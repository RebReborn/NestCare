'use client';

import { useState } from 'react';
import { Clock, ShieldAlert, PhoneCall, CheckCircle, AlertTriangle, DollarSign, Loader2, UserCheck, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SitterCareTrackerProps {
  booking: any;
  onUpdate?: () => void;
}

export function SitterCareTracker({ booking, onUpdate }: SitterCareTrackerProps) {
  const supabase = createClient();
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const scheduledEnd = new Date(booking.scheduled_end || booking.end_time);
  const extensionMins = Number(booking.extension_minutes) || 0;
  const effectiveScheduledEnd = new Date(scheduledEnd.getTime() + extensionMins * 60000);
  const now = new Date();

  const isPastScheduledEnd = now > effectiveScheduledEnd;
  const overdueMins = isPastScheduledEnd ? Math.floor((now.getTime() - effectiveScheduledEnd.getTime()) / 60000) : 0;

  // Rate snapshot for sitter late care earnings display
  const hourlyRateCents = Math.round(Number(booking.hourly_rate) * 100);
  const lateBillableMins = Math.max(0, overdueMins - 10);
  const estimatedSitterLateEarningsCents = Math.round((hourlyRateCents * lateBillableMins) / 60);

  const handleAction = async (action: 'start_care' | 'end_care') => {
    try {
      setSubmittingAction(action);
      const res = await fetch('/api/bookings/late-pickup/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update care status');

      if (action === 'start_care') {
        toast.success('Confirmed! Care session status set to "Care Continuing".');
      } else {
        toast.success(`Care ended! Processed ${data.lateMinutes} billable late minutes.`);
      }

      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="w-full space-y-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600" /> Caregiver Care Dashboard
        </h4>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
          booking.late_pickup_status === 'care_continuing' 
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        }`}>
          {booking.late_pickup_status === 'care_continuing' ? 'Overdue Care Active' : 'Normal Care Window'}
        </span>
      </div>

      {/* Sitter Late Care Action Banner */}
      {isPastScheduledEnd && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Scheduled end passed ({effectiveScheduledEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Current overdue time: <span className="font-mono font-bold">+{overdueMins} mins</span> (Grace period: 10 mins)
              </p>
            </div>
            {lateBillableMins > 0 && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">Late Earnings</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">+${(estimatedSitterLateEarningsCents / 100).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {booking.late_pickup_status !== 'care_continuing' && (
              <button
                onClick={() => handleAction('start_care')}
                disabled={submittingAction !== null}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold active-press transition-colors flex items-center justify-center gap-1"
              >
                {submittingAction === 'start_care' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Still Providing Care'}
              </button>
            )}

            <button
              onClick={() => handleAction('end_care')}
              disabled={submittingAction !== null}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold active-press transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              {submittingAction === 'end_care' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle className="h-3.5 w-3.5" /> Care Ended (Checkout)</>}
            </button>
          </div>
        </div>
      )}

      {/* Authorized Pickup Verification */}
      <div className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-stone-600 dark:text-stone-400">Designated Pickup: </span>
          <span className="font-bold text-stone-900 dark:text-stone-100">
            {booking.authorized_pickup_person?.name 
              ? `${booking.authorized_pickup_person.name} (${booking.authorized_pickup_person.relationship}) - ${booking.authorized_pickup_person.phone}` 
              : 'Parent (Default Account Holder)'}
          </span>
        </div>
      </div>

      {/* Parent ETA Status */}
      {booking.parent_eta_note && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold text-blue-900 dark:text-blue-200">Parent ETA Note: </span>
            <span className="text-blue-800 dark:text-blue-300 font-medium">"{booking.parent_eta_note}"</span>
          </div>
        </div>
      )}

      {/* Safety Escalation Protocol (if >20 mins overdue) */}
      {overdueMins >= 20 && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-extrabold">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            Safety Escalation Protocol Active (&gt;20 mins overdue)
          </div>
          <p className="text-rose-700 dark:text-rose-300 text-[11px]">
            If parent cannot be reached, contact emergency contacts below according to agreed childcare terms. Do not leave children unattended.
          </p>
          <div className="flex gap-2">
            <a
              href={`tel:${booking.parent?.phone || ''}`}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <PhoneCall className="h-3 w-3" /> Call Parent
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
