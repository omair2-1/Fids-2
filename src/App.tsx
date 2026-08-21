import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MenuGrid } from './components/MenuGrid';
import { CartDrawer } from './components/CartDrawer';
import { OrderTracker } from './components/OrderTracker';
import { AdminDashboard } from './components/AdminDashboard';
import { AIChatbot } from './components/AIChatbot';
import { TableReservationModal } from './components/TableReservationModal';
import { Footer } from './components/Footer';
import { Category, MenuItem, CartItem, Order, TableReservation } from './types';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from './data/initialData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'menu' | 'track' | 'admin'>('home');
  
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('fids_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  // Chatbot visibility control state (URL query param ?chat=false or ?nochat=true or localStorage)
  const [isChatEnabled, setIsChatEnabled] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('chat') === 'false' || params.get('nochat') === 'true') {
        return false;
      }
      const saved = localStorage.getItem('fids_chat_enabled');
      return saved !== null ? saved === 'true' : true; // Enabled by default unless turned off or shared with ?chat=false
    } catch {
      return true;
    }
  });

  const handleToggleChatEnabled = (enabled: boolean) => {
    setIsChatEnabled(enabled);
    if (!enabled) setIsChatOpen(false);
    try {
      localStorage.setItem('fids_chat_enabled', enabled ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [activeTrackOrder, setActiveTrackOrder] = useState<Order | null>(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fids_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Fetch data from API
  const fetchMenuData = async () => {
    try {
      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (catData.success && catData.categories) {
        setCategories(catData.categories);
      }

      const menuRes = await fetch('/api/menu');
      const menuData = await menuRes.json();
      if (menuData.success && menuData.menuItems) {
        setMenuItems(menuData.menuItems);
      }
    } catch (err) {
      console.warn('API fetch failed, utilizing initial local data:', err);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Cart operations
  const handleAddToCart = (item: MenuItem, notes?: string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((c) => c.menuItem.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        if (notes) updated[existingIndex].specialNotes = notes;
        return updated;
      } else {
        return [...prevCart, { menuItem: item, quantity: 1, specialNotes: notes }];
      }
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((c) => c.menuItem.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleOrderCreated = (newOrder: Order) => {
    setActiveTrackOrder(newOrder);
    setCurrentTab('track');
  };

  const handleOpenChatWithQuery = (query: string) => {
    setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cart={cart}
        setIsCartOpen={setIsCartOpen}
        setIsChatOpen={(open) => {
          if (open) setChatInitialQuery(undefined);
          setIsChatOpen(open);
        }}
        onOpenReservation={() => setIsReservationOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isVegOnly={isVegOnly}
        setIsVegOnly={setIsVegOnly}
        isChatEnabled={isChatEnabled}
        onToggleChatEnabled={handleToggleChatEnabled}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {currentTab === 'home' && (
          <Hero
            onExploreMenu={() => setCurrentTab('menu')}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenChat={() => isChatEnabled && setIsChatOpen(true)}
            onOpenReservation={() => setIsReservationOpen(true)}
            featuredItems={menuItems}
            categories={categories}
            onAddToCart={handleAddToCart}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
            isChatEnabled={isChatEnabled}
          />
        )}

        {currentTab === 'menu' && (
          <MenuGrid
            categories={categories}
            menuItems={menuItems}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isVegOnly={isVegOnly}
            setIsVegOnly={setIsVegOnly}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
          />
        )}

        {currentTab === 'track' && (
          <OrderTracker
            currentOrder={activeTrackOrder}
            onOpenChatWithQuery={(q) => isChatEnabled && handleOpenChatWithQuery(q)}
            isChatEnabled={isChatEnabled}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            categories={categories}
            menuItems={menuItems}
            onRefreshMenu={fetchMenuData}
            isChatEnabled={isChatEnabled}
            onToggleChatEnabled={handleToggleChatEnabled}
          />
        )}
      </main>

      {/* Persistent Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOrderCreated={handleOrderCreated}
      />

      {/* AI Culinary Chatbot Modal - Only rendered when AI Chat is enabled */}
      {isChatEnabled && (
        <AIChatbot
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          onClose={() => setIsChatOpen(false)}
          initialQuery={chatInitialQuery}
          menuItems={menuItems}
          onAddToCart={handleAddToCart}
          onOpenReservation={() => setIsReservationOpen(true)}
        />
      )}

      {/* Table Reservation Modal */}
      <TableReservationModal
        isOpen={isReservationOpen}
        onClose={() => setIsReservationOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigate={setCurrentTab}
        onOpenChat={() => isChatEnabled && setIsChatOpen(true)}
        isChatEnabled={isChatEnabled}
      />
    </div>
  );
}

