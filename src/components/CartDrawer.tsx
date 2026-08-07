import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, CreditCard, ShoppingBag, ArrowRight, CheckCircle2, ShieldCheck, MapPin, Phone, User, Utensils, AlertCircle, QrCode, Sparkles } from 'lucide-react';
import { CartItem, Order } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}) => {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | 'dine_in'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'GPay / PhonePe (UPI)' | 'Credit / Debit Card' | 'Cash on Delivery'>('GPay / PhonePe (UPI)');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrderSummary, setCreatedOrderSummary] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Pricing calculations
  const itemTotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const deliveryFee = deliveryType === 'delivery' ? (itemTotal > 500 ? 0 : 40) : 0;
  const taxesAndCharges = Math.round(itemTotal * 0.05); // 5% GST
  const grandTotal = itemTotal + deliveryFee + taxesAndCharges;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 8) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }
    if (deliveryType === 'delivery' && !customerAddress.trim()) {
      setErrorMessage('Please enter your complete delivery address.');
      return;
    }
    if (deliveryType === 'dine_in' && !tableNumber.trim()) {
      setErrorMessage('Please specify your table number.');
      return;
    }

    setShowPaymentModal(true);
  };

  const processFinalOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const orderPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: deliveryType === 'dine_in' ? `FIDS Table #${tableNumber}` : (deliveryType === 'pickup' ? 'Self Pickup at FIDS' : customerAddress),
        delivery_type: deliveryType,
        table_number: tableNumber,
        items: cart.map(c => ({
          menu_item_id: c.menuItem.id,
          quantity: c.quantity,
          price: c.menuItem.price,
          notes: c.specialNotes || ''
        })),
        payment_method: paymentMethod,
        special_instructions: specialInstructions
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCreatedOrderSummary(data.order);
        onClearCart();
        setShowPaymentModal(false);
      } else {
        setErrorMessage(data.error || 'Failed to place order. Please try again.');
        setShowPaymentModal(false);
      }
    } catch (err: any) {
      setErrorMessage('Network connection error while placing order.');
      setShowPaymentModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex justify-end">
      <div className="relative w-full max-w-lg bg-stone-900 text-stone-100 h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-amber-500/30">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold flex items-center justify-center text-lg">
              🛒
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Your FIDS Order Cart</h2>
              <p className="text-xs text-amber-400 font-medium">{cart.length} item type(s)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Success State */}
        {createdOrderSummary ? (
          <div className="p-8 my-auto text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Order Confirmed #{createdOrderSummary.id}
              </span>
              <h3 className="text-2xl font-black text-white">Dhanyawad, {createdOrderSummary.customer_name}!</h3>
              <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                Your order has been sent directly to the FIDS kitchen. Estimated prep &amp; fulfillment time is ~{createdOrderSummary.estimated_prep_time} mins.
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left text-xs space-y-2">
              <div className="flex justify-between font-bold text-stone-200">
                <span>Total Amount:</span>
                <span className="text-amber-400">₹{createdOrderSummary.total_amount}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Payment Mode:</span>
                <span className="text-stone-200 font-bold">{createdOrderSummary.payment_method}</span>
              </div>
              {createdOrderSummary.payment_transaction_id && (
                <div className="flex justify-between text-stone-400">
                  <span>Txn Ref:</span>
                  <span className="font-mono text-amber-400">{createdOrderSummary.payment_transaction_id}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const ord = createdOrderSummary;
                setCreatedOrderSummary(null);
                onClose();
                onOrderCreated(ord);
              }}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-sm hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Track Live Order Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : cart.length === 0 ? (
          /* Empty Cart State */
          <div className="p-12 my-auto text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-2xl border border-stone-700">
              🥘
            </div>
            <h3 className="text-lg font-bold text-white">Your cart is currently empty</h3>
            <p className="text-xs text-stone-400 max-w-xs mx-auto">
              Explore our vegetarian and non-vegetarian appetizers, rich gravies, tandoori breads, and saffron desserts.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Browse FIDS Menu
            </button>
          </div>
        ) : (
          /* Cart Content & Checkout Form */
          <div className="p-5 space-y-6 flex-1">
            
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">Selected Delicacies</h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.map(({ menuItem, quantity, specialNotes }) => (
                  <div
                    key={menuItem.id}
                    className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={menuItem.image_url}
                        alt={menuItem.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-800"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${menuItem.is_veg ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                          <h4 className="font-bold text-stone-100 text-xs">{menuItem.name}</h4>
                        </div>
                        <span className="text-xs text-amber-400 font-extrabold">₹{menuItem.price * quantity}</span>
                        {specialNotes && (
                          <p className="text-[10px] text-stone-400 italic line-clamp-1">Note: {specialNotes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-stone-900 border border-stone-800 rounded-lg p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(menuItem.id, -1)}
                          className="p-1 text-stone-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-xs text-amber-400">{quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(menuItem.id, 1)}
                          className="p-1 text-stone-400 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(menuItem.id)}
                        className="p-1.5 text-stone-500 hover:text-rose-400 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Type Selector */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">Order Fulfillment Mode</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    deliveryType === 'delivery'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Home Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('dine_in')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    deliveryType === 'dine_in'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                  }`}
                >
                  <Utensils className="w-4 h-4 text-amber-400" />
                  <span>Dine-In Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    deliveryType === 'pickup'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Self Pickup</span>
                </button>
              </div>
            </div>

            {/* Customer Details Form */}
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">Guest Contact Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {deliveryType === 'delivery' && (
                <textarea
                  required
                  placeholder="Complete Delivery Address (House/Flat No, Apartment, Street, Landmark) *"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              )}

              {deliveryType === 'dine_in' && (
                <input
                  type="text"
                  required
                  placeholder="Table Number (e.g. Table #4) *"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              )}

              {/* Payment Method */}
              <div className="space-y-2 pt-1">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">Payment Method</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'GPay / PhonePe (UPI)', label: '⚡ GPay / PhonePe (Instant UPI)' },
                    { id: 'Credit / Debit Card', label: '💳 Credit / Debit Card' },
                    { id: 'Cash on Delivery', label: '💵 Cash / Pay at Table' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        paymentMethod === pm.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <input
                type="text"
                placeholder="Kitchen notes (e.g. Extra mild spice, no onions in raita)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </form>

            {/* Bill Summary */}
            <div className="bg-stone-950 text-stone-300 p-4 rounded-2xl border border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Food Items Total</span>
                <span>₹{itemTotal}</span>
              </div>

              <div className="flex justify-between text-stone-400">
                <span>Delivery Charge {itemTotal > 500 && deliveryType === 'delivery' ? '(Free over ₹500)' : ''}</span>
                <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
              </div>

              <div className="flex justify-between text-stone-400">
                <span>GST &amp; Packaging (5%)</span>
                <span>₹{taxesAndCharges}</span>
              </div>

              <div className="pt-2 border-t border-stone-800 flex justify-between font-black text-sm text-amber-400">
                <span>Total Amount Payable</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Footer Checkout Action */}
        {!createdOrderSummary && cart.length > 0 && (
          <div className="p-4 border-t border-stone-800 bg-stone-950 sticky bottom-0 z-10">
            <button
              type="submit"
              form="checkout-form"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold text-sm hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Pay ₹{grandTotal} ({paymentMethod.split(' ')[0]})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-stone-400 text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secure FIDS Checkout • Instant Kitchen Ticketing</span>
            </p>
          </div>
        )}
      </div>

      {/* GPay / UPI Interactive Payment Simulation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-amber-500/40 text-stone-100 relative">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="font-extrabold text-sm text-white">FIDS GPay / UPI Checkout</span>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center space-y-2">
              <span className="text-xs text-stone-400 font-medium">Paying To: FIDS Indian Cuisine</span>
              <div className="text-3xl font-black text-amber-400">₹{grandTotal}</div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full inline-block border border-amber-500/30">
                Mode: {paymentMethod}
              </span>

              {/* Simulated GPay QR Code display */}
              {paymentMethod.includes('GPay') && (
                <div className="pt-2 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-inner border border-stone-300 flex flex-col items-center">
                    <QrCode className="w-24 h-24 text-stone-900" />
                    <span className="text-[9px] text-stone-600 font-mono mt-1">UPI ID: fids@okicici</span>
                  </div>
                  <span className="text-[10px] text-amber-400 mt-2 font-medium">Scan with Google Pay, PhonePe, or Paytm</span>
                </div>
              )}
            </div>

            <div className="text-xs text-stone-400 space-y-1">
              <p>• Guest: <span className="text-stone-200 font-bold">{customerName}</span> ({customerPhone})</p>
              <p>• Delivery: <span className="text-stone-200 capitalize font-bold">{deliveryType}</span></p>
            </div>

            <button
              onClick={processFinalOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-stone-950 font-black text-xs hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Authorizing GPay UPI Transaction...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate Successful Payment (₹{grandTotal})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

