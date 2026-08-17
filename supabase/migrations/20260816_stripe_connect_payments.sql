-- ============================================================
-- Stripe Connect & Marketplace Payment Architecture Migration
-- Migration: 20260816_stripe_connect_payments.sql
-- ============================================================

-- 1. Stripe Connect Accounts Table
CREATE TABLE IF NOT EXISTS stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    onboarding_status VARCHAR(50) DEFAULT 'pending',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    requirements_current JSONB DEFAULT '[]'::jsonb,
    country VARCHAR(10) DEFAULT 'CA',
    default_currency VARCHAR(10) DEFAULT 'CAD',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dedicated Booking Pricing Audit Snapshot
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

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES profiles(id),
    sitter_id UUID NOT NULL REFERENCES profiles(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    amount_cents BIGINT NOT NULL,
    platform_fee_cents BIGINT NOT NULL,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'CAD',
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, succeeded, failed, cancelled, refunded, disputed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sitter_id UUID NOT NULL REFERENCES profiles(id),
    stripe_account_id VARCHAR(255) NOT NULL,
    stripe_payout_id VARCHAR(255) UNIQUE,
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'CAD',
    status VARCHAR(50) DEFAULT 'pending', -- pending, eligible, processing, paid, failed, reversed
    arrival_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Webhook Events Log
CREATE TABLE IF NOT EXISTS stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payment_id UUID NOT NULL REFERENCES payments(id),
    stripe_refund_id VARCHAR(255) UNIQUE NOT NULL,
    amount_cents BIGINT NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, succeeded, failed
    requested_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payment_id UUID REFERENCES payments(id),
    stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'CAD',
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'under_review', -- under_review, won, lost, closed
    evidence_due_by TIMESTAMPTZ,
    is_charge_refundable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 8. Atomic Booking Creation Function (Concurrency Guard against Double Booking)
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
    p_total_cents BIGINT
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

    -- Insert Pricing Audit Snapshot
    INSERT INTO booking_pricing (
        booking_id, currency, hourly_rate_cents, duration_minutes,
        subtotal_cents, platform_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_booking_id, 'CAD', p_hourly_rate_cents, p_duration_minutes,
        p_subtotal_cents, p_platform_fee_cents, p_tax_cents, p_total_cents
    );

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
