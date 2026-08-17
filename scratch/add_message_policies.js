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

    console.log('Applying INSERT policies on conversations and conversation_participants...');
    await client.query(`
      -- Drop policies if they exist
      DROP POLICY IF EXISTS insert_conversations ON public.conversations;
      DROP POLICY IF EXISTS insert_participants ON public.conversation_participants;

      -- Enable RLS (already enabled, but let's make sure)
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

      -- Allow authenticated users to create conversations
      CREATE POLICY insert_conversations ON public.conversations
        FOR INSERT TO authenticated
        WITH CHECK (true);

      -- Allow authenticated users to add participants
      CREATE POLICY insert_participants ON public.conversation_participants
        FOR INSERT TO authenticated
        WITH CHECK (true);
    `);

    console.log('Database policies applied successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
