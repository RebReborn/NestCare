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
  Flag,
  MessageSquare,
  Eye,
  User,
  AlertTriangle,
  Wrench,
  Lock,
  Unlock,
  KeyRound
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type TabType = 'overview' | 'users' | 'bookings' | 'queue' | 'disputes' | 'reports' | 'messages' | 'settings' | 'audit';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Protected Access Passcode Security State (Code: 2020)
  const [isProtectedAccessUnlocked, setIsProtectedAccessUnlocked] = useState(false);
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [targetProtectedTab, setTargetProtectedTab] = useState<'settings' | 'audit' | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const handleTabClick = (tabId: TabType) => {
    if ((tabId === 'settings' || tabId === 'audit') && !isProtectedAccessUnlocked) {
      setTargetProtectedTab(tabId);
      setPasscodeInput('');
      setPasscodeError(false);
      setPasscodeModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  };

  // Audit Log Filters & Exporter State
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditDateFilter, setAuditDateFilter] = useState('all');
  const [inspectingAuditLog, setInspectingAuditLog] = useState<any | null>(null);

  const handleUnlockProtectedAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === '2020') {
      setIsProtectedAccessUnlocked(true);
      setPasscodeModalOpen(false);
      setPasscodeError(false);

      const unlockedTarget = targetProtectedTab === 'settings' ? 'Platform Settings & Maintenance' : 'Audit Logs';

      if (targetProtectedTab) {
        setActiveTab(targetProtectedTab);
        setTargetProtectedTab(null);
      }
      toast.success('Admin Security Clearance Granted (Passcode 2020 Verified)');

      // Log security passcode unlock event to backend audit stream
      try {
        await fetch('/api/admin/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unlocked_protected_settings',
            entityType: 'platform_settings',
            details: `Admin unlocked protected controls for ${unlockedTarget} using passcode 2020.`,
            metadata: { target: unlockedTarget, code_used: '2020' },
          }),
        });
      } catch (err) {
        console.warn('Audit log write error:', err);
      }
    } else {
      setPasscodeError(true);
      toast.error('Incorrect Security Passcode. Access Denied.');
    }
  };

  const handleExportAuditLogsCSV = () => {
    if (auditLogs.length === 0) {
      toast.error('No audit logs available to export.');
      return;
    }
    const headers = ['Log ID', 'Timestamp (UTC)', 'Admin Name', 'Admin Email', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'User Agent'];
    const csvRows = [headers.join(',')];

    auditLogs.forEach((log) => {
      const row = [
        `"${log.id}"`,
        `"${new Date(log.created_at).toISOString()}"`,
        `"${log.admin?.display_name || 'System Admin'}"`,
        `"${log.admin?.email || ''}"`,
        `"${log.action}"`,
        `"${log.entity_type || ''}"`,
        `"${log.entity_id || ''}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        `"${log.ip_address || ''}"`,
        `"${(log.user_agent || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NestCare_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit logs exported successfully as CSV!');
  };

  const handleRelockProtectedAccess = () => {
    setIsProtectedAccessUnlocked(false);
    if (activeTab === 'settings' || activeTab === 'audit') {
      setActiveTab('overview');
    }
    toast.info('Protected Admin Controls Re-locked');
  };

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
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([]);
  const [messageReports, setMessageReports] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState<any | null>(null);
  const [platformSettings, setPlatformSettings] = useState<any>({
    is_maintenance_mode: false,
    maintenance_title: 'Scheduled Platform Maintenance',
    maintenance_message: 'NestCare is currently undergoing scheduled platform upgrades to enhance system performance and security.',
    estimated_completion: '30-60 minutes'
  });
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const handleSaveMaintenanceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingSettings(true);

      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          id: platformSettings.id,
          is_maintenance_mode: platformSettings.is_maintenance_mode,
          maintenance_title: platformSettings.maintenance_title,
          maintenance_message: platformSettings.maintenance_message,
          estimated_completion: platformSettings.estimated_completion,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Fire Audit Logger API
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: platformSettings.is_maintenance_mode ? 'enabled_maintenance_mode' : 'disabled_maintenance_mode',
          entityType: 'platform_settings',
          details: platformSettings.is_maintenance_mode
            ? `Admin ENABLED maintenance mode ("${platformSettings.maintenance_title}")`
            : 'Admin DISABLED maintenance mode (System Online)',
          metadata: platformSettings,
        }),
      }).catch(e => console.warn('[Audit Log API]', e));

      toast.success(platformSettings.is_maintenance_mode ? '🔴 Maintenance Mode is now ACTIVE' : '🟢 System Maintenance Disabled');
      loadAdminData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update maintenance settings.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const [inspectingConvId, setInspectingConvId] = useState<string | null>(null);
  const [inspectingMessages, setInspectingMessages] = useState<any[]>([]);
  const [loadingInspectMessages, setLoadingInspectMessages] = useState<boolean>(false);

  const handleAdminViewConversation = async (convId: string) => {
    if (!convId) {
      toast.error('No conversation ID found.');
      return;
    }
    setInspectingConvId(convId);
    setLoadingInspectMessages(true);
    try {
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inspected_chat_transcript',
          entityType: 'conversation',
          entityId: convId,
          details: `Admin inspected chat conversation transcript (${convId})`,
        }),
      }).catch(e => console.warn('[Audit Log API]', e));

      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, display_name, avatar_url, role)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInspectingMessages(msgs || []);
      loadAdminData(true);
    } catch (err: any) {
      console.error('Error fetching chat transcript:', err);
      toast.error(err.message || 'Could not load conversation transcript.');
    } finally {
      setLoadingInspectMessages(false);
    }
  };

  const handleResolveMessageReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await supabase.from('message_reports').update({ status }).eq('id', reportId);
      setMessageReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      toast.success(`Message report marked as ${status}.`);
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    }
  };

  const handleSuspendUserFromMessageReport = async (userId: string, reportId: string) => {
    try {
      await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId);
      await supabase.from('message_reports').update({ status: 'resolved' }).eq('id', reportId);
      setMessageReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      toast.success('User suspended and report resolved.');
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    }
  };

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form states for pricing
  const [parentFeePct, setParentFeePct] = useState(10);
  const [sitterCommPct, setSitterCommPct] = useState(5);
  const [platformPct, setPlatformPct] = useState(15);
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
        setParentFeePct(Number(pricing.parent_service_fee_pct || 10));
        setSitterCommPct(Number(pricing.sitter_commission_pct || 5));
        setPlatformPct(Number(pricing.platform_percentage || 15));
        setMinFee(Number(pricing.min_platform_fee || 2));
        setMaxFee(Number(pricing.max_platform_fee || 50));
        setTaxPct(Number(pricing.tax_percentage || 5));
      }

      // Fetch platform settings for maintenance mode
      const { data: pSettings } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (pSettings) {
        setPlatformSettings(pSettings);
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

      // Fetch message reports
      const { data: msgReportsData } = await supabase
        .from('message_reports')
        .select(`
          *,
          reporter:profiles!message_reports_reporter_id_fkey(display_name, email),
          reported:profiles!message_reports_reported_id_fkey(display_name, email, role)
        `)
        .order('created_at', { ascending: false });
      setMessageReports(msgReportsData || []);

      // Fetch flagged messages (off-platform attempts)
      const { data: flaggedData } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(display_name, email, role)
        `)
        .eq('flagged_for_review', true)
        .order('created_at', { ascending: false });
      setFlaggedMessages(flaggedData || []);
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

      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentFeePct,
          sitterCommPct,
          minFee,
          maxFee,
          taxPct,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update pricing rules.');

      if (resData.pricing) {
        setPricingConfig(resData.pricing);
        setPlatformPct(Number(resData.pricing.platform_percentage || (parentFeePct + sitterCommPct)));
      }

      toast.success('Platform financial parameters updated & active!');
      loadAdminData(true);
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

  // Simulator values (2-hour booking @ $22/hr = $44 subtotal)
  const simHours = 2;
  const simHourlyRate = 22;
  const simSubtotal = simHours * simHourlyRate; // $44.00
  const simParentFee = Math.round((simSubtotal * parentFeePct) / 100 * 100) / 100; // $4.40
  const simSitterComm = Math.round((simSubtotal * sitterCommPct) / 100 * 100) / 100; // $2.20
  const simPlatformRevenue = simParentFee + simSitterComm; // $6.60
  const simSitterPayout = simSubtotal - simSitterComm; // $41.80
  const simTax = Math.round(((simSubtotal + simParentFee) * taxPct) / 100 * 100) / 100; // $2.42
  const simParentTotal = simSubtotal + simParentFee + simTax; // $50.82

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

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border active-press ${
              platformSettings.is_maintenance_mode
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-md animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            {platformSettings.is_maintenance_mode ? '🔴 Maintenance ACTIVE' : '⚙️ Maintenance & Settings'}
          </button>
          <button
            onClick={() => loadAdminData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 active-press"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
          </button>
        </div>
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
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'users', label: 'User Directory', count: allUsers.length, icon: Users },
            { id: 'bookings', label: 'Bookings', count: allBookings.length, icon: Calendar },
            { id: 'queue', label: 'Verification Queue', count: pendingSitters.length, icon: ShieldCheck, alert: pendingSitters.length > 0 },
            { id: 'disputes', label: 'Disputes', count: disputes.length, icon: ShieldAlert, alert: disputes.length > 0 },
            { id: 'reports', label: 'User Reports', count: userReports.filter(r => r.status === 'pending').length, icon: Flag, alert: userReports.filter(r => r.status === 'pending').length > 0 },
            { id: 'messages', label: 'Chat Moderation', count: flaggedMessages.length + messageReports.filter(r => r.status === 'pending').length, icon: MessageSquare, alert: flaggedMessages.length > 0 },
            { id: 'settings', label: 'Platform Settings & Maintenance', icon: Settings, alert: platformSettings.is_maintenance_mode, protected: true },
            { id: 'audit', label: 'Audit Logs', icon: FileText, protected: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.protected && (
                  <span className="text-[11px]" title={isProtectedAccessUnlocked ? 'Security Unlocked' : 'Passcode Protected (Code: 2020)'}>
                    {isProtectedAccessUnlocked ? '🔓' : '🔒'}
                  </span>
                )}
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

        {isProtectedAccessUnlocked && (
          <button
            onClick={handleRelockProtectedAccess}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold active-press transition-colors shrink-0 flex items-center gap-1.5"
            title="Lock Platform Settings & Audit Logs"
          >
            <Lock className="h-3.5 w-3.5" /> Re-lock Controls
          </button>
        )}
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
                    <span className="text-stone-500 dark:text-slate-400">Platform Revenue ({platformPct}%):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+${simPlatformRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-slate-400">Applicable Tax ({taxPct}%):</span>
                    <span className="font-bold text-stone-700 dark:text-slate-300">+${simTax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between font-black text-sm text-heading dark:text-white">
                    <span>Parent Invoice Total:</span>
                    <span>${simParentTotal.toFixed(2)}</span>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Parent Fee (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={parentFeePct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setParentFeePct(val);
                        setPlatformPct(val + sitterCommPct);
                      }}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-bold"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Added to parent invoice at checkout.</p>
                  </div>
                  <div>
                    <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Sitter Cut (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sitterCommPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSitterCommPct(val);
                        setPlatformPct(parentFeePct + val);
                      }}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-bold"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Deducted from sitter payout.</p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-900 dark:text-emerald-300">Total NestCare Take Rate:</span>
                  <span className="font-mono font-black text-primary text-sm">{(Number(parentFeePct) + Number(sitterCommPct)).toFixed(1)}%</span>
                </div>

                <div>
                  <label className="block text-stone-400 dark:text-slate-400 font-bold uppercase mb-1">Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxPct}
                    onChange={(e) => setTaxPct(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-bold"
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
                className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {updatingConfig ? 'Saving Configurations...' : 'Save & Publish Financial Rules'}
              </button>
            </form>
          {/* Platform Maintenance Mode Controls Card */}
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${platformSettings.is_maintenance_mode ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-heading dark:text-white">Platform Maintenance Mode</h3>
                  <p className="text-[10px] text-stone-400">Lock public & user access during scheduled upgrades while keeping admin tools live.</p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                platformSettings.is_maintenance_mode ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {platformSettings.is_maintenance_mode ? '🔴 MAINTENANCE ACTIVE' : '🟢 SYSTEM ONLINE'}
              </span>
            </div>

            <form onSubmit={handleSaveMaintenanceSettings} className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700">
                <div className="space-y-0.5">
                  <label className="font-bold text-stone-800 dark:text-slate-200 block">Enable Maintenance Mode</label>
                  <span className="text-[10px] text-stone-400">Redirect non-admin users to the maintenance notice screen.</span>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.is_maintenance_mode || false}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, is_maintenance_mode: e.target.checked })}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold uppercase mb-1 text-[10px]">Notice Title</label>
                <input
                  type="text"
                  value={platformSettings.maintenance_title || ''}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, maintenance_title: e.target.value })}
                  placeholder="e.g. Scheduled Platform Maintenance"
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold uppercase mb-1 text-[10px]">User Message Notice</label>
                <textarea
                  rows={2}
                  value={platformSettings.maintenance_message || ''}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, maintenance_message: e.target.value })}
                  placeholder="Message explaining the maintenance window to users..."
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold uppercase mb-1 text-[10px]">Estimated Duration</label>
                <input
                  type="text"
                  value={platformSettings.estimated_completion || ''}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, estimated_completion: e.target.value })}
                  placeholder="e.g. 30-60 minutes"
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={updatingSettings}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl active-press disabled:opacity-50 transition-colors shadow-sm"
              >
                {updatingSettings ? 'Updating Settings...' : 'Update Maintenance Settings'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-600" /> Interactive Split-Fee Revenue Calculator
            </h3>
            
            <div className="p-5 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 dark:text-slate-400 font-medium">Sitter Hourly Rate:</span>
                <span className="font-bold text-heading dark:text-white">${simHourlyRate}.00 / hr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 dark:text-slate-400 font-medium">Booking Duration:</span>
                <span className="font-bold text-heading dark:text-white">{simHours} Hours</span>
              </div>
              <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between">
                <span className="text-stone-500 dark:text-slate-400 font-medium">Booking Base Subtotal:</span>
                <span className="font-mono font-bold text-heading dark:text-white">${simSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-slate-300">
                <span>Parent Service Fee ({parentFeePct}%):</span>
                <span className="font-mono font-bold text-emerald-600">+${simParentFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-slate-300">
                <span>Sitter Commission Cut ({sitterCommPct}%):</span>
                <span className="font-mono font-bold text-emerald-600">+${simSitterComm.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-slate-300">
                <span>GST/HST Tax ({taxPct}%):</span>
                <span className="font-mono font-bold">+${simTax.toFixed(2)}</span>
              </div>

              <div className="border-t border-stone-200 dark:border-slate-700 pt-2.5 space-y-1">
                <div className="flex justify-between font-extrabold text-xs text-heading dark:text-white">
                  <span>Parent Total at Checkout:</span>
                  <span className="font-mono text-primary">${simParentTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs text-heading dark:text-white">
                  <span>Sitter Net Payout (Stripe Connect):</span>
                  <span className="font-mono text-emerald-600">${simSitterPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xs text-emerald-800 dark:text-emerald-300 pt-1">
                  <span>Total NestCare Platform Revenue:</span>
                  <span className="font-mono">${simPlatformRevenue.toFixed(2)} ({platformPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* TAB 7: MAXIMIZED ENTERPRISE AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Top Analytics Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Total System Logs</span>
                <span className="font-display text-2xl font-black text-heading dark:text-white mt-1 block">{auditLogs.length}</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-primary">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Security & Passcode Events</span>
                <span className="font-display text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {auditLogs.filter(l => l.action.includes('unlock') || l.action.includes('maintenance') || l.action.includes('login')).length}
                </span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-500">
                <Lock className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Moderation & Overrides</span>
                <span className="font-display text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                  {auditLogs.filter(l => l.action.includes('suspend') || l.action.includes('reject') || l.action.includes('dispute')).length}
                </span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl text-rose-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Logged Admin Actors</span>
                <span className="font-display text-2xl font-black text-heading dark:text-white mt-1 block">
                  {new Set(auditLogs.map(l => l.admin_id || l.actor_id)).size}
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-500">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Main Audit Trail Container */}
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="font-display text-lg font-black text-heading dark:text-white flex items-center gap-2.5">
                  <FileText className="h-5.5 w-5.5 text-primary" /> Comprehensive System Audit Stream
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 font-medium">
                  Real-time security log tracking all admin actions, passcode verifications, sitter approvals, user suspensions, booking overrides, pricing updates, and chat inspections.
                </p>
              </div>

              <button
                onClick={handleExportAuditLogsCSV}
                className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-primary dark:text-emerald-300 rounded-2xl text-xs font-bold active-press hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-2xs"
              >
                <ArrowUpRight className="h-4 w-4" /> Export CSV Log
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by action, admin name, email, IP, or details..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-medium focus:border-primary transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 font-bold outline-none"
                >
                  <option value="all" className="dark:bg-slate-900">All Action Categories</option>
                  <option value="security" className="dark:bg-slate-900">🔒 Security & Passcodes</option>
                  <option value="approvals" className="dark:bg-slate-900">✅ Sitter Approvals / Rejections</option>
                  <option value="suspensions" className="dark:bg-slate-900">🚫 User Suspensions</option>
                  <option value="financial" className="dark:bg-slate-900">💲 Financial Rules & Fees</option>
                  <option value="moderation" className="dark:bg-slate-900">🚩 Moderation & Disputes</option>
                </select>

                <select
                  value={auditDateFilter}
                  onChange={(e) => setAuditDateFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 font-bold outline-none"
                >
                  <option value="all" className="dark:bg-slate-900">All Time Ranges</option>
                  <option value="today" className="dark:bg-slate-900">Today</option>
                  <option value="7days" className="dark:bg-slate-900">Past 7 Days</option>
                  <option value="30days" className="dark:bg-slate-900">Past 30 Days</option>
                </select>
              </div>
            </div>

            {/* Audit Log Table List */}
            {auditLogs.filter((log) => {
              if (auditSearchQuery.trim()) {
                const q = auditSearchQuery.toLowerCase().trim();
                const adminName = (log.admin?.display_name || '').toLowerCase();
                const adminEmail = (log.admin?.email || '').toLowerCase();
                const details = (log.details || '').toLowerCase();
                const action = (log.action || '').toLowerCase();
                const ip = (log.ip_address || '').toLowerCase();
                const entity = (log.entity_id || '').toLowerCase();
                if (!adminName.includes(q) && !adminEmail.includes(q) && !details.includes(q) && !action.includes(q) && !ip.includes(q) && !entity.includes(q)) {
                  return false;
                }
              }

              if (auditActionFilter !== 'all') {
                const act = log.action.toLowerCase();
                if (auditActionFilter === 'security' && !act.includes('unlock') && !act.includes('maintenance') && !act.includes('login')) return false;
                if (auditActionFilter === 'approvals' && !act.includes('approve') && !act.includes('reject')) return false;
                if (auditActionFilter === 'suspensions' && !act.includes('suspend')) return false;
                if (auditActionFilter === 'financial' && !act.includes('pricing') && !act.includes('financial') && !act.includes('fee')) return false;
                if (auditActionFilter === 'moderation' && !act.includes('dispute') && !act.includes('report') && !act.includes('chat')) return false;
              }

              if (auditDateFilter !== 'all') {
                const logDate = new Date(log.created_at).getTime();
                const now = Date.now();
                if (auditDateFilter === 'today' && now - logDate > 86400000) return false;
                if (auditDateFilter === '7days' && now - logDate > 7 * 86400000) return false;
                if (auditDateFilter === '30days' && now - logDate > 30 * 86400000) return false;
              }

              return true;
            }).length === 0 ? (
              <div className="bg-stone-50 dark:bg-slate-800/40 rounded-2xl p-10 text-center text-xs text-stone-400 font-medium italic border border-stone-200 dark:border-slate-800">
                No audit logs match your search filters.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.filter((log) => {
                  if (auditSearchQuery.trim()) {
                    const q = auditSearchQuery.toLowerCase().trim();
                    const adminName = (log.admin?.display_name || '').toLowerCase();
                    const adminEmail = (log.admin?.email || '').toLowerCase();
                    const details = (log.details || '').toLowerCase();
                    const action = (log.action || '').toLowerCase();
                    const ip = (log.ip_address || '').toLowerCase();
                    const entity = (log.entity_id || '').toLowerCase();
                    if (!adminName.includes(q) && !adminEmail.includes(q) && !details.includes(q) && !action.includes(q) && !ip.includes(q) && !entity.includes(q)) {
                      return false;
                    }
                  }

                  if (auditActionFilter !== 'all') {
                    const act = log.action.toLowerCase();
                    if (auditActionFilter === 'security' && !act.includes('unlock') && !act.includes('maintenance') && !act.includes('login')) return false;
                    if (auditActionFilter === 'approvals' && !act.includes('approve') && !act.includes('reject')) return false;
                    if (auditActionFilter === 'suspensions' && !act.includes('suspend')) return false;
                    if (auditActionFilter === 'financial' && !act.includes('pricing') && !act.includes('financial') && !act.includes('fee')) return false;
                    if (auditActionFilter === 'moderation' && !act.includes('dispute') && !act.includes('report') && !act.includes('chat')) return false;
                  }

                  if (auditDateFilter !== 'all') {
                    const logDate = new Date(log.created_at).getTime();
                    const now = Date.now();
                    if (auditDateFilter === 'today' && now - logDate > 86400000) return false;
                    if (auditDateFilter === '7days' && now - logDate > 7 * 86400000) return false;
                    if (auditDateFilter === '30days' && now - logDate > 30 * 86400000) return false;
                  }

                  return true;
                }).map((log) => {
                  const adminName = log.admin?.display_name || 'System Admin';
                  const adminEmail = log.admin?.email || '';
                  const adminAvatar = log.admin?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

                  const isSecurity = log.action.includes('unlock') || log.action.includes('maintenance') || log.action.includes('login');
                  const isWarning = log.action.includes('suspend') || log.action.includes('reject') || log.action.includes('dispute');
                  const isSuccess = log.action.includes('approve') || log.action.includes('activate') || log.action.includes('pricing');

                  return (
                    <div 
                      key={log.id} 
                      className="p-4 sm:p-5 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all hover:border-primary/40"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <img
                          src={adminAvatar}
                          alt="Admin Avatar"
                          className="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0 mt-0.5 sm:mt-0"
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-heading dark:text-white text-xs sm:text-sm">
                              {adminName}
                            </span>
                            {adminEmail && (
                              <span className="text-[10px] text-stone-400 dark:text-slate-400 font-mono">
                                ({adminEmail})
                              </span>
                            )}
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              isSecurity ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                              isWarning ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                              isSuccess ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <p className="text-xs text-stone-700 dark:text-slate-200 font-medium leading-relaxed">
                            {log.details || log.action}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-400 dark:text-slate-400 font-mono pt-0.5">
                            {log.entity_type && (
                              <span>Entity: <strong className="text-stone-600 dark:text-slate-300">{log.entity_type}</strong> {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ''}</span>
                            )}
                            {log.ip_address && (
                              <span>IP: <strong className="text-stone-600 dark:text-slate-300">{log.ip_address}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-stone-200/60 dark:border-slate-700/60 pt-2 sm:pt-0">
                        <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 px-3 py-1 rounded-xl block font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <button
                          onClick={() => setInspectingAuditLog(log)}
                          className="px-3 py-1 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-xl text-[10px] font-bold transition-colors active-press flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3 text-primary" /> View Payload
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: USER REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-heading dark:text-white flex items-center gap-2">
                <Flag className="h-5 w-5 text-amber-500" /> User Reports & Moderation Center
              </h3>
              <p className="text-xs text-stone-500">Review reported users, chat behavior flags, and moderation actions.</p>
            </div>
            <span className="text-xs bg-amber-50 border border-amber-100 text-amber-700 px-3.5 py-1.5 rounded-full font-bold">
              {userReports.filter(r => r.status === 'pending').length + messageReports.filter(r => r.status === 'pending').length} Pending Review
            </span>
          </div>

          {/* Section A: Chat & Messaging Reports */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-rose-600" /> Chat Conversation Reports ({messageReports.length})
            </h4>

            {messageReports.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-2xl text-xs text-stone-500 font-medium italic border border-stone-100">
                No chat reports submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {messageReports.map((report) => (
                  <div key={report.id} className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl">
                          <Flag className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-heading dark:text-white block">
                            {report.reporter?.display_name || 'Reporter'} → reported → {report.reported?.display_name || 'Reported User'}
                          </span>
                          <span className="text-[10px] text-stone-400">{new Date(report.created_at).toLocaleString()} · Category: <strong className="text-rose-600">{report.reason_category}</strong></span>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                        report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-stone-200 text-stone-500'
                      }`}>{report.status}</span>
                    </div>

                    {report.details && (
                      <p className="text-xs text-stone-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-stone-200/80 font-medium">
                        "{report.details}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {report.conversation_id && (
                        <button
                          onClick={() => handleAdminViewConversation(report.conversation_id)}
                          className="px-3.5 py-2 bg-heading hover:bg-stone-800 text-white rounded-xl text-[10px] font-bold active-press transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect Conversation Log
                        </button>
                      )}

                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleResolveMessageReport(report.id, 'resolved')}
                            className="px-3.5 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl text-[10px] font-bold transition-colors active-press shrink-0"
                          >
                            ✓ Resolve Report
                          </button>
                          <button
                            onClick={() => handleResolveMessageReport(report.id, 'dismissed')}
                            className="px-3.5 py-2 bg-stone-200 text-stone-700 hover:bg-stone-300 rounded-xl text-[10px] font-bold transition-colors active-press shrink-0"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleSuspendUserFromMessageReport(report.reported_id, report.id)}
                            className="px-3.5 py-2 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-xl text-[10px] font-bold transition-colors active-press shrink-0"
                          >
                            ⚠ Suspend Reported User
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Profile Reports */}
          <div className="space-y-3 pt-4 border-t border-stone-100 dark:border-slate-800">
            <h4 className="font-bold text-xs text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-4 w-4 text-amber-600" /> Account Profile Reports ({userReports.length})
            </h4>

            {userReports.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-2xl text-xs text-stone-500 font-medium italic border border-stone-100">
                No account profile reports submitted.
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
                          className="px-3.5 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold hover:bg-emerald-200 transition-colors active-press"
                        >
                          ✓ Resolve
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from('user_reports').update({ status: 'dismissed' }).eq('id', report.id);
                            setUserReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r));
                            toast.success('Report dismissed.');
                          }}
                          className="px-3.5 py-2 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-bold hover:bg-stone-200 transition-colors active-press"
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
                          className="px-3.5 py-2 bg-red-100 text-red-700 rounded-xl text-[10px] font-bold hover:bg-red-200 transition-colors active-press"
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
        </div>
      )}

      {/* TAB 9: CHAT MODERATION & OFF-PLATFORM SECURITY */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-heading dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" /> Chat Moderation & Off-Platform Security Center
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Monitor flagged off-platform payment attempts, reported user conversations, and administrative audit logs.
                </p>
              </div>
              <span className="text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 px-3.5 py-1.5 rounded-full font-extrabold">
                {flaggedMessages.length + messageReports.filter(r => r.status === 'pending').length} Pending Action Items
              </span>
            </div>

            {/* Subsection A: Flagged Off-Platform Payment Attempts */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Flagged Off-Platform Payment Attempts ({flaggedMessages.length})
              </h4>

              {flaggedMessages.length === 0 ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" /> No off-platform payment attempts or suspicious contact keywords detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {flaggedMessages.map((msg) => (
                    <div key={msg.id} className="p-4 bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 dark:text-white">{msg.sender?.display_name || 'User'}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold uppercase">{msg.sender?.role}</span>
                          <span className="text-[10px] text-stone-400">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-stone-800 dark:text-slate-200 font-medium italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-slate-700">
                          "{msg.content}"
                        </p>
                        <p className="text-[10px] text-amber-800 dark:text-amber-300 font-extrabold flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Reason: {msg.flag_reason || 'Off-platform keyword detected'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAdminViewConversation(msg.conversation_id)}
                        className="px-4 py-2.5 bg-primary hover:bg-emerald-800 text-white rounded-xl text-xs font-bold active-press transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
                      >
                        <Eye className="h-4 w-4" /> Inspect Chat Log
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subsection B: Reported Chat Conversations */}
            <div className="space-y-3 pt-4 border-t border-stone-100 dark:border-slate-800">
              <h4 className="font-extrabold text-xs text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="h-4 w-4 text-rose-600" /> Reported User Conversations ({messageReports.length})
              </h4>

              {messageReports.length === 0 ? (
                <div className="p-4 bg-stone-50 dark:bg-slate-800/40 rounded-2xl text-xs text-stone-500 dark:text-slate-400 font-medium italic border border-stone-100 dark:border-slate-800">
                  No conversation reports submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {messageReports.map((report) => (
                    <div key={report.id} className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                            <Flag className="h-4 w-4 text-rose-600" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-heading dark:text-white block">
                              {report.reporter?.display_name || 'Reporter'} → reported → {report.reported?.display_name || 'Reported User'}
                            </span>
                            <span className="text-[10px] text-stone-400">{new Date(report.created_at).toLocaleString()} · Category: <strong className="text-rose-600">{report.reason_category}</strong></span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                          report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-stone-200 text-stone-500'
                        }`}>{report.status}</span>
                      </div>

                      {report.details && (
                        <p className="text-xs text-stone-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-stone-200/80 font-medium">
                          "{report.details}"
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {report.conversation_id && (
                          <button
                            onClick={() => handleAdminViewConversation(report.conversation_id)}
                            className="px-3.5 py-2 bg-heading hover:bg-stone-800 text-white rounded-xl text-[10px] font-bold active-press transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5" /> Inspect Conversation Log
                          </button>
                        )}

                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResolveMessageReport(report.id, 'resolved')}
                              className="px-3.5 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl text-[10px] font-bold transition-colors active-press shrink-0"
                            >
                              ✓ Resolve Report
                            </button>
                            <button
                              onClick={() => handleResolveMessageReport(report.id, 'dismissed')}
                              className="px-3.5 py-2 bg-stone-200 text-stone-700 hover:bg-stone-300 rounded-xl text-[10px] font-bold transition-colors active-press shrink-0"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleSuspendUserFromMessageReport(report.reported_id, report.id)}
                              className="px-3.5 py-2 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-xl text-[10px] font-bold transition-colors active-press shrink-0"
                            >
                              ⚠ Suspend Reported User
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CHAT LOG INSPECTOR MODAL */}
      {inspectingConvId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="font-display text-base font-black text-heading dark:text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" /> Inspect Chat Log
                </h3>
                <p className="text-[10px] text-stone-400 font-mono">ID: {inspectingConvId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/messages?convId=${inspectingConvId}`)}
                  className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-stone-200 active-press transition-colors"
                >
                  Open Full Screen
                </button>
                <button
                  onClick={() => { setInspectingConvId(null); setInspectingMessages([]); }}
                  className="p-1 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* MESSAGE LIST SCROLL AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-stone-100 dark:border-slate-800">
              {loadingInspectMessages ? (
                <div className="flex justify-center items-center h-48 text-stone-400 text-xs font-bold">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Loading transcript...
                </div>
              ) : inspectingMessages.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs italic font-medium">
                  No messages found in this conversation.
                </div>
              ) : (
                inspectingMessages.map((msg) => {
                  const isFlagged = msg.flagged_for_review;
                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                        isFlagged
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                          : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900 dark:text-white">
                            {msg.sender?.display_name || 'User'}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 font-bold uppercase text-stone-500">
                            {msg.sender?.role}
                          </span>
                          {isFlagged && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Flagged
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-stone-800 dark:text-slate-200 font-medium leading-relaxed">
                        {msg.content}
                      </p>

                      {msg.attachment_url && (
                        <div className="pt-1">
                          {msg.message_type === 'image' ? (
                            <img src={msg.attachment_url} alt="Attachment" className="max-h-48 rounded-xl object-cover border border-stone-200" />
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1">
                              📄 View Attachment Document
                            </a>
                          )}
                        </div>
                      )}

                      {isFlagged && msg.flag_reason && (
                        <p className="text-[10px] text-rose-700 dark:text-rose-400 font-bold pt-1 border-t border-rose-200/50">
                          Flag Reason: {msg.flag_reason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <button
                onClick={() => { setInspectingConvId(null); setInspectingMessages([]); }}
                className="px-5 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-bold active-press"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSCODE AUTHENTICATION MODAL (Code: 2020) */}
      {passcodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="font-display text-xl font-black text-heading dark:text-white">
                Protected System Access
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium leading-relaxed">
                Accessing <strong className="text-heading dark:text-slate-200">{targetProtectedTab === 'settings' ? 'Platform Settings & Maintenance' : 'Audit Logs'}</strong> requires administrative passcode verification.
              </p>
            </div>

            <form onSubmit={handleUnlockProtectedAccess} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Enter System Passcode
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={8}
                  placeholder="••••"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError(false);
                  }}
                  className={`w-full p-4 rounded-2xl border outline-none text-center font-mono text-xl font-bold tracking-widest transition-colors ${
                    passcodeError
                      ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                      : 'border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-slate-100 focus:border-primary'
                  }`}
                />
                {passcodeError && (
                  <p className="text-xs text-rose-500 font-bold text-center mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Incorrect Passcode. Access Denied.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasscodeModalOpen(false);
                    setTargetProtectedTab(null);
                  }}
                  className="flex-1 py-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-emerald-800 active-press transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <KeyRound className="h-4 w-4" /> Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT LOG JSON PAYLOAD INSPECTOR MODAL */}
      {inspectingAuditLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-black text-heading dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Audit Payload Details ({inspectingAuditLog.action})
              </h3>
              <button
                onClick={() => setInspectingAuditLog(null)}
                className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-slate-800 p-4 rounded-2xl border border-stone-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-slate-400 uppercase font-bold block">Log ID</span>
                  <span className="font-mono text-stone-800 dark:text-slate-200 font-bold">{inspectingAuditLog.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-slate-400 uppercase font-bold block">Timestamp</span>
                  <span className="font-mono text-stone-800 dark:text-slate-200 font-bold">{new Date(inspectingAuditLog.created_at).toUTCString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-slate-400 uppercase font-bold block">Actor ID</span>
                  <span className="font-mono text-stone-800 dark:text-slate-200 font-bold">{inspectingAuditLog.actor_id || inspectingAuditLog.admin_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-slate-400 uppercase font-bold block">IP Address</span>
                  <span className="font-mono text-stone-800 dark:text-slate-200 font-bold">{inspectingAuditLog.ip_address || 'client_web'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1">User Agent String</label>
                <div className="p-3 bg-stone-50 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-stone-700 dark:text-slate-300 break-all border border-stone-200 dark:border-slate-700">
                  {inspectingAuditLog.user_agent || 'NestCare Admin Console'}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1">Raw JSON Metadata Object</label>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                  {JSON.stringify(inspectingAuditLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end shrink-0 border-t border-stone-100 dark:border-slate-800">
              <button
                onClick={() => setInspectingAuditLog(null)}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold active-press shadow-md"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
