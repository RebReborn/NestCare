'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ThemeSettingsControl } from '@/components/theme-toggle';
import { PaymentMethodsModal } from '@/components/payments/payment-methods-modal';
import { Settings, LogOut, Loader2, Save, Baby, Plus, Trash2, Edit2, ShieldAlert, CheckCircle, Bell, FileText, User, CreditCard, Compass } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  // Private account settings state
  const [phone, setPhone] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // Children state (for parents)
  const [children, setChildren] = useState<any[]>([]);
  const [newChildName, setNewChildName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildGroup, setNewChildGroup] = useState('toddler');
  const [newChildAllergies, setNewChildAllergies] = useState('');
  const [newChildNotes, setNewChildNotes] = useState('');
  const [newChildMedications, setNewChildMedications] = useState('');
  const [newChildSchool, setNewChildSchool] = useState('');
  const [newChildAuthorizedPickup, setNewChildAuthorizedPickup] = useState(true);

  // Editing Child states
  const [editingChild, setEditingChild] = useState<any | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildDob, setEditChildDob] = useState('');
  const [editChildGroup, setEditChildGroup] = useState('toddler');
  const [editChildAllergies, setEditChildAllergies] = useState('');
  const [editChildNotes, setEditChildNotes] = useState('');
  const [editChildMedications, setEditChildMedications] = useState('');
  const [editChildSchool, setEditChildSchool] = useState('');
  const [editChildAuthorizedPickup, setEditChildAuthorizedPickup] = useState(true);

  // Emergency Contacts state
  const [primaryName, setPrimaryName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryRelation, setPrimaryRelation] = useState('');

  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [secondaryRelation, setSecondaryRelation] = useState('');

  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorClinic, setDoctorClinic] = useState('');
  
  const [savingContacts, setSavingContacts] = useState(false);

  // Deactivate account panel state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [useFloatingNav, setUseFloatingNav] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUseFloatingNav(localStorage.getItem('use_floating_nav') === 'true');
    }
  }, []);

  const handleToggleFloatingNav = (checked: boolean) => {
    setUseFloatingNav(checked);
    localStorage.setItem('use_floating_nav', checked ? 'true' : 'false');
    window.dispatchEvent(new Event('floating_nav_changed'));
    toast.success(checked ? 'Floating navigation menu activated!' : 'Traditional bottom bar activated!');
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (prof) {
          setProfile(prof);
          setPhone(prof.phone || '');

          if (prof.role === 'parent') {
            // Fetch children
            const { data: kids } = await supabase
              .from('children')
              .select('*')
              .eq('parent_id', user.id);
            setChildren(kids || []);

            // Fetch emergency contacts
            const { data: contacts } = await supabase
              .from('emergency_contacts')
              .select('*')
              .eq('parent_id', user.id);

            const primary = contacts?.find(c => c.contact_type === 'primary');
            const secondary = contacts?.find(c => c.contact_type === 'secondary');
            const doctor = contacts?.find(c => c.contact_type === 'doctor');

            if (primary) {
              setPrimaryName(primary.name || '');
              setPrimaryPhone(primary.phone || '');
              setPrimaryRelation(primary.relationship || '');
            }
            if (secondary) {
              setSecondaryName(secondary.name || '');
              setSecondaryPhone(secondary.phone || '');
              setSecondaryRelation(secondary.relationship || '');
            }
            if (doctor) {
              setDoctorName(doctor.name || '');
              setDoctorPhone(doctor.phone || '');
              setDoctorClinic(doctor.notes || '');
            }
          }

          // Fetch Stripe Connect status
          const { data: stAcc } = await supabase
            .from('stripe_accounts')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (stAcc && (stAcc.charges_enabled || stAcc.stripe_account_id)) {
            setStripeConnected(true);
          }

          // Fetch notifications preference settings (simulated or database)
          const { data: pref } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('profile_id', user.id)
            .maybeSingle();

          if (pref) {
            setEmailNotifications(pref.email_enabled);
            setSmsNotifications(pref.sms_enabled);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);

      // Update phone in profiles
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', profile.id);

      if (profErr) throw profErr;

      // Upsert notification preferences
      const { error: prefErr } = await supabase
        .from('notification_preferences')
        .upsert({
          profile_id: profile.id,
          email_enabled: emailNotifications,
          sms_enabled: smsNotifications,
        }, { onConflict: 'profile_id' });

      if (prefErr) throw prefErr;

      toast.success('Account configurations saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configurations.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName || !newChildDob || !profile) return;

    try {
      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: profile.id,
          first_name: newChildName,
          date_of_birth: newChildDob,
          age_group: newChildGroup,
          allergies: newChildAllergies.trim() || null,
          special_instructions: newChildNotes.trim() || null,
          medications: newChildMedications.trim() || null,
          school: newChildSchool.trim() || null,
          authorized_pickup: newChildAuthorizedPickup,
        })
        .select()
        .single();

      if (error) throw error;
      setChildren(prev => [...prev, data]);
      setNewChildName('');
      setNewChildDob('');
      setNewChildAllergies('');
      setNewChildNotes('');
      setNewChildMedications('');
      setNewChildSchool('');
      setNewChildAuthorizedPickup(true);
      toast.success('Child profile added successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add child.');
    }
  };

  const handleSaveEditedChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild || !editChildName || !editChildDob) return;

    try {
      const { data, error } = await supabase
        .from('children')
        .update({
          first_name: editChildName,
          date_of_birth: editChildDob,
          age_group: editChildGroup,
          allergies: editChildAllergies.trim() || null,
          special_instructions: editChildNotes.trim() || null,
          medications: editChildMedications.trim() || null,
          school: editChildSchool.trim() || null,
          authorized_pickup: editChildAuthorizedPickup,
        })
        .eq('id', editingChild.id)
        .select()
        .single();

      if (error) throw error;
      setChildren(prev => prev.map(c => c.id === editingChild.id ? data : c));
      setEditingChild(null);
      toast.success('Child profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save child changes.');
    }
  };

  const handleSaveEmergencyContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSavingContacts(true);

      const contactUpserts = [];

      if (primaryName || primaryPhone) {
        contactUpserts.push({
          parent_id: profile.id,
          contact_type: 'primary',
          name: primaryName,
          phone: primaryPhone,
          relationship: primaryRelation || 'Primary Contact',
        });
      }
      if (secondaryName || secondaryPhone) {
        contactUpserts.push({
          parent_id: profile.id,
          contact_type: 'secondary',
          name: secondaryName,
          phone: secondaryPhone,
          relationship: secondaryRelation || 'Secondary Contact',
        });
      }
      if (doctorName || doctorPhone) {
        contactUpserts.push({
          parent_id: profile.id,
          contact_type: 'doctor',
          name: doctorName,
          phone: doctorPhone,
          relationship: 'Pediatrician',
          notes: doctorClinic || null,
        });
      }

      if (contactUpserts.length > 0) {
        const { error } = await supabase
          .from('emergency_contacts')
          .upsert(contactUpserts, { onConflict: 'parent_id, contact_type' });

        if (error) throw error;
      }

      toast.success('Emergency contacts saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save emergency contacts.');
    } finally {
      setSavingContacts(false);
    }
  };

  const startEditingChild = (child: any) => {
    setEditingChild(child);
    setEditChildName(child.first_name);
    setEditChildDob(child.date_of_birth);
    setEditChildGroup(child.age_group || 'toddler');
    setEditChildAllergies(child.allergies || '');
    setEditChildNotes(child.special_instructions || '');
    setEditChildMedications(child.medications || '');
    setEditChildSchool(child.school || '');
    setEditChildAuthorizedPickup(child.authorized_pickup ?? true);
  };

  const handleDeleteChild = async (childId: string) => {
    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      if (error) throw error;
      setChildren(prev => prev.filter(c => c.id !== childId));
      toast.success('Child profile deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete child.');
    }
  };

  const handleDeactivate = async () => {
    if (!profile) return;
    try {
      setDeactivating(true);
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'deactivated' })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Account deactivated');
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate account.');
    } finally {
      setDeactivating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-black text-heading">Account Settings</h1>
          <p className="text-xs text-stone-400 mt-1">Manage private configurations, alerts, and billing options.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/profile')}
            className="p-3.5 bg-stone-100 text-stone-600 rounded-2xl active-press hover:bg-stone-200 flex items-center gap-1.5 text-xs font-bold transition-all"
          >
            Public Profile
          </button>
          <button
            onClick={handleSignOut}
            className="p-3.5 bg-red-50 text-red-600 rounded-2xl active-press hover:bg-red-100 flex items-center gap-1.5 text-xs font-bold transition-all"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Account Settings Form */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Appearance & Theme Preference Card */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-3">
          <h3 className="font-display text-sm font-bold text-heading flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Appearance & Theme
          </h3>
          <p className="text-[11px] text-stone-500">Choose your preferred visual theme for NestCare.</p>
          <ThemeSettingsControl />
        </div>

        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-bold text-heading flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Private Account Details
          </h3>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Contact Email (Private)</label>
            <input
              type="text"
              disabled
              value={profile?.email || ''}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-100/70 text-stone-500 cursor-not-allowed outline-none"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">To alter your registered email address, contact platform administration.</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Private Mobile Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. (555) 019-9234"
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Mobile Navigation Style Card */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-bold text-heading dark:text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" /> Navigation Style (Mobile)
          </h3>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Choose how you navigate the application on mobile devices.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleToggleFloatingNav(false)}
              className={`p-4 rounded-2xl border text-left transition-all active-press cursor-pointer ${
                !useFloatingNav
                  ? 'border-primary bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-primary/20 font-bold'
                  : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <strong className="block text-xs font-bold text-heading dark:text-white mb-0.5">Bottom Nav Bar</strong>
              <span className="text-[10px] text-stone-400 dark:text-slate-400 block leading-tight">Traditional fixed layout at the bottom of the screen.</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleFloatingNav(true)}
              className={`p-4 rounded-2xl border text-left transition-all active-press cursor-pointer ${
                useFloatingNav
                  ? 'border-primary bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-primary/20 font-bold'
                  : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <strong className="block text-xs font-bold text-heading dark:text-white mb-0.5">Floating Menu (FAB)</strong>
              <span className="text-[10px] text-stone-400 dark:text-slate-400 block leading-tight">Modern, expandable floating compass navigation menu.</span>
            </button>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-bold text-heading flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Alert Preferences
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <span className="text-xs font-bold text-heading block">Email Alerts</span>
                <span className="text-[10px] text-stone-400 block">Get email updates for booking approvals and messages.</span>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={() => setEmailNotifications(!emailNotifications)}
                className="h-5 w-5 rounded border-stone-300 text-primary accent-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none border-t border-stone-100 pt-3">
              <div>
                <span className="text-xs font-bold text-heading block">SMS Text Messages</span>
                <span className="text-[10px] text-stone-400 block">Get emergency instant notifications for last-minute pickups.</span>
              </div>
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={() => setSmsNotifications(!smsNotifications)}
                className="h-5 w-5 rounded border-stone-300 text-primary accent-primary"
              />
            </label>
          </div>
        </div>

        {/* Payments & Payouts Card */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-bold text-heading dark:text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Payments & Payout Setup
          </h3>

          {profile?.role === 'sitter' ? (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 dark:text-slate-400">
                {stripeConnected 
                  ? 'Your bank account is connected via Stripe Express to receive direct deposits.'
                  : 'Connect your bank account through Stripe Express to receive automatic payouts for completed bookings.'}
              </p>
              <div className={`flex items-center justify-between p-3.5 border rounded-2xl ${
                stripeConnected 
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' 
                  : 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900'
              }`}>
                <div>
                  <strong className={`block text-xs font-bold ${stripeConnected ? 'text-emerald-950 dark:text-emerald-200' : 'text-teal-900 dark:text-teal-200'}`}>
                    {stripeConnected ? '✓ Stripe Account Connected' : 'Stripe Connect Account'}
                  </strong>
                  <span className={`text-[10px] ${stripeConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-teal-700 dark:text-teal-400'}`}>
                    {stripeConnected ? 'Direct Deposit Active · CAD Payouts Enabled' : 'Direct Deposit (CAD) · Setup Pending'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setSaving(true);
                      toast.info(stripeConnected ? 'Opening Stripe Express Manager...' : 'Connecting to Stripe Express...');
                      const res = await fetch('/api/connect/onboarding-link', { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to start Stripe onboarding.');
                      if (data.url) {
                        toast.success('Redirecting to Stripe Express...');
                        window.location.href = data.url;
                      }
                    } catch (err: any) {
                      toast.error(err.message || 'Stripe Connect error.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className={`px-3.5 py-2 text-white rounded-xl text-xs font-bold active-press transition-colors ${
                    stripeConnected ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {stripeConnected ? 'Manage Stripe Account' : 'Connect Stripe'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Manage your saved credit cards for instant childcare checkout.
              </p>
              <div className="p-3.5 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-white dark:bg-slate-900 rounded-lg font-black border border-stone-200 text-[10px]">VISA</span>
                  <div>
                    <strong className="block font-bold text-heading dark:text-white">Visa ending in 4242</strong>
                    <span className="text-[10px] text-stone-400">Expires 12/28 · Default</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Manage Cards
                </button>
              </div>
            </div>
          )}
        </div>

        <PaymentMethodsModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4.5 w-4.5" /> Save Preferences
            </>
          )}
        </button>
      </form>

      {/* Children Section (Visible only to parents) */}
      {profile?.role === 'parent' && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-display text-sm font-bold text-heading flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" /> Registered Children Profiles
            </h3>
            <p className="text-xs text-stone-400 mt-1">Add details for matching childcare needs.</p>
          </div>

          <div className="space-y-2">
            {children.length === 0 ? (
              <p className="text-xs text-stone-400 italic bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                No child profiles registered yet. Add your children below.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {children.map((c) => (
                  <div key={c.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-150 flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-heading block">👶 {c.first_name}</span>
                      <span className="text-[10px] text-stone-450 block font-semibold capitalize">{c.age_group} • {c.date_of_birth}</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {c.school && (
                          <span className="text-[9px] block text-blue-700 font-bold bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5 self-start w-fit">
                            🏫 School: {c.school}
                          </span>
                        )}
                        {c.allergies && (
                          <span className="text-[9px] block text-red-700 font-bold bg-red-50 border border-red-100 rounded-lg px-2 py-0.5 self-start w-fit">
                            ⚠️ Allergies: {c.allergies}
                          </span>
                        )}
                        {c.medications && (
                          <span className="text-[9px] block text-amber-700 font-bold bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 self-start w-fit">
                            💊 Medications: {c.medications}
                          </span>
                        )}
                        <span className={`text-[9px] block font-bold border rounded-lg px-2 py-0.5 self-start w-fit ${
                          c.authorized_pickup 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                            : 'text-red-700 bg-red-50 border-red-100'
                        }`}>
                          {c.authorized_pickup ? '✓ Authorized Pickup' : '✗ No Pickup Auth'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditingChild(c)}
                        className="p-2 text-stone-400 hover:text-primary rounded-lg active-press transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteChild(c.id)}
                        className="p-2 text-stone-400 hover:text-red-500 rounded-lg active-press transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Child Form */}
          <form onSubmit={handleAddChild} className="border-t border-stone-100 pt-4 space-y-3.5">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Register New Child</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  placeholder="Tommy"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={newChildDob}
                  onChange={(e) => setNewChildDob(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Age Group</label>
                <select
                  value={newChildGroup}
                  onChange={(e) => setNewChildGroup(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs bg-stone-50 font-bold"
                >
                  <option value="infant">Infant (0-1 Yrs)</option>
                  <option value="toddler">Toddler (1-3 Yrs)</option>
                  <option value="preschooler">Preschooler (3-5 Yrs)</option>
                  <option value="school_aged">School Aged (5+ Yrs)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Allergies (If Any)</label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Dairy"
                  value={newChildAllergies}
                  onChange={(e) => setNewChildAllergies(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">School / Daycare Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lincoln Elementary"
                  value={newChildSchool}
                  onChange={(e) => setNewChildSchool(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Medications</label>
                <input
                  type="text"
                  placeholder="e.g. Asthma Inhaler"
                  value={newChildMedications}
                  onChange={(e) => setNewChildMedications(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 py-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={newChildAuthorizedPickup}
                  onChange={(e) => setNewChildAuthorizedPickup(e.target.checked)}
                  className="rounded accent-primary"
                />
                Sitter authorized for pickup?
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Special Instructions & Medical Notes</label>
              <textarea
                placeholder="e.g. Bedtime details, dietary specifications..."
                value={newChildNotes}
                onChange={(e) => setNewChildNotes(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={!newChildName || !newChildDob}
              className="w-full py-3 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-xl active-press transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-4.5 w-4.5" /> Register Child
            </button>
          </form>
        </div>
      )}

      {/* Emergency Contacts configuration */}
      {profile?.role === 'parent' && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-display text-sm font-bold text-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" /> Emergency Contacts Policy
            </h3>
            <p className="text-xs text-stone-400 mt-1">Configure emergency contacts. Sitter will get one-click access during active bookings.</p>
          </div>

          <form onSubmit={handleSaveEmergencyContacts} className="space-y-4 text-xs">
            {/* Primary Contact */}
            <div className="space-y-2 border-b border-stone-100 pb-3">
              <h4 className="font-bold text-xs text-heading flex items-center gap-1.5 text-stone-700 font-semibold">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Primary Emergency Contact
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Name</label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={primaryName}
                    onChange={(e) => setPrimaryName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Phone</label>
                  <input
                    type="text"
                    placeholder="555-0199"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Relationship</label>
                  <input
                    type="text"
                    placeholder="Mother / Spouse"
                    value={primaryRelation}
                    onChange={(e) => setPrimaryRelation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Contact */}
            <div className="space-y-2 border-b border-stone-100 pb-3">
              <h4 className="font-bold text-xs text-heading flex items-center gap-1.5 text-stone-700 font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Secondary Emergency Contact
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={secondaryName}
                    onChange={(e) => setSecondaryName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Phone</label>
                  <input
                    type="text"
                    placeholder="555-0188"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Relationship</label>
                  <input
                    type="text"
                    placeholder="Uncle / Friend"
                    value={secondaryRelation}
                    onChange={(e) => setSecondaryRelation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
              </div>
            </div>

            {/* Doctor / Pediatrician */}
            <div className="space-y-2 pb-1">
              <h4 className="font-bold text-xs text-heading flex items-center gap-1.5 text-stone-700 font-semibold">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Doctor / Pediatrician
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Doctor Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Smith"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Doctor Phone</label>
                  <input
                    type="text"
                    placeholder="555-0177"
                    value={doctorPhone}
                    onChange={(e) => setDoctorPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Clinic / Notes</label>
                  <input
                    type="text"
                    placeholder="Sunny Kids Clinic"
                    value={doctorClinic}
                    onChange={(e) => setDoctorClinic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 outline-none font-semibold text-stone-800"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingContacts}
              className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5 shadow-sm font-semibold"
            >
              {savingContacts ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" /> Save Emergency Contacts
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Edit Child Overlay Dialog Modal */}
      {editingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xl w-full max-w-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <span className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">👶</span>
              <div>
                <h3 className="font-display font-black text-sm text-heading">Edit Child Profile</h3>
                <p className="text-[10px] text-stone-400">Update medical and general configurations.</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditedChild} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    value={editChildName}
                    onChange={(e) => setEditChildName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editChildDob}
                    onChange={(e) => setEditChildDob(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Age Group</label>
                  <select
                    value={editChildGroup}
                    onChange={(e) => setEditChildGroup(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 font-bold"
                  >
                    <option value="infant">Infant (0-1 Yrs)</option>
                    <option value="toddler">Toddler (1-3 Yrs)</option>
                    <option value="preschooler">Preschooler (3-5 Yrs)</option>
                    <option value="school_aged">School Aged (5+ Yrs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Allergies</label>
                  <input
                    type="text"
                    value={editChildAllergies}
                    onChange={(e) => setEditChildAllergies(e.target.value)}
                    placeholder="None"
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">School / Daycare</label>
                  <input
                    type="text"
                    value={editChildSchool}
                    onChange={(e) => setEditChildSchool(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Medications</label>
                  <input
                    type="text"
                    value={editChildMedications}
                    onChange={(e) => setEditChildMedications(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={editChildAuthorizedPickup}
                    onChange={(e) => setEditChildAuthorizedPickup(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  Sitter authorized for pickup?
                </label>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Instructions / Notes</label>
                <textarea
                  value={editChildNotes}
                  onChange={(e) => setEditChildNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-emerald-800 active-press transition-colors text-center text-[11px]"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingChild(null)}
                  className="flex-1 py-3 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 active-press transition-colors text-center text-[11px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legal & Compliance Card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-display text-sm font-bold text-heading flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Legal & Support
        </h3>
        <p className="text-[11px] text-stone-500">Read our policies, terms, and reach out to our support team for help.</p>
        <div className="grid grid-cols-1 gap-2">
          <Link
            href="/privacy"
            className="py-3 px-4 border border-stone-200 hover:bg-stone-50 hover:border-primary/30 rounded-xl text-[11px] font-bold text-stone-700 active-press transition-all flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </span>
              Privacy Policy
            </span>
            <span className="text-stone-300">›</span>
          </Link>
          <Link
            href="/terms"
            className="py-3 px-4 border border-stone-200 hover:bg-stone-50 hover:border-primary/30 rounded-xl text-[11px] font-bold text-stone-700 active-press transition-all flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="p-1.5 bg-stone-100 rounded-lg border border-stone-200">
                <FileText className="h-3.5 w-3.5 text-stone-600" />
              </span>
              Terms of Service
            </span>
            <span className="text-stone-300">›</span>
          </Link>
          <Link
            href="/support"
            className="py-3 px-4 border border-stone-200 hover:bg-stone-50 hover:border-sky-200 rounded-xl text-[11px] font-bold text-stone-700 active-press transition-all flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-50 rounded-lg border border-sky-100">
                <Bell className="h-3.5 w-3.5 text-sky-600" />
              </span>
              Support Center
            </span>
            <span className="text-stone-300">›</span>
          </Link>
        </div>
      </div>

      {/* Danger Zone: Account Deactivation */}
      <div className="bg-red-50/20 border border-red-200/60 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-display text-sm font-bold text-red-700 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" /> Danger Zone
        </h3>
        <p className="text-[11px] text-stone-500">Deactivating your account will suspend your profile, cancel pending bookings, and sign you out.</p>

        {showDeactivateConfirm ? (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs font-bold text-red-800">Are you absolutely sure you want to deactivate your account?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold active-press hover:bg-red-700 flex items-center gap-1"
              >
                {deactivating && <Loader2 className="h-3 w-3 animate-spin" />} Yes, Deactivate Account
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold active-press hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeactivateConfirm(true)}
            className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold active-press transition-colors"
          >
            Deactivate My Account
          </button>
        )}
      </div>
    </div>
  );
}
