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

    console.log('Updating select_participants RLS policy...');
    await client.query(`
      DROP POLICY IF EXISTS select_participants ON public.conversation_participants;

      CREATE POLICY select_participants ON public.conversation_participants
        FOR SELECT TO authenticated
        USING (
          public.is_admin() OR 
          public.is_conversation_member(conversation_id, auth.uid()) OR
          profile_id = auth.uid()
        );
    `);

    console.log('Successfully updated select_participants RLS policy!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
