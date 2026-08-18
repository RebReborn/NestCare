'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, PlusCircle, User, ShieldAlert, CreditCard, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BookingTimelineProps {
  bookingId: string;
}

export function BookingTimeline({ bookingId }: BookingTimelineProps) {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('booking_timeline_events')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error('[Timeline Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-stone-400 flex items-center justify-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading timeline history...
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-stone-400 italic">
        No recorded timeline events for this booking.
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h4 className="font-extrabold text-xs text-stone-500 uppercase tracking-wider">
        Booking Activity Audit Timeline
      </h4>
      <div className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-3 space-y-3 pl-4">
        {events.map((ev) => {
          const date = new Date(ev.created_at);
          return (
            <div key={ev.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white dark:border-stone-900 group-hover:scale-125 transition-transform" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    {ev.event_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                  {ev.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
