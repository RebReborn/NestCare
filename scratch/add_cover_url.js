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

    console.log('Adding cover_url column to public.sitter_profiles...');
    await client.query(`
      ALTER TABLE public.sitter_profiles 
      ADD COLUMN IF NOT EXISTS cover_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800';
    `);

    console.log('Successfully added cover_url column!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
