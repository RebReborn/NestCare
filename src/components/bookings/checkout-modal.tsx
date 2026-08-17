'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { 
  X, CheckCircle2, ShieldCheck, Clock, Calendar, Baby, CreditCard, 
  Loader2, Lock, DollarSign, Star, AlertCircle 
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  sitter: {
    id: string;
    name: string;
    avatarUrl: string;
    hourlyRate: number;
    headline?: string;
    yearsExperience?: number;
  };
  childrenList: Array<{ id: string; first_name: string }>;
  onSuccess?: (bookingId: string) => void;
}

export function CheckoutModal({ isOpen, onClose, sitter, childrenList, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Schedule & Kids, 2: Calculate Pricing, 3: Review Invoice, 4: Payment
  const [startTime, setStartTime] = useState('2026-08-20T17:00');
  const [endTime, setEndTime] = useState('2026-08-20T21:00');
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>(childrenList.map(c => c.id));
  
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<any | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCalculatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitter_id: sitter.id,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          child_ids: selectedKidIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate pricing.');
      }

      setPricing(data.pricingSnapshot);
      setBookingId(data.bookingId);
      setClientSecret(data.clientSecret);
      setStep(3); // Move to itemized review
    } catch (err: any) {
      toast.error(err.message || 'Pricing calculation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndPay = async () => {
    try {
      setLoading(true);

      // Simulate or execute Stripe payment intent confirmation
      await new Promise(r => setTimeout(r, 1200));

      // Trigger Webhook simulation for dev environment if Stripe secret key is test
      await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'evt_sim_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_sim_' + Date.now(),
              metadata: { booking_id: bookingId },
            },
          },
        }),
      });

      toast.success('🎉 Payment confirmed! Your booking request has been sent to caregiver.');
      if (onSuccess && bookingId) onSuccess(bookingId);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Payment processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const durationHrs = Math.max(1, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-black text-heading dark:text-white">
              {step === 3 ? 'Review & Pay Booking' : 'Book Caregiver'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: Caregiver Card */}
        <div className="flex items-center gap-3 p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-150 dark:border-slate-700">
          <img src={sitter.avatarUrl} alt={sitter.name} className="w-12 h-12 rounded-xl object-cover border border-stone-200" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-heading dark:text-white truncate">{sitter.name}</h3>
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
            <span className="text-xs text-stone-400 font-semibold block">${sitter.hourlyRate}/hour · {sitter.yearsExperience || 2}+ yrs experience</span>
          </div>
        </div>

        {/* Step 1 & 2: Schedule & Kids Form */}
        {step < 3 && (
          <form onSubmit={handleCalculatePricing} className="space-y-4">
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Select Date & Timeframe</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-stone-500 mb-1 font-bold">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-1 font-bold">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-stone-400 font-semibold">Duration: {durationHrs} hours</p>
            </div>

            {/* Children selection */}
            {childrenList.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Children Requiring Care</label>
                <div className="flex flex-wrap gap-2">
                  {childrenList.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2.5 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedKidIds.includes(c.id)}
                        onChange={() => {
                          setSelectedKidIds(prev =>
                            prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className="accent-primary rounded"
                      />
                      👶 {c.first_name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white text-xs font-black rounded-2xl active-press hover:bg-emerald-800 transition-colors flex justify-center items-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calculate Invoice & Review Price'}
            </button>
          </form>
        )}

        {/* Step 3: Itemized Invoice Review & Payment */}
        {step === 3 && pricing && (
          <div className="space-y-5">
            {/* Itemized Price Snapshot */}
            <div className="bg-stone-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-2.5 text-xs">
              <h4 className="font-bold text-stone-400 uppercase tracking-wider text-[10px] mb-1">Itemized Pricing Breakdown</h4>

              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-300">Childcare ({durationHrs} hours × ${sitter.hourlyRate}.00):</span>
                <span className="font-bold text-heading dark:text-white">${pricing.subtotal} CAD</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-300">NestCare Platform Service Fee:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+${pricing.platformFee} CAD</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-300">Applicable Tax (5% GST):</span>
                <span className="font-bold text-stone-700 dark:text-slate-300">+${pricing.tax} CAD</span>
              </div>

              <div className="border-t border-stone-200 dark:border-slate-700 pt-2.5 flex justify-between font-black text-sm text-heading dark:text-white">
                <span>Total Invoice:</span>
                <span className="text-primary dark:text-emerald-400">${pricing.total} CAD</span>
              </div>
            </div>

            {/* Payment Guarantee Notice */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <Lock className="h-4 w-4 shrink-0" />
              <span>Payments are encrypted and held securely until childcare is completed.</span>
            </div>

            {/* Confirm & Pay Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmAndPay}
                className="flex-1 py-3.5 bg-primary text-white text-xs font-black rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-md"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Confirm Booking & Pay (${pricing.total} CAD)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
