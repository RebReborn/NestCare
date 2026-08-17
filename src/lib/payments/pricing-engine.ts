import { SupabaseClient } from '@supabase/supabase-js';

// Modular Tax Engine Interface for NestCare
export interface TaxCalculationInput {
  subtotalCents: number;
  platformFeeCents: number;
  taxPercentage: number;
  location?: string;
}

export interface TaxCalculationOutput {
  taxCents: number;
  appliedTaxPercentage: number;
}

export class DefaultTaxEngine {
  static calculate(input: TaxCalculationInput): TaxCalculationOutput {
    const taxableBase = input.subtotalCents + input.platformFeeCents;
    const taxCents = Math.round((taxableBase * input.taxPercentage) / 100);
    return {
      taxCents,
      appliedTaxPercentage: input.taxPercentage,
    };
  }
}

export interface PricingSnapshot {
  currency: 'CAD';
  hourlyRateCents: number;
  durationMinutes: number;
  subtotalCents: number;
  platformFeeCents: number;
  taxCents: number;
  totalCents: number;
  pricingVersion: string;
  childCount: number;
  pricingModel: 'flat' | 'additional_child' | 'per_child';
  baseHourlyRateCents: number;
  additionalChildRateCents: number;
}

export async function calculateBookingPricing(
  supabase: SupabaseClient,
  sitterId: string,
  startTime: string | Date,
  endTime: string | Date,
  childIds: string[]
): Promise<PricingSnapshot> {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error('Invalid booking start and end timeframe.');
  }

  if (!childIds || childIds.length === 0) {
    throw new Error('At least one child profile must be selected.');
  }

  // 1. Authenticate parent and verify child IDs belong to them
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error('Authentication required to calculate pricing.');
  }

  const { data: verifiedChildren, error: childErr } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', user.id)
    .in('id', childIds);

  if (childErr || !verifiedChildren) {
    throw new Error('Failed to verify child profiles.');
  }

  if (verifiedChildren.length === 0) {
    throw new Error('None of the selected children belong to your account.');
  }

  const numChildren = verifiedChildren.length;

  // 2. Fetch sitter pricing rules from sitter_profiles
  const { data: sitterProfile, error: sitterErr } = await supabase
    .from('sitter_profiles')
    .select('base_hourly_rate_cents, pricing_model, additional_child_rate_cents, max_children')
    .eq('id', sitterId)
    .maybeSingle();

  if (sitterErr || !sitterProfile) {
    throw new Error('Caregiver profile not found or unavailable.');
  }

  // 3. Enforce maximum children capacity guard
  const maxCapacity = sitterProfile.max_children || 4;
  if (numChildren > maxCapacity) {
    throw new Error(`This caregiver accepts bookings for up to ${maxCapacity} children. You have selected ${numChildren} children.`);
  }

  // 4. Calculate effective hourly rate based on pricing model
  const pricingModel = (sitterProfile.pricing_model || 'flat') as 'flat' | 'additional_child' | 'per_child';
  const baseHourlyRateCents = Number(sitterProfile.base_hourly_rate_cents) || 2200;
  const additionalChildRateCents = Number(sitterProfile.additional_child_rate_cents) || 500;

  let effectiveHourlyRateCents = baseHourlyRateCents;
  if (pricingModel === 'additional_child') {
    effectiveHourlyRateCents = baseHourlyRateCents + Math.max(0, numChildren - 1) * additionalChildRateCents;
  } else if (pricingModel === 'per_child') {
    effectiveHourlyRateCents = baseHourlyRateCents * numChildren;
  }

  // 5. Calculate duration in minutes (minimum 60 mins)
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.max(60, Math.round(durationMs / (1000 * 60)));

  // 6. Subtotal in cents
  const subtotalCents = Math.round((effectiveHourlyRateCents * durationMinutes) / 60);

  // 7. Fetch active platform financial rules
  const { data: pricingConfig } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const platformPct = Number(pricingConfig?.platform_percentage ?? 10);
  const minFeeCents = Math.round(Number(pricingConfig?.min_platform_fee ?? 2.00) * 100);
  const maxFeeCents = Math.round(Number(pricingConfig?.max_platform_fee ?? 50.00) * 100);
  const taxPct = Number(pricingConfig?.tax_percentage ?? 5.00);

  // 8. Calculate platform fee cut
  const rawFeeCents = Math.round((subtotalCents * platformPct) / 100);
  const platformFeeCents = Math.min(maxFeeCents, Math.max(minFeeCents, rawFeeCents));

  // 9. Calculate tax using abstract TaxEngine
  const { taxCents } = DefaultTaxEngine.calculate({
    subtotalCents,
    platformFeeCents,
    taxPercentage: taxPct,
  });

  // 10. Calculate total
  const totalCents = subtotalCents + platformFeeCents + taxCents;

  return {
    currency: 'CAD',
    hourlyRateCents: effectiveHourlyRateCents,
    durationMinutes,
    subtotalCents,
    platformFeeCents,
    taxCents,
    totalCents,
    pricingVersion: pricingConfig?.id?.slice(0, 8) || '1.0',
    childCount: numChildren,
    pricingModel,
    baseHourlyRateCents,
    additionalChildRateCents,
  };
}
