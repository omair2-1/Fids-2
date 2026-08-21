import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, ChefHat, Bike, MapPin, RefreshCw, Bot, Phone, AlertCircle, ShoppingBag } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderTrackerProps {
  currentOrder: Order | null;
  onOpenChatWithQuery?: (query: string) => void;
  isChatEnabled?: boolean;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ currentOrder, onOpenChatWithQuery, isChatEnabled = true }) => {
  const [searchId, setSearchId] = useState(currentOrder ? currentOrder.id : '');
  const [activeOrder, setActiveOrder] = useState<Order | null>(currentOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Fetch order by ID
  const fetchOrder = async (idToFetch: string) => {
    if (!idToFetch.trim()) return;
    setIsLoading(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/orders/${idToFetch.trim()}`);
      const data = await res.json();
      if (data.success && data.order) {
        setActiveOrder(data.order);
      } else {
        setSearchError(`Order "${idToFetch}" not found. Double-check the Order ID from your confirmation.`);
      }
    } catch (err) {
      setSearchError('Error fetching order status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrder) {
      setActiveOrder(currentOrder);
      setSearchId(currentOrder.id);
    }
  }, [currentOrder]);

  // Status now only changes via the kitchen/admin dashboard (protected by admin login).
  // Customers refresh to see the latest real status instead of being able to set it themselves.
  const refreshActiveOrder = async () => {
    if (!activeOrder) return;
    await fetchOrder(activeOrder.id);
  };

  const getStatusStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Preparing': return 1;
      case 'Ready': return 2;
      case 'Out for Delivery': return 3;
      case 'Delivered': return 4;
      default: return 0;
    }
  };

  const currentStepIndex = activeOrder ? getStatusStepIndex(activeOrder.status) : 0;

  const steps = [
    { title: 'Order Placed', desc: 'Received at FIDS', icon: ShoppingBag },
    { title: 'Preparing', desc: 'Chef cooking fresh', icon: ChefHat },
    { title: 'Quality Ready', desc: 'Packed & inspected', icon: CheckCircle2 },
    { title: 'Out for Delivery', desc: 'Delivery partner assigned', icon: Bike },
    { title: 'Delivered', desc: 'Enjoy your meal!', icon: MapPin },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header & Search */}
      <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 shadow-2xl space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">FIDS Live Order Tracker</h1>
            <p className="text-xs text-amber-400 font-medium mt-1">Real-time status stream directly from our kitchen workflow</p>
          </div>

          {/* Order Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
              <input
                type="text"
                placeholder="Enter Order ID (e.g. ORD-3F9A2B1C)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrder(searchId)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => fetchOrder(searchId)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-black text-xs hover:bg-amber-400 transition-colors shrink-0 shadow-md shadow-amber-500/20"
            >
              {isLoading ? 'Searching...' : 'Track Order'}
            </button>
          </div>
        </div>

        {searchError && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Main Tracking Details */}
      {activeOrder && (
        <div className="bg-stone-900 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden">
          
          {/* Status Header Banner */}
          <div className="p-6 bg-stone-950 text-white flex flex-wrap items-center justify-between gap-4 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-amber-400">#{activeOrder.id}</span>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${
                  activeOrder.payment_status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {activeOrder.payment_status} ({activeOrder.payment_method})
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">Placed on {new Date(activeOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {/* Estimated Time Badge */}
            <div className="flex items-center gap-3 bg-stone-900 p-3 rounded-2xl border border-stone-800">
              <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Estimated Prep/Arrival</span>
                <span className="text-base font-black text-amber-400">~{activeOrder.estimated_prep_time} Minutes</span>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="p-6 sm:p-10 border-b border-stone-800 bg-stone-950/50">
            <div className="relative flex justify-between items-center max-w-2xl mx-auto">
              
              {/* Progress Bar Background */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-stone-800 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 z-0 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
              />

              {/* Step Circles */}
              {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const Icon = step.icon;

                return (
                  <div key={step.title} className="relative z-10 flex flex-col items-center group">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                      isCompleted
                        ? 'bg-amber-500 text-stone-950'
                        : isCurrent
                        ? 'bg-amber-400 text-stone-950 ring-4 ring-amber-500/30 scale-110'
                        : 'bg-stone-900 text-stone-600 border border-stone-800'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="text-center mt-2">
                      <span className={`text-xs font-bold block ${isCurrent ? 'text-amber-400' : isCompleted ? 'text-stone-200' : 'text-stone-600'}`}>
                        {step.title}
                      </span>
                      <span className="hidden sm:block text-[10px] text-stone-500 max-w-[90px]">
                        {step.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Controls Bar */}
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Live Kitchen Status</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshActiveOrder}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-black hover:bg-amber-400 shadow-sm transition-colors"
              >
                Refresh Status 🔄
              </button>

              {isChatEnabled && onOpenChatWithQuery && (
                <button
                  onClick={() => onOpenChatWithQuery(`Where is my order #${activeOrder.id}?`)}
                  className="px-3 py-1.5 rounded-lg bg-stone-950 text-amber-400 border border-stone-800 font-bold hover:bg-stone-800 transition-colors flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask FidsBot AI</span>
                </button>
              )}
            </div>
          </div>

          {/* Order Itemized Summary */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Order Items ({activeOrder.items.length})</h3>
              
              <div className="space-y-2">
                {activeOrder.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${it.is_veg ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      <span className="font-bold text-white">{it.name}</span>
                      <span className="text-stone-500">x{it.quantity}</span>
                    </div>
                    <span className="font-extrabold text-amber-400">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-sm font-black text-white">
                <span>Total Payable</span>
                <span className="text-amber-400 text-base">₹{activeOrder.total_amount}</span>
              </div>
            </div>

            {/* Delivery & Customer Info */}
            <div className="space-y-4 bg-stone-950 p-5 rounded-2xl border border-stone-800 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Delivery &amp; Customer Information</h3>

              <div className="space-y-2 text-stone-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-stone-500 shrink-0" />
                  <span><strong className="text-white">{activeOrder.customer_name}</strong> ({activeOrder.customer_phone})</span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <span>{activeOrder.customer_address}</span>
                </div>

                {activeOrder.special_instructions && (
                  <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-300 text-[11px]">
                    <strong>Special Instructions:</strong> {activeOrder.special_instructions}
                  </div>
                )}
              </div>

              {/* Order History Timeline */}
              <div className="pt-3 border-t border-stone-800 space-y-2">
                <h4 className="font-bold text-stone-400 text-[11px] uppercase tracking-wider">Status History Log</h4>
                <div className="space-y-1.5 text-[11px] text-stone-400">
                  {activeOrder.history.map((h, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="font-semibold text-stone-300">• {h.status}: {h.note}</span>
                      <span className="text-stone-500">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

