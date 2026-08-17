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

    console.log('Defining helper function is_conversation_member to prevent RLS recursion...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
      RETURNS BOOLEAN SECURITY DEFINER AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_id = p_conversation_id AND profile_id = p_user_id
        );
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Updating messaging RLS policies...');
    await client.query(`
      -- Drop old policies
      DROP POLICY IF EXISTS select_conversations ON public.conversations;
      DROP POLICY IF EXISTS select_participants ON public.conversation_participants;
      DROP POLICY IF EXISTS select_messages ON public.messages;
      DROP POLICY IF EXISTS insert_messages ON public.messages;

      -- Apply new recursive-safe policies
      CREATE POLICY select_conversations ON public.conversations 
        FOR SELECT TO authenticated 
        USING (public.is_admin() OR public.is_conversation_member(id, auth.uid()));

      CREATE POLICY select_participants ON public.conversation_participants 
        FOR SELECT TO authenticated 
        USING (public.is_admin() OR public.is_conversation_member(conversation_id, auth.uid()));

      CREATE POLICY select_messages ON public.messages 
        FOR SELECT TO authenticated 
        USING (public.is_admin() OR public.is_conversation_member(conversation_id, auth.uid()));

      CREATE POLICY insert_messages ON public.messages 
        FOR INSERT TO authenticated 
        WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
    `);

    console.log('Messaging RLS policies updated successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
