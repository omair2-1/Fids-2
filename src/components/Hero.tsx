import React from 'react';
import { Utensils, Sparkles, Clock, ShieldCheck, Flame, ArrowRight, Bot, Star, ChevronRight, Calendar } from 'lucide-react';
import { MenuItem, Category } from '../types';

interface HeroProps {
  onExploreMenu: () => void;
  onOpenCart: () => void;
  onOpenChat: () => void;
  onOpenReservation?: () => void;
  featuredItems: MenuItem[];
  categories: Category[];
  onAddToCart: (item: MenuItem) => void;
  onSelectCategory: (catId: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreMenu,
  onOpenCart,
  onOpenChat,
  onOpenReservation,
  featuredItems,
  categories,
  onAddToCart,
  onSelectCategory,
}) => {
  return (
    <div className="space-y-12 pb-16">
      {/* Main Hero Banner */}
      <section className="relative overflow-hidden bg-stone-950 text-white rounded-3xl border border-amber-500/30 shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80"
            alt="FIDS Fine Dining Ambiance"
            className="w-full h-full object-cover object-center opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 sm:py-24 lg:px-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>FIDS - Authentic Indian Cuisine • Veg &amp; Non-Veg Delicacies</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-3xl leading-tight">
            Royal Indian Flavors.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
              Crafted with Precision.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-stone-300 max-w-2xl leading-relaxed font-light">
            Savor rich Awadhi biryanis, velvety butter chicken, paneer tikka, and tandoori breads at FIDS. Order online for swift home delivery or reserve a private dining table.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <button
              onClick={onExploreMenu}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-xs uppercase tracking-wider hover:from-amber-400 hover:to-amber-500 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Utensils className="w-4 h-4" />
              <span>Explore Menu</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onOpenReservation && (
              <button
                onClick={onOpenReservation}
                className="px-6 py-3.5 rounded-2xl bg-stone-900/90 text-amber-400 border border-amber-500/40 hover:bg-stone-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Book a Table</span>
              </button>
            )}

            <button
              onClick={onOpenChat}
              className="px-5 py-3.5 rounded-2xl bg-stone-900/80 text-stone-200 border border-stone-800 hover:bg-stone-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>Ask FidsBot AI</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-12 pt-8 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1">
                <span>4.9</span> <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div className="text-xs text-stone-400">1,800+ Guest Reviews</div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-black text-white flex items-center gap-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>20-25 Mins</span>
              </div>
              <div className="text-xs text-stone-400">Fresh Kitchen Prep Time</div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>100%</span>
              </div>
              <div className="text-xs text-stone-400">Pure Ghee &amp; Whole Spices</div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1">
                <Flame className="w-4 h-4" />
                <span>Direct</span>
              </div>
              <div className="text-xs text-stone-400">GPay UPI &amp; Instant Ticketing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Quick Selector */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Explore FIDS Categories</h2>
            <p className="text-xs text-amber-400/80 font-medium">Vegetarian &amp; Non-Vegetarian Authentic Selections</p>
          </div>
          <button
            onClick={onExploreMenu}
            className="text-amber-400 font-bold text-xs hover:text-amber-300 flex items-center gap-1"
          >
            <span>View Full Menu</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                onSelectCategory(cat.id);
                onExploreMenu();
              }}
              className="group cursor-pointer bg-stone-900 p-5 rounded-2xl border border-stone-800 hover:border-amber-500/50 hover:bg-stone-850 shadow-lg transition-all text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                {cat.name.includes('Starter') ? '🥗' :
                 cat.name.includes('Main') ? '🥘' :
                 cat.name.includes('Bread') ? '🫓' :
                 cat.name.includes('Dessert') ? '🍨' : '🍹'}
              </div>
              <h3 className="mt-3 font-extrabold text-stone-100 text-xs group-hover:text-amber-400 transition-colors">
                {cat.name}
              </h3>
              <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">
                {cat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Chef Specials */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Signature Highlights</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">FIDS House Specialties</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-xl hover:border-amber-500/40 transition-all flex flex-col group"
            >
              <div className="relative h-48 overflow-hidden bg-stone-950">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-stone-950 uppercase tracking-wider flex items-center gap-1 shadow-md ${
                    item.is_veg ? 'bg-emerald-400' : 'bg-rose-500 text-white'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
                    {item.is_veg ? 'VEG' : 'NON-VEG'}
                  </span>
                  {item.spice_level && (
                    <span className="bg-stone-950/90 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-amber-500/30">
                      🌶️ {item.spice_level}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Price</span>
                    <span className="text-base font-black text-amber-400">₹{item.price}</span>
                  </div>

                  <button
                    onClick={() => onAddToCart(item)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-black hover:bg-amber-400 shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span>+ Add</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Assistant Callout Box */}
      <section className="bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white rounded-3xl p-8 sm:p-10 border border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
            <Bot className="w-4 h-4" />
            <span>FidsBot AI Assistant</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Need culinary recommendations or diet filters?
          </h2>

          <p className="text-xs text-stone-300 leading-relaxed">
            FidsBot recommends pairings, explains ingredients, filters vegetarian or halal non-vegetarian options, and helps you reserve dining tables seamlessly!
          </p>

          <div className="pt-2">
            <button
              onClick={onOpenChat}
              className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              <span>Ask FidsBot AI</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

