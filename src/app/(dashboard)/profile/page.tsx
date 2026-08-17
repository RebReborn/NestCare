'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  User, Loader2, Save, ExternalLink, ShieldCheck, DollarSign, Baby, Heart, 
  Pencil, X, Check, Camera, Mail, Calendar, CreditCard, Image as ImageIcon,
  Plus, Trash2, Clock, Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PaymentMethodsModal } from '@/components/payments/payment-methods-modal';

const SERVICES = ['In-home Babysitting', 'Overnight Care', 'After-school Pickup', 'Daycare Pickup', 'Weekend Care', 'Emergency Care'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'American Sign Language'];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<'parent' | 'sitter' | 'admin' | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Edit Mode Toggles
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingPro, setIsEditingPro] = useState(false);
  const [isEditingGallery, setIsEditingGallery] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Profile fields (shared)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Temp draft states for Basic Info edit mode
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');

  // Sitter-specific profile fields
  const [headline, setHeadline] = useState('');
  const [hourlyRate, setHourlyRate] = useState(18);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [maxChildren, setMaxChildren] = useState(3);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Sitter Gallery fields
  const [galleryUrls, setGalleryUrls] = useState<string[]>(['']);
  const [coverUrl, setCoverUrl] = useState('');

  // Sitter availability summary
  const [availRules, setAvailRules] = useState<any[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState('');

  // Parent Specific fields
  const [savedSitters, setSavedSitters] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserId(user.id);
        setUserEmail(user.email || '');

        // Fetch profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (prof) {
          setRole(prof.role);
          setFirstName(prof.first_name || '');
          setLastName(prof.last_name || '');
          setBio(prof.bio || '');
          setAvatarUrl(prof.avatar_url || '');

          setDraftFirstName(prof.first_name || '');
          setDraftLastName(prof.last_name || '');
          setDraftBio(prof.bio || '');
          setDraftAvatarUrl(prof.avatar_url || '');

          if (prof.role === 'sitter') {
            const { data: sitterDetails } = await supabase
              .from('sitter_profiles')
              .select(`
                headline,
                hourly_rate,
                years_experience,
                max_children,
                gallery_urls,
                cover_url,
                sitter_services(service_type),
                sitter_languages(language)
              `)
              .eq('id', user.id)
              .maybeSingle();

            if (sitterDetails) {
              setHeadline(sitterDetails.headline || '');
              setHourlyRate(Number(sitterDetails.hourly_rate || 18));
              setYearsExperience(sitterDetails.years_experience || 0);
              setMaxChildren(sitterDetails.max_children || 3);
              
              const sList = (sitterDetails as any).sitter_services?.map((s: any) => s.service_type) || [];
              const lList = (sitterDetails as any).sitter_languages?.map((l: any) => l.language) || [];
              setSelectedServices(sList);
              setSelectedLanguages(lList);

              const urls = sitterDetails.gallery_urls || [];
              setGalleryUrls(urls.length > 0 ? urls : ['']);
              setCoverUrl(sitterDetails.cover_url || '');
            }

            // Fetch availability rules
            const { data: rules } = await supabase
              .from('availability_rules')
              .select('*')
              .eq('sitter_id', user.id);
            setAvailRules(rules || []);

            // Fetch Stripe Connect account status
            const { data: stAcc } = await supabase
              .from('stripe_accounts')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();

            if (stAcc && (stAcc.charges_enabled || stAcc.stripe_account_id)) {
              setStripeConnected(true);
              setStripeAccountId(stAcc.stripe_account_id);
            }

          } else if (prof.role === 'parent') {
            const { data: kids } = await supabase
              .from('children')
              .select('*')
              .eq('parent_id', user.id);
            setChildren(kids || []);

            const { data: favs } = await supabase
              .from('favorites')
              .select(`
                sitter_id,
                sitter:sitter_profiles(
                  id,
                  hourly_rate,
                  years_experience,
                  profile:profiles(
                    display_name,
                    avatar_url
                  )
                )
              `)
              .eq('parent_id', user.id);

            const mappedFavs = (favs || []).map((f: any) => {
              const s = f.sitter;
              return {
                id: s.id,
                name: s.profile?.display_name || 'Caregiver',
                avatar_url: s.profile?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
                hourly_rate: s.hourly_rate,
                years_experience: s.years_experience,
              };
            });
            setSavedSitters(mappedFavs);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleServiceChange = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      const displayInitial = draftLastName ? `${draftLastName[0]}.` : '';
      const newDisplayName = `${draftFirstName} ${displayInitial}`.trim();

      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          first_name: draftFirstName,
          last_name: draftLastName,
          display_name: newDisplayName,
          bio: draftBio,
          avatar_url: draftAvatarUrl,
        })
        .eq('id', userId);

      if (profErr) throw profErr;

      setFirstName(draftFirstName);
      setLastName(draftLastName);
      setBio(draftBio);
      setAvatarUrl(draftAvatarUrl);
      setIsEditingBasic(false);

      toast.success('Basic profile information updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update basic info.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || role !== 'sitter') return;

    try {
      setSaving(true);
      const finalUrls = galleryUrls.map(url => url.trim()).filter(Boolean);

      const { error: sitterErr } = await supabase
        .from('sitter_profiles')
        .update({
          headline,
          hourly_rate: hourlyRate,
          years_experience: yearsExperience,
          max_children: maxChildren,
          gallery_urls: finalUrls,
          cover_url: coverUrl.trim() || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
        })
        .eq('id', userId);

      if (sitterErr) throw sitterErr;

      await supabase.from('sitter_services').delete().eq('sitter_id', userId);
      if (selectedServices.length > 0) {
        const sInsert = selectedServices.map(s => ({ sitter_id: userId, service_type: s }));
        const { error: sErr } = await supabase.from('sitter_services').insert(sInsert);
        if (sErr) throw sErr;
      }

      await supabase.from('sitter_languages').delete().eq('sitter_id', userId);
      if (selectedLanguages.length > 0) {
        const lInsert = selectedLanguages.map(l => ({ sitter_id: userId, language: l }));
        const { error: lErr } = await supabase.from('sitter_languages').insert(lInsert);
        if (lErr) throw lErr;
      }

      setIsEditingPro(false);
      setIsEditingGallery(false);
      toast.success('Professional details saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update professional details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-black text-heading dark:text-white">Profile Overview</h1>
          <p className="text-xs text-stone-400 mt-1">Manage your public information and account details.</p>
        </div>
        <div className="flex gap-2">
          {role === 'sitter' && (
            <button
              onClick={() => router.push(`/sitter/${userId}`)}
              className="px-4 py-2.5 bg-emerald-50 text-primary dark:bg-emerald-950/50 dark:text-emerald-300 rounded-2xl active-press hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-bold transition-all"
            >
              <ExternalLink className="h-4 w-4" /> View Public Profile
            </button>
          )}
          <button
            onClick={() => router.push('/settings')}
            className="px-4 py-2.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 rounded-2xl active-press hover:bg-stone-200 flex items-center gap-1.5 text-xs font-bold transition-all"
          >
            Settings
          </button>
        </div>
      </div>

      {/* ============================================================
         1. BASIC INFORMATION CARD (DISPLAY MODE / EDIT MODE TOGGLE)
         ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-all">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4 mb-4">
          <h2 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Basic Information
          </h2>

          {!isEditingBasic ? (
            <button
              type="button"
              onClick={() => {
                setDraftFirstName(firstName);
                setDraftLastName(lastName);
                setDraftBio(bio);
                setDraftAvatarUrl(avatarUrl);
                setIsEditingBasic(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-bold active-press transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> Edit Info
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingBasic(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-600 dark:text-slate-300 rounded-xl text-xs font-bold active-press transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>

        {/* DISPLAY MODE */}
        {!isEditingBasic ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-100 dark:border-slate-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={firstName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shrink-0"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-xl shrink-0">
                  {firstName?.[0] || 'U'}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-black text-heading dark:text-white">
                    {firstName} {lastName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {role || 'User'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <Mail className="h-3.5 w-3.5" /> {userEmail}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">About Me / Bio</span>
              <div className="p-4 bg-stone-50/70 dark:bg-slate-800/40 rounded-2xl border border-stone-100 dark:border-slate-800 text-xs text-stone-700 dark:text-slate-200 leading-relaxed">
                {bio ? (
                  <p className="whitespace-pre-line">{bio}</p>
                ) : (
                  <p className="italic text-stone-400">No biography provided yet. Click "Edit Info" above to add details about yourself.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form onSubmit={handleSaveBasicInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={draftFirstName}
                  onChange={(e) => setDraftFirstName(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={draftLastName}
                  onChange={(e) => setDraftLastName(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={draftAvatarUrl}
                onChange={(e) => setDraftAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo..."
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">About Me / Biography</label>
              <textarea
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                rows={4}
                placeholder="Tell other parents or caregivers about yourself..."
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Basic Info</>}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBasic(false)}
                className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================
         2. SITTER SPECIFIC: MANAGE SHIFTS & AVAILABILITY WIDGET
         ============================================================ */}
      {role === 'sitter' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Manage Shifts & Availability
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Configure your weekly working schedule and block vacation dates.</p>
            </div>
            <button
              onClick={() => router.push('/availability')}
              className="px-4 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Calendar className="h-4 w-4" /> Manage Shifts & Calendar
            </button>
          </div>

          <div className="bg-stone-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-stone-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-2">Weekly Schedule Overview</h4>
            {availRules.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No recurring shift rules set up yet. Click 'Manage Shifts' above to configure your calendar.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availRules.map((rule) => (
                  <div key={rule.id || rule.day} className="px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold">
                    <span className="text-primary font-bold">{DAY_NAMES[rule.day]}:</span> {rule.startTime} - {rule.endTime}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
         3. SITTER SPECIFIC: STRIPE PAYOUT & EARNINGS SETUP
         ============================================================ */}
      {role === 'sitter' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-teal-600" /> Stripe Payout Setup
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {stripeConnected 
                  ? 'Your bank account is connected via Stripe Express to receive direct deposits.'
                  : 'Connect your bank account to receive direct deposits for completed bookings.'}
              </p>
            </div>

            <button
              onClick={async () => {
                try {
                  setSaving(true);
                  toast.info(stripeConnected ? 'Opening Stripe Account Manager...' : 'Initiating Stripe Connect Express setup...');
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
              disabled={saving}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold active-press transition-colors flex items-center gap-1.5 shadow-sm shrink-0 disabled:opacity-50 ${
                stripeConnected 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : stripeConnected ? (
                <>
                  <Check className="h-4 w-4" /> Manage Stripe Account
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Connect Stripe Express
                </>
              )}
            </button>
          </div>

          <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs border ${
            stripeConnected 
              ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' 
              : 'bg-teal-50/50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900'
          }`}>
            <span className={`font-semibold ${stripeConnected ? 'text-emerald-950 dark:text-emerald-200' : 'text-teal-900 dark:text-teal-200'}`}>
              {stripeConnected 
                ? `✓ Connected (${stripeAccountId || 'Stripe Express Direct Deposit'})` 
                : 'Automatic Direct Deposit Payouts (CAD)'}
            </span>
            <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
              stripeConnected 
                ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100' 
                : 'bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100'
            }`}>
              {stripeConnected ? 'Connected & Verified' : 'Setup Pending'}
            </span>
          </div>
        </div>
      )}

      {/* PARENT SPECIFIC: SAVED PAYMENT METHODS */}
      {role === 'parent' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Saved Payment Methods
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Manage credit cards used for booking childcare appointments.</p>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors"
            >
              + Manage Cards
            </button>
          </div>

          <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-700 font-black text-xs">
                💳 VISA
              </div>
              <div>
                <strong className="block text-xs font-bold text-heading dark:text-white">Visa ending in 4242</strong>
                <span className="text-[10px] text-stone-400">Expires 12/28 · Default Payment Method</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-[10px] font-bold">
              Default
            </span>
          </div>
        </div>
      )}

      <PaymentMethodsModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />

      {/* ============================================================
         4. SITTER SPECIFIC: CARE GALLERY & MEDIA PHOTOS MANAGER
         ============================================================ */}
      {role === 'sitter' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" /> Care Gallery & Media Photos
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Showcase your care environment, activities, and background photos.</p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingGallery(!isEditingGallery)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-bold active-press transition-colors shrink-0"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> {isEditingGallery ? 'Close Gallery Editor' : 'Edit Gallery Photos'}
            </button>
          </div>

          {/* DISPLAY MODE PREVIEW */}
          {!isEditingGallery ? (
            <div className="space-y-4">
              {/* Cover Banner Preview */}
              {coverUrl && (
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Profile Banner Image</span>
                  <img src={coverUrl} alt="Banner Cover" className="w-full h-36 rounded-2xl object-cover border border-stone-200 dark:border-slate-700 shadow-xs" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}

              {/* Gallery Grid Preview */}
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Care Photo Showcase</span>
                {galleryUrls.filter(Boolean).length === 0 ? (
                  <p className="text-xs text-stone-400 italic bg-stone-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-stone-100 dark:border-slate-800">
                    No care gallery photos added yet. Click "Edit Gallery Photos" above to add photo URLs!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryUrls.filter(Boolean).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Care photo ${i + 1}`}
                        className="w-full h-28 rounded-2xl object-cover border border-stone-200 dark:border-slate-700 hover-scale"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM FOR GALLERY */
            <form onSubmit={handleSaveProDetails} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Banner Cover Image URL</label>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Care Gallery Photo URLs</label>
                {galleryUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...galleryUrls];
                        newUrls[idx] = e.target.value;
                        setGalleryUrls(newUrls);
                      }}
                      placeholder={`Photo ${idx + 1} URL (https://...)`}
                      className="flex-1 p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                    />
                    {galleryUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGalleryUrls(galleryUrls.filter((_, i) => i !== idx))}
                        className="p-3.5 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-2xl text-xs font-bold hover:bg-red-100 active-press transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setGalleryUrls([...galleryUrls, ''])}
                  className="w-full py-3 border border-dashed border-stone-300 dark:border-slate-700 hover:border-primary text-stone-500 dark:text-slate-300 hover:text-primary rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Another Care Photo URL
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Care Gallery</>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingGallery(false)}
                  className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Parent-specific Dashboard Details */}
      {role === 'parent' && (
        <div className="space-y-6">
          {/* Registered Children */}
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-sm font-bold text-heading dark:text-white flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" /> Registered Children
              </h3>
              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Manage Children
              </button>
            </div>

            {children.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No child profiles registered yet. Add them in settings.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {children.map((child) => {
                  const age = new Date().getFullYear() - new Date(child.date_of_birth).getFullYear();
                  return (
                    <div 
                      key={child.id} 
                      className="p-3.5 bg-stone-50 dark:bg-slate-800/60 border border-stone-150 dark:border-slate-700 rounded-2xl flex items-center gap-3"
                    >
                      <span className="p-2.5 bg-primary/10 rounded-xl text-primary font-display font-black text-sm shrink-0">
                        👶
                      </span>
                      <div>
                        <strong className="block text-xs text-heading dark:text-white font-black">{child.first_name}</strong>
                        <span className="text-[10px] text-stone-400 font-semibold">{age} years old</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saved Sitters Grid */}
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-sm font-bold text-heading dark:text-white flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" /> Saved Sitter Favorites
              </h3>
              <button
                type="button"
                onClick={() => router.push('/search')}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Find Sitters
              </button>
            </div>

            {savedSitters.length === 0 ? (
              <p className="text-xs text-stone-400 italic">You haven't favorited any sitters yet. Search to find care!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedSitters.map((sitter) => (
                  <button
                    key={sitter.id}
                    type="button"
                    onClick={() => router.push(`/sitter/${sitter.id}`)}
                    className="p-3.5 bg-stone-50 dark:bg-slate-800/60 border border-stone-150 dark:border-slate-700 hover:border-primary rounded-2xl flex items-center gap-3 text-left transition-all active-press w-full"
                  >
                    <img 
                      src={sitter.avatar_url} 
                      alt={sitter.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-slate-700" 
                    />
                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs text-heading dark:text-white font-black truncate">{sitter.name}</strong>
                      <span className="text-[10px] text-stone-400 block font-semibold">
                        ${sitter.hourly_rate}/hr • {sitter.years_experience} yrs exp
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sitter Professional Details */}
      {role === 'sitter' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <h3 className="font-display text-sm font-bold text-heading dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Professional Caregiver Details
            </h3>
            <button
              type="button"
              onClick={() => setIsEditingPro(!isEditingPro)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-bold active-press transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> {isEditingPro ? 'Close Editor' : 'Edit Professional Info'}
            </button>
          </div>

          <form onSubmit={handleSaveProDetails} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Headline / Title</label>
              <input
                type="text"
                disabled={!isEditingPro}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Certified Infant Specialist & CPR Trained"
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary disabled:opacity-80"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3 text-stone-400" /> Rate ($ / hr)
                </label>
                <input
                  type="number"
                  disabled={!isEditingPro}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary disabled:opacity-80"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Experience (Yrs)</label>
                <input
                  type="number"
                  disabled={!isEditingPro}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary disabled:opacity-80"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Max Kids Cap</label>
                <input
                  type="number"
                  disabled={!isEditingPro}
                  value={maxChildren}
                  onChange={(e) => setMaxChildren(Number(e.target.value))}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary disabled:opacity-80"
                />
              </div>
            </div>

            {/* Offered Care Services */}
            <div className="space-y-2 border-t border-stone-100 dark:border-slate-800 pt-4">
              <label className="block text-[10px] font-bold text-stone-400 uppercase">Offered Care Services</label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map((service) => (
                  <label key={service} className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={!isEditingPro}
                      checked={selectedServices.includes(service)}
                      onChange={() => handleServiceChange(service)}
                      className="h-4.5 w-4.5 rounded border-stone-300 text-primary accent-primary disabled:opacity-80"
                    />
                    {service}
                  </label>
                ))}
              </div>
            </div>

            {/* Spoken Languages */}
            <div className="space-y-2 border-t border-stone-100 dark:border-slate-800 pt-4">
              <label className="block text-[10px] font-bold text-stone-400 uppercase">Spoken Languages</label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <label key={lang} className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={!isEditingPro}
                      checked={selectedLanguages.includes(lang)}
                      onChange={() => handleLanguageChange(lang)}
                      className="h-4.5 w-4.5 rounded border-stone-300 text-primary accent-primary disabled:opacity-80"
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </div>

            {isEditingPro && (
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4.5 w-4.5" /> Save Professional Details</>}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
