'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert, DollarSign, Loader2, UserCheck, PlusCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ActiveBookingTrackerProps {
  booking: any;
  userRole: 'parent' | 'sitter' | 'admin';
  onUpdate?: () => void;
}

export function ActiveBookingTracker({ booking, userRole, onUpdate }: ActiveBookingTrackerProps) {
  const supabase = createClient();

  const scheduledEnd = new Date(booking.scheduled_end || booking.end_time);
  const extensionMins = Number(booking.extension_minutes) || 0;
  const effectiveScheduledEnd = new Date(scheduledEnd.getTime() + extensionMins * 60000);

  const [now, setNow] = useState(new Date());
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);
  const [customMinutesInput, setCustomMinutesInput] = useState('');
  const [submittingExtension, setSubmittingExtension] = useState(false);

  // Authorized pickup state
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupName, setPickupName] = useState(booking.authorized_pickup_person?.name || '');
  const [pickupRel, setPickupRel] = useState(booking.authorized_pickup_person?.relationship || '');
  const [pickupPhone, setPickupPhone] = useState(booking.authorized_pickup_person?.phone || '');
  const [savingPickup, setSavingPickup] = useState(false);

  // ETA update state
  const [etaNote, setEtaNote] = useState('');
  const [submittingEta, setSubmittingEta] = useState(false);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diffMs = effectiveScheduledEnd.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const overdueMins = isOverdue ? Math.floor(Math.abs(diffMs) / 60000) : 0;
  const overdueSecs = isOverdue ? Math.floor((Math.abs(diffMs) % 60000) / 1000) : 0;

  const remainingMins = !isOverdue ? Math.floor(diffMs / 60000) : 0;
  const remainingSecs = !isOverdue ? Math.floor((diffMs % 60000) / 1000) : 0;

  // Snapshot rate calculation preview
  const hourlyRateCents = Math.round(Number(booking.hourly_rate) * 100);
  const effectiveExtendMins = customMinutesInput ? Number(customMinutesInput) : extendMinutes;
  const estimatedSubtotalCents = Math.round((hourlyRateCents * effectiveExtendMins) / 60);
  const estimatedPlatformFeeCents = Math.max(200, Math.round(estimatedSubtotalCents * 0.10));
  const estimatedTaxCents = Math.round((estimatedSubtotalCents + estimatedPlatformFeeCents) * 0.05);
  const estimatedTotalCents = estimatedSubtotalCents + estimatedPlatformFeeCents + estimatedTaxCents;

  const handleRequestExtension = async () => {
    try {
      setSubmittingExtension(true);
      const res = await fetch('/api/bookings/extensions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          additionalMinutes: effectiveExtendMins,
          idempotencyKey: `ext_req_${booking.id}_${effectiveExtendMins}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request extension');

      toast.success(`Extension request for +${effectiveExtendMins} mins sent to caregiver!`);
      setShowExtendModal(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingExtension(false);
    }
  };

  const handleSavePickupPerson = async () => {
    try {
      setSavingPickup(true);
      const pickupObj = { name: pickupName, relationship: pickupRel, phone: pickupPhone };
      const { error } = await supabase
        .from('bookings')
        .update({ authorized_pickup_person: pickupObj })
        .eq('id', booking.id);

      if (error) throw error;
      toast.success('Authorized pickup person updated!');
      setShowPickupModal(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPickup(false);
    }
  };

  const handleSendEta = async (note: string) => {
    try {
      setSubmittingEta(true);
      const res = await fetch('/api/bookings/late-pickup/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          action: 'update_eta',
          etaNote: note,
        }),
      });
      if (!res.ok) throw new Error('Failed to update ETA');
      toast.success(`ETA updated: "${note}"`);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingEta(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* 1. Countdown Status Card */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isOverdue 
          ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50' 
          : remainingMins <= 30 
          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50'
          : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isOverdue ? 'bg-rose-500 text-white' : remainingMins <= 30 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
            }`}>
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {isOverdue ? '⚠️ Pickup Overdue' : 'Active Care Session'}
              </p>
              <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Scheduled End: {effectiveScheduledEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {extensionMins > 0 && <span className="ml-1.5 text-xs text-emerald-600 font-bold">(+{extensionMins}m Ext)</span>}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-lg font-black font-mono ${
              isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-stone-800 dark:text-stone-200'
            }`}>
              {isOverdue ? `+${overdueMins}m ${overdueSecs}s` : `${remainingMins}m ${remainingSecs}s`}
            </div>
            <p className="text-[10px] font-medium text-stone-500">
              {isOverdue ? 'Overdue Elapsed' : 'Time Remaining'}
            </p>
          </div>
        </div>

        {/* Reminders & Quick Actions */}
        {userRole === 'parent' && (
          <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
            {isOverdue ? (
              <div className="w-full space-y-2">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Your booking ended at {effectiveScheduledEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Caregiver is continuing care.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSendEta('On my way — arriving in 5 mins')}
                    disabled={submittingEta}
                    className="px-2.5 py-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors"
                  >
                    On my way (5 mins)
                  </button>
                  <button
                    onClick={() => handleSendEta('On my way — arriving in 15 mins')}
                    disabled={submittingEta}
                    className="px-2.5 py-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors"
                  >
                    On my way (15 mins)
                  </button>
                  <button
                    onClick={() => setShowExtendModal(true)}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-emerald-800 active-press transition-colors flex items-center gap-1 ml-auto"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Request Extension
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {remainingMins <= 30 ? '⏰ Need extra time for pickup?' : 'Care in progress.'}
                </p>
                <button
                  onClick={() => setShowExtendModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl active-press transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Extend Booking
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Authorized Pickup Person Card */}
      <div className="p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-emerald-600" />
          <div>
            <span className="font-bold text-stone-700 dark:text-stone-300">Authorized Pickup: </span>
            <span className="text-stone-900 dark:text-stone-100 font-semibold">
              {booking.authorized_pickup_person?.name ? (
                `${booking.authorized_pickup_person.name} (${booking.authorized_pickup_person.relationship})`
              ) : (
                'Parent (Account Holder)'
              )}
            </span>
          </div>
        </div>
        {userRole === 'parent' && (
          <button
            onClick={() => setShowPickupModal(true)}
            className="text-primary font-bold hover:underline text-xs"
          >
            {booking.authorized_pickup_person?.name ? 'Edit' : '+ Add Person'}
          </button>
        )}
      </div>

      {/* 3. Extension Request Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Request Booking Extension
              </h3>
              <button onClick={() => setShowExtendModal(false)} className="text-stone-400 hover:text-stone-600 font-bold">✕</button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              Select additional care duration. Pricing will be calculated based on your original booking's snapshot rate (${(hourlyRateCents / 100).toFixed(2)}/hr).
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => { setExtendMinutes(mins); setCustomMinutesInput(''); }}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    !customMinutesInput && extendMinutes === mins
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                  }`}
                >
                  +{mins} min
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-500 uppercase">Or Custom Minutes:</label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
              />
            </div>

            {/* Price Preview */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-1 text-xs">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Subtotal (+{effectiveExtendMins} mins):</span>
                <span>${(estimatedSubtotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Platform Fee & Tax:</span>
                <span>${((estimatedPlatformFeeCents + estimatedTaxCents) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-900 dark:text-emerald-200 pt-1 border-t border-emerald-200/60 dark:border-emerald-800">
                <span>Estimated Additional Charge:</span>
                <span>${(estimatedTotalCents / 100).toFixed(2)} CAD</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExtendModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestExtension}
                disabled={submittingExtension}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 active-press transition-colors flex items-center gap-1.5"
              >
                {submittingExtension ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send Extension Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Authorized Pickup Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2 border-stone-100 dark:border-stone-800">
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Authorized Pickup Person
              </h3>
              <button onClick={() => setShowPickupModal(false)} className="text-stone-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              Specify who will pick up your child. The caregiver will verify identity upon checkout.
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase">Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase">Relationship to Child:</label>
                <input
                  type="text"
                  placeholder="e.g. Father, Aunt, Family Friend"
                  value={pickupRel}
                  onChange={(e) => setPickupRel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase">Contact Phone:</label>
                <input
                  type="tel"
                  placeholder="e.g. (555) 019-2834"
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPickupModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePickupPerson}
                disabled={savingPickup}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 active-press transition-colors"
              >
                {savingPickup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Pickup Person'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
