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
    console.log('Connected successfully!');
    
    // Check auth.users
    console.log('--- auth.users ---');
    const authResult = await client.query("SELECT id, email, created_at, email_confirmed_at FROM auth.users WHERE email IN ('rbrnproduction@gmail.com', 'rodrickreborn@gmail.com');");
    console.log(authResult.rows);

    // Check profiles
    console.log('--- public.profiles ---');
    const profileResult = await client.query("SELECT id, email, role, first_name FROM public.profiles WHERE email IN ('rbrnproduction@gmail.com', 'rodrickreborn@gmail.com');");
    console.log(profileResult.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
