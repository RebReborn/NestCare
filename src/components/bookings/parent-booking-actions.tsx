'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Star, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ReviewModal } from '@/components/reviews/review-modal';

interface ParentBookingActionsProps {
  bookingId: string;
  bookingStatus?: string;
  sitterId?: string;
  sitterName?: string;
  sitterAvatar?: string;
}

export function ParentBookingActions({ 
  bookingId,
  bookingStatus = 'pending',
  sitterId,
  sitterName = 'Caregiver',
  sitterAvatar
}: ParentBookingActionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [checkingReview, setCheckingReview] = useState(false);

  useEffect(() => {
    async function checkExistingReview() {
      if (bookingStatus !== 'completed') return;
      try {
        setCheckingReview(true);
        const { data } = await supabase
          .from('reviews')
          .select('id, rating, comment')
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (data) {
          setExistingReview(data);
        }
      } catch (err) {
        console.error('Error checking existing review:', err);
      } finally {
        setCheckingReview(false);
      }
    }

    checkExistingReview();
  }, [bookingId, bookingStatus]);

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

  if (bookingStatus === 'completed') {
    if (checkingReview) {
      return (
        <div className="w-full py-2 flex justify-center text-xs text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin text-primary mr-1.5" /> Checking review status...
        </div>
      );
    }

    if (existingReview) {
      return (
        <div className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>You rated {existingReview.rating} ⭐ — Verified Review</span>
        </div>
      );
    }

    return (
      <>
        <button
          onClick={() => setShowReviewModal(true)}
          className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs font-extrabold active-press transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
          <span>Rate Sitter & Write Review</span>
        </button>

        {sitterId && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            bookingId={bookingId}
            sitterId={sitterId}
            sitterName={sitterName}
            sitterAvatar={sitterAvatar}
            onSuccess={() => {
              setExistingReview({ rating: 5 });
              router.refresh();
            }}
          />
        )}
      </>
    );
  }

  return (
    <button
      onClick={handleCancel}
      disabled={cancelling}
      className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 rounded-xl text-xs font-bold active-press transition-colors flex items-center justify-center gap-1 border border-red-100 dark:border-rose-900/50"
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
