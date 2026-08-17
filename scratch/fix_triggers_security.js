const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'db.akmxcyeaqucgcvctxjdq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '4#b#@m7G99=&-Fw',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    console.log('Re-defining handle_booking_notification trigger with SECURITY DEFINER...');
    await client.query(`
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
              INSERT INTO public.notifications (profile_id, type, title, content, link)
              VALUES (
                  NEW.sitter_id,
                  'booking_cancelled',
                  'Booking Cancelled',
                  'Booking scheduled for ' || to_char(v_booking_date, 'Mon DD, YYYY') || ' has been cancelled.',
                  '/bookings'
              );
              INSERT INTO public.notifications (profile_id, type, title, content, link)
              VALUES (
                  NEW.parent_id,
                  'booking_cancelled',
                  'Booking Cancelled',
                  'Booking scheduled for ' || to_char(v_booking_date, 'Mon DD, YYYY') || ' has been cancelled.',
                  '/bookings'
              );
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Re-defining initialize_booking_conversation trigger with SECURITY DEFINER...');
    await client.query(`
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
    `);

    console.log('Triggers security updated successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
