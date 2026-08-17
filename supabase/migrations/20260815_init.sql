-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable PostGIS for geospatial distance queries
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums
CREATE TYPE user_role AS ENUM ('parent', 'sitter', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'suspended', 'deactivated', 'deleted');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'identity_verified', 'background_check_pending', 'background_checked', 'fully_verified', 'rejected', 'suspended');
CREATE TYPE booking_status AS ENUM ('draft', 'pending', 'accepted', 'declined', 'cancelled', 'in_progress', 'completed', 'disputed', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE dispute_status AS ENUM ('open', 'investigating', 'resolved', 'rejected', 'refunded');
CREATE TYPE exception_type AS ENUM ('unavailable', 'available_override');

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'parent',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    bio TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_coords GEOGRAPHY(Point, 4326),
    verification_status verification_status NOT NULL DEFAULT 'unverified',
    account_status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger to sync location_coords from latitude/longitude
CREATE OR REPLACE FUNCTION sync_profile_location_coords()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
        NEW.location_coords := ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326)::geography;
    ELSE
        NEW.location_coords := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_profile_location_coords
BEFORE INSERT OR UPDATE OF location_lat, location_lng ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_profile_location_coords();

-- 2. Sitter Profiles Table
CREATE TABLE sitter_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    headline VARCHAR(255),
    bio TEXT,
    hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
    years_experience INT NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
    background_check_status verification_status NOT NULL DEFAULT 'unverified',
    background_check_date TIMESTAMP WITH TIME ZONE,
    identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    minimum_booking_hours INT NOT NULL DEFAULT 1 CHECK (minimum_booking_hours >= 1),
    max_children INT NOT NULL DEFAULT 4 CHECK (max_children >= 1),
    gallery_urls TEXT[] NOT NULL DEFAULT ARRAY[
        'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=500',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500',
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=500'
    ],
    cover_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Sitter Services Table
CREATE TABLE sitter_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (sitter_id, service_type)
);

-- 4. Sitter Languages Table
CREATE TABLE sitter_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (sitter_id, language)
);

-- 5. Children Profiles Table
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    age_group VARCHAR(50) NOT NULL,
    special_instructions TEXT,
    allergies TEXT,
    medical_notes TEXT,
    emergency_information TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Emergency Contacts Table
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Availability Rules Table
CREATE TABLE availability_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_times CHECK (start_time < end_time)
);

-- 8. Availability Exceptions Table
CREATE TABLE availability_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    exception_type exception_type NOT NULL DEFAULT 'unavailable',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_exception_dates CHECK (start_date < end_date)
);

-- 9. Pricing Config Table
CREATE TABLE pricing_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (platform_percentage >= 0),
    min_platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 2.00 CHECK (min_platform_fee >= 0),
    max_platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00 CHECK (max_platform_fee >= 0),
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (tax_percentage >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status booking_status NOT NULL DEFAULT 'pending',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    special_notes TEXT,
    pickup_required BOOLEAN NOT NULL DEFAULT FALSE,
    pickup_location TEXT,
    cancellation_policy_snapshot TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_booking_times CHECK (start_time < end_time)
);

-- 11. Booking Children Join Table
CREATE TABLE booking_children (
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    PRIMARY KEY (booking_id, child_id)
);

-- 12. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    platform_fee_cut NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (platform_fee_cut >= 0),
    sitter_payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (sitter_payout_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Payouts Table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE RESTRICT,
    stripe_transfer_id VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Stripe Accounts Table
CREATE TABLE stripe_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_connect_id VARCHAR(255),
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 15. Stripe Webhook Events Deduplication Table
CREATE TABLE stripe_events (
    id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 16. Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_booking_reviewer UNIQUE (booking_id, reviewer_id),
    CONSTRAINT chk_reviewer_not_reviewee CHECK (reviewer_id <> reviewee_id)
);

-- 17. Favorites Table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sitter_id UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (parent_id, sitter_id)
);

-- 18. Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 19. Conversation Participants Table
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, profile_id)
);

-- 20. Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 21. Message Attachments Table
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 22. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 23. Notification Preferences Table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 24. Disputes Table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status dispute_status NOT NULL DEFAULT 'open',
    reason VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 25. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 26. Indexes
CREATE INDEX idx_profiles_location_coords ON profiles USING gist(location_coords);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_verification_status ON profiles(verification_status);
CREATE INDEX idx_sitter_profiles_rate ON sitter_profiles(hourly_rate);
CREATE INDEX idx_sitter_profiles_available ON sitter_profiles(is_available);
CREATE INDEX idx_bookings_parent ON bookings(parent_id);
CREATE INDEX idx_bookings_sitter ON bookings(sitter_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_times ON bookings(start_time, end_time);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id) WHERE is_read = FALSE;

-- 27. Security triggers and pricing calculations
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_sitter_profiles_modtime BEFORE UPDATE ON sitter_profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_bookings_modtime BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE FUNCTION enforce_role_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Allow role changes for service role (auth.uid() is null) or if actor is admin
        IF auth.uid() IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Role changes are restricted to administrators.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_role_immutability
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_role_immutability();

CREATE OR REPLACE FUNCTION enforce_booking_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS NULL THEN
        IF NEW.status NOT IN ('draft', 'pending') THEN
            RAISE EXCEPTION 'Invalid initial booking status. Must be draft or pending.';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'draft' AND NEW.status IN ('pending', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('in_progress', 'cancelled') THEN
        IF NEW.status = 'cancelled' THEN
            NEW.cancelled_at := NOW();
        END IF;
        RETURN NEW;
    ELSIF OLD.status = 'in_progress' AND NEW.status IN ('completed', 'disputed') THEN
        IF NEW.status = 'completed' THEN
            NEW.completed_at := NOW();
        END IF;
        RETURN NEW;
    ELSIF OLD.status = 'completed' AND NEW.status IN ('disputed', 'refunded') THEN
        RETURN NEW;
    ELSIF OLD.status = 'disputed' AND NEW.status IN ('refunded', 'completed') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Illegal booking status transition from % to %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_booking_status_transitions
BEFORE UPDATE OF status ON bookings
FOR EACH ROW EXECUTE FUNCTION enforce_booking_status_transitions();

CREATE OR REPLACE FUNCTION check_sitter_double_booking(
    p_sitter_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM bookings
        WHERE sitter_id = p_sitter_id
          AND status IN ('pending', 'accepted', 'in_progress')
          AND (p_exclude_booking_id IS NULL OR id <> p_exclude_booking_id)
          AND (
            (p_start_time >= start_time AND p_start_time < end_time) OR
            (p_end_time > start_time AND p_end_time <= end_time) OR
            (p_start_time <= start_time AND p_end_time >= end_time)
          )
    ) INTO v_conflict_exists;

    RETURN v_conflict_exists;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_no_double_bookings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('pending', 'accepted', 'in_progress') THEN
        IF check_sitter_double_booking(NEW.sitter_id, NEW.start_time, NEW.end_time, NEW.id) THEN
            RAISE EXCEPTION 'Double booking conflict: Sitter is already booked during this timeframe.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_no_double_bookings
BEFORE INSERT OR UPDATE OF sitter_id, start_time, end_time, status ON bookings
FOR EACH ROW EXECUTE FUNCTION enforce_no_double_bookings();

-- Booking notifications auto-generator
CREATE OR REPLACE FUNCTION public.handle_booking_notification()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
    v_parent_name TEXT;
    v_sitter_name TEXT;
    v_booking_date DATE;
BEGIN
    v_booking_date := NEW.start_time::DATE;

    -- Get Parent Display Name
    SELECT display_name INTO v_parent_name
    FROM public.profiles
    WHERE id = NEW.parent_id;

    -- Get Sitter Display Name
    SELECT display_name INTO v_sitter_name
    FROM public.profiles
    WHERE id = NEW.sitter_id;

    -- If inserting a new booking or updating to pending
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending') THEN
        INSERT INTO public.notifications (profile_id, type, title, content, link)
        VALUES (
            NEW.sitter_id,
            'booking_request',
            'New Booking Request',
            COALESCE(v_parent_name, 'A parent') || ' has requested a booking on ' || to_char(v_booking_date, 'Mon DD, YYYY') || '.',
            '/bookings'
        );
    END IF;

    -- If booking accepted
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted' THEN
        INSERT INTO public.notifications (profile_id, type, title, content, link)
        VALUES (
            NEW.parent_id,
            'booking_accepted',
            'Booking Request Accepted',
            COALESCE(v_sitter_name, 'A sitter') || ' has accepted your booking request for ' || to_char(v_booking_date, 'Mon DD, YYYY') || '.',
            '/bookings'
        );
    END IF;

    -- If booking declined
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'declined' THEN
        INSERT INTO public.notifications (profile_id, type, title, content, link)
        VALUES (
            NEW.parent_id,
            'booking_declined',
            'Booking Request Declined',
            COALESCE(v_sitter_name, 'A sitter') || ' has declined your booking request for ' || to_char(v_booking_date, 'Mon DD, YYYY') || '.',
            '/bookings'
        );
    END IF;

    -- If booking cancelled
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
        -- Notify the other party
        -- If parent cancelled, notify sitter
        IF auth.uid() = NEW.parent_id THEN
            INSERT INTO public.notifications (profile_id, type, title, content, link)
            VALUES (
                NEW.sitter_id,
                'booking_cancelled',
                'Booking Cancelled by Parent',
                COALESCE(v_parent_name, 'The parent') || ' has cancelled the booking on ' || to_char(v_booking_date, 'Mon DD, YYYY') || '.',
                '/bookings'
            );
        -- If sitter cancelled, notify parent
        ELSIF auth.uid() = NEW.sitter_id THEN
            INSERT INTO public.notifications (profile_id, type, title, content, link)
            VALUES (
                NEW.parent_id,
                'booking_cancelled',
                'Booking Cancelled by Sitter',
                COALESCE(v_sitter_name, 'The sitter') || ' has cancelled the booking on ' || to_char(v_booking_date, 'Mon DD, YYYY') || '.',
                '/bookings'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_booking_notification ON public.bookings;
CREATE TRIGGER trg_handle_booking_notification
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_notification();

-- Booking conversation initiator trigger
CREATE OR REPLACE FUNCTION public.initialize_booking_conversation()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
    v_conversation_id UUID;
    v_booking_date DATE;
BEGIN
    v_booking_date := NEW.start_time::DATE;

    -- 1. Create a new conversation row
    INSERT INTO public.conversations (booking_id)
    VALUES (NEW.id)
    RETURNING id INTO v_conversation_id;

    -- 2. Add Parent as participant
    INSERT INTO public.conversation_participants (conversation_id, profile_id)
    VALUES (v_conversation_id, NEW.parent_id);

    -- 3. Add Sitter as participant
    INSERT INTO public.conversation_participants (conversation_id, profile_id)
    VALUES (v_conversation_id, NEW.sitter_id);

    -- 4. Insert an initial system welcome message from the parent
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (
        v_conversation_id,
        NEW.parent_id,
        'Hello! I have sent a booking request for ' || to_char(v_booking_date, 'Mon DD, YYYY') || '. Let''s coordinate details here!'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initialize_booking_conversation ON public.bookings;
CREATE TRIGGER trg_initialize_booking_conversation
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.initialize_booking_conversation();

-- Admin Check Helper Function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES POLICIES
CREATE POLICY select_profiles ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY update_profiles ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());
CREATE POLICY insert_profiles ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. SITTER PROFILES POLICIES
CREATE POLICY select_sitter_profiles ON sitter_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_sitter_profiles ON sitter_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY update_sitter_profiles ON sitter_profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

-- 3. SITTER SERVICES & LANGUAGES POLICIES
CREATE POLICY select_sitter_services ON sitter_services FOR SELECT TO authenticated USING (true);
CREATE POLICY modify_sitter_services ON sitter_services FOR ALL TO authenticated USING (sitter_id = auth.uid() OR is_admin()) WITH CHECK (sitter_id = auth.uid() OR is_admin());
CREATE POLICY select_sitter_languages ON sitter_languages FOR SELECT TO authenticated USING (true);
CREATE POLICY modify_sitter_languages ON sitter_languages FOR ALL TO authenticated USING (sitter_id = auth.uid() OR is_admin()) WITH CHECK (sitter_id = auth.uid() OR is_admin());

-- 4. CHILDREN POLICIES
CREATE POLICY select_children ON children FOR SELECT TO authenticated USING (parent_id = auth.uid() OR is_admin() OR EXISTS (SELECT 1 FROM bookings b JOIN booking_children bc ON b.id = bc.booking_id WHERE bc.child_id = children.id AND b.sitter_id = auth.uid() AND b.status IN ('accepted', 'in_progress', 'completed', 'disputed')));
CREATE POLICY insert_children ON children FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid());
CREATE POLICY update_children ON children FOR UPDATE TO authenticated USING (parent_id = auth.uid() OR is_admin()) WITH CHECK (parent_id = auth.uid() OR is_admin());
CREATE POLICY delete_children ON children FOR DELETE TO authenticated USING (parent_id = auth.uid() OR is_admin());

-- 5. EMERGENCY CONTACTS POLICIES
CREATE POLICY select_emergency_contacts ON emergency_contacts FOR SELECT TO authenticated USING (parent_id = auth.uid() OR is_admin() OR EXISTS (SELECT 1 FROM bookings b WHERE b.parent_id = emergency_contacts.parent_id AND b.sitter_id = auth.uid() AND b.status IN ('accepted', 'in_progress', 'completed', 'disputed')));
CREATE POLICY modify_emergency_contacts ON emergency_contacts FOR ALL TO authenticated USING (parent_id = auth.uid() OR is_admin()) WITH CHECK (parent_id = auth.uid() OR is_admin());

-- 6. AVAILABILITY POLICIES
CREATE POLICY select_availability_rules ON availability_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY modify_availability_rules ON availability_rules FOR ALL TO authenticated USING (sitter_id = auth.uid() OR is_admin()) WITH CHECK (sitter_id = auth.uid() OR is_admin());
CREATE POLICY select_availability_exceptions ON availability_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY modify_availability_exceptions ON availability_exceptions FOR ALL TO authenticated USING (sitter_id = auth.uid() OR is_admin()) WITH CHECK (sitter_id = auth.uid() OR is_admin());

-- 7. BOOKINGS POLICIES
CREATE POLICY select_bookings ON bookings FOR SELECT TO authenticated USING (parent_id = auth.uid() OR sitter_id = auth.uid() OR is_admin());
CREATE POLICY insert_bookings ON bookings FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND NOT is_admin());
CREATE POLICY update_bookings ON bookings FOR UPDATE TO authenticated USING (parent_id = auth.uid() OR sitter_id = auth.uid() OR is_admin()) WITH CHECK (parent_id = auth.uid() OR sitter_id = auth.uid() OR is_admin());
CREATE POLICY select_booking_children ON booking_children FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid() OR is_admin())));
CREATE POLICY insert_booking_children ON booking_children FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.parent_id = auth.uid()));

-- 8. PAYMENTS & PAYOUTS POLICIES
CREATE POLICY select_payments ON payments FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = payments.booking_id AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())));
CREATE POLICY select_payouts ON payouts FOR SELECT TO authenticated USING (sitter_id = auth.uid() OR is_admin());

-- 9. STRIPE ACCOUNTS POLICIES
CREATE POLICY select_stripe_accounts ON stripe_accounts FOR SELECT TO authenticated USING (profile_id = auth.uid() OR is_admin());

-- 10. REVIEWS POLICIES
CREATE POLICY select_reviews ON reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_reviews ON reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.status = 'completed' AND ((b.parent_id = reviewer_id AND b.sitter_id = reviewee_id) OR (b.sitter_id = reviewer_id AND b.parent_id = reviewee_id))));
CREATE POLICY delete_reviews ON reviews FOR DELETE TO authenticated USING (is_admin());

-- 11. FAVORITES POLICIES
CREATE POLICY select_favorites ON favorites FOR SELECT TO authenticated USING (parent_id = auth.uid() OR is_admin());
CREATE POLICY modify_favorites ON favorites FOR ALL TO authenticated USING (parent_id = auth.uid() OR is_admin()) WITH CHECK (parent_id = auth.uid() OR is_admin());

-- Helper function to check conversation membership securely without RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND profile_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 12. MESSAGING SYSTEM POLICIES
CREATE POLICY select_conversations ON conversations FOR SELECT TO authenticated USING (is_admin() OR is_conversation_member(id, auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id));
CREATE POLICY insert_conversations ON conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY select_participants ON conversation_participants FOR SELECT TO authenticated USING (is_admin() OR is_conversation_member(conversation_id, auth.uid()) OR profile_id = auth.uid());
CREATE POLICY insert_participants ON conversation_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY select_messages ON messages FOR SELECT TO authenticated USING (is_admin() OR is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY insert_messages ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_conversation_member(conversation_id, auth.uid()));

-- 13. NOTIFICATIONS POLICIES
CREATE POLICY select_notifications ON notifications FOR SELECT TO authenticated USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY update_notifications ON notifications FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR is_admin()) WITH CHECK (profile_id = auth.uid() OR is_admin());
CREATE POLICY select_notification_preferences ON notification_preferences FOR SELECT TO authenticated USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY update_notification_preferences ON notification_preferences FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR is_admin()) WITH CHECK (profile_id = auth.uid() OR is_admin());

-- 14. DISPUTES POLICIES
CREATE POLICY select_disputes ON disputes FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR is_admin() OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = disputes.booking_id AND b.sitter_id = auth.uid()));
CREATE POLICY insert_disputes ON disputes FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())));

-- 15. AUDIT LOGS
CREATE POLICY select_audit_logs ON audit_logs FOR SELECT TO authenticated USING (is_admin());

-- 25. CARE FEED / LOGS
CREATE TABLE public.care_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    sitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    details TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_care_logs ON public.care_logs
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.parent_id = auth.uid() OR b.sitter_id = auth.uid())
    )
  );

CREATE POLICY insert_care_logs ON public.care_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.sitter_id = auth.uid()
    )
  );

CREATE POLICY delete_care_logs ON public.care_logs
  FOR DELETE TO authenticated
  USING (
    public.is_admin() OR 
    sitter_id = auth.uid()
  );

-- Enable Supabase Realtime for care_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_logs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;
