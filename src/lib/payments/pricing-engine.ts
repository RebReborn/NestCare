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
}

export async function calculateBookingPricing(
  supabase: SupabaseClient,
  sitterId: string,
  startTime: string | Date,
  endTime: string | Date
): Promise<PricingSnapshot> {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error('Invalid booking start and end timeframe.');
  }

  // 1. Fetch sitter hourly rate from sitter_profiles
  const { data: sitterProfile, error: sitterErr } = await supabase
    .from('sitter_profiles')
    .select('hourly_rate')
    .eq('id', sitterId)
    .maybeSingle();

  if (sitterErr || !sitterProfile) {
    throw new Error('Caregiver profile not found or unavailable.');
  }

  const rawRate = Number(sitterProfile.hourly_rate) || 22.00;
  const hourlyRateCents = Math.round(rawRate * 100);

  // 2. Calculate duration in minutes (minimum 60 mins)
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.max(60, Math.round(durationMs / (1000 * 60)));

  // 3. Subtotal in integer cents
  const subtotalCents = Math.round((hourlyRateCents * durationMinutes) / 60);

  // 4. Fetch active platform financial rules
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

  // 5. Calculate platform fee cut
  const rawFeeCents = Math.round((subtotalCents * platformPct) / 100);
  const platformFeeCents = Math.min(maxFeeCents, Math.max(minFeeCents, rawFeeCents));

  // 6. Calculate tax using abstract TaxEngine
  const { taxCents } = DefaultTaxEngine.calculate({
    subtotalCents,
    platformFeeCents,
    taxPercentage: taxPct,
  });

  // 7. Calculate total
  const totalCents = subtotalCents + platformFeeCents + taxCents;

  return {
    currency: 'CAD',
    hourlyRateCents,
    durationMinutes,
    subtotalCents,
    platformFeeCents,
    taxCents,
    totalCents,
    pricingVersion: pricingConfig?.id?.slice(0, 8) || '1.0',
  };
}
