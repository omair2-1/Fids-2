import React from 'react';
import { ShoppingBag, Bot, Utensils, Search, ShieldCheck, Clock, MapPin, Menu as MenuIcon, X, Calendar } from 'lucide-react';
import { CartItem } from '../types';

interface NavbarProps {
  currentTab: 'home' | 'menu' | 'track' | 'admin';
  setCurrentTab: (tab: 'home' | 'menu' | 'track' | 'admin') => void;
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  setIsChatOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isVegOnly: boolean;
  setIsVegOnly: (veg: boolean) => void;
  onOpenReservation?: () => void;
  isChatEnabled?: boolean;
  onToggleChatEnabled?: (enabled: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cart,
  setIsCartOpen,
  setIsChatOpen,
  searchQuery,
  setSearchQuery,
  isVegOnly,
  setIsVegOnly,
  onOpenReservation,
  isChatEnabled = true,
  onToggleChatEnabled,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md text-stone-100 border-b border-amber-500/20 shadow-2xl">
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 border-b border-stone-800 text-amber-400 text-[11px] py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-200 font-bold">FIDS Indian Cuisine</span>
            <span className="text-stone-400 hidden sm:inline">• Direct Kitchen Delivery &amp; Table Dining</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-stone-400">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> Open: 11:30 AM - 11:00 PM IST</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-500" /> Bengaluru / Fine Dining</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => setCurrentTab('home')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              🔥
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                FIDS<span className="text-amber-500">.</span>
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-amber-400/80 font-bold -mt-1">
                Authentic Indian Cuisine
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentTab === 'home'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:bg-stone-900 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentTab('menu')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                currentTab === 'menu'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:bg-stone-900 hover:text-white'
              }`}
            >
              <Utensils className="w-4 h-4 text-amber-500" />
              Food Menu
            </button>
            <button
              onClick={() => setCurrentTab('track')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                currentTab === 'track'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:bg-stone-900 hover:text-white'
              }`}
            >
              Track Order
            </button>
            
            {onOpenReservation && (
              <button
                onClick={onOpenReservation}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                Book Table
              </button>
            )}

            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'bg-stone-800 text-amber-400 border border-amber-500/40'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Admin
            </button>
          </nav>

          {/* Right Action Icons & Search */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search on Menu View */}
            {currentTab === 'menu' && (
              <div className="hidden lg:flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-40 focus:w-52 bg-stone-900 text-xs text-stone-100 placeholder-stone-500 pl-8 pr-3 py-1.5 rounded-full border border-stone-800 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                {/* Veg Toggle */}
                <button
                  onClick={() => setIsVegOnly(!isVegOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    isVegOnly
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                  title="Toggle Pure Veg Filter"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Veg Only</span>
                </button>
              </div>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <ShoppingBag className="w-5 h-5 text-stone-950" />
              {totalCartCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black bg-stone-950 text-amber-400 px-1.5 py-0.5 rounded-full">
                    {totalCartCount}
                  </span>
                  <span className="hidden sm:inline text-xs font-extrabold text-stone-950">
                    ₹{totalCartPrice}
                  </span>
                </div>
              )}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-800 bg-stone-950 px-4 pt-3 pb-6 space-y-2">
          <button
            onClick={() => { setCurrentTab('home'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
              currentTab === 'home' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-300'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => { setCurrentTab('menu'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
              currentTab === 'menu' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-300'
            }`}
          >
            FIDS Food Menu
          </button>
          <button
            onClick={() => { setCurrentTab('track'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
              currentTab === 'track' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-300'
            }`}
          >
            Live Order Tracking
          </button>
          {onOpenReservation && (
            <button
              onClick={() => { onOpenReservation(); setMobileMenuOpen(false); }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20"
            >
              Book a Dining Table
            </button>
          )}
          <button
            onClick={() => { setCurrentTab('admin'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
              currentTab === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-300'
            }`}
          >
            Admin Management
          </button>
        </div>
      )}
    </header>
  );
};

