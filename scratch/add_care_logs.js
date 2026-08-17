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

    console.log('Creating care_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.care_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
          sitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
          category VARCHAR(50) NOT NULL, -- 'meal', 'nap', 'potty', 'activity', 'photo'
          status VARCHAR(50), -- 'wet', 'dirty', 'dry' / 'asleep', 'awake'
          details TEXT,
          image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Enabling Row-Level Security (RLS) on care_logs...');
    await client.query(`
      ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;
    `);

    console.log('Applying RLS policies to care_logs...');
    await client.query(`
      DROP POLICY IF EXISTS select_care_logs ON public.care_logs;
      DROP POLICY IF EXISTS insert_care_logs ON public.care_logs;
      DROP POLICY IF EXISTS delete_care_logs ON public.care_logs;

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
    `);

    console.log('Enabling Supabase Realtime for care_logs...');
    // Realtime in Supabase is managed via adding the table to the supabase_realtime publication
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.care_logs;
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN
          -- Table is already in the publication
          NULL;
      END;
      $$;
    `);

    console.log('Database changes executed successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
