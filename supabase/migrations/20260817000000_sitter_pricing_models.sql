-- 1. Modify sitter_profiles table to support cents-based pricing models
ALTER TABLE sitter_profiles
ADD COLUMN IF NOT EXISTS base_hourly_rate_cents BIGINT,
ADD COLUMN IF NOT EXISTS additional_child_rate_cents BIGINT NOT NULL DEFAULT 500 CHECK (additional_child_rate_cents >= 0),
ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(50) NOT NULL DEFAULT 'flat' CHECK (pricing_model IN ('flat', 'additional_child', 'per_child'));

-- Copy existing hourly_rate dollars into base_hourly_rate_cents (in cents)
UPDATE sitter_profiles
SET base_hourly_rate_cents = ROUND(hourly_rate * 100)
WHERE hourly_rate IS NOT NULL AND base_hourly_rate_cents IS NULL;

-- If any base_hourly_rate_cents are still null, set a fallback default
UPDATE sitter_profiles
SET base_hourly_rate_cents = 2200
WHERE base_hourly_rate_cents IS NULL;

-- Make base_hourly_rate_cents NOT NULL
ALTER TABLE sitter_profiles
ALTER COLUMN base_hourly_rate_cents SET NOT NULL;

-- Drop legacy hourly_rate column if it still exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sitter_profiles' AND column_name = 'hourly_rate'
    ) THEN
        ALTER TABLE sitter_profiles DROP COLUMN hourly_rate;
    END IF;
END $$;

-- Recreate pricing index on cents-based column
DROP INDEX IF EXISTS idx_sitter_profiles_rate;
CREATE INDEX idx_sitter_profiles_rate ON sitter_profiles(base_hourly_rate_cents);


-- 2. Create or alter booking_pricing table
CREATE TABLE IF NOT EXISTS booking_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    currency VARCHAR(10) DEFAULT 'CAD',
    hourly_rate_cents BIGINT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    subtotal_cents BIGINT NOT NULL,
    platform_fee_cents BIGINT NOT NULL,
    tax_cents BIGINT NOT NULL,
    total_cents BIGINT NOT NULL,
    pricing_version VARCHAR(20) DEFAULT '1.0',
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booking_pricing
ADD COLUMN IF NOT EXISTS child_count INTEGER NOT NULL DEFAULT 1 CHECK (child_count >= 1),
ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(50) NOT NULL DEFAULT 'flat' CHECK (pricing_model IN ('flat', 'additional_child', 'per_child')),
ADD COLUMN IF NOT EXISTS base_hourly_rate_cents BIGINT NOT NULL DEFAULT 2200 CHECK (base_hourly_rate_cents >= 0),
ADD COLUMN IF NOT EXISTS additional_child_rate_cents BIGINT NOT NULL DEFAULT 500 CHECK (additional_child_rate_cents >= 0);


-- 3. Replace create_booking_atomic RPC function to support the audit parameters
CREATE OR REPLACE FUNCTION create_booking_atomic(
    p_parent_id UUID,
    p_sitter_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_hourly_rate_cents BIGINT,
    p_duration_minutes INT,
    p_subtotal_cents BIGINT,
    p_platform_fee_cents BIGINT,
    p_tax_cents BIGINT,
    p_total_cents BIGINT,
    p_child_count INT,
    p_pricing_model VARCHAR(50),
    p_base_hourly_rate_cents BIGINT,
    p_additional_child_rate_cents BIGINT
) RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
    v_overlap INT;
BEGIN
    -- Check overlapping bookings for sitter
    SELECT COUNT(*) INTO v_overlap
    FROM bookings
    WHERE sitter_id = p_sitter_id
      AND status IN ('pending_payment', 'pending_sitter_acceptance', 'accepted', 'in_progress')
      AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);

    IF v_overlap > 0 THEN
        RAISE EXCEPTION 'Concurrency Conflict: Caregiver is already booked for this timeframe.';
    END IF;

    -- Insert Booking
    INSERT INTO bookings (parent_id, sitter_id, start_time, end_time, status, total)
    VALUES (p_parent_id, p_sitter_id, p_start_time, p_end_time, 'pending_payment', (p_total_cents::decimal / 100))
    RETURNING id INTO v_booking_id;

    -- Insert Pricing Audit Snapshot (including the new pricing details)
    INSERT INTO booking_pricing (
        booking_id, currency, hourly_rate_cents, duration_minutes,
        subtotal_cents, platform_fee_cents, tax_cents, total_cents,
        child_count, pricing_model, base_hourly_rate_cents, additional_child_rate_cents
    ) VALUES (
        v_booking_id, 'CAD', p_hourly_rate_cents, p_duration_minutes,
        p_subtotal_cents, p_platform_fee_cents, p_tax_cents, p_total_cents,
        p_child_count, p_pricing_model, p_base_hourly_rate_cents, p_additional_child_rate_cents
    );

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
