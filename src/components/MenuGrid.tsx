import React, { useState } from 'react';
import { Search, Filter, Plus, Minus, Star, Flame, Check, AlertCircle, ShoppingBag, X } from 'lucide-react';
import { MenuItem, Category, CartItem } from '../types';

interface MenuGridProps {
  categories: Category[];
  menuItems: MenuItem[];
  selectedCategory: string | null;
  setSelectedCategory: (catId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isVegOnly: boolean;
  setIsVegOnly: (v: boolean) => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem, notes?: string) => void;
  onUpdateCartQuantity: (itemId: string, delta: number) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categories,
  menuItems,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  isVegOnly,
  setIsVegOnly,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
}) => {
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [spiceFilter, setSpiceFilter] = useState<string>('All');
  const [noteModalItem, setNoteModalItem] = useState<MenuItem | null>(null);
  const [customNote, setCustomNote] = useState('');

  // Filter logic
  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory && item.category_id !== selectedCategory) return false;
    if (isVegOnly && !item.is_veg) return false;
    if (nonVegOnly && item.is_veg) return false;
    if (inStockOnly && !item.is_available) return false;
    if (spiceFilter !== 'All' && item.spice_level !== spiceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchTag = item.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const getCartQuantity = (itemId: string) => {
    const found = cart.find((c) => c.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  const handleAddWithNote = () => {
    if (noteModalItem) {
      onAddToCart(noteModalItem, customNote);
      setNoteModalItem(null);
      setCustomNote('');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Controls */}
      <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">FIDS Cuisine Menu</h1>
            <p className="text-xs text-amber-400 font-medium mt-1">Freshly prepared Indian delicacies • Pure Veg &amp; Halal Non-Veg options</p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
            <input
              type="text"
              placeholder="Search dishes, biryani, paneer, tikka..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 text-stone-100 placeholder-stone-500 pl-10 pr-9 py-2.5 rounded-2xl border border-stone-800 focus:outline-none focus:border-amber-500 text-xs font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-stone-500 hover:text-stone-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                : 'bg-stone-950 text-stone-400 hover:bg-stone-800 hover:text-stone-200 border border-stone-800'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter(i => i.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                    : 'bg-stone-950 text-stone-400 hover:bg-stone-800 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Veg toggle */}
            <button
              onClick={() => {
                setIsVegOnly(!isVegOnly);
                if (!isVegOnly) setNonVegOnly(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-extrabold transition-colors ${
                isVegOnly
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Veg Only</span>
            </button>

            {/* Non-veg toggle */}
            <button
              onClick={() => {
                setNonVegOnly(!nonVegOnly);
                if (!nonVegOnly) setIsVegOnly(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-extrabold transition-colors ${
                nonVegOnly
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Non-Veg Only</span>
            </button>

            {/* In stock only */}
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-extrabold transition-colors ${
                inStockOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>In-Stock Only</span>
            </button>
          </div>

          {/* Spice Selector */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Spice Level:</span>
            {['All', 'Mild', 'Medium', 'Spicy'].map((spice) => (
              <button
                key={spice}
                onClick={() => setSpiceFilter(spice)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  spiceFilter === spice
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-400 hover:bg-stone-800'
                }`}
              >
                {spice}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Item Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-stone-900 rounded-3xl p-12 text-center border border-stone-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
            🔍
          </div>
          <h3 className="text-lg font-extrabold text-white">No dishes match your filter</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Try adjusting search keywords, veg/non-veg toggles, or spice filters to view FIDS delicacies.
          </p>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery('');
              setIsVegOnly(false);
              setNonVegOnly(false);
              setInStockOnly(false);
              setSpiceFilter('All');
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-black text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const qty = getCartQuantity(item.id);
            return (
              <div
                key={item.id}
                className={`bg-stone-900 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                  !item.is_available ? 'opacity-70 border-stone-800 bg-stone-950' : 'border-stone-800 hover:border-amber-500/40'
                }`}
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative h-48 overflow-hidden bg-stone-950">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        !item.is_available ? 'grayscale-[40%]' : 'hover:scale-105'
                      }`}
                      referrerPolicy="no-referrer"
                    />

                    {/* Veg/Non-Veg + Stock Badge */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-stone-950 uppercase tracking-wider flex items-center gap-1 shadow-md ${
                        item.is_veg ? 'bg-emerald-400' : 'bg-rose-500 text-white'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
                        {item.is_veg ? 'VEG' : 'NON-VEG'}
                      </span>

                      {!item.is_available && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-950/90 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Spice + Prep Time */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1">
                      {item.spice_level && (
                        <span className="bg-stone-950/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                          🌶️ {item.spice_level}
                        </span>
                      )}
                      {item.prep_time_est && (
                        <span className="bg-stone-950/90 text-stone-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-stone-800">
                          ⏱️ ~{item.prep_time_est} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm leading-snug">
                        {item.name}
                      </h3>
                      {item.rating && (
                        <div className="flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.rating}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map(t => (
                          <span key={t} className="text-[10px] bg-stone-950 text-stone-400 px-2 py-0.5 rounded border border-stone-800 font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Action Button Footer */}
                <div className="p-5 pt-3 border-t border-stone-800 flex items-center justify-between bg-stone-950">
                  <div>
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Price</span>
                    <span className="text-base font-black text-amber-400">₹{item.price}</span>
                  </div>

                  {!item.is_available ? (
                    <button
                      disabled
                      className="px-4 py-2 rounded-xl bg-stone-800 text-stone-500 text-xs font-bold cursor-not-allowed"
                    >
                      Unavailable
                    </button>
                  ) : qty > 0 ? (
                    <div className="flex items-center bg-amber-500 text-stone-950 rounded-xl p-1 shadow-lg shadow-amber-500/20">
                      <button
                        onClick={() => onUpdateCartQuantity(item.id, -1)}
                        className="p-1 hover:bg-amber-400 rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 font-black text-xs">{qty}</span>
                      <button
                        onClick={() => onUpdateCartQuantity(item.id, 1)}
                        className="p-1 hover:bg-amber-400 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAddToCart(item)}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-black hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>

                      <button
                        onClick={() => {
                          setNoteModalItem(item);
                          setCustomNote('');
                        }}
                        className="p-2 rounded-xl bg-stone-800 text-stone-300 text-xs hover:bg-stone-700 transition-colors border border-stone-700"
                        title="Add Special Cooking Note"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Special Instruction Modal */}
      {noteModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-amber-500/30 text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-extrabold text-white text-base">Cooking Note for {noteModalItem.name}</h3>
              <button onClick={() => setNoteModalItem(null)} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Specify custom preferences (e.g., &quot;Less oil&quot;, &quot;Extra spicy gravy&quot;, &quot;No onions in raita&quot;)
            </p>

            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please make gravy medium spicy and send extra mint chutney."
              rows={3}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModalItem(null)}
                className="px-4 py-2 rounded-xl text-stone-400 text-xs font-bold hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWithNote}
                className="px-5 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

