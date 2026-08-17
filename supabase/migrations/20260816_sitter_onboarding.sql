-- ============================================================
-- Sitter Onboarding Wizard - Schema Additions
-- Migration: 20260816_sitter_onboarding.sql
-- ============================================================

-- 1. Extend sitter_profiles with onboarding + transportation columns
ALTER TABLE sitter_profiles
  ADD COLUMN IF NOT EXISTS service_area             TEXT,
  ADD COLUMN IF NOT EXISTS additional_child_rate    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_drivers_license      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vehicle_info             TEXT,
  ADD COLUMN IF NOT EXISTS transportation_insurance BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employment_history       TEXT,
  ADD COLUMN IF NOT EXISTS age_groups               TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS childcare_types          TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS onboarding_step          INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed     BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Sitter Certifications
CREATE TABLE IF NOT EXISTS sitter_certifications (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id      UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
  cert_type      VARCHAR(50)  NOT NULL,  -- first_aid | cpr | ece | special_needs | other
  cert_name      VARCHAR(255) NOT NULL,
  issued_date    DATE,
  expiry_date    DATE,
  document_url   TEXT,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(sitter_id, cert_type)
);

-- 3. Sitter References
CREATE TABLE IF NOT EXISTS sitter_references (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id            UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
  ref_name             VARCHAR(200) NOT NULL,
  relationship         VARCHAR(100) NOT NULL,
  phone                VARCHAR(20),
  email                VARCHAR(255),
  known_duration_years INT,
  consent_obtained     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Sitter Agreements (safety commitment + provider agreement)
CREATE TABLE IF NOT EXISTS sitter_agreements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_type  VARCHAR(50) NOT NULL,      -- safety | provider
  policy_version  VARCHAR(20) NOT NULL DEFAULT '1.0',
  accepted_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agreement_type, policy_version)
);

-- 5. Sitter Verification Documents (private, never public)
CREATE TABLE IF NOT EXISTS sitter_verification_docs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id     UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
  doc_type      VARCHAR(50) NOT NULL,   -- government_id | selfie | drivers_license | vehicle_insurance
  storage_path  TEXT NOT NULL,          -- private bucket path only
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  submitted_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMP WITH TIME ZONE,
  UNIQUE(sitter_id, doc_type)
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE sitter_certifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_references        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_agreements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_verification_docs ENABLE ROW LEVEL SECURITY;

-- Certifications: sitter reads/manages own; public read for display
CREATE POLICY "select_sitter_certifications" ON sitter_certifications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "modify_sitter_certifications" ON sitter_certifications
  FOR ALL TO authenticated
  USING (sitter_id = auth.uid() OR is_admin())
  WITH CHECK (sitter_id = auth.uid() OR is_admin());

-- References: only sitter and admin can view
CREATE POLICY "sitter_select_own_references" ON sitter_references
  FOR SELECT TO authenticated USING (sitter_id = auth.uid() OR is_admin());
CREATE POLICY "sitter_modify_references" ON sitter_references
  FOR ALL TO authenticated
  USING (sitter_id = auth.uid() OR is_admin())
  WITH CHECK (sitter_id = auth.uid() OR is_admin());

-- Agreements: only the user and admins can view
CREATE POLICY "user_select_agreements" ON sitter_agreements
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "user_insert_agreements" ON sitter_agreements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Verification docs: ONLY sitter and admins — never public
CREATE POLICY "sitter_select_own_docs" ON sitter_verification_docs
  FOR SELECT TO authenticated USING (sitter_id = auth.uid() OR is_admin());
CREATE POLICY "sitter_modify_own_docs" ON sitter_verification_docs
  FOR ALL TO authenticated
  USING (sitter_id = auth.uid() OR is_admin())
  WITH CHECK (sitter_id = auth.uid() OR is_admin());
