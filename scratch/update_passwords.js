const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  console.log('Generating bcrypt hash for Password123!...');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('Password123!', salt);
  console.log(`Generated hash: ${hash}`);

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

    console.log('Updating seeded users passwords in auth.users...');
    const result = await client.query(
      `UPDATE auth.users 
       SET encrypted_password = $1 
       WHERE email IN (
         'jane.doe@example.com', 
         'robert.smith@example.com', 
         'emily.watson@example.com', 
         'michael.brown@example.com', 
         'admin@childcaremarketplace.com'
       ) 
       RETURNING email;`,
      [hash]
    );

    console.log('Updated users:', result.rows.map(r => r.email));
    console.log('Passwords updated successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
