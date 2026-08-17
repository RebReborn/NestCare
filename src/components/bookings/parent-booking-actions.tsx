'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { toast } from 'sonner';

export function ParentBookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [cancelling, setCancelling] = useState(false);

  const executeCancel = async () => {
    try {
      setCancelling(true);
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking request cancelled successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancel = () => {
    toast.warning('Cancel Booking Request?', {
      description: 'Are you sure you want to cancel this booking request? This action cannot be undone.',
      action: {
        label: 'Yes, Cancel',
        onClick: () => executeCancel(),
      },
      cancel: {
        label: 'Keep Booking',
        onClick: () => {},
      },
      duration: 8000,
    });
  };

  return (
    <button
      onClick={handleCancel}
      disabled={cancelling}
      className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold active-press transition-colors flex items-center justify-center gap-1"
    >
      {cancelling ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <Trash2 className="h-3.5 w-3.5" /> Cancel Request
        </>
      )}
    </button>
  );
}
