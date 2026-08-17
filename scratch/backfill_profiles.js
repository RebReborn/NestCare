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

    console.log('Backfilling missing profiles from auth.users...');
    const query = `
      INSERT INTO public.profiles (
        id,
        role,
        first_name,
        last_name,
        display_name,
        email,
        date_of_birth,
        verification_status,
        account_status
      )
      SELECT 
        u.id,
        COALESCE((u.raw_user_meta_data->>'role')::public.user_role, 'parent'::public.user_role) as role,
        COALESCE(u.raw_user_meta_data->>'first_name', 'User') as first_name,
        COALESCE(u.raw_user_meta_data->>'last_name', '') as last_name,
        COALESCE(u.raw_user_meta_data->>'first_name', 'User') || ' ' || COALESCE(SUBSTRING(u.raw_user_meta_data->>'last_name' FROM 1 FOR 1), '') || '.' as display_name,
        u.email,
        COALESCE((u.raw_user_meta_data->>'date_of_birth')::DATE, '2000-01-01'::DATE) as date_of_birth,
        'unverified'::public.verification_status,
        'active'::public.account_status
      FROM auth.users u
      LEFT JOIN public.profiles p ON u.id = p.id
      WHERE p.id IS NULL
      ON CONFLICT (id) DO NOTHING
      RETURNING email, role;
    `;

    const result = await client.query(query);
    console.log('Backfilled profiles:', result.rows);
    console.log('Backfill completed successfully!');

    // Also handle sitter profiles if any backfilled profile is a sitter
    console.log('Checking for backfilled sitters...');
    const sitterBackfill = `
      INSERT INTO public.sitter_profiles (
        id,
        headline,
        bio,
        hourly_rate,
        years_experience,
        background_check_status,
        is_available,
        minimum_booking_hours,
        max_children
      )
      SELECT 
        p.id,
        'Experienced Caregiver',
        'Tell parents about your qualifications and experience here.',
        18.00,
        0,
        'unverified',
        true,
        1,
        3
      FROM public.profiles p
      LEFT JOIN public.sitter_profiles sp ON p.id = sp.id
      WHERE p.role = 'sitter' AND sp.id IS NULL
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `;
    const sitterResult = await client.query(sitterBackfill);
    console.log('Backfilled sitter profiles count:', sitterResult.rows.length);

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
