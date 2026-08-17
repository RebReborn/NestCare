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

    console.log('Altering bookings.sitter_id foreign key constraint to point directly to profiles...');
    await client.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_sitter_id_fkey;
      ALTER TABLE bookings ADD CONSTRAINT bookings_sitter_id_fkey FOREIGN KEY (sitter_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
    `);

    console.log('Foreign key constraint updated successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
