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

    console.log('Creating database trigger function initialize_booking_conversation...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.initialize_booking_conversation()
      RETURNS TRIGGER AS $$
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
    `);

    console.log('Booking chat trigger installed successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
