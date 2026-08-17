-- ============================================================
-- Saved Payment Methods Table Migration
-- Migration: 20260816_payment_methods.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    brand VARCHAR(50) NOT NULL DEFAULT 'Visa',
    last4 VARCHAR(10) NOT NULL DEFAULT '4242',
    exp_month INT NOT NULL DEFAULT 12,
    exp_year INT NOT NULL DEFAULT 2028,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by parent
CREATE INDEX IF NOT EXISTS idx_payment_methods_parent ON payment_methods(parent_id);
