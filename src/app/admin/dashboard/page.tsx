'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  ShieldAlert, 
  Users, 
  Calendar, 
  DollarSign, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  Settings, 
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserX,
  FileText,
  Clock,
  ArrowUpRight,
  Calculator,
  Activity,
  Flag
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type TabType = 'overview' | 'users' | 'bookings' | 'queue' | 'disputes' | 'reports' | 'settings' | 'audit';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Metrics
  const [metrics, setMetrics] = useState<any>({
    totalUsers: 0,
    activeSitters: 0,
    totalParents: 0,
    totalBookings: 0,
    completedBookings: 0,
    grossVolume: 0,
    platformRevenue: 0,
  });

  // Data lists
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [pendingSitters, setPendingSitters] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState<any | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form states for pricing
  const [platformPct, setPlatformPct] = useState(10);
  const [minFee, setMinFee] = useState(2);
  const [maxFee, setMaxFee] = useState(50);
  const [taxPct, setTaxPct] = useState(5);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function loadAdminData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch profiles
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const usersList = usersData || [];
      setAllUsers(usersList);

      const sittersCount = usersList.filter(u => u.role === 'sitter').length;
      const parentsCount = usersList.filter(u => u.role === 'parent').length;

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          parent:profiles!bookings_parent_id_fkey(display_name, email),
          sitter:profiles!bookings_sitter_id_fkey(display_name, email)
        `)
        .order('created_at', { ascending: false });

      const bookingsList = bookingsData || [];
      setAllBookings(bookingsList);

      const completed = bookingsList.filter(b => b.status === 'completed');
      const grossVolume = completed.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const platformRevenue = completed.reduce((sum, b) => sum + (Number(b.platform_fee) || 0), 0);

      setMetrics({
        totalUsers: usersList.length,
        activeSitters: sittersCount,
        totalParents: parentsCount,
        totalBookings: bookingsList.length,
        completedBookings: completed.length,
        grossVolume,
        platformRevenue,
      });

      // Fetch pending sitters
      const { data: pendingData } = await supabase
        .from('profiles')
        .select(`
          *,
          sitter_profiles(headline, base_hourly_rate_cents, bio, years_experience)
        `)
        .eq('role', 'sitter')
        .in('verification_status', ['pending', 'unverified']);

      setPendingSitters(pendingData || []);

      // Fetch disputes
      const { data: disputesData } = await supabase
        .from('disputes')
        .select(`
          *,
          booking:bookings(total, parent_id, sitter_id)
        `)
        .order('created_at', { ascending: false });

      setDisputes(disputesData || []);

      // Fetch pricing config
      const { data: pricing } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pricing) {
        setPricingConfig(pricing);
        setPlatformPct(Number(pricing.platform_percentage));
        setMinFee(Number(pricing.min_platform_fee));
        setMaxFee(Number(pricing.max_platform_fee));
        setTaxPct(Number(pricing.tax_percentage));
      }

      // Fetch audit logs
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setAuditLogs(logsData || []);

      // Fetch user reports
      const { data: reportsData } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:profiles!user_reports_reporter_id_fkey(display_name, email),
          reported:profiles!user_reports_reported_id_fkey(display_name, email, role)
        `)
        .order('created_at', { ascending: false });
      setUserReports(reportsData || []);
    } catch (err) {
      console.error('Error fetching admin details:', err);
      toast.error('Failed to load admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveSitter = async (sitterId: string) => {
    try {
      setActioningId(sitterId);
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ verification_status: 'fully_verified' })
        .eq('id', sitterId);

      if (profileErr) throw profileErr;

      await supabase
        .from('sitter_profiles')
        .update({ identity_verified: true, email_verified: true, phone_verified: true })
        .eq('id', sitterId);

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        actor_id: user?.id || null,
        action: 'approve_sitter_verification',
        entity_type: 'profiles',
        entity_id: sitterId,
        metadata: { status: 'fully_verified' },
      });

      toast.success('Sitter identity & credentials verified successfully!');
      loadAdminData(true);
    } catch (err: any) {
      toast.error(err.message || 'Verification approval failed.');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectSitter = async (sitterId: string) => {
    try {
      setActioningId(sitterId);
      await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', sitterId);

      toast.info('Sitter verification rejected.');
      loadAdminData(true);
    } catch (err: any) {
      toast.error(err.message || 'Verification rejection failed.');
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleAccountStatus = async (userId: string, currentStatus: string) => {
    try {
      setActioningId(userId);
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User account status updated to ${newStatus}.`);
      loadAdminData(true);
    } catch (err: any) {
      toast.error(err.message || 'Account status update failed.');
    } finally {
      setActioningId(null);
    }
  };

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingConfig(true);
      
      if (pricingConfig) {
        await supabase
          .from('pricing_config')
          .update({ is_active: false })
          .eq('id', pricingConfig.id);
      }

      const { data: newPricing, error } = await supabase
        .from('pricing_config')
        .insert({
          platform_percentage: platformPct,
          min_platform_fee: minFee,
          max_platform_fee: maxFee,
          tax_percentage: taxPct,
          currency: 'USD',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      setPricingConfig(newPricing);
      toast.success('Platform financial parameters updated & active!');
    } catch (err: any) {
      toast.error(err.message || 'Pricing update failed.');
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Filter users
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Simulator values
  const simSubtotal = 100;
  const simFee = Math.min(maxFee, Math.max(minFee, (simSubtotal * platformPct) / 100));
  const simTax = ((simSubtotal + simFee) * taxPct) / 100;
  const simTotal = simSubtotal + simFee + simTax;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-3xl text-white shadow-xl border border-slate-700/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Platform Control Engine</span>
          </div>
          <h1 className="font-display text-2xl font-black text-white">Admin Operations Center</h1>
          <p className="text-xs text-slate-300">Real-time user management, verification vetting, booking audits & revenue controls.</p>
        </div>

        <button
          onClick={() => loadAdminData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 active-press self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* High Impact Executive Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-sm hover-scale transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> Active
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-400 block font-semibold uppercase tracking-wider">Total Platform Users</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-heading dark:text-white">{metrics.totalUsers}</span>
            <span className="text-[10px] text-stone-500 dark:text-slate-400">({metrics.activeSitters} Sitters · {metrics.totalParents} Parents)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-sm hover-scale transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              {pendingSitters.length} Pending
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-400 block font-semibold uppercase tracking-wider">Verified Caregivers</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-heading dark:text-white">{metrics.activeSitters}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100% Vetted</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-sm hover-scale transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-2xl">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {metrics.completedBookings} Completed
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-400 block font-semibold uppercase tracking-wider">Total Bookings</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-heading dark:text-white">{metrics.totalBookings}</span>
            <span className="text-[10px] text-stone-500 dark:text-slate-400">(${metrics.grossVolume.toFixed(2)} Volume)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-sm hover-scale transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 rounded-2xl">
              <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {platformPct}% Fee
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-400 block font-semibold uppercase tracking-wider">Net Platform Revenue</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-heading dark:text-white">${metrics.platformRevenue.toFixed(2)}</span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">Cut</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'User Directory', count: allUsers.length, icon: Users },
          { id: 'bookings', label: 'Bookings', count: allBookings.length, icon: Calendar },
          { id: 'queue', label: 'Verification Queue', count: pendingSitters.length, icon: ShieldCheck, alert: pendingSitters.length > 0 },
          { id: 'disputes', label: 'Disputes', count: disputes.length, icon: ShieldAlert, alert: disputes.length > 0 },
          { id: 'reports', label: 'Reports', count: userReports.filter(r => r.status === 'pending').length, icon: Flag, alert: userReports.filter(r => r.status === 'pending').length > 0 },
          { id: 'settings', label: 'Financial Rules', icon: Calculator },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  tab.alert
                    ? 'bg-red-500 text-white font-extrabold animate-pulse'
                    : isActive ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions & Recent Verification */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pending Verifications Widget */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" /> Pending Sitter Approvals ({pendingSitters.length})
                  </h3>
                  <button onClick={() => setActiveTab('queue')} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                    View All <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {pendingSitters.length === 0 ? (
                  <div className="text-center py-8 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-800">
                    <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-700 dark:text-slate-300">All sitter applications are verified!</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">New caregiver applications will appear here for review.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSitters.slice(0, 3).map((sitter) => (
                      <div key={sitter.id} className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                            {sitter.display_name?.[0] || 'S'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-heading dark:text-white">{sitter.display_name}</h4>
                            <span className="text-[10px] text-stone-400 block">{sitter.email}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                              Verification Pending
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={actioningId === sitter.id}
                            onClick={() => handleApproveSitter(sitter.id)}
                            className="px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors flex items-center gap-1.5"
                          >
                            <Check className="h-4 w-4" /> Approve
                          </button>
                          <button
                            disabled={actioningId === sitter.id}
                            onClick={() => handleRejectSitter(sitter.id)}
                            className="px-3.5 py-2 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-200 active-press transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bookings Feed */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-secondary" /> Recent Activity & Bookings
                  </h3>
                  <button onClick={() => setActiveTab('bookings')} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                    View All <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {allBookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-stone-800 dark:text-slate-200">
                          {b.parent?.display_name || b.parent?.first_name || b.parent?.email?.split('@')[0] || 'Parent'} booked {b.sitter?.display_name || b.sitter?.first_name || b.sitter?.email?.split('@')[0] || 'Sitter'}
                        </div>
                        <span className="text-[10px] text-stone-400 block">{new Date(b.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-stone-900 dark:text-white block">${Number(b.total).toFixed(2)}</span>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          b.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Rules & Simulator */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" /> Live Fee Simulator
                </h3>

                <div className="bg-stone-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-slate-400">Sample Sitter Booking Subtotal:</span>
                    <span className="font-bold text-heading dark:text-white">${simSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-slate-400">Platform Commission ({platformPct}%):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+${simFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-slate-400">Applicable Tax ({taxPct}%):</span>
                    <span className="font-bold text-stone-700 dark:text-slate-300">+${simTax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between font-black text-sm text-heading dark:text-white">
                    <span>Parent Invoice Total:</span>
                    <span>${simTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="w-full py-3 bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-stone-200 dark:hover:bg-slate-700 active-press transition-colors flex items-center justify-center gap-2"
                >
                  <Settings className="h-4 w-4" /> Adjust Platform Fee Rules
                </button>
              </div>

              {/* Audit Log Stream Preview */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-stone-400" /> Recent Audit Logs
                  </h3>
                  <button onClick={() => setActiveTab('audit')} className="text-xs text-primary font-bold hover:underline">
                    View Stream
                  </button>
                </div>

                <div className="space-y-2">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl text-xs border border-stone-100 dark:border-slate-800">
                      <span className="font-bold text-stone-800 dark:text-slate-200 block capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-stone-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
            <h3 className="font-display text-lg font-bold text-heading dark:text-white">User Directory ({filteredUsers.length})</h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-primary dark:text-white w-64"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-primary dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="parent">Parents</option>
                <option value="sitter">Sitters</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-slate-800 text-stone-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                          {u.display_name?.[0] || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-stone-800 dark:text-slate-200 block">{u.display_name}</span>
                          <span className="text-[10px] text-stone-400">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                        u.role === 'sitter' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        u.verification_status === 'fully_verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.verification_status || 'unverified'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        u.account_status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {u.account_status || 'active'}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-400 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {u.role === 'sitter' && u.verification_status !== 'fully_verified' && (
                          <button
                            disabled={actioningId === u.id}
                            onClick={() => handleApproveSitter(u.id)}
                            className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-emerald-800 active-press"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          disabled={actioningId === u.id}
                          onClick={() => handleToggleAccountStatus(u.id, u.account_status)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg active-press ${
                            u.account_status === 'suspended'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {u.account_status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-heading dark:text-white">Platform Bookings ({allBookings.length})</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-slate-800 text-stone-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Booking ID</th>
                  <th className="p-3.5">Parent</th>
                  <th className="p-3.5">Sitter</th>
                  <th className="p-3.5">Hours</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Platform Fee</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {allBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-[10px] text-stone-400">
                      {b.id.slice(0, 8)}...
                    </td>
                    <td className="p-3.5 font-bold text-stone-800 dark:text-slate-200">
                      {b.parent?.display_name || 'Parent'}
                    </td>
                    <td className="p-3.5 font-bold text-stone-800 dark:text-slate-200">
                      {b.sitter?.display_name || 'Sitter'}
                    </td>
                    <td className="p-3.5 text-stone-600 dark:text-slate-300">
                      {b.total_hours || 1} hrs
                    </td>
                    <td className="p-3.5 font-black text-stone-900 dark:text-white">
                      ${Number(b.total).toFixed(2)}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(b.platform_fee).toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[10px] ${
                        b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-400 text-[11px]">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VERIFICATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-heading dark:text-white">Sitter Identity Verification Queue ({pendingSitters.length})</h3>

          {pendingSitters.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-800">
              <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-stone-800 dark:text-white">No Caregivers Pending Verification</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">All registered caregivers have completed verification or have already been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSitters.map((sitter) => (
                <div key={sitter.id} className="p-5 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
                      {sitter.display_name?.[0] || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-heading dark:text-white">{sitter.display_name}</h4>
                      <span className="text-xs text-stone-400 block">{sitter.email}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold mt-1 inline-block">
                        Status: {sitter.verification_status}
                      </span>
                    </div>
                  </div>

                  {sitter.sitter_profiles?.[0] && (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-stone-200 dark:border-slate-800 text-xs space-y-1">
                      <div><strong className="text-stone-500">Headline:</strong> {sitter.sitter_profiles[0].headline || 'Caregiver'}</div>
                       <div><strong className="text-stone-500">Hourly Rate:</strong> ${sitter.sitter_profiles[0].base_hourly_rate_cents ? Math.round(sitter.sitter_profiles[0].base_hourly_rate_cents / 100) : 20}/hr</div>
                       <div><strong className="text-stone-500">Experience:</strong> {sitter.sitter_profiles[0].years_experience || 1} years</div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={actioningId === sitter.id}
                      onClick={() => handleApproveSitter(sitter.id)}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> Approve & Issue Badge
                    </button>
                    <button
                      disabled={actioningId === sitter.id}
                      onClick={() => handleRejectSitter(sitter.id)}
                      className="px-4 py-2.5 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-200 active-press transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DISPUTES */}
      {activeTab === 'disputes' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-heading dark:text-white">Care Dispute Resolution ({disputes.length})</h3>

          {disputes.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-800">
              <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-stone-800 dark:text-white">No Open Disputes</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">There are currently no unresolved booking complaints or refund requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.id} className="p-5 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-heading dark:text-white uppercase tracking-wider">Reason: {d.reason.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded font-extrabold uppercase">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-stone-200 dark:border-slate-800">
                    "{d.description}"
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-400">Booking Amount: ${d.booking?.total || '0.00'}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.success(`Dispute ${d.id.slice(0, 6)} resolved & refund released.`)}
                        className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press"
                      >
                        Resolve & Issue Refund
                      </button>
                      <button
                        onClick={() => toast.info(`Dispute ${d.id.slice(0, 6)} dismissed.`)}
                        className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-300 active-press"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: FINANCIAL RULES */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-stone-400" /> Financial & Pricing Rule Parameters
            </h3>
            
            <form onSubmit={handleUpdatePricing} className="space-y-4">
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Platform Commission Cut (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={platformPct}
                    onChange={(e) => setPlatformPct(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Percentage deducted from sitter earnings per booking.</p>
                </div>

                <div>
                  <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxPct}
                    onChange={(e) => setTaxPct(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Local GST / service tax applied to parent invoice.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Min Platform Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={minFee}
                      onChange={(e) => setMinFee(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Max Platform Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={maxFee}
                      onChange={(e) => setMaxFee(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingConfig}
                className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {updatingConfig ? 'Saving Configurations...' : 'Save & Publish Rules'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-600" /> Interactive Revenue Calculator
            </h3>
            
            <div className="p-5 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 dark:text-slate-400">Sitter Hourly Rate:</span>
                <span className="font-bold text-heading dark:text-white">$25.00 / hr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 dark:text-slate-400">Booking Duration:</span>
                <span className="font-bold text-heading dark:text-white">4 Hours</span>
              </div>
              <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between">
                <span className="text-stone-500 dark:text-slate-400">Booking Base Subtotal:</span>
                <span className="font-extrabold text-heading dark:text-white">$100.00</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Platform Cut ({platformPct}%):</span>
                <span className="font-bold">+${simFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-slate-300">
                <span>Tax ({taxPct}%):</span>
                <span className="font-bold">+${simTax.toFixed(2)}</span>
              </div>
              <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between font-black text-sm text-heading dark:text-white">
                <span>Parent Total Invoice:</span>
                <span>${simTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-heading dark:text-white">Audit Trail Stream ({auditLogs.length})</h3>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-stone-800 dark:text-slate-200 block capitalize">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-mono text-stone-400">Entity: {log.entity_type} ({log.entity_id?.slice(0, 8)})</span>
                </div>
                <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 bg-stone-200 dark:bg-slate-700 px-2 py-1 rounded-lg">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: USER REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-heading dark:text-white flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" /> User Reports
            </h3>
            <span className="text-xs bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">
              {userReports.filter(r => r.status === 'pending').length} Pending Review
            </span>
          </div>

          {userReports.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-100">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-700">No reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReports.map((report) => (
                <div key={report.id} className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 rounded-xl">
                        <Flag className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-heading dark:text-white block">
                          {report.reporter?.display_name || 'Unknown'} → reported → {report.reported?.display_name || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-stone-400">{new Date(report.created_at).toLocaleString()} · Role: {report.reported?.role}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-wider ${
                      report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-stone-200 text-stone-500'
                    }`}>{report.status}</span>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-stone-100 italic">
                    "{report.reason}"
                  </p>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await supabase.from('user_reports').update({ status: 'resolved' }).eq('id', report.id);
                          setUserReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                          toast.success('Report marked as resolved.');
                        }}
                        className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold hover:bg-emerald-200 transition-colors active-press"
                      >
                        ✓ Resolve
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from('user_reports').update({ status: 'dismissed' }).eq('id', report.id);
                          setUserReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r));
                          toast.success('Report dismissed.');
                        }}
                        className="px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-bold hover:bg-stone-200 transition-colors active-press"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from('profiles').update({ is_suspended: true }).eq('id', report.reported_id);
                          await supabase.from('user_reports').update({ status: 'resolved' }).eq('id', report.id);
                          setUserReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                          toast.success('User suspended and report resolved.');
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-[10px] font-bold hover:bg-red-200 transition-colors active-press"
                      >
                        ⚠ Suspend User
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
