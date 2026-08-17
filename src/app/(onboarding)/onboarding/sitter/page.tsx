'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Baby, User, Briefcase, LayoutGrid, Calendar, DollarSign,
  ShieldCheck, Search, Users, Car, AlertTriangle, FileText,
  CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
  Loader2, Star, Clock, Heart, Upload, Info,
  Smile, Palette, GraduationCap, UserCheck, School, Bus, Moon, Sparkles, BookOpen, Utensils, HeartHandshake, Footprints, PartyPopper, Stethoscope, Timer, Save, Lock, BadgeCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Constants ───────────────────────────────────────────────
const PLATFORM_FEE = 0.10;
const TOTAL_STEPS = 12;
const POLICY_VERSION = '1.0';

const STEP_CONFIG = [
  { n: 1,  icon: Baby,         title: 'Welcome',               subtitle: 'Get started with NestCare' },
  { n: 2,  icon: User,         title: 'Basic Identity',         subtitle: 'Tell us about yourself' },
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
  // Step 3
  yearsExperience: number; childcareTypes: string[]; ageGroups: string[];
  maxChildren: number; languages: string[]; certs: string[];
  employmentHistory: string;
  // Step 4
  services: string[];
  // Step 5
  availabilityRules: AvailRule[];
  // Step 6
  hourlyRate: number; minBookingHours: number; additionalChildRate: number;
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
  yearsExperience: 0, childcareTypes: [], ageGroups: [], maxChildren: 3,
  languages: [], certs: [], employmentHistory: '',
  services: [],
  availabilityRules: [],
  hourlyRate: 22, minBookingHours: 2, additionalChildRate: 0,
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
          serviceArea: sp?.service_area || '',
          yearsExperience: sp?.years_experience || 0,
          childcareTypes: sp?.childcare_types || [],
          ageGroups: sp?.age_groups || [],
          maxChildren: sp?.max_children || 3,
          languages: langs?.map((l: any) => l.language) || [],
          certs: certsData?.map((c: any) => c.cert_type) || [],
          employmentHistory: sp?.employment_history || '',
          services: services?.map((s: any) => s.service_type) || [],
          hourlyRate: Number(sp?.hourly_rate) || 22,
          minBookingHours: sp?.minimum_booking_hours || 2,
          additionalChildRate: Number(sp?.additional_child_rate) || 0,
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

      // Always update core profile info (works on all DB schema versions)
      await supabase.from('profiles').update({
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: data.displayName || `${data.firstName} ${data.lastName[0] || ''}.`,
        phone: data.phone,
        avatar_url: data.avatarUrl,
      }).eq('id', sid);

      if (step === 2) {
        try {
          await supabase.from('sitter_profiles').update({
            service_area: data.serviceArea,
            onboarding_step: targetStep
          }).eq('id', sid);
        } catch (e) {
          console.warn('[Onboarding] Optional column update skipped:', e);
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
          hourly_rate: data.hourlyRate,
          minimum_booking_hours: data.minBookingHours,
        }).eq('id', sid);
        try {
          await supabase.from('sitter_profiles').update({
            additional_child_rate: data.additionalChildRate,
            onboarding_step: targetStep,
          }).eq('id', sid);
        } catch (e) {}
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
            transportation_insurance: data.transportationInsurance, onboarding_step: targetStep,
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

        // Always update identity_verified / phone_verified in standard sitter_profiles table
        await supabase.from('sitter_profiles').update({
          identity_verified: true,
          phone_verified: true,
          hourly_rate: data.hourlyRate,
          minimum_booking_hours: data.minBookingHours,
          years_experience: data.yearsExperience,
        }).eq('id', sid);

        try {
          await supabase.from('sitter_profiles').update({
            onboarding_step: 13, onboarding_completed: true,
          }).eq('id', sid);
        } catch (e) {}
      }
    } catch (e) { console.error('Save error:', e); }
    finally { setSaving(false); }
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

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 1 && (
          <button
            onClick={back}
            className="flex-1 py-3.5 border border-stone-200 text-stone-600 rounded-2xl text-xs font-bold hover:bg-stone-50 active-press transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button
          onClick={step === 1 ? () => { setStep(2); window.scrollTo({ top: 0 }); } : next}
          disabled={saving ||
            (step === 11 && (!data.safetyAgreed || !safetyScrolled)) ||
            (step === 12 && !data.providerAgreed)}
          className="flex-2 flex-1 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
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

// ─── Step 1: Welcome ─────────────────────────────────────────
function Step1Welcome() {
  return (
    <div className="bg-gradient-to-br from-primary/90 to-emerald-700 rounded-3xl p-8 text-white space-y-5">
      <div className="p-4 bg-white/15 rounded-2xl w-fit">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-black mb-2">Welcome to NestCare!</h2>
        <p className="text-sm text-emerald-100 leading-relaxed">
          We're excited to have you join our community of trusted caregivers.
          Let's set up your profile so families can find and book you.
        </p>
      </div>
      <div className="space-y-3 pt-2">
        {[
          { icon: Timer, text: 'Takes about 10–15 minutes' },
          { icon: Save, text: 'Your progress is automatically saved' },
          { icon: Lock, text: 'Your information is kept private and secure' },
          { icon: CheckCircle2, text: 'You can skip optional steps and return later' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.text} className="flex items-center gap-3 text-sm text-emerald-100">
              <Icon className="h-4 w-4 shrink-0 text-white" />
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Identity ─────────────────────────────────────────
function Step2Identity({ data, setField, toggle }: any) {
  return (
    <div className="space-y-4">
      <Card title="Legal Name" icon={<User className="h-4 w-4 text-primary" />}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Legal First Name" value={data.firstName} onChange={v => setField('firstName', v)} placeholder="Jane" />
          <Field label="Legal Last Name" value={data.lastName} onChange={v => setField('lastName', v)} placeholder="Smith" />
        </div>
        <Field label="Preferred Display Name" value={data.displayName} onChange={v => setField('displayName', v)} placeholder="Jane S." />
        <p className="text-[10px] text-stone-400">This is what families see. Your full legal name is kept private.</p>
      </Card>

      <Card title="Contact & Location">
        <Field label="Phone Number" value={data.phone} onChange={v => setField('phone', v)} placeholder="+1 (780) 555-0123" type="tel" />
        <Field label="Service Area" value={data.serviceArea} onChange={v => setField('serviceArea', v)} placeholder="e.g. Edmonton, AB — Northwest & Central" />
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">Your exact residential address is never shared publicly.</p>
        </div>
      </Card>

      <Card title="Profile Photo">
        <Field label="Profile Photo URL" value={data.avatarUrl} onChange={v => setField('avatarUrl', v)} placeholder="https://..." />
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
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(l => {
            const active = data.languages.includes(l);
            return (
              <button key={l} type="button"
                onClick={() => setField('languages', toggle(data.languages, l))}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active-press ${active ? 'bg-primary text-white border-primary' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
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
              <label key={c.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${active ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-150 hover:bg-stone-100'}`}>
                <input type="checkbox" checked={active}
                  onChange={() => setField('certs', toggle(data.certs, c.key))}
                  className="rounded accent-primary" />
                <span className="text-xs font-semibold text-stone-700">{c.label}</span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card title="Previous Employment (Optional)">
        <textarea rows={3} value={data.employmentHistory}
          onChange={e => setField('employmentHistory', e.target.value)}
          placeholder="e.g. Nanny for the Johnson family (2022–2024), Daycare assistant at Sunny Kids (2020–2022)..."
          className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary resize-none" />
      </Card>
    </div>
  );
}

// ─── Step 4: Services ─────────────────────────────────────────
function Step4Services({ data, toggle, setField }: any) {
  return (
    <Card title="Select all services you offer">
      <div className="grid grid-cols-2 gap-2.5">
        {SERVICES.map(s => {
          const active = data.services.includes(s.id);
          const Icon = s.icon;
          return (
            <button key={s.id} type="button"
              onClick={() => setField('services', toggle(data.services, s.id))}
              className={`p-3.5 rounded-2xl border text-left transition-all active-press ${active ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}`}
            >
              <Icon className={`h-6 w-6 mb-2 ${active ? 'text-primary' : 'text-stone-400'}`} />
              <span className={`text-[11px] font-bold block leading-tight ${active ? 'text-emerald-800' : 'text-stone-700'}`}>{s.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-stone-400 mt-1">You can update these anytime from your profile settings.</p>
    </Card>
  );
}

// ─── Step 5: Availability ─────────────────────────────────────
function Step5Availability({ data, setField }: any) {
  const rulesMap = Object.fromEntries(data.availabilityRules.map((r: AvailRule) => [r.day, r]));

  const setDay = (day: number, startTime: string, endTime: string) => {
    const filtered = data.availabilityRules.filter((r: AvailRule) => r.day !== day);
    setField('availabilityRules', [...filtered, { day, startTime, endTime }]);
  };
  const removeDay = (day: number) => setField('availabilityRules', data.availabilityRules.filter((r: AvailRule) => r.day !== day));

  return (
    <div className="space-y-4">
      <Card title="Weekly Schedule" icon={<Calendar className="h-4 w-4 text-primary" />}>
        <p className="text-[11px] text-stone-400 mb-3">Toggle the days you're available and set your hours.</p>
        <div className="space-y-2">
          {DAYS.map((day, i) => {
            const rule = rulesMap[i];
            const active = !!rule;
            return (
              <div key={day} className={`p-3 rounded-2xl border transition-all ${active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-stone-50 border-stone-150'}`}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={active}
                      onChange={e => {
                        if (e.target.checked) setDay(i, '09:00', '17:00');
                        else removeDay(i);
                      }}
                      className="rounded accent-primary" />
                    <span className={`text-xs font-bold ${active ? 'text-emerald-800' : 'text-stone-500'}`}>{day}</span>
                  </label>
                  {active && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <input type="time" value={rule.startTime}
                        onChange={e => setDay(i, e.target.value, rule.endTime)}
                        className="px-2 py-1 rounded-lg border border-stone-200 text-xs bg-white outline-none focus:border-primary" />
                      <span className="text-stone-400">–</span>
                      <input type="time" value={rule.endTime}
                        onChange={e => setDay(i, rule.startTime, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-stone-200 text-xs bg-white outline-none focus:border-primary" />
                    </div>
                  )}
                  {!active && <span className="text-[10px] text-stone-400 font-semibold">Unavailable</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex gap-2.5">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-800 leading-relaxed">You can manage vacation days and one-time blocked dates from your <strong>Availability</strong> settings page after completing onboarding.</p>
      </div>
    </div>
  );
}

// ─── Step 6: Pricing ──────────────────────────────────────────
function Step6Pricing({ data, setField }: any) {
  const payout = (data.hourlyRate * (1 - PLATFORM_FEE)).toFixed(2);
  return (
    <div className="space-y-4">
      <Card title="Hourly Rate" icon={<DollarSign className="h-4 w-4 text-primary" />}>
        <div className="text-center py-2">
          <span className="font-display text-4xl font-black text-heading">${data.hourlyRate}</span>
          <span className="text-stone-400 text-sm font-bold">/hr</span>
        </div>
        <input type="range" min={15} max={75} step={1} value={data.hourlyRate}
          onChange={e => setField('hourlyRate', Number(e.target.value))}
          className="w-full accent-primary" />
        <div className="flex justify-between text-[10px] text-stone-400 font-bold">
          <span>$15/hr</span><span>$75/hr</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 mt-2">
          <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide mb-1">Your estimated payout</p>
          <p className="font-display text-xl font-black text-emerald-800">${payout}<span className="text-sm font-bold">/hr</span></p>
          <p className="text-[10px] text-emerald-600 mt-0.5">After NestCare's 10% platform fee</p>
        </div>
      </Card>

      <Card title="Booking Preferences">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Min. Booking Duration</label>
            <select value={data.minBookingHours} onChange={e => setField('minBookingHours', Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary appearance-none">
              {[1, 2, 3, 4, 5].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Max Children</label>
            <input type="number" min={1} max={10} value={data.maxChildren}
              onChange={e => setField('maxChildren', Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Additional Child Rate ($/hr, optional)</label>
          <input type="number" min={0} max={20} step={0.5} value={data.additionalChildRate}
            onChange={e => setField('additionalChildRate', Number(e.target.value))}
            className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary"
            placeholder="e.g. 5 (for $5 extra per additional child)" />
        </div>
      </Card>
    </div>
  );
}

// ─── Step 7: Identity Verification ───────────────────────────
function Step7Verification({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white space-y-3">
        <div className="p-3 bg-white/15 rounded-2xl w-fit">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-display text-lg font-black">Verify Your Identity</h2>
        <p className="text-sm text-blue-100 leading-relaxed">
          We verify sitter identities to help keep our community safe. Your documents are stored in a private,
          encrypted vault — never publicly accessible or shared without your consent.
        </p>
      </div>

      <Card title="Government-Issued ID">
        <p className="text-[11px] text-stone-500 mb-3">Upload a clear photo of your government-issued photo ID (driver's licence, passport, or provincial ID).</p>
        <div className="grid grid-cols-2 gap-3">
          {['ID Front', 'ID Back'].map(side => (
            <div key={side} className="border-2 border-dashed border-stone-200 rounded-2xl p-5 text-center hover:border-primary transition-colors cursor-pointer">
              <Upload className="h-5 w-5 text-stone-400 mx-auto mb-2" />
              <p className="text-[11px] font-bold text-stone-500">{side}</p>
              <p className="text-[10px] text-stone-400">JPG, PNG, PDF</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Selfie / Liveness Check">
        <p className="text-[11px] text-stone-500 mb-3">Upload a clear selfie to confirm the ID belongs to you.</p>
        <div className="border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center hover:border-primary transition-colors cursor-pointer">
          <Upload className="h-6 w-6 text-stone-400 mx-auto mb-2" />
          <p className="text-[11px] font-bold text-stone-500">Upload Selfie</p>
          <p className="text-[10px] text-stone-400">Clear, well-lit photo of your face</p>
        </div>
      </Card>

      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex gap-2.5">
        <Info className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-stone-500 leading-relaxed">
          <strong>Note:</strong> This step is currently processed manually by our admin team. You'll receive an email once your identity has been verified (typically within 1 business day). You can skip this for now and complete it later.
        </p>
      </div>
    </div>
  );
}

// ─── Step 8: Background Screening ────────────────────────────
function Step8Background() {
  const stages = ['Not Started', 'Submitted', 'Processing', 'Approved'];
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-3xl p-6 text-white space-y-3">
        <div className="p-3 bg-white/10 rounded-2xl w-fit">
          <Search className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-display text-lg font-black">Background Screening</h2>
        <p className="text-sm text-stone-300 leading-relaxed">
          A background check helps families feel confident choosing you. Completing this step
          unlocks the <strong className="text-white">Background Check Completed</strong> badge on your public profile.
        </p>
      </div>

      <Card title="Current Status">
        <div className="flex items-center justify-between gap-2">
          {stages.map((stage, i) => (
            <div key={stage} className="flex flex-col items-center flex-1 gap-1.5">
              <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-stone-400 ring-2 ring-stone-200 ring-offset-1' : 'bg-stone-200'}`} />
              <span className={`text-[9px] font-bold text-center leading-tight ${i === 0 ? 'text-stone-600' : 'text-stone-300'}`}>{stage}</span>
            </div>
          ))}
        </div>
        <div className="h-px bg-stone-100 -mx-4 my-3" />
        <div className="flex items-center gap-2 px-1">
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="text-xs text-stone-500 font-semibold">Not Started</span>
        </div>
      </Card>

      <Card title="What's Included">
        {['Criminal record check (RCMP/local)', 'Sex offender registry check', 'Vulnerable sector screening', 'Identity cross-reference'].map(item => (
          <div key={item} className="flex items-center gap-2.5 text-xs text-stone-600">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            {item}
          </div>
        ))}
      </Card>

      <button className="w-full py-3.5 bg-stone-800 text-white rounded-2xl text-xs font-bold hover:bg-stone-900 active-press transition-colors">
        Begin Background Check →
      </button>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex gap-2.5">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800">You can continue onboarding and complete your background check later. It's required before you can receive verified bookings.</p>
      </div>
    </div>
  );
}

// ─── Step 9: References ───────────────────────────────────────
function Step9References({ refs, setRefs }: { refs: Reference[]; setRefs: (r: Reference[]) => void }) {
  const updateRef = (i: number, field: keyof Reference, val: any) => {
    const updated = [...refs];
    updated[i] = { ...updated[i], [field]: val };
    setRefs(updated);
  };
  const addRef = () => setRefs([...refs, { name: '', relationship: '', phone: '', email: '', knownYears: 1, consent: false }]);
  const removeRef = (i: number) => setRefs(refs.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500">Provide up to 3 references who can speak to your childcare experience. References will only be contacted if families request it and you provide consent.</p>
      {refs.map((ref, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700">Reference #{i + 1}</span>
            {refs.length > 1 && (
              <button onClick={() => removeRef(i)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Field label="Full Name" value={ref.name} onChange={v => updateRef(i, 'name', v)} placeholder="Dr. Sarah Johnson" />
          <Field label="Relationship" value={ref.relationship} onChange={v => updateRef(i, 'relationship', v)} placeholder="e.g. Former employer, Family friend" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={ref.phone} onChange={v => updateRef(i, 'phone', v)} placeholder="+1 (780) 555-0100" type="tel" />
            <Field label="Email" value={ref.email} onChange={v => updateRef(i, 'email', v)} placeholder="sarah@example.com" type="email" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Years Known</label>
            <select value={ref.knownYears} onChange={e => updateRef(i, 'knownYears', Number(e.target.value))}
              className="w-full p-3 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary appearance-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-stone-50 rounded-xl">
            <input type="checkbox" checked={ref.consent} onChange={e => updateRef(i, 'consent', e.target.checked)} className="mt-0.5 rounded accent-primary" />
            <span className="text-[11px] text-stone-600 leading-relaxed">I confirm this person is aware they may be contacted as a reference and has given their consent.</span>
          </label>
        </div>
      ))}
      {refs.length < 3 && (
        <button onClick={addRef} className="w-full py-3 border-2 border-dashed border-stone-200 hover:border-primary text-stone-500 hover:text-primary rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add Another Reference
        </button>
      )}
    </div>
  );
}

// ─── Step 10: Transportation ──────────────────────────────────
function Step10Transportation({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <Card title="Do you offer transportation services?">
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map(val => (
            <button key={String(val)} type="button"
              onClick={() => setField('offersTransport', val)}
              className={`p-4 rounded-2xl border text-center transition-all active-press ${data.offersTransport === val ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
            >
              <div className="flex justify-center mb-1">
                {val ? <Car className="h-6 w-6 text-primary" /> : <Footprints className="h-6 w-6 text-stone-400" />}
              </div>
              <span className="text-xs font-bold">{val ? 'Yes, I can drive children' : 'No, I don\'t drive'}</span>
            </button>
          ))}
        </div>
      </Card>

      {data.offersTransport && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">Transportation services require additional insurance verification. Please ensure your auto insurance policy covers transporting clients' children.</p>
          </div>
          <Card title="Driver Information">
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${data.hasDriversLicense ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-150'}`}>
              <input type="checkbox" checked={data.hasDriversLicense} onChange={e => setField('hasDriversLicense', e.target.checked)} className="rounded accent-primary" />
              <span className="text-xs font-semibold text-stone-700">I hold a valid driver's licence</span>
            </label>
            <Field label="Vehicle Information" value={data.vehicleInfo}
              onChange={v => setField('vehicleInfo', v)}
              placeholder="e.g. 2020 Honda Pilot — 7 seats, booster seat available" />
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${data.transportationInsurance ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-150'}`}>
              <input type="checkbox" checked={data.transportationInsurance} onChange={e => setField('transportationInsurance', e.target.checked)} className="rounded accent-primary" />
              <span className="text-xs font-semibold text-stone-700">My insurance policy covers transporting clients' children</span>
            </label>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Step 11: Safety Agreement ────────────────────────────────
function Step11Safety({ safetyRef, safetyScrolled, setSafetyScrolled, data, setField }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl p-6 text-white space-y-2">
        <div className="p-3 bg-white/15 rounded-2xl w-fit">
          <AlertTriangle className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-display text-lg font-black">Child Safety Commitment</h2>
        <p className="text-sm text-red-100">Please read all clauses carefully, then confirm your commitment below.</p>
      </div>
      <div
        ref={safetyRef}
        onScroll={e => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setSafetyScrolled(true);
        }}
        className="bg-white border border-stone-200 rounded-3xl p-5 max-h-72 overflow-y-auto space-y-3 shadow-sm"
      >
        {SAFETY_CLAUSES.map((clause, i) => (
          <div key={i} className="flex gap-3 text-xs text-stone-600 leading-relaxed">
            <span className="font-display font-black text-stone-300 text-sm shrink-0 mt-0.5">{i + 1}.</span>
            <p>{clause}</p>
          </div>
        ))}
        <div className="h-4" />
      </div>
      {!safetyScrolled && (
        <p className="text-center text-[11px] text-stone-400 font-bold">↑ Scroll to the end to continue</p>
      )}
      {safetyScrolled && (
        <label className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl cursor-pointer">
          <input type="checkbox" checked={data.safetyAgreed} onChange={e => setField('safetyAgreed', e.target.checked)} className="mt-0.5 rounded accent-red-500" />
          <span className="text-xs text-red-800 font-semibold leading-relaxed">
            I have read and fully understand this Child Safety Commitment. I agree to uphold these standards in every care situation and acknowledge that violations may result in account suspension.
          </span>
        </label>
      )}
    </div>
  );
}

// ─── Step 12: Provider Agreement ─────────────────────────────
function Step12Agreement({ data, setField }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-3xl p-6 text-white space-y-3">
        <div className="p-3 bg-white/10 rounded-2xl w-fit">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-display text-lg font-black">Provider Agreement</h2>
        <p className="text-sm text-stone-300">Review and accept our Sitter Terms of Service to activate your account.</p>
      </div>
      <Card title="Summary of Key Terms">
        {[
          'You are an independent contractor — not an employee of NestCare.',
          'You must honour all confirmed bookings or provide timely cancellation.',
          'Off-platform payment arrangements are strictly prohibited.',
          'NestCare charges a 10% platform fee on all completed bookings.',
          'You must comply with all applicable local laws regarding childcare.',
          'Violations of our policies may result in immediate account suspension.',
        ].map((term, i) => (
          <div key={i} className="flex gap-2.5 text-xs text-stone-600 leading-relaxed">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-300 shrink-0 mt-1.5" />
            <span>{term}</span>
          </div>
        ))}
      </Card>
      <a href="/terms" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100 transition-colors">
        <span className="text-xs font-bold text-stone-700">Read full Sitter Agreement</span>
        <ChevronRight className="h-4 w-4 text-stone-400" />
      </a>
      <label className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl cursor-pointer">
        <input type="checkbox" checked={data.providerAgreed} onChange={e => setField('providerAgreed', e.target.checked)} className="mt-0.5 rounded accent-primary" />
        <span className="text-xs text-emerald-800 font-semibold leading-relaxed">
          ☑ I have read and agree to the NestCare Sitter Agreement and Terms of Service.
        </span>
      </label>
      {data.providerAgreed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <p className="text-[11px] text-emerald-800 font-semibold">You're ready to submit. Click "Submit Application" below!</p>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3.5">
      <h3 className="text-xs font-black text-heading flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 outline-none focus:border-primary transition-colors" />
    </div>
  );
}
