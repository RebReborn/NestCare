'use client';

import { useState } from 'react';
import { Star, X, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ReviewModalProps {
  bookingId: string;
  sitterId: string;
  sitterName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ bookingId, sitterId, sitterName, onClose, onSuccess }: ReviewModalProps) {
  const supabase = createClient();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to leave a review.');

      const { error: insertErr } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          reviewer_id: user.id,
          reviewee_id: sitterId,
          rating,
          comment: comment.trim() || null,
        });

      if (insertErr) throw insertErr;

      toast.success('Thank you! Your review has been published.');
      onSuccess();
    } catch (err: any) {
      if (err.code === '23505') {
        const msg = 'You have already submitted a review for this booking.';
        setError(msg);
        toast.error(msg);
      } else {
        const msg = err.message || 'Failed to submit review. Try again.';
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-base font-black text-heading">Rate Sitter</h3>
            <p className="text-xs text-stone-400 mt-1">Share your experience with {sitterName}.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Stars Selector */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Your Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isLit = hoverRating !== null ? starValue <= hoverRating : starValue <= rating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-stone-300 hover:scale-110 active:scale-95 transition-all outline-none"
                  >
                    <Star 
                      className={`h-9 w-9 stroke-amber-400 ${
                        isLit ? 'text-amber-400 fill-amber-400' : 'text-stone-250 fill-none'
                      }`} 
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-1">
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Disappointing' : 'Very Poor'}
            </span>
          </div>

          {/* Comment description */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Written Review (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Tell other parents about the sitter's care, schedule reliability, emergency responses..."
              className="w-full p-4 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 border border-stone-200 text-stone-700 text-xs font-bold rounded-2xl active-press hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
