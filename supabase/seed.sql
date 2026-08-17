-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Seed auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
(
    '00000000-0000-0000-0000-000000000001', 
    'jane.doe@example.com', 
    crypt('Password123!', gen_salt('bf')), 
    now(), 
    'authenticated', 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now()
),
(
    '00000000-0000-0000-0000-000000000002', 
    'robert.smith@example.com', 
    crypt('Password123!', gen_salt('bf')), 
    now(), 
    'authenticated', 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now()
),
(
    '00000000-0000-0000-0000-000000000011', 
    'emily.watson@example.com', 
    crypt('Password123!', gen_salt('bf')), 
    now(), 
    'authenticated', 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now()
),
(
    '00000000-0000-0000-0000-000000000012', 
    'michael.brown@example.com', 
    crypt('Password123!', gen_salt('bf')), 
    now(), 
    'authenticated', 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now()
),
(
    '00000000-0000-0000-0000-000000000099', 
    'admin@childcaremarketplace.com', 
    crypt('Password123!', gen_salt('bf')), 
    now(), 
    'authenticated', 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Seed configuration
INSERT INTO pricing_config (id, platform_percentage, min_platform_fee, max_platform_fee, tax_percentage, currency, is_active)
VALUES (
    'f310f845-df62-421f-82ff-65287f39446d',
    10.00,
    2.00,
    50.00,
    5.00,
    'USD',
    TRUE
) ON CONFLICT DO NOTHING;

-- Seed mock parents and sitters in profiles
-- (In a real system, these would align with auth.users)
-- Parents
INSERT INTO profiles (id, role, first_name, last_name, display_name, email, date_of_birth, bio, location_lat, location_lng, verification_status, account_status)
VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'parent',
    'Jane',
    'Doe',
    'Jane D.',
    'jane.doe@example.com',
    '1990-05-15',
    'Mother of two looking for occasional weekend care and school pickups.',
    53.5461,
    -113.4938,
    'identity_verified',
    'active'
),
(
    '00000000-0000-0000-0000-000000000002',
    'parent',
    'Robert',
    'Smith',
    'Robert S.',
    'robert.smith@example.com',
    '1985-09-20',
    'Single dad needing recurring after-school pickup.',
    53.5225,
    -113.5244,
    'unverified',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Sitters
INSERT INTO profiles (id, role, first_name, last_name, display_name, email, date_of_birth, bio, location_lat, location_lng, verification_status, account_status)
VALUES 
(
    '00000000-0000-0000-0000-000000000011',
    'sitter',
    'Emily',
    'Watson',
    'Emily W.',
    'emily.watson@example.com',
    '1998-03-10',
    'Certified early childhood educator with CPR training.',
    53.5400,
    -113.5000,
    'fully_verified',
    'active'
),
(
    '00000000-0000-0000-0000-000000000012',
    'sitter',
    'Michael',
    'Brown',
    'Michael B.',
    'michael.brown@example.com',
    '2001-11-22',
    'University student looking for evening and weekend babysitting jobs.',
    53.5300,
    -113.5100,
    'identity_verified',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Admin
INSERT INTO profiles (id, role, first_name, last_name, display_name, email, date_of_birth, bio, location_lat, location_lng, verification_status, account_status)
VALUES 
(
    '00000000-0000-0000-0000-000000000099',
    'admin',
    'Alex',
    'Admin',
    'Alex (Admin)',
    'admin@childcaremarketplace.com',
    '1988-01-01',
    'Platform Administrator',
    53.5444,
    -113.4909,
    'fully_verified',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Sitter Profiles Detailed
INSERT INTO sitter_profiles (id, headline, bio, hourly_rate, years_experience, background_check_status, background_check_date, identity_verified, phone_verified, email_verified, is_available, minimum_booking_hours, max_children)
VALUES 
(
    '00000000-0000-0000-0000-000000000011',
    'Early Childhood Educator & CPR Certified Sitter',
    'Hi! I am Emily, a professional childcare provider with 5+ years of experience working with kids aged 0-12. ECE certified and CPR trained.',
    22.50,
    5,
    'fully_verified',
    '2026-01-15 10:00:00+00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    2,
    4
),
(
    '00000000-0000-0000-0000-000000000012',
    'Energetic College Student Sitter',
    'Hey parents! I am Michael, currently studying education. Happy to help with homework, meal prep, and active games with children.',
    18.00,
    2,
    'identity_verified',
    NULL,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    1,
    3
) ON CONFLICT (id) DO NOTHING;

-- Services
INSERT INTO sitter_services (sitter_id, service_type)
VALUES 
('00000000-0000-0000-0000-000000000011', 'babysitting'),
('00000000-0000-0000-0000-000000000011', 'weekend_care'),
('00000000-0000-0000-0000-000000000011', 'meal_preparation'),
('00000000-0000-0000-0000-000000000011', 'special_needs_support'),
('00000000-0000-0000-0000-000000000012', 'babysitting'),
('00000000-0000-0000-0000-000000000012', 'homework_help'),
('00000000-0000-0000-0000-000000000012', 'after_school_pickup')
ON CONFLICT DO NOTHING;

-- Languages
INSERT INTO sitter_languages (sitter_id, language)
VALUES 
('00000000-0000-0000-0000-000000000011', 'English'),
('00000000-0000-0000-0000-000000000011', 'French'),
('00000000-0000-0000-0000-000000000012', 'English'),
('00000000-0000-0000-0000-000000000012', 'Spanish')
ON CONFLICT DO NOTHING;

-- Children
INSERT INTO children (id, parent_id, first_name, date_of_birth, age_group, allergies, special_instructions, medical_notes, emergency_information)
VALUES 
(
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    'Tommy',
    '2021-04-12',
    'toddler',
    'Peanuts (Severe anaphylaxis)',
    'Needs EpiPen near him at all times.',
    'Healthy, no regular medication.',
    'EpiPen is in the red bag in the kitchen cabinet.'
),
(
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000001',
    'Lily',
    '2018-08-30',
    'school_aged',
    'None',
    'Enjoys reading and drawing before bed.',
    'None',
    'Call pediatrician Dr. Susan (555-0199) if parent unreachable.'
) ON CONFLICT (id) DO NOTHING;

-- Emergency Contacts
INSERT INTO emergency_contacts (id, parent_id, name, relationship, phone, secondary_phone, notes)
VALUES (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000001',
    'Grandma Sarah',
    'Grandparent',
    '555-1234',
    '555-5678',
    'Lives 10 mins away, backups if parents unavailable'
) ON CONFLICT (id) DO NOTHING;

-- Availability Rules (Emily Watson available Monday/Saturday)
INSERT INTO availability_rules (sitter_id, day_of_week, start_time, end_time)
VALUES 
('00000000-0000-0000-0000-000000000011', 1, '15:00:00', '21:00:00'),
('00000000-0000-0000-0000-000000000011', 6, '08:00:00', '23:00:00')
ON CONFLICT DO NOTHING;

-- Bookings (1 completed, 1 pending)
-- Completed booking
INSERT INTO bookings (id, parent_id, sitter_id, status, start_time, end_time, duration_minutes, hourly_rate, subtotal, platform_fee, tax, total, currency, special_notes, pickup_required, pickup_location, cancellation_policy_snapshot, created_at, completed_at)
VALUES (
    '00000000-0000-0000-0000-000000001001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'completed',
    '2026-08-10 18:00:00+00',
    '2026-08-10 22:00:00+00',
    240,
    22.50,
    90.00,
    9.00,
    4.95,
    103.95,
    'USD',
    'First time booking Emily. Kids excited.',
    FALSE,
    NULL,
    'Free cancellation > 24 hours',
    '2026-08-08 14:00:00+00',
    '2026-08-10 22:15:00+00'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_children (booking_id, child_id)
VALUES 
('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000201'),
('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000202')
ON CONFLICT DO NOTHING;

-- Pending booking
INSERT INTO bookings (id, parent_id, sitter_id, status, start_time, end_time, duration_minutes, hourly_rate, subtotal, platform_fee, tax, total, currency, special_notes, pickup_required, pickup_location, cancellation_policy_snapshot, created_at)
VALUES (
    '00000000-0000-0000-0000-000000001002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'pending',
    '2026-08-22 17:00:00+00',
    '2026-08-22 21:00:00+00',
    240,
    22.50,
    90.00,
    9.00,
    4.95,
    103.95,
    'USD',
    'Need pickup from art camp, then dinner at home.',
    TRUE,
    'Edmonton Art Museum Lobby',
    'Free cancellation > 24 hours',
    '2026-08-14 09:00:00+00'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_children (booking_id, child_id)
VALUES 
('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000201')
ON CONFLICT DO NOTHING;

-- Payment for completed booking
INSERT INTO payments (id, booking_id, stripe_payment_intent_id, status, amount, platform_fee_cut, sitter_payout_amount, currency)
VALUES (
    '00000000-0000-0000-0000-000000002001',
    '00000000-0000-0000-0000-000000001001',
    'pi_mock_123456789',
    'succeeded',
    103.95,
    9.00,
    94.95,
    'USD'
) ON CONFLICT (id) DO NOTHING;

-- Reviews
INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment)
VALUES (
    '00000000-0000-0000-0000-000000003001',
    '00000000-0000-0000-0000-000000001001',
    '00000000-0000-0000-0000-000000000001', -- Parent reviews sitter
    '00000000-0000-0000-0000-000000000011', -- Emily
    5,
    'Emily was absolutely wonderful! The kids loved her immediately, she followed all dietary restrictions and Tommy felt very safe with his EpiPen. Highly recommend!'
) ON CONFLICT (id) DO NOTHING;

-- Favorites
INSERT INTO favorites (parent_id, sitter_id)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011')
ON CONFLICT DO NOTHING;

-- Chat Setup
INSERT INTO conversations (id, booking_id)
VALUES ('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001002')
ON CONFLICT DO NOTHING;

INSERT INTO conversation_participants (conversation_id, profile_id)
VALUES 
('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000011')
ON CONFLICT DO NOTHING;

INSERT INTO messages (conversation_id, sender_id, content)
VALUES 
('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000001', 'Hi Emily! I requested a booking for August 22nd. Let me know if you can pick Tommy up from camp.'),
('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000011', 'Hi Jane, yes! I am available Saturday evening. I can definitely pick him up from camp and drive him home.')
ON CONFLICT DO NOTHING;
