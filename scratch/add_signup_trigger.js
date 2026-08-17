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

    // 1. Create the trigger function
    console.log('Creating handle_new_user trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
        v_role public.user_role;
        v_dob DATE;
      BEGIN
        -- Parse role safely
        BEGIN
          v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'parent'::public.user_role);
        EXCEPTION WHEN OTHERS THEN
          v_role := 'parent'::public.user_role;
        END;

        -- Parse date of birth safely
        BEGIN
          v_dob := COALESCE((new.raw_user_meta_data->>'date_of_birth')::DATE, '2000-01-01'::DATE);
        EXCEPTION WHEN OTHERS THEN
          v_dob := '2000-01-01'::DATE;
        END;

        -- Insert into public.profiles
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
        VALUES (
          new.id,
          v_role,
          COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
          COALESCE(new.raw_user_meta_data->>'last_name', ''),
          COALESCE(new.raw_user_meta_data->>'first_name', 'User') || ' ' || COALESCE(SUBSTRING(new.raw_user_meta_data->>'last_name' FROM 1 FOR 1), '') || '.',
          new.email,
          v_dob,
          'unverified',
          'active'
        )
        ON CONFLICT (id) DO NOTHING;

        -- If Sitter, insert into public.sitter_profiles
        IF v_role = 'sitter'::public.user_role THEN
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
          VALUES (
            new.id,
            'Experienced Caregiver',
            'Tell parents about your qualifications and experience here.',
            18.00,
            0,
            'unverified',
            true,
            1,
            3
          )
          ON CONFLICT (id) DO NOTHING;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 2. Bind the trigger to auth.users
    console.log('Binding trigger to auth.users table...');
    await client.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);

    console.log('Trigger set up successfully!');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
