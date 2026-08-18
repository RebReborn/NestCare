import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Search, 
  MessageSquare, 
  Heart, 
  User, 
  ShieldAlert, 
  ChevronRight, 
  DollarSign, 
  Clock, 
  Star, 
  Users,
  Baby,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  PhoneCall
} from 'lucide-react';
import { BookingActions } from '@/components/bookings/booking-actions';
import { ParentBookingActions } from '@/components/bookings/parent-booking-actions';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect('/login');
  }

  const role = profile.role;

  if (role === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Greetings Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="font-display text-2xl font-black text-heading dark:text-white">
            Good afternoon, {profile.first_name}!
          </h1>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 font-medium">
            Role: <span className="font-bold text-primary capitalize">{role}</span> • Edmonton Area
          </p>
        </div>
        <img 
          src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
          alt="Avatar" 
          className="w-12 h-12 rounded-2xl object-cover border border-stone-200 dark:border-slate-800" 
        />
      </div>

      {role === 'parent' ? (
        <ParentDashboardView parentId={user.id} parentName={profile.first_name} />
      ) : (
        <SitterDashboardView sitterId={user.id} />
      )}
    </div>
  );
}

// ==========================================
// PARENT DASHBOARD VIEW
// ==========================================
async function ParentDashboardView({ parentId, parentName }: { parentId: string, parentName: string }) {
  const supabase = await createClient();
  const now = new Date();

  // Fetch all active/in-progress bookings for parent to check overdue pickup
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      start_time,
      end_time,
      scheduled_end,
      total,
      sitter:profiles!bookings_sitter_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .eq('parent_id', parentId)
    .in('status', ['accepted', 'in_progress'])
    .order('start_time', { ascending: true });

  // Find any overdue pickup booking (where current time > scheduled end time)
  const overdueBooking = activeBookings?.find(b => {
    const end = new Date(b.scheduled_end || b.end_time);
    return now > end;
  });

  let overdueMinutes = 0;
  if (overdueBooking) {
    const endTime = new Date(overdueBooking.scheduled_end || overdueBooking.end_time);
    overdueMinutes = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60));
  }

  // Fetch upcoming bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      start_time,
      end_time,
      total,
      sitter:profiles!bookings_sitter_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .eq('parent_id', parentId)
    .in('status', ['pending', 'accepted', 'in_progress'])
    .order('start_time', { ascending: true })
    .limit(1);

  // Fetch children count
  const { data: children } = await supabase
    .from('children')
    .select('id, first_name')
    .eq('parent_id', parentId);

  // Fetch 3 recommended sitters
  const { data: sitters } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      avatar_url,
      sitter_profiles (
        headline,
        base_hourly_rate_cents,
        years_experience
      )
    `)
    .eq('role', 'sitter')
    .limit(3);

  // Fetch parent's favorites
  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      id,
      sitter:sitter_profiles (
        id,
        headline,
        base_hourly_rate_cents,
        profile:profiles (
          display_name,
          avatar_url
        )
      )
    `)
    .eq('parent_id', parentId)
    .limit(4);

  const favSitters = (favorites || []).map((fav: any) => {
    const sp = fav.sitter;
    const profile = sp?.profile;
    return {
      id: sp?.id,
      display_name: profile?.display_name,
      avatar_url: profile?.avatar_url,
      headline: sp?.headline,
      hourly_rate: sp?.base_hourly_rate_cents ? Math.round(Number(sp.base_hourly_rate_cents) / 100) : 20,
    };
  }).filter(f => f.id);

  const booking = upcomingBookings?.[0];

  return (
    <div className="space-y-6">
      {/* OVERDUE PICKUP WARNING BANNER (PARENT) */}
      {overdueBooking && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/80 rounded-2xl text-rose-600 dark:text-rose-300 shrink-0 mt-0.5">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                    Overdue Pickup Alert
                  </span>
                  <span className="text-xs font-mono font-extrabold text-rose-700 dark:text-rose-300">
                    +{overdueMinutes} min overdue
                  </span>
                </div>
                <h3 className="font-display font-black text-sm text-stone-900 dark:text-white">
                  Care session with <span className="text-rose-700 dark:text-rose-300 font-extrabold">{(overdueBooking.sitter as any)?.display_name || 'your sitter'}</span> ended at {new Date(overdueBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Your sitter is waiting! Late pickup charges ($0.50/min after 10-min grace period) apply automatically. Please confirm pickup with your sitter.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-rose-200/80 dark:border-rose-900/50 flex flex-wrap gap-2.5">
            <Link
              href={`/bookings/${overdueBooking.id}/carefeed`}
              className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold active-press transition-colors text-center shadow-xs flex items-center justify-center gap-1.5"
            >
              <Clock className="h-4 w-4" /> Live Carefeed & Pickup Status
            </Link>
            <Link
              href="/messages"
              className="py-2.5 px-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-800 text-stone-800 dark:text-slate-200 rounded-2xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-slate-800 active-press transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="h-4 w-4 text-rose-600" /> Contact Sitter
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link 
          href="/search" 
          className="bg-primary p-5 rounded-3xl text-white flex flex-col justify-between h-32 active-press hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Search className="h-6 w-6" />
          <span className="font-display font-extrabold text-sm block">Find a Babysitter</span>
        </Link>
        <Link 
          href="/bookings" 
          className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 rounded-3xl text-heading dark:text-white flex flex-col justify-between h-32 active-press hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Calendar className="h-6 w-6 text-primary" />
          <span className="font-display font-extrabold text-sm block">My Bookings</span>
        </Link>
      </div>

      {/* Upcoming Booking Card */}
      <div className="space-y-2">
        <h2 className="font-display text-base font-bold text-heading dark:text-white">Upcoming Booking</h2>
        {booking ? (
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img 
                  src={(booking.sitter as any)?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'} 
                  alt="Sitter" 
                  className="w-12 h-12 rounded-2xl object-cover border border-stone-200 dark:border-slate-800" 
                />
                <div>
                  <span className="text-xs text-stone-400 block font-semibold uppercase">Sitter</span>
                  <span className="font-bold text-sm text-heading dark:text-white">{(booking.sitter as any)?.display_name}</span>
                  <span className="text-xs text-stone-500 dark:text-slate-400 block mt-0.5">
                    {new Date(booking.start_time).toLocaleDateString()} • {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                  booking.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {booking.status}
                </span>
                <span className="font-display font-black text-heading dark:text-white block mt-2">${booking.total}</span>
              </div>
            </div>

            {booking.status !== 'pending' ? (
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex">
                <Link
                  href={`/bookings/${booking.id}/carefeed`}
                  className="flex-1 text-center py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 rounded-xl active-press transition-colors"
                >
                  View Live Carefeed
                </Link>
              </div>
            ) : (
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex">
                <ParentBookingActions bookingId={booking.id} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-stone-300 dark:border-slate-800 rounded-3xl p-6 text-center text-stone-400 text-xs">
            No upcoming bookings scheduled. Need help soon?
            <Link href="/search" className="text-primary font-bold block mt-1.5 hover:underline">
              Search available sitters
            </Link>
          </div>
        )}
      </div>

      {/* Children List Banner */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-sm font-extrabold text-heading dark:text-white">Child Profiles</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 dark:bg-slate-800 rounded-md text-stone-500 dark:text-slate-400">
            {children?.length || 0} Registered
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {children && children.map((c) => (
            <span key={c.id} className="px-3.5 py-2 bg-stone-50 dark:bg-slate-800/80 rounded-xl text-xs font-semibold border border-stone-100 dark:border-slate-700 text-stone-700 dark:text-slate-200 inline-flex items-center gap-1.5">
              <Baby className="h-3.5 w-3.5 text-primary" /> {c.first_name}
            </span>
          ))}
          <Link 
            href="/settings" 
            className="px-3.5 py-2 border border-dashed border-stone-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-primary hover:bg-stone-50 dark:hover:bg-slate-800 active-press"
          >
            + Add Child
          </Link>
        </div>
      </div>

      {/* Favorite / Saved Sitters */}
      {favSitters && favSitters.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-bold text-heading dark:text-white">My Saved Sitters</h2>
          <div className="grid grid-cols-2 gap-3">
            {favSitters.map((s) => (
              <Link 
                key={s.id}
                href={`/sitter/${s.id}`}
                className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs hover-scale flex flex-col justify-between h-32 relative"
              >
                <div className="flex gap-2 items-start min-w-0">
                  <img 
                    src={s.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'} 
                    alt={s.display_name} 
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-slate-800"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs text-heading dark:text-white truncate">{s.display_name}</h3>
                    <span className="text-[9px] text-stone-400 block truncate">{s.headline || 'Sitter'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 dark:border-slate-800 pt-2.5 mt-2.5">
                  <span className="text-[9px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 fill-rose-600" /> Saved
                  </span>
                  <span className="font-display text-xs font-black text-heading dark:text-white">${s.hourly_rate}/hr</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Sitters */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-heading dark:text-white">Recommended Near You</h2>
        <div className="flex flex-col gap-3">
          {sitters && sitters.map((sitter) => {
            const sp: any = sitter.sitter_profiles;
            const profileDetails = Array.isArray(sp) ? sp[0] : sp;
            return (
              <Link 
                key={sitter.id} 
                href={`/sitter/${sitter.id}`}
                className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs hover-scale flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={sitter.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'} 
                    alt={sitter.display_name} 
                    className="w-11 h-11 rounded-xl object-cover border border-stone-200 dark:border-slate-800" 
                  />
                  <div>
                    <h3 className="font-bold text-sm text-heading dark:text-white flex items-center gap-1">
                      {sitter.display_name}
                      <ShieldCheck className="h-4 w-4 text-primary fill-emerald-50 dark:fill-emerald-950" />
                    </h3>
                    <span className="text-[10px] text-stone-400 block">{profileDetails?.headline || 'Sitter'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-sm font-extrabold text-heading dark:text-white block">${profileDetails?.base_hourly_rate_cents ? Math.round(Number(profileDetails.base_hourly_rate_cents) / 100) : 20}/hr</span>
                  <span className="text-[10px] text-stone-400 font-medium">{profileDetails?.years_experience} yrs exp</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SITTER DASHBOARD VIEW
// ==========================================
async function SitterDashboardView({ sitterId }: { sitterId: string }) {
  const supabase = await createClient();
  const now = new Date();

  // Fetch all active/in-progress bookings for sitter to check overdue pickup
  const { data: activeSitterBookings } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      start_time,
      end_time,
      scheduled_end,
      total,
      parent:profiles!bookings_parent_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .eq('sitter_id', sitterId)
    .in('status', ['accepted', 'in_progress'])
    .order('start_time', { ascending: true });

  // Find any overdue pickup booking
  const overdueBooking = activeSitterBookings?.find(b => {
    const end = new Date(b.scheduled_end || b.end_time);
    return now > end;
  });

  let overdueMinutes = 0;
  if (overdueBooking) {
    const endTime = new Date(overdueBooking.scheduled_end || overdueBooking.end_time);
    overdueMinutes = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60));
  }

  // Fetch pending requests
  const { data: pendingRequests } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      total,
      parent:profiles!bookings_parent_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .eq('sitter_id', sitterId)
    .eq('status', 'pending')
    .order('start_time', { ascending: true });

  // Fetch completed bookings earnings
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select('subtotal')
    .eq('sitter_id', sitterId)
    .eq('status', 'completed');

  const totalEarnings = completedBookings?.reduce((sum, b) => sum + Number(b.subtotal), 0) || 0;

  return (
    <div className="space-y-6">
      {/* OVERDUE PICKUP WARNING BANNER (SITTER) */}
      {overdueBooking && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/80 rounded-2xl text-amber-600 dark:text-amber-300 shrink-0 mt-0.5">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    Overdue Pickup Alert
                  </span>
                  <span className="text-xs font-mono font-extrabold text-amber-700 dark:text-amber-300">
                    +{overdueMinutes} min waiting
                  </span>
                </div>
                <h3 className="font-display font-black text-sm text-stone-900 dark:text-white">
                  Care session for <span className="text-amber-800 dark:text-amber-300 font-extrabold">{(overdueBooking.parent as any)?.display_name || 'Parent'}</span> ended at {new Date(overdueBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
                  Parent pickup is past scheduled end time. Late pickup charges ($0.50/min after 10-min grace period) will be logged automatically upon completion.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-200/80 dark:border-amber-900/50 flex flex-wrap gap-2.5">
            <Link
              href={`/bookings/${overdueBooking.id}/carefeed`}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold active-press transition-colors text-center shadow-xs flex items-center justify-center gap-1.5"
            >
              <Clock className="h-4 w-4" /> Open Live Carefeed & Log Completion
            </Link>
            <Link
              href="/messages"
              className="py-2.5 px-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 text-stone-800 dark:text-slate-200 rounded-2xl text-xs font-bold hover:bg-amber-50 dark:hover:bg-slate-800 active-press transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="h-4 w-4 text-amber-600" /> Message Parent
            </Link>
          </div>
        </div>
      )}

      {/* Earnings and Summary Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
          <DollarSign className="h-6 w-6 text-primary mb-2" />
          <span className="text-xs text-stone-400 block font-semibold uppercase">Total Earnings</span>
          <span className="font-display text-2xl font-black text-heading dark:text-white">${totalEarnings.toFixed(2)}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
          <Clock className="h-6 w-6 text-amber-500 mb-2" />
          <span className="text-xs text-stone-400 block font-semibold uppercase">Requests</span>
          <span className="font-display text-2xl font-black text-heading dark:text-white">{pendingRequests?.length || 0} Pending</span>
        </div>
      </div>

      {/* Pending Booking Requests Section */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-heading dark:text-white">Pending Requests</h2>
        {pendingRequests && pendingRequests.length > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div 
                key={req.id} 
                className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={(req.parent as any)?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'} 
                      alt="Parent" 
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-slate-800" 
                    />
                    <div>
                      <span className="font-bold text-sm text-heading dark:text-white">{(req.parent as any)?.display_name}</span>
                      <span className="text-xs text-stone-400 block mt-0.5">
                        {new Date(req.start_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-400 block font-medium">Estimated payout</span>
                    <span className="font-display text-base font-extrabold text-heading dark:text-white">${req.total}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex">
                  <BookingActions bookingId={req.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-stone-300 dark:border-slate-800 rounded-3xl p-8 text-center text-stone-400 text-xs shadow-xs">
            No pending booking requests. Keep availability updated to receive requests.
          </div>
        )}
      </div>

      {/* Sitter Availability Settings Banner */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-display font-extrabold text-sm text-heading dark:text-white">Availability Settings</h3>
          <p className="text-[10px] text-stone-400 max-w-[200px]">Configure your weekly recurring shifts and block vacation dates.</p>
        </div>
        <Link 
          href="/availability" 
          className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl active-press hover:bg-emerald-800 transition-colors shadow-xs"
        >
          Manage Shifts
        </Link>
      </div>

      {/* Sitter Quick Settings Banner */}
      <div className="bg-stone-900 dark:bg-slate-900 rounded-3xl p-6 text-white shadow-md flex items-center justify-between border border-stone-800">
        <div className="space-y-1">
          <h3 className="font-display font-extrabold text-sm">Payout Setup</h3>
          <p className="text-[10px] text-stone-400 max-w-[200px]">Link your Stripe account to receive automatic, secure payouts.</p>
        </div>
        <button className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl active-press hover:bg-emerald-800 transition-colors shadow-xs">
          Stripe Connect
        </button>
      </div>
    </div>
  );
}
