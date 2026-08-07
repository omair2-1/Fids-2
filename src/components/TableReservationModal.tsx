import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Sparkles, CheckCircle2, Phone, Mail, User, Utensils } from 'lucide-react';
import { TableReservation } from '../types';

interface TableReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReservationCreated?: (res: TableReservation) => void;
}

export const TableReservationModal: React.FC<TableReservationModalProps> = ({
  isOpen,
  onClose,
  onReservationCreated
}) => {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('19:30');
  const [guestsCount, setGuestsCount] = useState(2);
  const [tablePreference, setTablePreference] = useState('Main Dining Hall - Candlelight');
  const [specialOccasion, setSpecialOccasion] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedRes, setConfirmedRes] = useState<TableReservation | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone || !date || !time) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          guest_phone: guestPhone,
          guest_email: guestEmail,
          date,
          time,
          guests_count: guestsCount,
          table_preference: tablePreference,
          special_occasion: specialOccasion
        })
      });

      const data = await response.json();
      if (data.success && data.reservation) {
        setConfirmedRes(data.reservation);
        if (onReservationCreated) onReservationCreated(data.reservation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-amber-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-stone-100 relative overflow-hidden">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-wide">FIDS Table Reservation</h2>
              <p className="text-xs text-amber-400 font-medium">Reserve a fine dining experience</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedRes ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Table Reserved at FIDS!</h3>
              <p className="text-xs text-stone-400 mt-1">Reservation ID: <strong className="text-amber-400">{confirmedRes.id}</strong></p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">Guest Name:</span>
                <span className="font-bold text-stone-200">{confirmedRes.guest_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Date &amp; Time:</span>
                <span className="font-bold text-amber-400">{confirmedRes.date} at {confirmedRes.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Party Size:</span>
                <span className="font-bold text-stone-200">{confirmedRes.guests_count} Guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Table Area:</span>
                <span className="font-bold text-stone-200">{confirmedRes.table_preference}</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-400">We have sent a SMS confirmation to {confirmedRes.guest_phone}. See you soon at FIDS!</p>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Done &amp; Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 font-bold mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="text"
                    required
                    placeholder="Rahul Sharma"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">Mobile Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-stone-400 font-bold mb-1">Date *</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-3 text-amber-500" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-2 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">Time *</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-2.5 top-3 text-amber-500" />
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-2 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 text-[11px]"
                  >
                    {['12:30', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => (
                      <option key={t} value={t}>{t} IST</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">Guests *</label>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-3 text-amber-500" />
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-2 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 text-[11px]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-stone-400 font-bold mb-1">Seating Atmosphere Preference</label>
              <select
                value={tablePreference}
                onChange={(e) => setTablePreference(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Main Dining Hall - Candlelight">Main Dining Hall - Candlelight</option>
                <option value="Outdoor Garden Terrace">Outdoor Garden Terrace</option>
                <option value="Private VIP Dining Room">Private VIP Dining Room</option>
                <option value="Near Tandoori Open Kitchen">Near Tandoori Live Kitchen</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-400 font-bold mb-1">Special Request or Occasion (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Birthday surprise, high chair for infant, extra mild spice..."
                value={specialOccasion}
                onChange={(e) => setSpecialOccasion(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold text-xs hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Confirming Table...' : 'Confirm Table Reservation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
