'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { toast } from 'sonner';

export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState<'accept' | 'decline' | null>(null);

  const handleUpdate = async (status: 'accepted' | 'declined', action: 'accept' | 'decline') => {
    try {
      setUpdating(action);
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success(status === 'accepted' ? 'Booking request accepted!' : 'Booking request declined');

      // Dispatch async email notification to parent
      fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_status',
          recipientId: bookingId, // API looks up booking details
          payload: { status, sitterName: 'Sitter', bookingDate: 'Scheduled Date' },
        }),
      }).catch(e => console.warn('[Email Trigger Error]:', e));

      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update booking status.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex gap-2 w-full">
      <button
        onClick={() => handleUpdate('declined', 'decline')}
        disabled={updating !== null}
        className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 active-press transition-colors flex items-center justify-center gap-1"
      >
        {updating === 'decline' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <X className="h-3.5 w-3.5" /> Decline
          </>
        )}
      </button>
      <button
        onClick={() => handleUpdate('accepted', 'accept')}
        disabled={updating !== null}
        className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 active-press transition-colors flex items-center justify-center gap-1"
      >
        {updating === 'accept' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Check className="h-3.5 w-3.5" /> Accept Request
          </>
        )}
      </button>
    </div>
  );
}
