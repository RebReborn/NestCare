'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@/schemas/validation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'OAuth initialization failed.');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-black text-heading">Welcome Back</h1>
          <p className="text-xs text-muted-text">Sign in to your CareMarket account.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email Address</label>
              <input
                type="email"
                {...register('email')}
                placeholder="you@example.com"
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
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink mx-4 text-[10px] text-stone-400 font-bold uppercase">Or</span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full py-3.5 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 active-press hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            Continue with Google
          </button>
        </div>

        <div className="text-center text-xs">
          <span className="text-stone-400">Don't have an account? </span>
          <Link href="/register" className="text-primary font-bold hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
