import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Razorpay from 'razorpay';
import { rateLimit } from 'express-rate-limit';
import { prisma } from './src/lib/prisma';

const app = express();
const PORT = 3000;
app.set('trust proxy', 1);

app.use(express.json());

// --- Admin Authentication ---
// Set ADMIN_PASSKEY as a real secret in your hosting environment before going live.
let ADMIN_PASSKEY = process.env.ADMIN_PASSKEY;
if (!ADMIN_PASSKEY) {
  ADMIN_PASSKEY = crypto.randomBytes(12).toString('hex');
  console.warn('\n⚠️  ADMIN_PASSKEY is not set. Generated a temporary one for this run only:');
  console.warn(`   ${ADMIN_PASSKEY}`);
  console.warn('   Set ADMIN_PASSKEY in your environment before deploying to production.\n');
}

// token -> expiry timestamp (ms). Fine as in-memory: a server restart just means
// admin staff log in again, which is a reasonable trade-off vs. the complexity
// of a persisted session store at this stage.
const adminSessions = new Map<string, number>();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const expiry = token ? adminSessions.get(token) : undefined;

  if (!token || !expiry || expiry < Date.now()) {
    if (token) adminSessions.delete(token);
    return res.status(401).json({ success: false, error: 'Admin authentication required.' });
  }

  adminSessions.set(token, Date.now() + SESSION_TTL_MS); // sliding expiry
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { passkey } = req.body;
  if (typeof passkey !== 'string' || passkey !== ADMIN_PASSKEY) {
    return res.status(401).json({ success: false, error: 'Invalid admin passkey.' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ success: true, token });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) adminSessions.delete(token);
  res.json({ success: true });
});

// Random, non-sequential public IDs for orders/reservations — see the comment
// on the Order model in prisma/schema.prisma for why this matters.
function generateId(prefix: string) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// --- Razorpay ---
const razorpay = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

// Recomputes pricing server-side from real DB menu prices — never trust a
// client-supplied total. Matches the breakdown shown in the cart UI exactly
// (5% GST, ₹40 delivery fee waived over ₹500) so the amount actually charged
// via Razorpay always matches the amount stored on the order.
async function computeOrderPricing(items: { menu_item_id: string; quantity: number }[], deliveryType: string) {
  const menuItemIds = items.map((i) => i.menu_item_id).filter(Boolean);
  const menuItemsFound = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } });
  const menuItemById = new Map(menuItemsFound.map((m) => [m.id, m]));

  let itemTotal = 0;
  const formattedItems = items.map((i) => {
    const menuItem = menuItemById.get(i.menu_item_id);
    const price = menuItem ? menuItem.price : 0;
    const quantity = i.quantity || 1;
    itemTotal += price * quantity;
    return {
      menu_item_id: i.menu_item_id,
      name: menuItem ? menuItem.name : 'Food Item',
      quantity,
      price,
      is_veg: menuItem ? menuItem.is_veg : true,
    };
  });

  const deliveryFee = deliveryType === 'delivery' ? (itemTotal > 500 ? 0 : 40) : 0;
  const taxesAndCharges = Math.round(itemTotal * 0.05);
  const grandTotal = itemTotal + deliveryFee + taxesAndCharges;

  return { formattedItems, itemTotal, deliveryFee, taxesAndCharges, grandTotal };
}

// Helper: Initialize Gemini AI Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') return null;
  return new GoogleGenAI({ apiKey });
}

// REST API ROUTES

// 1. Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, categories });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ success: false, error: 'Failed to load categories.' });
  }
});

// 2. Menu Items
app.get('/api/menu', async (req, res) => {
  try {
    const { category_id, is_veg, search, in_stock_only } = req.query;

    const where: any = {};
    if (category_id && typeof category_id === 'string') where.category_id = category_id;
    if (is_veg === 'true') where.is_veg = true;
    else if (is_veg === 'false') where.is_veg = false;
    if (in_stock_only === 'true') where.is_available = true;

    let items = await prisma.menuItem.findMany({ where, orderBy: { name: 'asc' } });

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: items.length, menuItems: items });
  } catch (err) {
    console.error('GET /api/menu error:', err);
    res.status(500).json({ success: false, error: 'Failed to load menu.' });
  }
});

// Admin: Add Menu Item
app.post('/api/menu', requireAdmin, async (req, res) => {
  try {
    const { category_id, name, description, price, is_veg, image_url, spice_level, tags } = req.body;
    if (!name || !category_id || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name, Category, and Price are required.' });
    }

    const newItem = await prisma.menuItem.create({
      data: {
        category_id,
        name,
        description: description || '',
        price: Number(price),
        is_veg: Boolean(is_veg),
        is_available: true,
        image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        spice_level: spice_level || 'Medium',
        rating: 5.0,
        review_count: 1,
        tags: tags && Array.isArray(tags) ? tags : ['Chef Special'],
      },
    });

    res.json({ success: true, menuItem: newItem });
  } catch (err: any) {
    if (err.code === 'P2003') {
      return res.status(400).json({ success: false, error: 'That category does not exist.' });
    }
    console.error('POST /api/menu error:', err);
    res.status(500).json({ success: false, error: 'Failed to add menu item.' });
  }
});

// Admin: Update Menu Item
app.put('/api/menu/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, price, is_veg, is_available, image_url, spice_level, calories, prep_time_est, rating, review_count, tags } = req.body;

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(category_id !== undefined && { category_id }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(is_veg !== undefined && { is_veg: Boolean(is_veg) }),
        ...(is_available !== undefined && { is_available: Boolean(is_available) }),
        ...(image_url !== undefined && { image_url }),
        ...(spice_level !== undefined && { spice_level }),
        ...(calories !== undefined && { calories }),
        ...(prep_time_est !== undefined && { prep_time_est: Number(prep_time_est) }),
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(review_count !== undefined && { review_count: Number(review_count) }),
        ...(tags !== undefined && { tags }),
      },
    });

    res.json({ success: true, menuItem });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }
    console.error('PUT /api/menu/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to update menu item.' });
  }
});

// Admin: Delete Menu Item
app.delete('/api/menu/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }
    console.error('DELETE /api/menu/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete menu item.' });
  }
});

// 3. Table Reservations API
app.get('/api/reservations', requireAdmin, async (req, res) => {
  try {
    const reservations = await prisma.tableReservation.findMany({ orderBy: { created_at: 'desc' } });
    res.json({ success: true, count: reservations.length, reservations });
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    res.status(500).json({ success: false, error: 'Failed to load reservations.' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { guest_name, guest_phone, guest_email, date, time, guests_count, table_preference, special_occasion } = req.body;
    if (!guest_name || !guest_phone || !date || !time) {
      return res.status(400).json({ success: false, error: 'Guest name, phone, date, and time are required.' });
    }

    const newRes = await prisma.tableReservation.create({
      data: {
        id: generateId('RES'),
        guest_name,
        guest_phone,
        guest_email: guest_email || '',
        date,
        time,
        guests_count: Number(guests_count) || 2,
        table_preference: table_preference || 'Standard Table',
        special_occasion: special_occasion || '',
        status: 'Confirmed',
      },
    });

    res.json({ success: true, reservation: newRes });
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    res.status(500).json({ success: false, error: 'Failed to create reservation.' });
  }
});

// 4. Orders API
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const { phone, status } = req.query;

    const where: any = {};
    if (phone && typeof phone === 'string') where.customer_phone = { contains: phone };
    if (status && typeof status === 'string') where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: { items: true, history: { orderBy: { timestamp: 'asc' } } },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ success: false, error: 'Failed to load orders.' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const id = req.params.id.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, history: { orderBy: { timestamp: 'asc' } } },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    res.json({ success: true, order });
  } catch (err) {
    console.error('GET /api/orders/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to load order.' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      customer_name, customer_phone, customer_address, delivery_type, table_number,
      items, payment_method, special_instructions,
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
    } = req.body;

    if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Customer details and items are required.' });
    }

    const { formattedItems, grandTotal } = await computeOrderPricing(items, delivery_type || 'delivery');
    // Carry through each item's kitchen notes (not a pricing/security concern, safe to trust as-is).
    const itemsWithNotes = formattedItems.map((f, idx) => ({ ...f, notes: items[idx]?.notes || '' }));

    let payment_status = 'Unpaid';
    let payment_transaction_id: string | undefined;

    if (payment_method !== 'Cash on Delivery') {
      // Real payment: every field below is verified against Razorpay's own
      // records, not trusted from the request body.
      if (!razorpay) {
        return res.status(503).json({ success: false, error: 'Online payments are not configured on this server yet.' });
      }
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Payment verification details are missing.' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Payment verification failed. Please contact support before retrying.' });
      }

      // Cross-check with Razorpay's servers directly: confirms the payment was
      // actually captured, and that its amount matches THIS cart — not a
      // cheaper one the customer might be trying to swap in after paying.
      const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
      if (razorpayOrder.status !== 'paid' || razorpayOrder.amount !== Math.round(grandTotal * 100)) {
        return res.status(400).json({ success: false, error: 'Payment amount could not be verified. Please contact support before retrying.' });
      }

      payment_status = 'Paid';
      payment_transaction_id = razorpay_payment_id;
    }

    const order = await prisma.order.create({
      data: {
        id: generateId('ORD'),
        customer_name,
        customer_phone,
        customer_address: customer_address || (delivery_type === 'dine_in' ? `FIDS Table #${table_number}` : 'Takeaway Counter'),
        delivery_type: delivery_type || 'delivery',
        table_number,
        total_amount: grandTotal,
        status: 'Pending',
        estimated_prep_time: 20,
        payment_status,
        payment_method: payment_method || 'GPay / PhonePe (UPI)',
        payment_transaction_id,
        special_instructions: special_instructions || '',
        items: { create: itemsWithNotes },
        history: {
          create: [{ status: 'Pending', note: `Order placed via ${payment_method || 'UPI'}` }],
        },
      },
      include: { items: true, history: true },
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ success: false, error: 'Failed to create order.' });
  }
});

// Admin: Update Order Status
app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id.trim().toUpperCase();
    const { status, estimated_prep_time, note } = req.body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const nextStatus = status || existing.status;

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status !== undefined && { status: nextStatus }),
        ...(estimated_prep_time !== undefined && { estimated_prep_time: Number(estimated_prep_time) }),
        history: {
          create: [{ status: nextStatus, note: note || `Status updated to ${nextStatus}` }],
        },
      },
      include: { items: true, history: { orderBy: { timestamp: 'asc' } } },
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('PUT /api/orders/:id/status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update order status.' });
  }
});

// 5. Razorpay Payment API
// Step 1 of real payment flow: create a genuine Razorpay order for the
// customer's actual cart, priced from real DB data — never from the client.
app.post('/api/payments/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ success: false, error: 'Online payments are not configured on this server yet.' });
    }

    const { items, delivery_type } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart items are required.' });
    }

    const { grandTotal } = await computeOrderPricing(items, delivery_type || 'delivery');
    if (grandTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Could not price this order.' });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(grandTotal * 100), // paise
      currency: 'INR',
      receipt: generateId('RCPT'),
    });

    res.json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      razorpay_order_id: razorpayOrder.id,
      amount: grandTotal,
    });
  } catch (err) {
    console.error('POST /api/payments/create-order error:', err);
    res.status(500).json({ success: false, error: 'Could not start payment. Please try again.' });
  }
});

// 6. AI Chatbot API Endpoint
const chatRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages — please wait a few minutes before trying again.' },
});

app.post('/api/chat', chatRateLimiter, async (req, res) => {
  try {
    const { message, history, openAiKey } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message parameter is required.' });
    }

    // Build restaurant context for AI from the real database
    const [availableItems, recentOrders] = await Promise.all([
      prisma.menuItem.findMany({ where: { is_available: true }, include: { category: true } }),
      prisma.order.findMany({ take: 5, orderBy: { created_at: 'desc' } }),
    ]);

    const availableMenuSummary = availableItems
      .map(i => `- ${i.name} (${i.is_veg ? 'VEGETARIAN' : 'NON-VEGETARIAN'}, Price: ₹${i.price}, Category: ${i.category?.name || 'General'}): ${i.description} [ID: ${i.id}]`)
      .join('\n');

    const recentOrdersSummary = recentOrders.map(o => `Order #${o.id}: Status is ${o.status}, Total ₹${o.total_amount}, Name: ${o.customer_name}`).join('\n');

    const systemPrompt = `You are "FidsBot", the friendly, polite, and expert AI Culinary Assistant for "FIDS - Authentic Indian Cuisine".
Your goal is to assist customers with:
1. Recommending authentic Indian dishes based on dietary preferences (Vegetarian, Non-Vegetarian, Spicy, Mild, Starters, Biryani, Desserts).
2. Explaining ingredients, spice levels, preparation in pure ghee/tandoor, and portion recommendations.
3. Guiding users on ordering food with GPay / PhonePe UPI instant payments or booking a table for fine dining at FIDS.
4. Helping users track their live order if they mention an order ID.

CURRENT FIDS MENU DATA:
${availableMenuSummary}

RECENT ACTIVE ORDERS:
${recentOrdersSummary}

RULES FOR YOUR RESPONSE:
- Keep answers warm, welcoming, clear, and scannable (under 2-3 short paragraphs).
- Always use Indian Rupee (₹) for prices.
- Clearly state whether a recommended dish is VEGETARIAN or NON-VEGETARIAN.
- When recommending a dish, always attach its recommendation tag in this exact format:
[RECOMMEND: item_id | Dish Name | Price]
Example: "Try our Royal Paneer Butter Masala [RECOMMEND: item-6 | Royal Paneer Butter Masala | 390]!"
- Be polite, courteous, and enthusiastic about Indian culinary arts.`;

    // Check if user requested OpenAI or provided an OpenAI Key
    const effectiveOpenAiKey = openAiKey || process.env.OPENAI_API_KEY;

    if (effectiveOpenAiKey) {
      try {
        const openai = new OpenAI({ apiKey: effectiveOpenAiKey });
        const messagesForOpenAI: any[] = [
          { role: 'system', content: systemPrompt }
        ];

        if (Array.isArray(history)) {
          history.forEach(h => {
            messagesForOpenAI.push({
              role: h.sender === 'user' ? 'user' : 'assistant',
              content: h.text
            });
          });
        }
        messagesForOpenAI.push({ role: 'user', content: message });

        const openAiResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messagesForOpenAI,
          temperature: 0.7,
        });

        const reply = openAiResponse.choices[0]?.message?.content || 'Welcome to FIDS Indian Cuisine! How may I assist your culinary experience today?';
        return res.json({ success: true, reply, provider: 'OpenAI (gpt-4o-mini)' });
      } catch (openAiErr: any) {
        // Fallback gracefully without throwing server errors
      }
    }

    // Default: Gemini API using @google/genai SDK
    const ai = getGeminiClient();
    if (ai) {
      try {
        let fullPrompt = `${systemPrompt}\n\n`;
        if (Array.isArray(history) && history.length > 0) {
          fullPrompt += `Previous Conversation:\n`;
          history.forEach(h => {
            fullPrompt += `${h.sender === 'user' ? 'Customer' : 'FidsBot'}: ${h.text}\n`;
          });
        }
        fullPrompt += `Customer: ${message}\nFidsBot:`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
        });

        if (response.text) {
          return res.json({ success: true, reply: response.text, provider: 'Gemini 2.5 Flash' });
        }
      } catch (geminiErr: any) {
        // Fallback gracefully to smart engine
      }
    }

    // Smart Local Fallback Response Engine based on user input
    const q = message.toLowerCase();
    let reply = "";
    if (q.includes('veg') || q.includes('vegetarian') || q.includes('paneer')) {
      reply = "Namaste! For vegetarian cravings, our Chef highly recommends our Tandoori Paneer Tikka [RECOMMEND: item-1 | Tandoori Paneer Tikka | 320] and Royal Paneer Butter Masala [RECOMMEND: item-6 | Royal Paneer Butter Masala | 390], served with warm Garlic Butter Naan [RECOMMEND: item-10 | Garlic Butter Naan | 75]!";
    } else if (q.includes('chicken') || q.includes('non-veg') || q.includes('non veg') || q.includes('mutton') || q.includes('biryani')) {
      reply = "Greetings! For non-vegetarian lovers, our signature delicacies are the Velvet Butter Chicken [RECOMMEND: item-5 | Velvet Butter Chicken | 460] and Royal Awadhi Mutton Biryani [RECOMMEND: item-8 | Royal Awadhi Mutton Biryani | 520]. Cooked with fragrant saffron and pure ghee!";
    } else if (q.includes('order') || q.includes('track') || q.includes('ord-')) {
      reply = "You can track your live kitchen order status anytime under the 'Track Order' tab above by entering your Order ID (it looks like ORD-3F9A2B1C)!";
    } else if (q.includes('table') || q.includes('reserve') || q.includes('book')) {
      reply = "We would love to host you for fine dining at FIDS! You can click the 'Book Table' button in the menu bar to reserve your candlelight or family dining table.";
    } else {
      reply = "Welcome to FIDS Indian Cuisine! I am FidsBot. I recommend our Velvet Butter Chicken [RECOMMEND: item-5 | Velvet Butter Chicken | 460], Tandoori Paneer Tikka [RECOMMEND: item-1 | Tandoori Paneer Tikka | 320], or Hyderabadi Dum Biryani [RECOMMEND: item-7 | Hyderabadi Chicken Dum Biryani | 440] today! Would you like me to add any of these to your cart?";
    }

    return res.json({ success: true, reply, provider: 'FidsBot Engine' });

  } catch (err: any) {
    console.error('Chat API error:', err);
    return res.json({
      success: true,
      reply: "Namaste! Welcome to FIDS Indian Cuisine. I recommend trying our Velvet Butter Chicken [RECOMMEND: item-5 | Velvet Butter Chicken | 460] or Royal Paneer Butter Masala [RECOMMEND: item-6 | Royal Paneer Butter Masala | 390] today!",
      provider: 'FidsBot Assistant'
    });
  }
});

// START SERVER / VITE MIDDLEWARE
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Application build in progress, please refresh in a moment.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FIDS Restaurant server running on http://localhost:${PORT}`);
  });
}

start();
