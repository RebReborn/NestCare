-- Migration: 20260818_booking_extensions_v2.sql
-- Late-Pickup, Booking Extensions, Timeline Events & Admin Audit Architecture

-- 1. Alter pricing_config table
ALTER TABLE pricing_config 
ADD COLUMN IF NOT EXISTS grace_period_minutes INT NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS min_extension_minutes INT NOT NULL DEFAULT 15;

-- 2. Alter bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS care_status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (care_status IN ('scheduled', 'in_progress', 'care_ended')),
ADD COLUMN IF NOT EXISTS extension_minutes INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_pickup_minutes INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_pickup_status VARCHAR(25) NOT NULL DEFAULT 'none' CHECK (late_pickup_status IN ('none', 'grace_period', 'care_continuing', 'overdue', 'escalated', 'resolved')),
ADD COLUMN IF NOT EXISTS parent_eta_note TEXT,
ADD COLUMN IF NOT EXISTS parent_eta_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS authorized_pickup_person JSONB DEFAULT NULL;

-- Backfill scheduled_start and scheduled_end from start_time / end_time if null
UPDATE bookings 
SET scheduled_start = start_time 
WHERE scheduled_start IS NULL;

UPDATE bookings 
SET scheduled_end = end_time 
WHERE scheduled_end IS NULL;

-- 3. Create booking_extensions table
CREATE TABLE IF NOT EXISTS booking_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('extension', 'late_pickup')),
    requested_by UUID NOT NULL REFERENCES profiles(id),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    original_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    additional_duration_minutes INT NOT NULL DEFAULT 0,
    additional_subtotal_cents INT NOT NULL DEFAULT 0,
    additional_platform_fee_cents INT NOT NULL DEFAULT 0,
    additional_tax_cents INT NOT NULL DEFAULT 0,
    additional_total_cents INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'declined', 'expired', 'active', 'completed', 'cancelled')),
    payment_status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'authorized', 'succeeded', 'failed', 'requires_action')),
    payment_action_deadline TIMESTAMP WITH TIME ZONE,
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Create booking_timeline_events table
CREATE TABLE IF NOT EXISTS booking_timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE booking_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- booking_extensions RLS
DROP POLICY IF EXISTS "Users can view extensions for their bookings" ON booking_extensions;
CREATE POLICY "Users can view extensions for their bookings" ON booking_extensions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_extensions.booking_id
            AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Parents and sitters can insert extensions" ON booking_extensions;
CREATE POLICY "Parents and sitters can insert extensions" ON booking_extensions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_extensions.booking_id
            AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Parents and sitters can update extensions" ON booking_extensions;
CREATE POLICY "Parents and sitters can update extensions" ON booking_extensions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_extensions.booking_id
            AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())
        )
    );

-- booking_timeline_events RLS
DROP POLICY IF EXISTS "Users can view timeline events for their bookings" ON booking_timeline_events;
CREATE POLICY "Users can view timeline events for their bookings" ON booking_timeline_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_timeline_events.booking_id
            AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "System and participants can insert timeline events" ON booking_timeline_events;
CREATE POLICY "System and participants can insert timeline events" ON booking_timeline_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_timeline_events.booking_id
            AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())
        )
    );

-- admin_audit_logs RLS
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON admin_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
