'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Star, X, ShieldCheck, Heart, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  sitterId: string;
  sitterName: string;
  sitterAvatar?: string;
  onSuccess?: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  sitterId,
  sitterName,
  sitterAvatar,
  onSuccess
}: ReviewModalProps) {
  const supabase = createClient();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a star rating between 1 and 5.');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be signed in to submit a review.');
        return;
      }

      // Insert review into Supabase
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          reviewer_id: user.id,
          reviewee_id: sitterId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already submitted a review for this booking.');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Thank you! Your verified review has been published.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error(err.message || 'Failed to publish review.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5: return '⭐⭐⭐⭐⭐ Exceptional Care!';
      case 4: return '⭐⭐⭐⭐ Great Experience!';
      case 3: return '⭐⭐⭐ Good Service';
      case 2: return '⭐⭐ Fair Care';
      case 1: return '⭐ Unsatisfactory';
      default: return 'Select your rating';
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-500">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h3 className="font-display text-lg font-black text-heading dark:text-white">Rate Your Caregiver</h3>
              <p className="text-[10px] text-stone-400 font-medium">Verified Parent Booking Review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sitter Info Header */}
        <div className="flex items-center gap-3.5 p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-150 dark:border-slate-700">
          <img
            src={sitterAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
            alt={sitterName}
            className="w-11 h-11 rounded-xl object-cover border border-stone-200 dark:border-slate-700"
          />
          <div>
            <h4 className="font-bold text-sm text-heading dark:text-white flex items-center gap-1">
              {sitterName}
              <ShieldCheck className="h-4 w-4 text-primary" />
            </h4>
            <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Completed Booking
            </span>
          </div>
        </div>

        {/* Interactive Star Rating Selector */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">
              {getRatingLabel(currentDisplayRating)}
            </label>
            <div className="flex justify-center items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-stone-300 dark:text-slate-700 hover-scale focus:outline-none transition-transform"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= currentDisplayRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Written Review Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              Share details of your experience (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Was the sitter punctual, attentive, engaging, or communicative? Your feedback helps other parents in the community!"
              className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Submit Controls */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing Review...
                </>
              ) : (
                'Submit Verified Review'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-stone-50 dark:hover:bg-slate-800 active-press"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
