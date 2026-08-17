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

    console.log('Adding gallery_urls column to sitter_profiles...');
    await client.query(`
      ALTER TABLE public.sitter_profiles 
      ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT ARRAY[
        'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=500',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500',
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=500'
      ];
    `);

    console.log('Successfully added gallery_urls column to sitter_profiles!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
