import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from './src/data/initialData';
import { MenuItem, Order, OrderStatus, Category, TableReservation } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database State
let categories: Category[] = [...INITIAL_CATEGORIES];
let menuItems: MenuItem[] = [...INITIAL_MENU_ITEMS];

let reservations: TableReservation[] = [
  {
    id: 'RES-8801',
    guest_name: 'Vikramaditya Roy',
    guest_phone: '+91 98765 11223',
    guest_email: 'vikram.roy@example.com',
    date: '2026-08-07',
    time: '20:00',
    guests_count: 4,
    table_preference: 'Main Dining Hall - Candle Light',
    special_occasion: 'Anniversary Dinner',
    status: 'Confirmed',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  }
];

let orders: Order[] = [
  {
    id: 'ORD-9102',
    customer_name: 'Rahul Sharma',
    customer_phone: '+91 98765 43210',
    customer_address: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
    delivery_type: 'delivery',
    total_amount: 925,
    status: 'Preparing',
    estimated_prep_time: 25,
    payment_status: 'Paid',
    payment_method: 'GPay / PhonePe (UPI)',
    payment_transaction_id: 'UPI98421049281',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    items: [
      { menu_item_id: 'item-5', name: 'Velvet Butter Chicken', quantity: 1, price: 460, is_veg: false },
      { menu_item_id: 'item-10', name: 'Garlic Butter Naan', quantity: 2, price: 75, is_veg: true },
      { menu_item_id: 'item-12', name: 'Saffron Gulab Jamun', quantity: 1, price: 160, is_veg: true },
    ],
    special_instructions: 'Make butter chicken medium spicy please',
    history: [
      { status: 'Pending', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), note: 'Order placed via GPay UPI' },
      { status: 'Preparing', timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), note: 'FIDS Kitchen accepted order' },
    ],
  },
  {
    id: 'ORD-9101',
    customer_name: 'Ananya Verma',
    customer_phone: '+91 91234 56789',
    customer_address: 'Table #4 (Dine In at FIDS)',
    delivery_type: 'dine_in',
    table_number: '4',
    total_amount: 870,
    status: 'Ready',
    estimated_prep_time: 15,
    payment_status: 'Paid',
    payment_method: 'Credit / Debit Card',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    items: [
      { menu_item_id: 'item-1', name: 'Tandoori Paneer Tikka', quantity: 1, price: 320, is_veg: true },
      { menu_item_id: 'item-6', name: 'Royal Paneer Butter Masala', quantity: 1, price: 390, is_veg: true },
      { menu_item_id: 'item-14', name: 'Mango Kulhad Lassi', quantity: 1, price: 140, is_veg: true },
    ],
    history: [
      { status: 'Pending', timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), note: 'Dine-in order placed' },
      { status: 'Preparing', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), note: 'Chef prepping paneer' },
      { status: 'Ready', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), note: 'Food ready for table service' },
    ],
  }
];

// Helper: Initialize Gemini AI Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') return null;
  return new GoogleGenAI({ apiKey });
}

// REST API ROUTES

// 1. Categories
app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories });
});

// 2. Menu Items
app.get('/api/menu', (req, res) => {
  const { category_id, is_veg, search, in_stock_only } = req.query;
  let filtered = [...menuItems];

  if (category_id && typeof category_id === 'string') {
    filtered = filtered.filter(item => item.category_id === category_id);
  }
  if (is_veg === 'true') {
    filtered = filtered.filter(item => item.is_veg === true);
  } else if (is_veg === 'false') {
    filtered = filtered.filter(item => item.is_veg === false);
  }
  if (in_stock_only === 'true') {
    filtered = filtered.filter(item => item.is_available === true);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: filtered.length, menuItems: filtered });
});

// Admin: Add Menu Item
app.post('/api/menu', (req, res) => {
  const { category_id, name, description, price, is_veg, image_url, spice_level, tags } = req.body;
  if (!name || !category_id || price === undefined) {
    return res.status(400).json({ success: false, error: 'Name, Category, and Price are required.' });
  }

  const newItem: MenuItem = {
    id: 'item-' + Date.now(),
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
    tags: tags || ['Chef Special']
  };

  menuItems.push(newItem);
  res.json({ success: true, menuItem: newItem });
});

// Admin: Update Menu Item
app.put('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const index = menuItems.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Menu item not found.' });
  }

  menuItems[index] = {
    ...menuItems[index],
    ...req.body
  };

  res.json({ success: true, menuItem: menuItems[index] });
});

// Admin: Delete Menu Item
app.delete('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  menuItems = menuItems.filter(i => i.id !== id);
  res.json({ success: true, message: 'Item deleted successfully.' });
});

// 3. Table Reservations API
app.get('/api/reservations', (req, res) => {
  res.json({ success: true, count: reservations.length, reservations });
});

app.post('/api/reservations', (req, res) => {
  const { guest_name, guest_phone, guest_email, date, time, guests_count, table_preference, special_occasion } = req.body;
  if (!guest_name || !guest_phone || !date || !time) {
    return res.status(400).json({ success: false, error: 'Guest name, phone, date, and time are required.' });
  }

  const newRes: TableReservation = {
    id: 'RES-' + Math.floor(1000 + Math.random() * 9000),
    guest_name,
    guest_phone,
    guest_email: guest_email || '',
    date,
    time,
    guests_count: Number(guests_count) || 2,
    table_preference: table_preference || 'Standard Table',
    special_occasion: special_occasion || '',
    status: 'Confirmed',
    created_at: new Date().toISOString()
  };

  reservations.unshift(newRes);
  res.json({ success: true, reservation: newRes });
});

// 4. Orders API
app.get('/api/orders', (req, res) => {
  const { phone, status } = req.query;
  let result = [...orders];

  if (phone && typeof phone === 'string') {
    result = result.filter(o => o.customer_phone.includes(phone));
  }
  if (status && typeof status === 'string') {
    result = result.filter(o => o.status === status);
  }

  // Sort latest first
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, count: result.length, orders: result });
});

app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id.toLowerCase() === id.toLowerCase());
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }
  res.json({ success: true, order });
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_address, delivery_type, table_number, items, payment_method, special_instructions } = req.body;

  if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Customer details and items are required.' });
  }

  let total_amount = 0;
  const formattedItems = items.map((i: any) => {
    const menuItem = menuItems.find(m => m.id === i.menu_item_id);
    const price = menuItem ? menuItem.price : (i.price || 0);
    const quantity = i.quantity || 1;
    total_amount += price * quantity;
    return {
      menu_item_id: i.menu_item_id,
      name: menuItem ? menuItem.name : (i.name || 'Food Item'),
      quantity,
      price,
      is_veg: menuItem ? menuItem.is_veg : true,
      notes: i.notes || ''
    };
  });

  const transactionId = payment_method?.includes('GPay') ? 'GPI' + Math.floor(1000000000 + Math.random() * 9000000000) : undefined;

  const newOrder: Order = {
    id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
    customer_name,
    customer_phone,
    customer_address: customer_address || (delivery_type === 'dine_in' ? `FIDS Table #${table_number}` : 'Takeaway Counter'),
    delivery_type: delivery_type || 'delivery',
    table_number,
    total_amount,
    status: 'Pending',
    estimated_prep_time: 20,
    payment_status: payment_method === 'Cash on Delivery' ? 'Unpaid' : 'Paid',
    payment_method: payment_method || 'GPay / PhonePe (UPI)',
    payment_transaction_id: transactionId,
    created_at: new Date().toISOString(),
    items: formattedItems,
    special_instructions: special_instructions || '',
    history: [
      { status: 'Pending', timestamp: new Date().toISOString(), note: `Order placed via ${payment_method || 'UPI'}` }
    ]
  };

  orders.unshift(newOrder);
  res.json({ success: true, order: newOrder });
});

// Admin: Update Order Status
app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, estimated_prep_time, note } = req.body;

  const order = orders.find(o => o.id.toLowerCase() === id.toLowerCase());
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  if (status) {
    order.status = status as OrderStatus;
  }
  if (estimated_prep_time !== undefined) {
    order.estimated_prep_time = Number(estimated_prep_time);
  }

  order.history.push({
    status: order.status,
    timestamp: new Date().toISOString(),
    note: note || `Status updated to ${order.status}`
  });

  res.json({ success: true, order });
});

// 5. Simulated UPI / GPay QR Payment Init API
app.post('/api/payments/gpay-init', (req, res) => {
  const { amount, phone } = req.body;
  const upiId = 'fidsrestaurant@okicici';
  const transactionRef = 'GPay-' + Date.now();
  const qrString = `upi://pay?pa=${upiId}&pn=FIDS%20Indian%20Cuisine&am=${amount}&cu=INR&tn=Food%20Order%20${transactionRef}`;

  res.json({
    success: true,
    upi_id: upiId,
    merchant_name: 'FIDS Indian Cuisine',
    amount,
    transaction_ref: transactionRef,
    qr_data: qrString
  });
});

// 6. AI Chatbot API Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, openAiKey } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message parameter is required.' });
    }

    // Build restaurant context for AI
    const availableMenuSummary = menuItems
      .filter(i => i.is_available)
      .map(i => `- ${i.name} (${i.is_veg ? 'VEGETARIAN' : 'NON-VEGETARIAN'}, Price: ₹${i.price}, Category: ${categories.find(c => c.id === i.category_id)?.name || 'General'}): ${i.description} [ID: ${i.id}]`)
      .join('\n');

    const recentOrdersSummary = orders.slice(0, 5).map(o => `Order #${o.id}: Status is ${o.status}, Total ₹${o.total_amount}, Name: ${o.customer_name}`).join('\n');

    const systemPrompt = `You are "FidsBot", the friendly, polite, and expert AI Culinary Assistant for "FIDS - Authentic Indian Cuisine".
Your goal is to assist customers with:
1. Recommending authentic Indian dishes based on dietary preferences (Vegetarian, Non-Vegetarian, Spicy, Mild, Starters, Biryani, Desserts).
2. Explaining ingredients, spice levels, preparation in pure ghee/tandoor, and portion recommendations.
3. Guiding users on ordering food with GPay / PhonePe UPI instant payments or booking a table for fine dining at FIDS.
4. Helping users track their live order if they mention an order ID (like ORD-9102).

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
      reply = "You can track your live kitchen order status anytime under the 'Track Order' tab above by entering your Order ID (like ORD-9102 or ORD-9101)!";
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

