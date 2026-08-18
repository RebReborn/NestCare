'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { registerSchema } from '@/schemas/validation';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'parent' as const,
      first_name: '',
      last_name: '',
      date_of_birth: '',
    }
  });

  const onSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Sign up user via Supabase auth (with metadata options so DB trigger can parse them)
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            role: values.role,
            date_of_birth: values.date_of_birth,
          }
        }
      });

      if (authError) throw authError;

      if (!data.user) {
        throw new Error('Registration failed. Please check details.');
      }

      // Sitters go through onboarding; parents go straight to dashboard
      if (values.role === 'sitter') {
        router.push('/onboarding/sitter');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-black text-heading">Create Account</h1>
          <p className="text-xs text-muted-text">Register as a Parent or Babysitter.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  {...register('first_name')}
                  placeholder="Jane"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
                />
                {errors.first_name && (
                  <span className="text-[10px] text-red-500 font-medium mt-1 block">{errors.first_name.message}</span>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  {...register('last_name')}
                  placeholder="Doe"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
                />
                {errors.last_name && (
                  <span className="text-[10px] text-red-500 font-medium mt-1 block">{errors.last_name.message}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Account Role</label>
              <select
                {...register('role')}
                className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
              >
                <option value="parent">Parent (Looking for Care)</option>
                <option value="sitter">Babysitter (Providing Care)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Date of Birth</label>
              <input
                type="date"
                {...register('date_of_birth')}
                className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
              />
              {errors.date_of_birth && (
                <span className="text-[10px] text-red-500 font-medium mt-1 block">{errors.date_of_birth.message}</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email Address</label>
              <input
                type="email"
                {...register('email')}
                placeholder="name@example.com"
                className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
              />
              {errors.email && (
                <span className="text-[10px] text-red-500 font-medium mt-1 block">{errors.email.message}</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Password</label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none focus:border-primary text-xs bg-bg"
              />
              {errors.password && (
                <span className="text-[10px] text-red-500 font-medium mt-1 block">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-stone-400 font-bold uppercase">Or sign up with</span>
            <div className="flex-grow border-t border-stone-200 dark:border-slate-800"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Google OAuth */}
            <button
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/api/auth/callback` }
                });
              }}
              type="button"
              className="py-3 border border-stone-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-stone-700 dark:text-slate-200 active-press hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.67 0 3.2.58 4.38 1.69l3.27-3.27C17.67 1.48 14.97 1 12 1 7.24 1 3.2 3.73 1.24 7.7l3.87 3C6.03 7.82 8.79 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.71z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.11 14.3c-.24-.72-.37-1.5-.37-2.3s.13-1.58.37-2.3L1.24 6.7C.45 8.29 0 10.09 0 12s.45 3.71 1.24 5.3l3.87-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.04.7-2.38 1.12-4.23 1.12-3.21 0-5.97-2.78-6.89-5.66l-3.87 3C3.2 20.27 7.24 23 12 23z"
                />
              </svg>
              Google
            </button>

            {/* Apple OAuth */}
            <button
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: 'apple',
                  options: { redirectTo: `${window.location.origin}/api/auth/callback` }
                });
              }}
              type="button"
              className="py-3 bg-black dark:bg-white dark:text-black text-white rounded-2xl text-xs font-bold active-press hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.04.24-9.97-1.78-14.8-6.05-3.3-2.84-7.25-7.6-11.85-14.28-6.19-9.04-11.22-19.53-15.09-31.47-3.87-11.94-5.8-23.23-5.8-33.88 0-14.43 3.6-26.17 10.8-35.2 7.2-9.04 16.27-13.67 27.22-13.91 4.79 0 9.87 1.25 15.24 3.76 5.37 2.5 9.17 3.81 11.4 3.93 2.12 0 6.04-1.37 11.75-4.11 5.71-2.74 10.74-4.05 15.1-3.93 12.08.72 21.73 5.43 28.94 14.13-10.73 6.49-16.03 15.39-15.9 26.7 0 9.04 3.36 16.63 10.08 22.77 6.72 6.14 14.8 9.61 24.24 10.4-2.58 7.54-6.04 15.15-10.38 22.84zM119.22 31.81c0-7.25 2.5-14.1 7.5-20.55 5-6.45 11.51-10.38 19.53-11.78.24 1.09.36 2.06.36 2.9 0 7.25-2.58 14.19-7.74 20.81-5.16 6.62-11.66 10.4-19.5 11.35-.12-.73-.15-1.63-.15-2.73z"/>
              </svg>
              Apple
            </button>
          </div>
        </div>

        <div className="text-center text-xs">
          <span className="text-stone-400">Already have an account? </span>
          <Link href="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
