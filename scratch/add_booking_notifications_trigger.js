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

    console.log('Creating database trigger function handle_booking_notification...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_booking_notification()
      RETURNS TRIGGER AS $$
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
    `);

    console.log('Booking notification trigger installed successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
