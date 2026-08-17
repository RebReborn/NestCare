'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Calendar, Clock, User, ShieldCheck, Check, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BookingActions } from '@/components/bookings/booking-actions';
import { ParentBookingActions } from '@/components/bookings/parent-booking-actions';
import { ReviewModal } from '@/components/reviews/review-modal';

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
  const [priceBreakdown, setPriceBreakdown] = useState<any | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

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
      
      // Re-fetch bookings client-side
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
                hourly_rate,
                minimum_booking_hours
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
              hourly_rate: Number(profileDetails?.hourly_rate || 20),
              min_hours: profileDetails?.minimum_booking_hours || 1,
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
          pickup_required: pickupRequired,
          pickup_location: pickupRequired ? pickupLocation : null,
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
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press">
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
              <h4 className="font-display text-sm font-bold text-heading">Step 4: Care Details</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="flex items-center gap-2 mb-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={pickupRequired}
                      onChange={(e) => setPickupRequired(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    Pickup Required?
                  </label>
                  {pickupRequired && (
                    <input
                      type="text"
                      placeholder="Pickup address or location details..."
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full p-3.5 rounded-2xl border border-stone-200 bg-white"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Care Notes</label>
                  <textarea
                    placeholder="Allergy alerts, emergency info, bedtime routine instructions..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-white min-h-[100px]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="flex-1 py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700">
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
                          {booking.pickup_required && (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded bg-amber-50 text-[9px] font-bold text-amber-700 border border-amber-100">
                              Pickup Required
                            </span>
                          )}
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
                          className="flex-1 py-2.5 bg-orange-650 hover:bg-orange-700 text-white text-xs font-bold rounded-xl active-press transition-colors"
                        >
                          Check Out Child (Pick-up)
                        </button>
                      </div>
                    )}

                    {/* Carefeed and Review buttons */}
                    {booking.status !== 'pending' && booking.status !== 'cancelled' && booking.status !== 'declined' && (
                      <div className="pt-3 border-t border-stone-100 flex gap-2">
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
