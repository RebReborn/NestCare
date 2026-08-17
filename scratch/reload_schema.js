const { Client } = require('pg');

async function run() {
  console.log('Connecting to database...');
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
    console.log('Notifying PostgREST to reload schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema cache reload signal sent successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

run();
