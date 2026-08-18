'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Calendar, Clock, User, ShieldCheck, Check, DollarSign, AlertCircle, Loader2, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BookingActions } from '@/components/bookings/booking-actions';
import { ParentBookingActions } from '@/components/bookings/parent-booking-actions';
import { ReviewModal } from '@/components/reviews/review-modal';
import { ActiveBookingTracker } from '@/components/bookings/active-booking-tracker';
import { SitterCareTracker } from '@/components/bookings/sitter-care-tracker';
import { BookingTimeline } from '@/components/bookings/booking-timeline';

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const bookSitterId = searchParams.get('bookSitter');

  // Bookings list states
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<any | null>(null);

  // Tab filtering state
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  
  // Booking sheet flow states
  const [sitter, setSitter] = useState<any | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [pickupRequired, setPickupRequired] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [careType, setCareType] = useState<'in_home' | 'school_pickup' | 'daycare_pickup' | 'school_childcare'>('in_home');
  const [pickupSchool, setPickupSchool] = useState('');
  const [pickupTime, setPickupTime] = useState('15:00');
  const [pickupDestination, setPickupDestination] = useState('');
  const [pickupTravelMinutes, setPickupTravelMinutes] = useState(15);
  const [priceBreakdown, setPriceBreakdown] = useState<any | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [inlineAvailabilityError, setInlineAvailabilityError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const handleUpdateStatus = async (bookingId: string, newStatus: 'in_progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Auto-insert a carefeed log entry for the dropoff / pickup event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('care_logs')
          .insert({
            booking_id: bookingId,
            sitter_id: user.id,
            category: 'activity',
            status: newStatus === 'in_progress' ? 'Checked In' : 'Checked Out',
            details: newStatus === 'in_progress' 
              ? 'Child has been dropped off and checked in safely. Start of care session.' 
              : 'Child has been picked up and checked out. End of care session.',
          });
      }

      toast.success(newStatus === 'in_progress' ? 'Child checked in successfully!' : 'Child checked out successfully!');

      // Fire booking lifecycle notification (non-blocking)
      const event = newStatus === 'in_progress' ? 'booking_started' : 'booking_completed';
      fetch('/api/bookings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, event }),
      }).catch(e => console.warn('[Notify]', e));

      
      // Re-fetch bookings client-side
      const { data: updated } = await supabase
        .from('bookings')
        .select(`
          id, status, start_time, end_time, total, hourly_rate, pickup_required, parent_id, sitter_id,
          sitter:profiles!bookings_sitter_id_fkey (display_name, avatar_url),
          parent:profiles!bookings_parent_id_fkey (display_name, avatar_url),
          booking_children (child_id),
          reviews (id)
        `)
        .order('start_time', { ascending: false });
      setBookings(updated || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update booking status.');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingBookings(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUser(user);

        // Fetch bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            start_time,
            end_time,
            scheduled_start,
            scheduled_end,
            actual_start,
            actual_end,
            care_status,
            extension_minutes,
            late_pickup_minutes,
            late_pickup_status,
            parent_eta_note,
            parent_eta_time,
            authorized_pickup_person,
            total,
            hourly_rate,
            pickup_required,
            parent_id,
            sitter_id,
            sitter:profiles!bookings_sitter_id_fkey (
              display_name,
              avatar_url
            ),
            parent:profiles!bookings_parent_id_fkey (
              display_name,
              avatar_url
            ),
            booking_children (
              child_id
            ),
            reviews (
              id
            )
          `)
          .order('start_time', { ascending: false });

        setBookings(bookingsData || []);

        // If trying to book a sitter
        if (bookSitterId) {
          // Fetch Sitter Info
          const { data: sitterData } = await supabase
            .from('profiles')
            .select(`
              id,
              display_name,
              avatar_url,
              sitter_profiles (
                base_hourly_rate_cents,
                additional_child_rate_cents,
                pricing_model,
                minimum_booking_hours,
                max_children
              )
            `)
            .eq('id', bookSitterId)
            .single();

          if (sitterData) {
            const sp: any = sitterData.sitter_profiles;
            const profileDetails = Array.isArray(sp) ? sp[0] : sp;
            setSitter({
              id: sitterData.id,
              name: sitterData.display_name,
              avatar_url: sitterData.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
              hourly_rate: profileDetails?.base_hourly_rate_cents ? Math.round(Number(profileDetails.base_hourly_rate_cents) / 100) : 20,
              additional_child_rate: profileDetails?.additional_child_rate_cents ? Math.round(Number(profileDetails.additional_child_rate_cents) / 100) : 0,
              pricing_model: profileDetails?.pricing_model || 'flat',
              min_hours: profileDetails?.minimum_booking_hours || 1,
              max_children: profileDetails?.max_children || 4,
            });
          }

          // Fetch Parent's children
          const { data: childrenData } = await supabase
            .from('children')
            .select('id, first_name, age_group')
            .eq('parent_id', user.id);

          setChildren(childrenData || []);
        }
      } catch (err) {
        console.error('Error loading bookings page data:', err);
      } finally {
        setLoadingBookings(false);
      }
    }
    loadData();
  }, [bookSitterId]);

  // Trigger availability checks when date or times are updated
  useEffect(() => {
    if (!sitter || !bookingDate || !startTime || !endTime) return;

    const checkAvailabilityInline = async () => {
      try {
        setCheckingAvailability(true);
        setInlineAvailabilityError(null);

        const startIso = new Date(`${bookingDate}T${startTime}:00`).toISOString();
        const endIso = new Date(`${bookingDate}T${endTime}:00`).toISOString();

        const res = await fetch('/api/bookings/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sitter_id: sitter.id,
            start_time: startIso,
            end_time: endIso,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.isBooked) {
          setInlineAvailabilityError(data.error || 'Caregiver is not available during this timeframe.');
        } else {
          setInlineAvailabilityError(null);
        }
      } catch (err: any) {
        console.warn('Inline availability check error:', err);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailabilityInline();
  }, [sitter?.id, bookingDate, startTime, endTime]);

  // Calculate pricing when step 5 is loaded
  useEffect(() => {
    if (step === 5 && sitter && bookingDate) {
      async function fetchCalculatedPrice() {
        try {
          setCalculatingPrice(true);
          setBookingError(null);
          
          const startIso = new Date(`${bookingDate}T${startTime}:00`).toISOString();
          const endIso = new Date(`${bookingDate}T${endTime}:00`).toISOString();

          // Query the pricing calculator route
          const response = await fetch('/api/bookings/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sitter_id: sitter.id,
              start_time: startIso,
              end_time: endIso,
              child_ids: selectedChildren,
            }),
          });

          const resData = await response.json();
          if (!response.ok) {
            throw new Error(resData.error || 'Failed to calculate price.');
          }

          setPriceBreakdown(resData);
        } catch (err: any) {
          setBookingError(err.message || 'Pricing calculation failed.');
        } finally {
          setCalculatingPrice(false);
        }
      }
      fetchCalculatedPrice();
    }
  }, [step, bookingDate, startTime, endTime, sitter]);

  const handleToggleChild = (childId: string) => {
    setSelectedChildren(prev =>
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    );
  };

  const handleCreateBooking = async () => {
    try {
      setSubmittingBooking(true);
      setBookingError(null);

      const startIso = new Date(`${bookingDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${bookingDate}T${endTime}:00`).toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated user.');

      // Check double booking
      const resVal = await fetch('/api/bookings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitter_id: sitter.id,
          start_time: startIso,
          end_time: endIso,
        }),
      });

      const valData = await resVal.json();
      if (!resVal.ok || valData.isBooked) {
        throw new Error(valData.error || 'Sitter is already booked during this timeframe.');
      }

      // Insert booking record (status defaulting to pending)
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          parent_id: user.id,
          sitter_id: sitter.id,
          status: 'pending',
          start_time: startIso,
          end_time: endIso,
          duration_minutes: priceBreakdown.duration_minutes,
          hourly_rate: priceBreakdown.hourly_rate,
          subtotal: priceBreakdown.subtotal,
          platform_fee: priceBreakdown.platform_fee,
          tax: priceBreakdown.tax,
          total: priceBreakdown.total,
          currency: priceBreakdown.currency,
          special_notes: specialNotes || null,
          pickup_required: careType !== 'in_home',
          pickup_location: careType !== 'in_home' ? pickupSchool : null,
          care_type: careType,
          pickup_school: careType !== 'in_home' ? pickupSchool || null : null,
          pickup_time: careType !== 'in_home' ? pickupTime + ':00' || null : null,
          pickup_destination: careType !== 'in_home' ? pickupDestination || null : null,
          pickup_travel_minutes: careType !== 'in_home' ? pickupTravelMinutes : null,
          cancellation_policy_snapshot: 'Free cancellation > 24 hours',
        })
        .select()
        .single();

      if (bookingErr) throw bookingErr;

      // Link booking children
      const bookingChildrenInserts = selectedChildren.map(cId => ({
        booking_id: booking.id,
        child_id: cId,
      }));

      const { error: childLinkErr } = await supabase
        .from('booking_children')
        .insert(bookingChildrenInserts);

      if (childLinkErr) throw childLinkErr;

      // Redirect parent to booking success dashboard or Stripe checkout
      router.push('/dashboard');
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete booking request.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-heading">Bookings</h1>
        <p className="text-sm text-muted-text mt-1">Manage and track your childcare appointments.</p>
      </div>

      {bookSitterId && sitter ? (
        // Booking Multi-step Sheet
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
          {/* Step Progress Line */}
          <div className="flex items-center gap-1.5 mb-5 pb-3 border-b border-stone-100">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary' : 'bg-stone-100'
                }`}
              />
            ))}
            <span className="text-[10px] font-bold text-stone-400 shrink-0 ml-1.5 uppercase">Step {step}/5</span>
          </div>

          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <img src={sitter.avatar_url} alt={sitter.name} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <h3 className="font-bold text-sm text-heading">Book {sitter.name}</h3>
                <span className="text-xs text-stone-400 block">${sitter.hourly_rate}/hr • Min {sitter.min_hours} hrs</span>
              </div>
            </div>
            <button onClick={() => router.push('/bookings')} className="text-xs font-bold text-stone-400 hover:text-stone-700">
              Cancel
            </button>
          </div>

          {bookingError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Steps Content */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-heading">Step 1: Select Date</h4>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 text-sm bg-white"
              />
              <button
                disabled={!bookingDate}
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-heading">Step 2: Start & End Time</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 block uppercase mb-1">Start</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 block uppercase mb-1">End</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-sm bg-white"
                  />
                </div>
              </div>

              {checkingAvailability && (
                <div className="flex items-center gap-1.5 text-xs text-stone-400 py-1 font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Verifying availability calendar settings...</span>
                </div>
              )}

              {inlineAvailabilityError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-[11px] font-semibold flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{inlineAvailabilityError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 font-semibold">
                  Back
                </button>
                <button 
                  disabled={!!inlineAvailabilityError || checkingAvailability || !startTime || !endTime}
                  onClick={() => setStep(3)} 
                  className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-heading">Step 3: Select Children</h4>
              {children.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-stone-400">No children registered on your profile.</p>
                  <button onClick={() => router.push('/profile')} className="text-xs font-bold text-primary">
                    + Add Children Profiles
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {children.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleToggleChild(c.id)}
                      className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all ${
                        selectedChildren.includes(c.id) ? 'border-primary bg-emerald-50/45' : 'border-stone-200'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-sm text-heading block">👶 {c.first_name}</span>
                        <span className="text-[10px] text-stone-400 capitalize">{c.age_group}</span>
                      </div>
                      {selectedChildren.includes(c.id) && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700">
                  Back
                </button>
                <button
                  disabled={selectedChildren.length === 0}
                  onClick={() => setStep(4)}
                  className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-heading">Step 4: Care & Pickup Details</h4>
              <div className="space-y-4 text-xs">
                {/* Care Type Options */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Care Type Selection</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'in_home', label: '🏡 In-home childcare' },
                      { id: 'school_pickup', label: '🎒 School pickup' },
                      { id: 'daycare_pickup', label: '🧸 Daycare pickup' },
                      { id: 'school_childcare', label: '🚌 School + childcare' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCareType(opt.id as any)}
                        className={`p-3 rounded-2xl border text-left font-bold transition-all active-press ${
                          careType === opt.id 
                            ? 'bg-emerald-50 border-primary text-emerald-800 dark:bg-emerald-950/20' 
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {careType !== 'in_home' && (
                  <div className="space-y-3 p-4 bg-emerald-50/40 border border-emerald-100 rounded-3xl animate-fade-in text-xs font-semibold">
                    <h5 className="font-bold text-xs text-emerald-800 uppercase tracking-wider mb-1">Pickup Parameters</h5>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">School / Daycare Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Lincoln Elementary"
                          value={pickupSchool}
                          onChange={(e) => setPickupSchool(e.target.value)}
                          className="w-full p-3 rounded-xl border border-stone-200 bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Pickup Time</label>
                        <input
                          type="time"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full p-3 rounded-xl border border-stone-200 bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Destination Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Home"
                          value={pickupDestination}
                          onChange={(e) => setPickupDestination(e.target.value)}
                          className="w-full p-3 rounded-xl border border-stone-200 bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Est. Travel (Minutes)</label>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={pickupTravelMinutes}
                          onChange={(e) => setPickupTravelMinutes(Number(e.target.value))}
                          className="w-full p-3 rounded-xl border border-stone-200 bg-white outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Care Notes / Instructions</label>
                  <textarea
                    placeholder="Allergy alerts, emergency info, bedtime routine instructions..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-white outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="flex-1 py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 font-semibold">
                  Back
                </button>
                <button onClick={() => setStep(5)} className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press">
                  Review Pricing
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-heading">Step 5: Price Breakdown</h4>
              {calculatingPrice ? (
                <div className="flex justify-center items-center py-6 text-stone-400">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-xs">Calculating platform fee and tax...</span>
                </div>
              ) : priceBreakdown ? (
                <div className="space-y-4">
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-2 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Pricing Model</span>
                      <span className="font-bold capitalize">{priceBreakdown.pricing_model?.replace(/_/g, ' ') || 'Flat Rate'}</span>
                    </div>
                    <div className="flex justify-between text-stone-600 font-semibold">
                      <span>Children Selected</span>
                      <span className="font-bold">{priceBreakdown.child_count || selectedChildren.length} child(ren)</span>
                    </div>
                    <div className="flex justify-between text-stone-600 font-semibold">
                      <span>Effective Hourly Rate</span>
                      <span className="font-bold text-primary">${priceBreakdown.hourly_rate.toFixed(2)}/hr</span>
                    </div>
                    <div className="h-px bg-stone-200 my-1.5" />
                    <div className="flex justify-between text-stone-600 font-semibold">
                      <span>Care Service (${priceBreakdown.hourly_rate}/hr x {priceBreakdown.duration_minutes / 60} hrs)</span>
                      <span>${priceBreakdown.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Platform Fee</span>
                      <span>${priceBreakdown.platform_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Taxes (5%)</span>
                      <span>${priceBreakdown.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-heading text-sm border-t border-stone-200 pt-2 mt-2">
                      <span>Total Invoice</span>
                      <span>${priceBreakdown.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(4)} className="flex-1 py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700">
                      Back
                    </button>
                    <button
                      disabled={submittingBooking}
                      onClick={handleCreateBooking}
                      className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press disabled:opacity-50"
                    >
                      {submittingBooking ? 'Submitting Request...' : 'Send Booking Request'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        // List Bookings
        <div className="space-y-4">
          <div className="flex gap-1.5 p-1 bg-stone-100 border border-stone-200/50 rounded-2xl max-w-sm mx-auto shadow-xs">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-press ${
                activeTab === 'active' ? 'bg-white text-heading shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-press ${
                activeTab === 'completed' ? 'bg-white text-heading shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-press ${
                activeTab === 'cancelled' ? 'bg-white text-heading shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Past/Declined
            </button>
          </div>

          {loadingBookings ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : bookings.filter(b => {
              if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status);
              if (activeTab === 'completed') return b.status === 'completed';
              return ['cancelled', 'declined'].includes(b.status);
            }).length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-xs max-w-md mx-auto space-y-3">
              <Calendar className="h-9 w-9 text-stone-300 mx-auto" />
              <div>
                <p className="text-stone-500 font-bold text-xs">No bookings found</p>
                <p className="text-[10px] text-stone-400 mt-0.5">There are no records in this tab category.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.filter(b => {
                if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status);
                if (activeTab === 'completed') return b.status === 'completed';
                return ['cancelled', 'declined'].includes(b.status);
              }).map((booking) => {
                const isSitter = currentUser?.id === booking.sitter_id;
                const otherParty = isSitter ? booking.parent : booking.sitter;
                return (
                  <div key={booking.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={otherParty?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                          alt="User"
                          className="w-12 h-12 rounded-2xl object-cover border border-stone-150"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-heading">{otherParty?.display_name}</h4>
                          <span className="text-[9px] text-stone-400 block font-semibold uppercase">{isSitter ? 'Parent Request' : 'Sitter'}</span>
                          <p className="text-xs text-stone-400 mt-1 font-medium">
                            {new Date(booking.start_time).toLocaleDateString()} • {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[9px] font-bold text-emerald-800 border border-emerald-100/60 uppercase">
                              👶 {booking.booking_children?.length || 1} {booking.booking_children?.length === 1 ? 'Kid' : 'Kids'}
                            </span>
                            {booking.pickup_required && (
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-50 text-[9px] font-bold text-amber-700 border border-amber-100 uppercase">
                                Pickup Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${
                          booking.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : booking.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : booking.status === 'in_progress'
                            ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                            : booking.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {booking.status.replace(/_/g, ' ')}
                        </span>
                        <span className="font-display font-black text-heading block">${booking.total}</span>
                      </div>
                    </div>

                    {/* Sitter pending actions */}
                    {isSitter && booking.status === 'pending' && (
                      <div className="pt-3 border-t border-stone-100">
                        <BookingActions bookingId={booking.id} />
                      </div>
                    )}

                    {/* Parent pending actions (Cancellation controls) */}
                    {!isSitter && booking.status === 'pending' && (
                      <div className="pt-3 border-t border-stone-100">
                        <ParentBookingActions bookingId={booking.id} />
                      </div>
                    )}

                    {/* Parent completed booking action (Rate Sitter & Review) */}
                    {!isSitter && booking.status === 'completed' && (
                      <div className="pt-3 border-t border-stone-100">
                        <ParentBookingActions
                          bookingId={booking.id}
                          bookingStatus="completed"
                          sitterId={booking.sitter_id}
                          sitterName={booking.sitter?.display_name || 'Caregiver'}
                          sitterAvatar={booking.sitter?.avatar_url}
                        />
                      </div>
                    )}

                    {/* Active Booking Countdown & Extension Tracker */}
                    {(booking.status === 'in_progress' || booking.status === 'accepted') && (
                      <div className="pt-3 border-t border-stone-100">
                        <ActiveBookingTracker
                          booking={booking}
                          userRole={isSitter ? 'sitter' : 'parent'}
                          onUpdate={async () => {
                            const { data: updated } = await supabase
                              .from('bookings')
                              .select(`
                                id, status, start_time, end_time, scheduled_start, scheduled_end, actual_start, actual_end, care_status, extension_minutes, late_pickup_minutes, late_pickup_status, parent_eta_note, parent_eta_time, authorized_pickup_person, total, hourly_rate, pickup_required, parent_id, sitter_id,
                                sitter:profiles!bookings_sitter_id_fkey (display_name, avatar_url),
                                parent:profiles!bookings_parent_id_fkey (display_name, avatar_url, phone),
                                reviews (id)
                              `)
                              .order('start_time', { ascending: false });
                            setBookings(updated || []);
                          }}
                        />
                      </div>
                    )}

                    {/* Sitter Care Control Tracker */}
                    {isSitter && (booking.status === 'in_progress' || booking.status === 'accepted') && (
                      <div className="pt-3 border-t border-stone-100">
                        <SitterCareTracker
                          booking={booking}
                          onUpdate={async () => {
                            const { data: updated } = await supabase
                              .from('bookings')
                              .select(`
                                id, status, start_time, end_time, scheduled_start, scheduled_end, actual_start, actual_end, care_status, extension_minutes, late_pickup_minutes, late_pickup_status, parent_eta_note, parent_eta_time, authorized_pickup_person, total, hourly_rate, pickup_required, parent_id, sitter_id,
                                sitter:profiles!bookings_sitter_id_fkey (display_name, avatar_url),
                                parent:profiles!bookings_parent_id_fkey (display_name, avatar_url, phone),
                                reviews (id)
                              `)
                              .order('start_time', { ascending: false });
                            setBookings(updated || []);
                          }}
                        />
                      </div>
                    )}

                    {/* Sitter Check-in / Check-out actions */}
                    {isSitter && booking.status === 'accepted' && (
                      <div className="pt-3 border-t border-stone-100 flex">
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'in_progress')}
                          className="flex-1 py-2.5 bg-primary text-white hover:bg-emerald-800 text-xs font-bold rounded-xl active-press transition-colors"
                        >
                          Check In Child (Drop-off)
                        </button>
                      </div>
                    )}
                    {isSitter && booking.status === 'in_progress' && (
                      <div className="pt-3 border-t border-stone-100 flex">
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'completed')}
                          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl active-press transition-colors shadow-sm"
                        >
                          Check Out Child (Pick-up)
                        </button>
                      </div>
                    )}

                    {/* Carefeed and Review buttons */}
                    {booking.status !== 'pending' && booking.status !== 'cancelled' && booking.status !== 'declined' && (
                      <div className="pt-3 border-t border-stone-100 space-y-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/bookings/${booking.id}/carefeed`}
                            className="flex-1 py-2.5 text-center rounded-xl bg-stone-50 border border-stone-150 hover:bg-stone-100 text-xs font-bold text-stone-700 active-press transition-colors"
                          >
                            View Carefeed
                          </Link>
                          {!isSitter && booking.status === 'completed' && (!booking.reviews || booking.reviews.length === 0) && (
                            <button
                              onClick={() => setSelectedReviewBooking({
                                id: booking.id,
                                sitterId: booking.sitter_id,
                                name: booking.sitter?.display_name || 'Sitter'
                              })}
                              className="flex-1 py-2.5 text-center rounded-xl bg-primary text-white hover:bg-emerald-800 text-xs font-bold active-press transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> Leave a Review
                            </button>
                          )}
                          {!isSitter && booking.status === 'completed' && (booking.reviews && booking.reviews.length > 0) && (
                            <span className="flex-1 py-2.5 text-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Reviewed
                            </span>
                          )}
                        </div>

                        {/* Audit Timeline */}
                        <div className="pt-2 border-t border-stone-100">
                          <BookingTimeline bookingId={booking.id} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Review Modal Trigger */}
      {selectedReviewBooking && (
        <ReviewModal
          isOpen={!!selectedReviewBooking}
          bookingId={selectedReviewBooking.id}
          sitterId={selectedReviewBooking.sitterId}
          sitterName={selectedReviewBooking.name}
          onClose={() => setSelectedReviewBooking(null)}
          onSuccess={async () => {
            setSelectedReviewBooking(null);
            router.refresh();
            // Re-fetch bookings client-side
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: updated } = await supabase
                .from('bookings')
                .select(`
                  id, status, start_time, end_time, total, hourly_rate, pickup_required, parent_id, sitter_id,
                  sitter:profiles!bookings_sitter_id_fkey (display_name, avatar_url),
                  parent:profiles!bookings_parent_id_fkey (display_name, avatar_url),
                  reviews (id)
                `)
                .order('start_time', { ascending: false });
              setBookings(updated || []);
            }
          }}
        />
      )}
    </div>
  );
}
