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

    console.log('Updating select_conversations RLS policy...');
    await client.query(`
      DROP POLICY IF EXISTS select_conversations ON public.conversations;

      CREATE POLICY select_conversations ON public.conversations
        FOR SELECT TO authenticated
        USING (
          public.is_admin() OR 
          public.is_conversation_member(id, auth.uid()) OR
          NOT EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id
          )
        );
    `);

    console.log('Successfully updated select_conversations RLS policy!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
