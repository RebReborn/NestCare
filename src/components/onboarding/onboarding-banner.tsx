import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, Baby, Phone, UserCheck, ShieldAlert, Rocket, Play } from 'lucide-react';

const STEP_LABELS = [
  '',
  'Welcome',
  'Basic Identity',
  'Childcare Experience',
  'Services',
  'Availability',
  'Pricing',
  'Identity Verification',
  'Background Screening',
  'References',
  'Transportation',
  'Safety Agreement',
  'Provider Agreement',
];

const TOTAL_STEPS = 12;

export async function OnboardingBanner() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch full profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    // ============================================================
    // 1. PARENT ONBOARDING CHECK
    // ============================================================
    if (profile.role === 'parent') {
      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq('parent_id', user.id);

      const hasPhone = !!profile.phone && profile.phone.trim().length > 0;
      const hasChildren = (children && children.length > 0);

      // If parent has both phone and at least 1 child registered, onboarding is complete!
      if (hasPhone && hasChildren) return null;

      // Calculate parent completion percentage
      let completedCount = 0;
      if (hasPhone) completedCount++;
      if (hasChildren) completedCount++;
      const parentPct = Math.round((completedCount / 2) * 100);

      return (
        <div className="mb-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-3xl p-6 shadow-lg text-white">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-white/90" />
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
                  Account Setup Incomplete ({parentPct}%)
                </span>
              </div>

              <div>
                <h2 className="font-display text-lg font-black leading-tight">
                  Complete your parent profile to book sitters
                </h2>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  Add your contact phone number and child profiles so sitters have the required details when you request care.
                </p>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${hasPhone ? 'bg-white/20 border-white/30 text-white' : 'bg-white/10 border-white/20 text-white/80'}`}>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold">Contact Phone Number</span>
                  </div>
                  {hasPhone ? <CheckCircle2 className="h-4 w-4 text-white" /> : <span className="text-[10px] bg-white text-orange-600 px-2 py-0.5 rounded-md font-extrabold">Missing</span>}
                </div>

                <div className={`p-3 rounded-2xl border flex items-center justify-between ${hasChildren ? 'bg-white/20 border-white/30 text-white' : 'bg-white/10 border-white/20 text-white/80'}`}>
                  <div className="flex items-center gap-2.5">
                    <Baby className="h-4 w-4" />
                    <span className="text-xs font-bold">Child Profile</span>
                  </div>
                  {hasChildren ? <CheckCircle2 className="h-4 w-4 text-white" /> : <span className="text-[10px] bg-white text-orange-600 px-2 py-0.5 rounded-md font-extrabold">Missing</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                {!hasChildren && (
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white text-orange-600 rounded-2xl text-xs font-black hover:bg-orange-50 active-press transition-colors shadow-sm"
                  >
                    <Baby className="h-4 w-4" /> Add Child Profile
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                {!hasPhone && (
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-xs font-black active-press transition-colors"
                  >
                    <Phone className="h-4 w-4" /> Add Phone Number
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 2. SITTER ONBOARDING CHECK
    // ============================================================
    if (profile.role === 'sitter') {
      const { data: sp } = await supabase
        .from('sitter_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const raw = sp as any;
      const onboardingCompleted: boolean = raw?.onboarding_completed ?? false;
      const onboardingStep: number = raw?.onboarding_step ?? 1;

      // If explicit onboarding_completed is true, OR sitter profile has completed bio & rates, hide banner
      const isProfileFullyFilled = raw?.hourly_rate > 0 && raw?.years_experience > 0 && raw?.bio && raw.bio.length > 15 && !raw.bio.startsWith('Tell parents');
      if (onboardingCompleted || isProfileFullyFilled) {
        return null;
      }

      const currentStep = Math.max(1, onboardingStep);
      const completedSteps = Math.max(0, currentStep - 1);
      const pct = Math.round((completedSteps / TOTAL_STEPS) * 100);
      const stepLabel = STEP_LABELS[currentStep] || 'Next Step';
      const isJustStarted = currentStep <= 1;

      return (
        <div className="mb-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 rounded-3xl p-6 shadow-lg text-white">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />

            <div className="relative space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-200" />
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">
                    {isJustStarted ? 'Action Required' : `Sitter Setup (${pct}%)`}
                  </span>
                </div>
                <h2 className="font-display text-lg font-black text-white leading-tight">
                  {isJustStarted
                    ? 'Complete your sitter profile to start receiving bookings'
                    : `You're ${pct}% done — finish your sitter profile`}
                </h2>
                <p className="text-xs text-emerald-100 mt-1 font-medium">
                  Next step: <strong className="text-white">{stepLabel}</strong>
                  {!isJustStarted && ` · Step ${currentStep} of ${TOTAL_STEPS}`}
                </p>
              </div>

              {/* Progress bar */}
              {!isJustStarted && (
                <div className="space-y-1.5">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-200 font-bold">
                    <span>{completedSteps} of {TOTAL_STEPS} steps completed</span>
                    <span>{TOTAL_STEPS - completedSteps} steps remaining</span>
                  </div>
                </div>
              )}

              {/* Completed step chips */}
              {!isJustStarted && completedSteps > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(completedSteps, 6) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                      <span className="text-[10px] text-white font-bold">{STEP_LABELS[i + 1]}</span>
                    </div>
                  ))}
                  {completedSteps > 6 && (
                    <div className="px-2 py-1 bg-white/20 rounded-lg">
                      <span className="text-[10px] text-white font-bold">+{completedSteps - 6} more</span>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <Link
                href="/onboarding/sitter"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-emerald-800 rounded-2xl text-xs font-black hover:bg-emerald-50 active-press transition-colors shadow-sm"
              >
                {isJustStarted ? <Rocket className="h-4 w-4 text-emerald-600" /> : <Play className="h-4 w-4 fill-emerald-600 text-emerald-600" />}
                {isJustStarted ? 'Complete Sitter Setup' : 'Resume Onboarding'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return null;
  } catch (e) {
    console.error('[OnboardingBanner] Exception:', e);
    return null;
  }
}
