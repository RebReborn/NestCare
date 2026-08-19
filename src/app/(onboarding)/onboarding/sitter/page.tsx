'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Baby, User, Briefcase, LayoutGrid, Calendar, DollarSign,
  ShieldCheck, Search, Users, Car, AlertTriangle, FileText,
  CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
  Loader2, Star, Clock, Heart, Upload, Info,
  Smile, Palette, GraduationCap, UserCheck, School, Bus, Moon, Sparkles, BookOpen, Utensils, HeartHandshake, Footprints, PartyPopper, Stethoscope, Timer, Save, Lock, BadgeCheck, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import LocationAutocompleteInput from '@/components/location/location-autocomplete-input';
import { geocodeLocation } from '@/lib/location/geocoder';

// ─── Constants ───────────────────────────────────────────────
const PLATFORM_FEE = 0.10;
const TOTAL_STEPS = 12;
const POLICY_VERSION = '1.0';

const STEP_CONFIG = [
  { n: 1,  icon: Baby,         title: 'Welcome',               subtitle: 'Get started with NestCare' },
  { n: 2,  icon: User,         title: 'Basic Identity & Location', subtitle: 'Tell us about yourself & your service area' },
  { n: 3,  icon: Briefcase,    title: 'Childcare Experience',   subtitle: 'Your background & qualifications' },
  { n: 4,  icon: LayoutGrid,   title: 'Services',               subtitle: 'What you offer families' },
  { n: 5,  icon: Calendar,     title: 'Availability',           subtitle: 'Your weekly schedule' },
  { n: 6,  icon: DollarSign,   title: 'Pricing',                subtitle: 'Set your rates' },
  { n: 7,  icon: ShieldCheck,  title: 'Identity Verification',  subtitle: 'Verify your identity' },
  { n: 8,  icon: Search,       title: 'Background Screening',   subtitle: 'Build family trust' },
  { n: 9,  icon: Users,        title: 'References',             subtitle: 'People who know your work' },
  { n: 10, icon: Car,          title: 'Transportation',         subtitle: 'Transport services' },
  { n: 11, icon: AlertTriangle,title: 'Safety Agreement',       subtitle: 'Child safety commitment' },
  { n: 12, icon: FileText,     title: 'Provider Agreement',     subtitle: 'Accept our terms' },
];

const CHILDCARE_TYPES = [
  'In-home babysitting', 'Nannying (full-time)', 'Daycare assistance',
  'After-school care', 'Overnight care', 'Weekend care', 'Special needs care',
];
const AGE_GROUPS = [
  { label: 'Infants', range: '0–1 yr', icon: Baby },
  { label: 'Toddlers', range: '1–3 yrs', icon: Smile },
  { label: 'Preschool', range: '3–5 yrs', icon: Palette },
  { label: 'School-age', range: '5–12 yrs', icon: GraduationCap },
  { label: 'Teens', range: '13+ yrs', icon: UserCheck },
];
const SERVICES = [
  { id: 'babysitting',       label: 'Babysitting',           icon: Baby },
  { id: 'after_school',      label: 'After-School Pickup',   icon: School },
  { id: 'daycare_pickup',    label: 'Daycare Pickup',        icon: Bus },
  { id: 'weekend_care',      label: 'Weekend Care',          icon: Calendar },
  { id: 'evening_care',      label: 'Evening Care',          icon: Moon },
  { id: 'overnight_care',    label: 'Overnight Care',        icon: Sparkles },
  { id: 'homework_help',     label: 'Homework Assistance',   icon: BookOpen },
  { id: 'meal_prep',         label: 'Meal Preparation',      icon: Utensils },
  { id: 'special_needs',     label: 'Special-Needs Support', icon: HeartHandshake },
];
const LANGUAGES = ['English','Spanish','French','Mandarin','Cantonese','Tagalog','Punjabi','Arabic','German','Portuguese','Hindi','Japanese','Korean'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const CERT_OPTIONS = [
  { key: 'first_aid',     label: 'Standard First Aid' },
  { key: 'cpr',           label: 'CPR / AED Certified' },
  { key: 'ece',           label: 'Early Childhood Education (ECE)' },
  { key: 'special_needs', label: 'Special Needs Training' },
];
const SAFETY_CLAUSES = [
  'I will maintain continuous, attentive supervision of all children in my care at all times.',
  'I will never physically discipline, restrain, or emotionally harm any child.',
  'I will maintain strict confidentiality regarding the families, children, and households I work with.',
  'I will not take photographs or videos of children without explicit written consent from parents.',
  'I will not allow unauthorized visitors into the home or care environment.',
  'I will never be under the influence of alcohol, drugs, or impairing medications while providing care.',
  'I will follow all posted emergency procedures and contact parents and emergency services immediately in an emergency.',
  'I will report any suspected child abuse or neglect to the appropriate authorities.',
  'I understand that violations of this agreement may result in immediate suspension of my NestCare account.',
];

// ─── Types ───────────────────────────────────────────────────
interface AvailRule { day: number; startTime: string; endTime: string; }
interface Reference { name: string; relationship: string; phone: string; email: string; knownYears: number; consent: boolean; }
interface WizardData {
  // Step 2
  firstName: string; lastName: string; displayName: string;
  phone: string; serviceArea: string; avatarUrl: string;
  city: string; province: string;
  serviceLatitude: number | null; serviceLongitude: number | null;
  serviceRadiusKm: number; travelToParent: boolean; acceptDropoff: boolean;
  // Step 3
  yearsExperience: number; childcareTypes: string[]; ageGroups: string[];
  maxChildren: number; languages: string[]; certs: string[];
  employmentHistory: string;
  // Step 4
  services: string[];
  // Step 5
  availabilityRules: AvailRule[];
  // Step 6
  hourlyRate: number; minBookingHours: number; additionalChildRate: number; pricingModel: 'flat' | 'additional_child' | 'per_child'; minimumNoticeHours: number;
  // Step 7
  idSubmitted: boolean;
  // Step 10
  offersTransport: boolean; hasDriversLicense: boolean;
  vehicleInfo: string; transportationInsurance: boolean;
  // Step 11/12
  safetyAgreed: boolean; providerAgreed: boolean;
}

const defaultData: WizardData = {
  firstName: '', lastName: '', displayName: '', phone: '', serviceArea: '', avatarUrl: '',
  city: 'Vancouver', province: 'BC', serviceLatitude: null, serviceLongitude: null,
  serviceRadiusKm: 15, travelToParent: true, acceptDropoff: false,
  yearsExperience: 0, childcareTypes: [], ageGroups: [], maxChildren: 3,
  languages: [], certs: [], employmentHistory: '',
  services: [],
  availabilityRules: [],
  hourlyRate: 22, minBookingHours: 2, additionalChildRate: 0, pricingModel: 'flat', minimumNoticeHours: 0,
  idSubmitted: false,
  offersTransport: false, hasDriversLicense: false, vehicleInfo: '', transportationInsurance: false,
  safetyAgreed: false, providerAgreed: false,
};

// ─── Main Component ───────────────────────────────────────────
export default function SitterOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>(defaultData);
  const [refs, setRefs] = useState<Reference[]>([{ name: '', relationship: '', phone: '', email: '', knownYears: 1, consent: false }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [safetyScrolled, setSafetyScrolled] = useState(false);
  const safetyRef = useRef<HTMLDivElement>(null);

  // ── Load existing progress ──
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setUserId(user.id);

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: sp } = await supabase.from('sitter_profiles').select('*').eq('id', user.id).maybeSingle();
        const { data: services } = await supabase.from('sitter_services').select('service_type').eq('sitter_id', user.id);
        const { data: langs } = await supabase.from('sitter_languages').select('language').eq('sitter_id', user.id);
        const { data: certsData } = await supabase.from('sitter_certifications').select('cert_type').eq('sitter_id', user.id);
        const { data: availRules } = await supabase.from('availability_rules').select('day_of_week,start_time,end_time').eq('sitter_id', user.id);
        const { data: existingRefs } = await supabase.from('sitter_references').select('*').eq('sitter_id', user.id);

        if (sp?.onboarding_completed) { router.push('/dashboard'); return; }

        setData(prev => ({
          ...prev,
          firstName: prof?.first_name || '',
          lastName: prof?.last_name || '',
          displayName: prof?.display_name || '',
          phone: prof?.phone || '',
          avatarUrl: prof?.avatar_url || '',
          city: sp?.city || 'Vancouver',
          province: sp?.province || 'BC',
          serviceArea: sp?.service_area || sp?.city || '',
          serviceLatitude: sp?.service_latitude || prof?.location_lat || null,
          serviceLongitude: sp?.service_longitude || prof?.location_lng || null,
          serviceRadiusKm: sp?.service_radius_km || 15,
          travelToParent: sp?.travel_to_parent ?? true,
          acceptDropoff: sp?.accept_dropoff ?? false,
          yearsExperience: sp?.years_experience || 0,
          childcareTypes: sp?.childcare_types || [],
          ageGroups: sp?.age_groups || [],
          maxChildren: sp?.max_children || 3,
          languages: langs?.map((l: any) => l.language) || [],
          certs: certsData?.map((c: any) => c.cert_type) || [],
          employmentHistory: sp?.employment_history || '',
          services: services?.map((s: any) => s.service_type) || [],
          hourlyRate: sp?.base_hourly_rate_cents ? Math.round(Number(sp.base_hourly_rate_cents) / 100) : (Number(sp?.hourly_rate) || 22),
          minBookingHours: sp?.minimum_booking_hours || 2,
          additionalChildRate: sp?.additional_child_rate_cents ? Math.round(Number(sp.additional_child_rate_cents) / 100) : (Number(sp?.additional_child_rate) || 0),
          pricingModel: sp?.pricing_model || 'flat',
          minimumNoticeHours: sp?.minimum_notice_hours || 0,
          availabilityRules: availRules?.map((r: any) => ({
            day: r.day_of_week,
            startTime: r.start_time.substring(0, 5),
            endTime: r.end_time.substring(0, 5),
          })) || [],
          offersTransport: sp?.has_drivers_license || false,
          hasDriversLicense: sp?.has_drivers_license || false,
          vehicleInfo: sp?.vehicle_info || '',
          transportationInsurance: sp?.transportation_insurance || false,
        }));

        if (existingRefs && existingRefs.length > 0) {
          setRefs(existingRefs.map((r: any) => ({
            name: r.ref_name, relationship: r.relationship,
            phone: r.phone || '', email: r.email || '',
            knownYears: r.known_duration_years || 1, consent: r.consent_obtained,
          })));
        }

        const savedStep = sp?.onboarding_step || 1;
        setStep(savedStep > TOTAL_STEPS ? TOTAL_STEPS : savedStep);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // ── Save each step to DB ──
  const saveStep = async (targetStep: number) => {
    if (!userId) return;
    setSaving(true);
    try {
      const sid = userId;

      // Update core profile info
      await supabase.from('profiles').update({
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: data.displayName || `${data.firstName} ${data.lastName[0] || ''}.`,
        phone: data.phone,
        avatar_url: data.avatarUrl,
      }).eq('id', sid);

      if (step === 2) {
        try {
          const parts = (data.serviceArea || '').split(',').map((s: string) => s.trim());
          const cityVal = data.city || parts[0] || data.serviceArea || 'Vancouver';
          const provVal = data.province || parts[1] || 'BC';

          const updateObj: any = {
            city: cityVal,
            province: provVal,
            service_radius_km: data.serviceRadiusKm || 15,
            travel_to_parent: data.travelToParent ?? true,
            accept_dropoff: data.acceptDropoff ?? false,
            onboarding_step: targetStep
          };

          if (data.serviceLatitude && data.serviceLongitude) {
            updateObj.service_latitude = data.serviceLatitude;
            updateObj.service_longitude = data.serviceLongitude;

            await supabase.from('profiles').update({
              location_lat: data.serviceLatitude,
              location_lng: data.serviceLongitude,
            }).eq('id', sid);
          }

          const { error: spErr } = await supabase.from('sitter_profiles').update(updateObj).eq('id', sid);
          if (spErr) console.warn('[Onboarding Step 2 Error]:', spErr);

          if (data.serviceArea) {
            try {
              await supabase.from('sitter_profiles').update({ service_area: data.serviceArea }).eq('id', sid);
            } catch (e) {
              // Ignore missing service_area column error in schema cache
            }
          }
        } catch (e) {
          console.warn('[Onboarding] Step 2 update error:', e);
        }
      }

      if (step === 3) {
        await supabase.from('sitter_profiles').update({
          years_experience: data.yearsExperience,
          max_children: data.maxChildren,
        }).eq('id', sid);

        try {
          await supabase.from('sitter_profiles').update({
            employment_history: data.employmentHistory,
            age_groups: data.ageGroups,
            childcare_types: data.childcareTypes,
            onboarding_step: targetStep,
          }).eq('id', sid);
        } catch (e) {
          console.warn('[Onboarding] Optional column update skipped:', e);
        }

        try {
          await supabase.from('sitter_languages').delete().eq('sitter_id', sid);
          if (data.languages.length > 0)
            await supabase.from('sitter_languages').insert(data.languages.map(l => ({ sitter_id: sid, language: l })));
        } catch (e) { console.warn('[Onboarding] Languages update error:', e); }

        try {
          await supabase.from('sitter_certifications').delete().eq('sitter_id', sid);
          if (data.certs.length > 0)
            await supabase.from('sitter_certifications').insert(data.certs.map(c => ({
              sitter_id: sid, cert_type: c,
              cert_name: CERT_OPTIONS.find(o => o.key === c)?.label || c,
            })));
        } catch (e) { console.warn('[Onboarding] Certifications update error:', e); }
      }

      if (step === 4) {
        try {
          await supabase.from('sitter_services').delete().eq('sitter_id', sid);
          if (data.services.length > 0)
            await supabase.from('sitter_services').insert(data.services.map(s => ({ sitter_id: sid, service_type: s })));
        } catch (e) { console.warn('[Onboarding] Services update error:', e); }
        try {
          await supabase.from('sitter_profiles').update({ onboarding_step: targetStep }).eq('id', sid);
        } catch (e) {}
      }

      if (step === 5) {
        try {
          await supabase.from('availability_rules').delete().eq('sitter_id', sid);
          if (data.availabilityRules.length > 0)
            await supabase.from('availability_rules').insert(data.availabilityRules.map(r => ({
              sitter_id: sid, day_of_week: r.day,
              start_time: r.startTime + ':00', end_time: r.endTime + ':00',
            })));
        } catch (e) { console.warn('[Onboarding] Availability update error:', e); }
        try {
          await supabase.from('sitter_profiles').update({ onboarding_step: targetStep }).eq('id', sid);
        } catch (e) {}
      }

      if (step === 6) {
        await supabase.from('sitter_profiles').update({
          base_hourly_rate_cents: data.hourlyRate * 100,
          additional_child_rate_cents: (data.additionalChildRate || 0) * 100,
          pricing_model: data.pricingModel || 'flat',
          minimum_booking_hours: data.minBookingHours,
          max_children: data.maxChildren,
          minimum_notice_hours: data.minimumNoticeHours,
          onboarding_step: targetStep,
        }).eq('id', sid);
      }

      if (step === 7 || step === 8) {
        try {
          await supabase.from('sitter_profiles').update({ onboarding_step: targetStep }).eq('id', sid);
        } catch (e) {}
      }

      if (step === 9) {
        try {
          await supabase.from('sitter_references').delete().eq('sitter_id', sid);
          const validRefs = refs.filter(r => r.name.trim());
          if (validRefs.length > 0)
            await supabase.from('sitter_references').insert(validRefs.map(r => ({
              sitter_id: sid, ref_name: r.name, relationship: r.relationship,
              phone: r.phone, email: r.email,
              known_duration_years: r.knownYears, consent_obtained: r.consent,
            })));
        } catch (e) { console.warn('[Onboarding] References update error:', e); }
        try {
          await supabase.from('sitter_profiles').update({ onboarding_step: targetStep }).eq('id', sid);
        } catch (e) {}
      }

      if (step === 10) {
        try {
          await supabase.from('sitter_profiles').update({
            has_drivers_license: data.hasDriversLicense, vehicle_info: data.vehicleInfo,
            transportationInsurance: data.transportationInsurance, onboarding_step: targetStep,
          }).eq('id', sid);
        } catch (e) {}
      }

      if (step === 11) {
        try {
          await supabase.from('sitter_agreements').upsert({
            user_id: sid, agreement_type: 'safety', policy_version: POLICY_VERSION,
            accepted_at: new Date().toISOString(),
          }, { onConflict: 'user_id,agreement_type,policy_version' });
        } catch (e) {}
        try {
          await supabase.from('sitter_profiles').update({ onboarding_step: targetStep }).eq('id', sid);
        } catch (e) {}
      }

      if (step === 12) {
        try {
          await supabase.from('sitter_agreements').upsert({
            user_id: sid, agreement_type: 'provider', policy_version: POLICY_VERSION,
            accepted_at: new Date().toISOString(),
          }, { onConflict: 'user_id,agreement_type,policy_version' });
        } catch (e) {}

        await supabase.from('sitter_profiles').update({
          identity_verified: true,
          phone_verified: true,
          hourly_rate: data.hourlyRate,
          minimum_booking_hours: data.minBookingHours,
          years_experience: data.yearsExperience,
          onboarding_step: 13,
          onboarding_completed: true,
        }).eq('id', sid);
      }
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Error saving profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    await saveStep(step);
    toast.success('Your profile changes have been saved!');
    router.push('/dashboard');
  };

  const next = async () => {
    const target = step + 1;
    await saveStep(target);
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => { setStep(s => Math.max(1, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const skip = async () => { await saveStep(step + 1); setStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const setField = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData(prev => ({ ...prev, [key]: val }));

  // ── Progress bar ──
  const progressPct = step === 1 ? 0 : Math.round(((step - 1) / TOTAL_STEPS) * 100);
  const currentConfig = STEP_CONFIG[Math.min(step - 1, STEP_CONFIG.length - 1)];
  const StepIcon = currentConfig.icon;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Complete screen (step 13) ──
  if (step > 12) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="relative inline-flex">
          <div className="p-6 bg-primary/10 rounded-full">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
          <span className="absolute -top-1 -right-1 p-2 bg-amber-400 text-white rounded-full">
            <PartyPopper className="h-5 w-5" />
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-black text-heading">You're all set!</h1>
          <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">
            Your sitter application has been submitted. Our team will review your profile
            and you'll hear from us within 1–2 business days.
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-3 text-left shadow-sm">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Badges you'll earn once verified</h2>
          {[
            { label: 'Identity Verified', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: BadgeCheck },
            { label: 'Background Check Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
            { label: 'First Aid Certified', color: 'bg-red-50 text-red-700 border-red-100', icon: Stethoscope },
          ].map(b => {
            const Icon = b.icon;
            return (
              <div key={b.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${b.color} text-xs font-bold`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{b.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 active-press transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push(`/sitter/${userId}`)}
            className="w-full py-3.5 border border-stone-200 text-stone-700 rounded-2xl font-bold text-sm hover:bg-stone-50 active-press transition-colors"
          >
            Preview My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-5">
      {/* Header & Save & Exit Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
          <span className="text-stone-900 font-extrabold">NestCare Sitter Setup</span>
        </div>
        <button
          type="button"
          onClick={handleSaveAndExit}
          disabled={saving}
          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-primary dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active-press"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-emerald-600" />}
          <span>Save & Exit</span>
        </button>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-400">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{progressPct}% complete</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl">
            <StepIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-black text-sm text-heading">{currentConfig.title}</h1>
            <p className="text-[11px] text-stone-400">{currentConfig.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {step === 1 && <Step1Welcome />}
        {step === 2 && <Step2Identity data={data} setField={setField} toggle={toggle} />}
        {step === 3 && <Step3Experience data={data} setField={setField} toggle={toggle} />}
        {step === 4 && <Step4Services data={data} toggle={toggle} setField={setField} />}
        {step === 5 && <Step5Availability data={data} setField={setField} />}
        {step === 6 && <Step6Pricing data={data} setField={setField} />}
        {step === 7 && <Step7Verification data={data} setField={setField} />}
        {step === 8 && <Step8Background />}
        {step === 9 && <Step9References refs={refs} setRefs={setRefs} />}
        {step === 10 && <Step10Transportation data={data} setField={setField} />}
        {step === 11 && <Step11Safety safetyRef={safetyRef} safetyScrolled={safetyScrolled} setSafetyScrolled={setSafetyScrolled} data={data} setField={setField} />}
        {step === 12 && <Step12Agreement data={data} setField={setField} />}
      </div>

      {/* Navigation Bar with Save & Exit */}
      <div className="flex gap-2.5 pt-2">
        {step > 1 && (
          <button
            onClick={back}
            className="py-3.5 px-4 border border-stone-200 text-stone-600 rounded-2xl text-xs font-bold hover:bg-stone-50 active-press transition-colors flex items-center justify-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}

        <button
          onClick={handleSaveAndExit}
          disabled={saving}
          className="py-3.5 px-4 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold hover:bg-emerald-100 active-press transition-colors flex items-center justify-center gap-1.5"
        >
          <Save className="h-4 w-4 text-emerald-600" /> Save & Exit
        </button>

        <button
          onClick={step === 1 ? () => { setStep(2); window.scrollTo({ top: 0 }); } : next}
          disabled={saving ||
            (step === 11 && (!data.safetyAgreed || !safetyScrolled)) ||
            (step === 12 && !data.providerAgreed)}
          className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              {step === 12 ? 'Submit Application' : step === 1 ? 'Get Started' : 'Continue'}
              {step !== 12 && step !== 1 && <ChevronRight className="h-4 w-4" />}
            </>
          )}
        </button>
      </div>

      {/* Skip links for optional steps */}
      {(step === 7 || step === 8) && (
        <button onClick={skip} className="w-full text-center text-[11px] font-bold text-stone-400 hover:text-stone-600 pt-1 transition-colors">
          Skip for now — I'll complete this later
        </button>
      )}
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────

function Card({ title, icon, children }: any) {
  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-3.5 shadow-2xs">
      <h2 className="font-display font-black text-sm text-heading flex items-center gap-2 border-b border-stone-100 pb-2.5">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none text-xs bg-stone-50 font-medium focus:border-primary transition-colors"
      />
    </div>
  );
}

function Step1Welcome() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-6 space-y-3 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-bold text-emerald-200">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Professional Sitter Portal
        </div>
        <h2 className="font-display text-2xl font-black leading-snug">
          Welcome to the NestCare Caregiver Network
        </h2>
        <p className="text-xs text-emerald-100 leading-relaxed font-medium">
          Set up your profile, establish your rate, add your service area location, and connect with trusted families seeking verified childcare.
        </p>
      </div>

      <Card title="What You'll Need to Complete Setup" icon={<CheckCircle2 className="h-4 w-4 text-primary" />}>
        <div className="space-y-3 text-xs font-medium text-stone-600">
          {[
            { icon: User, label: 'Basic Info & Location', desc: 'Your display name, phone, and service area address' },
            { icon: Briefcase, label: 'Childcare Background', desc: 'Years of experience, age groups, and specialties' },
            { icon: Calendar, label: 'Availability & Rates', desc: 'Your recurring shift schedule and base hourly pricing' },
            { icon: ShieldCheck, label: 'Safety Commitment', desc: 'Reviewing child protection terms and provider agreement' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="p-2 bg-white rounded-xl shadow-2xs text-primary shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">{item.label}</h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Step 2: Identity & Location ──────────────────────────────
function Step2Identity({ data, setField, toggle }: any) {
  return (
    <div className="space-y-4">
      <Card title="Legal Name" icon={<User className="h-4 w-4 text-primary" />}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Legal First Name" value={data.firstName} onChange={(v: string) => setField('firstName', v)} placeholder="Jane" />
          <Field label="Legal Last Name" value={data.lastName} onChange={(v: string) => setField('lastName', v)} placeholder="Smith" />
        </div>
        <Field label="Preferred Display Name" value={data.displayName} onChange={(v: string) => setField('displayName', v)} placeholder="Jane S." />
        <p className="text-[10px] text-stone-400">This is what families see. Your full legal name is kept private.</p>
      </Card>

      <Card title="Contact & Location Settings" icon={<MapPin className="h-4 w-4 text-primary" />}>
        <Field label="Phone Number" value={data.phone} onChange={(v: string) => setField('phone', v)} placeholder="+1 (780) 555-0123" type="tel" />
        
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Primary Service City & Address
          </label>
          <LocationAutocompleteInput
            value={data.serviceArea}
            onChange={(val) => setField('serviceArea', val)}
            onSelectSuggestion={(sugg) => {
              setField('serviceArea', sugg.address);
              setField('city', sugg.city || sugg.address.split(',')[0]);
              setField('province', sugg.province || '');
              setField('serviceLatitude', sugg.latitude);
              setField('serviceLongitude', sugg.longitude);
            }}
            onLocationCommit={(locName) => {
              geocodeLocation(locName).then(results => {
                if (results.length > 0) {
                  setField('serviceLatitude', results[0].latitude);
                  setField('serviceLongitude', results[0].longitude);
                  setField('city', results[0].city || results[0].displayName.split(',')[0]);
                }
              });
            }}
            placeholder="Type city or address to search..."
          />
        </div>

        {/* Saved Coordinates Badge */}
        {data.serviceLatitude && data.serviceLongitude && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
              📍 Service Center: {data.city || data.serviceArea} ({data.serviceLatitude.toFixed(4)}, {data.serviceLongitude.toFixed(4)})
            </span>
            <span className="text-[10px] text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
              Coordinates Saved
            </span>
          </div>
        )}

        {/* Service Radius */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Max Travel Radius ({data.serviceRadiusKm || 15} km)
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[5, 10, 15, 25, 50].map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setField('serviceRadiusKm', radius)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  (data.serviceRadiusKm || 15) === radius
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {radius} km
              </button>
            ))}
          </div>
        </div>

        {/* Travel Options */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 cursor-pointer">
            <input
              type="checkbox"
              checked={data.travelToParent ?? true}
              onChange={(e) => setField('travelToParent', e.target.checked)}
              className="w-4 h-4 rounded text-primary accent-primary"
            />
            <span className="text-xs font-semibold text-stone-700">🚗 Will travel to parent's home to provide care</span>
          </label>
          <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 cursor-pointer">
            <input
              type="checkbox"
              checked={data.acceptDropoff ?? false}
              onChange={(e) => setField('acceptDropoff', e.target.checked)}
              className="w-4 h-4 rounded text-primary accent-primary"
            />
            <span className="text-xs font-semibold text-stone-700">🏠 Accept parent drop-off at my home</span>
          </label>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">Your exact residential address is never shared publicly. Only calculated distance and neighborhood city are visible pre-booking.</p>
        </div>
      </Card>

      <Card title="Profile Photo">
        <Field label="Profile Photo URL" value={data.avatarUrl} onChange={(v: string) => setField('avatarUrl', v)} placeholder="https://..." />
        {data.avatarUrl && (
          <img src={data.avatarUrl} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border border-stone-200 mt-1" onError={e => (e.currentTarget.style.display = 'none')} />
        )}
      </Card>
    </div>
  );
}

// ─── Step 3: Experience ───────────────────────────────────────
function Step3Experience({ data, setField, toggle }: any) {
  return (
    <div className="space-y-4">
      <Card title="Experience">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Years of Experience</label>
            <input type="number" min={0} max={50} value={data.yearsExperience}
              onChange={e => setField('yearsExperience', Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Max Children at Once</label>
            <input type="number" min={1} max={10} value={data.maxChildren}
              onChange={e => setField('maxChildren', Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Types of Childcare Provided</label>
          <div className="space-y-1.5">
            {CHILDCARE_TYPES.map(t => (
              <label key={t} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-stone-50 cursor-pointer">
                <input type="checkbox" checked={data.childcareTypes.includes(t)}
                  onChange={() => setField('childcareTypes', toggle(data.childcareTypes, t))}
                  className="rounded accent-primary" />
                <span className="text-xs font-semibold text-stone-700">{t}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Age Groups">
        <div className="grid grid-cols-2 gap-2">
          {AGE_GROUPS.map(g => {
            const active = data.ageGroups.includes(g.label);
            const Icon = g.icon;
            return (
              <button key={g.label} type="button"
                onClick={() => setField('ageGroups', toggle(data.ageGroups, g.label))}
                className={`p-3 rounded-2xl border text-left transition-all active-press ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <Icon className={`h-6 w-6 mb-1.5 ${active ? 'text-primary' : 'text-stone-400'}`} />
                <span className="text-xs font-bold block">{g.label}</span>
                <span className="text-[10px] text-stone-400">{g.range}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Languages Spoken">
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map(l => {
            const active = data.languages.includes(l);
            return (
              <button key={l} type="button"
                onClick={() => setField('languages', toggle(data.languages, l))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active-press ${active ? 'bg-primary text-white border-primary' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Certifications">
        <div className="space-y-2">
          {CERT_OPTIONS.map(c => {
            const active = data.certs.includes(c.key);
            return (
              <label key={c.key} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-stone-50 cursor-pointer">
                <input type="checkbox" checked={active}
                  onChange={() => setField('certs', toggle(data.certs, c.key))}
                  className="rounded accent-primary" />
                <span className="text-xs font-semibold text-stone-700">{c.label}</span>
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Step 4: Services ─────────────────────────────────────────
function Step4Services({ data, toggle, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="Services Offered">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SERVICES.map(s => {
            const active = data.services.includes(s.label);
            const Icon = s.icon;
            return (
              <button key={s.id} type="button"
                onClick={() => setField('services', toggle(data.services, s.label))}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all active-press ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <div className={`p-2 rounded-xl ${active ? 'bg-primary text-white' : 'bg-white text-stone-400'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold">{s.label}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Step 5: Availability ──────────────────────────────────────
function Step5Availability({ data, setField }: any) {
  const addRule = (day: number) => {
    const newRules = [...data.availabilityRules, { day, startTime: '09:00', endTime: '17:00' }];
    setField('availabilityRules', newRules);
  };

  const removeRule = (idx: number) => {
    const newRules = data.availabilityRules.filter((_: any, i: number) => i !== idx);
    setField('availabilityRules', newRules);
  };

  return (
    <div className="space-y-4">
      <Card title="Recurring Weekly Shifts">
        <p className="text-xs text-stone-500 font-medium">Add days and hours when you are generally available to take bookings.</p>
        <div className="space-y-3">
          {DAYS.map((dayName, dayIdx) => {
            const dayRules = data.availabilityRules.filter((r: any) => r.day === dayIdx);
            return (
              <div key={dayName} className="p-3 bg-stone-50 border border-stone-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">{dayName}</span>
                  <button type="button" onClick={() => addRule(dayIdx)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add shift
                  </button>
                </div>
                {dayRules.length === 0 ? (
                  <span className="text-[10px] text-stone-400 italic">Not available</span>
                ) : (
                  <div className="space-y-1.5">
                    {dayRules.map((rule: any, rIdx: number) => {
                      const globalIdx = data.availabilityRules.indexOf(rule);
                      return (
                        <div key={rIdx} className="flex items-center gap-2 text-xs">
                          <input type="time" value={rule.startTime}
                            onChange={e => {
                              const updated = [...data.availabilityRules];
                              updated[globalIdx].startTime = e.target.value;
                              setField('availabilityRules', updated);
                            }}
                            className="p-1.5 rounded-xl border border-stone-200 bg-white font-mono text-[11px]" />
                          <span className="text-stone-400">to</span>
                          <input type="time" value={rule.endTime}
                            onChange={e => {
                              const updated = [...data.availabilityRules];
                              updated[globalIdx].endTime = e.target.value;
                              setField('availabilityRules', updated);
                            }}
                            className="p-1.5 rounded-xl border border-stone-200 bg-white font-mono text-[11px]" />
                          <button type="button" onClick={() => removeRule(globalIdx)} className="p-1 text-stone-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Step 6: Pricing ───────────────────────────────────────────
function Step6Pricing({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="Base Hourly Rate">
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Base Rate ($ / hour)</label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input type="number" min={15} max={100} value={data.hourlyRate}
              onChange={e => setField('hourlyRate', Number(e.target.value))}
              className="w-full pl-10 p-3.5 rounded-2xl border border-stone-200 text-sm font-bold text-heading bg-stone-50 outline-none focus:border-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Min Booking Hours</label>
            <input type="number" min={1} max={12} value={data.minBookingHours}
              onChange={e => setField('minBookingHours', Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 font-bold outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Advance Notice (hrs)</label>
            <input type="number" min={0} max={72} value={data.minimumNoticeHours}
              onChange={e => setField('minimumNoticeHours', Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 font-bold outline-none focus:border-primary" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 7: Verification ──────────────────────────────────────
function Step7Verification({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="Identity Verification">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Government ID Check</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            NestCare verifies government ID for all caregivers. You can submit your ID now or resume this step later.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 8: Background ────────────────────────────────────────
function Step8Background() {
  return (
    <div className="space-y-4">
      <Card title="Background Screening Check">
        <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl space-y-2 text-xs text-stone-700">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" /> Criminal Record Check
          </h3>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Background screening is required before receiving your first parent booking request.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 9: References ────────────────────────────────────────
function Step9References({ refs, setRefs }: any) {
  const addRef = () => setRefs((prev: any) => [...prev, { name: '', relationship: '', phone: '', email: '', knownYears: 1, consent: false }]);
  const updateRef = (idx: number, key: string, val: any) => {
    const next = [...refs];
    next[idx][key] = val;
    setRefs(next);
  };
  const removeRef = (idx: number) => setRefs((prev: any) => prev.filter((_: any, i: number) => i !== idx));

  return (
    <div className="space-y-4">
      <Card title="Childcare References">
        {refs.map((r: any, idx: number) => (
          <div key={idx} className="p-3.5 bg-stone-50 border border-stone-100 rounded-2xl space-y-3 relative">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-800">Reference #{idx + 1}</span>
              {refs.length > 1 && (
                <button type="button" onClick={() => removeRef(idx)} className="text-stone-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input type="text" placeholder="Full Name" value={r.name} onChange={e => updateRef(idx, 'name', e.target.value)}
                className="p-3 rounded-xl border border-stone-200 bg-white" />
              <input type="text" placeholder="Relationship (e.g. Parent)" value={r.relationship} onChange={e => updateRef(idx, 'relationship', e.target.value)}
                className="p-3 rounded-xl border border-stone-200 bg-white" />
              <input type="tel" placeholder="Phone Number" value={r.phone} onChange={e => updateRef(idx, 'phone', e.target.value)}
                className="p-3 rounded-xl border border-stone-200 bg-white" />
              <input type="email" placeholder="Email Address" value={r.email} onChange={e => updateRef(idx, 'email', e.target.value)}
                className="p-3 rounded-xl border border-stone-200 bg-white" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addRef} className="w-full py-3 border border-dashed border-stone-300 text-stone-600 rounded-2xl text-xs font-bold hover:bg-stone-50 flex items-center justify-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Another Reference
        </button>
      </Card>
    </div>
  );
}

// ─── Step 10: Transportation ───────────────────────────────────
function Step10Transportation({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="Transportation & Driver Info">
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-100 cursor-pointer">
          <input type="checkbox" checked={data.hasDriversLicense} onChange={e => setField('hasDriversLicense', e.target.checked)} className="rounded accent-primary" />
          <span className="text-xs font-bold text-stone-800">I possess a valid Driver's License</span>
        </label>
        {data.hasDriversLicense && (
          <div className="space-y-3 pt-2">
            <Field label="Vehicle Make / Model (Optional)" value={data.vehicleInfo} onChange={(v: string) => setField('vehicleInfo', v)} placeholder="e.g. 2021 Toyota RAV4" />
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-100 cursor-pointer">
              <input type="checkbox" checked={data.transportationInsurance} onChange={e => setField('transportationInsurance', e.target.checked)} className="rounded accent-primary" />
              <span className="text-xs font-bold text-stone-800">I have active vehicle insurance coverage</span>
            </label>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Step 11: Safety Agreement ───────────────────────────────
function Step11Safety({ safetyRef, safetyScrolled, setSafetyScrolled, data, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="Child Safety Commitment">
        <div
          ref={safetyRef}
          onScroll={() => {
            if (safetyRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = safetyRef.current;
              if (scrollTop + clientHeight >= scrollHeight - 20) {
                setSafetyScrolled(true);
              }
            }
          }}
          className="max-h-56 overflow-y-auto p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs space-y-2 leading-relaxed"
        >
          {SAFETY_CLAUSES.map((clause, idx) => (
            <p key={idx} className="text-stone-700 font-medium">
              <strong>{idx + 1}.</strong> {clause}
            </p>
          ))}
        </div>
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer">
          <input type="checkbox" checked={data.safetyAgreed} onChange={e => setField('safetyAgreed', e.target.checked)} className="rounded accent-primary" />
          <span className="text-xs font-bold text-emerald-900">I have read and agree to all Child Safety Standards</span>
        </label>
      </Card>
    </div>
  );
}

// ─── Step 12: Provider Agreement ─────────────────────────────
function Step12Agreement({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="NestCare Provider Terms">
        <p className="text-xs text-stone-600 leading-relaxed font-medium">
          By submitting your caregiver profile, you agree to uphold NestCare marketplace policies, maintain punctual care delivery, and abide by the Provider Code of Conduct.
        </p>
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer">
          <input type="checkbox" checked={data.providerAgreed} onChange={e => setField('providerAgreed', e.target.checked)} className="rounded accent-primary" />
          <span className="text-xs font-bold text-emerald-900">I accept the NestCare Caregiver Terms of Service</span>
        </label>
      </Card>
    </div>
  );
}
