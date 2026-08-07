import React from 'react';
import { Clock, MapPin, Phone, ShieldCheck, Heart, Sparkles } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: 'home' | 'menu' | 'track' | 'admin') => void;
  onOpenChat: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenChat }) => {
  return (
    <footer className="bg-stone-950 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg shadow-amber-500/20">
                🍛
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white">
                  FIDS <span className="text-amber-400 font-bold text-sm">CUISINE</span>
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                  Authentic Indian Delicacies
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed font-light">
              FIDS brings you royal Awadhi biryanis, rich tandoori grills, velvety paneer gravies, and handcrafted Indian desserts. Served fresh with pure ghee and whole spices.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Quick Links</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-amber-400 transition-colors">
                  Home Discovery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('menu')} className="hover:text-amber-400 transition-colors">
                  FIDS Dining Menu
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('track')} className="hover:text-amber-400 transition-colors">
                  Live Kitchen Order Tracker
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-amber-400 transition-colors">
                  Kitchen Admin Portal
                </button>
              </li>
              <li>
                <button onClick={onOpenChat} className="hover:text-amber-300 transition-colors text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>FidsBot AI Assistant</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Timings & Location */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Hours &amp; Address</h4>
            <div className="space-y-2 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Open Daily: 11:30 AM – 11:30 PM</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>FIDS Indian Restaurant, Indiranagar 100ft Road, Bengaluru - 560038</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>+91 98765 43210</span>
              </div>
            </div>
          </div>

          {/* Col 4: Trust Badge */}
          <div className="space-y-3 bg-stone-900 p-5 rounded-2xl border border-stone-800 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>GPay UPI &amp; Instant Ticketing</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed font-light">
              Enjoy direct online order placement with GPay QR support, pure veg and non-veg dietary certifications, and real-time live kitchen tracking.
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} FIDS Authentic Indian Cuisine. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="text-amber-400 font-bold">Node.js Express + React + Gemini &amp; OpenAI AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

