const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

    // 1. Read and run schema migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260815_init.sql');
    console.log(`Reading migration file from ${migrationPath}...`);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running DDL migrations & RLS policies (this may take a few seconds)...');
    await client.query(migrationSql);
    console.log('Migrations completed successfully!');

    // 2. Read and run seed data
    const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
    console.log(`Reading seed data file from ${seedPath}...`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('Inserting seed records...');
    await client.query(seedSql);
    console.log('Seed records inserted successfully!');

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
