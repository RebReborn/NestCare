-- Add minimum_notice_hours field to sitter_profiles
ALTER TABLE sitter_profiles
ADD COLUMN IF NOT EXISTS minimum_notice_hours INT NOT NULL DEFAULT 0 CHECK (minimum_notice_hours >= 0);

-- Insert default placeholder availability rules for any sitters who don't have them
INSERT INTO availability_rules (sitter_id, day_of_week, start_time, end_time)
SELECT id, day_of_week, '09:00:00'::TIME, '17:00:00'::TIME
FROM sitter_profiles
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS days(day_of_week)
WHERE NOT EXISTS (
    SELECT 1 FROM availability_rules WHERE availability_rules.sitter_id = sitter_profiles.id
);
