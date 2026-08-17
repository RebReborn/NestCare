-- 1. Extend bookings table for first-class school/daycare pickup options
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS care_type VARCHAR(50) NOT NULL DEFAULT 'in_home' CHECK (care_type IN ('in_home', 'school_pickup', 'daycare_pickup', 'school_childcare')),
ADD COLUMN IF NOT EXISTS pickup_school VARCHAR(255),
ADD COLUMN IF NOT EXISTS pickup_time TIME,
ADD COLUMN IF NOT EXISTS pickup_destination VARCHAR(255),
ADD COLUMN IF NOT EXISTS pickup_travel_minutes INT;

-- 2. Extend children table with additional medical, school, and pickup fields
ALTER TABLE children
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS school VARCHAR(255),
ADD COLUMN IF NOT EXISTS authorized_pickup BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Extend emergency_contacts table with contact types (primary, secondary, doctor)
ALTER TABLE emergency_contacts
ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50) NOT NULL DEFAULT 'primary' CHECK (contact_type IN ('primary', 'secondary', 'doctor'));

ALTER TABLE emergency_contacts 
ADD CONSTRAINT unique_parent_contact_type 
UNIQUE (parent_id, contact_type);
