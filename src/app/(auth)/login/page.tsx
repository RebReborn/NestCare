'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, AlertCircle, Loader2, KeyRound, X, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@/schemas/validation';
import { toast } from 'sonner';

const getFriendlyErrorMessage = (msg: string) => {
  if (!msg) return 'Invalid email or password. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email address or password. Please double-check your credentials and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been verified yet. Please check your inbox for a confirmation link.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many failed login attempts. Please wait a few minutes before trying again.';
  }
  if (lower.includes('user not found')) {
    return 'No account was found with this email address. Please register for a new account.';
  }
  return msg;
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

      toast.success('Successfully signed in!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('[Login Error]', err);
      const friendlyMsg = getFriendlyErrorMessage(err.message || '');
      setError(friendlyMsg);
      toast.error(friendlyMsg);
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

  const handleAppleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Apple Sign-In failed.');
      toast.error(err.message || 'Apple Sign-In failed.');
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    try {
      setResetLoading(true);
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) throw resetErr;

      setResetSent(true);
      toast.success('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-black text-heading dark:text-white">Welcome Back</h1>
          <p className="text-xs text-stone-500 dark:text-slate-400">Sign in to your NestCare account.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 p-4 rounded-2xl text-xs space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-rose-900 dark:text-white">Authentication Failed</p>
                  <p className="text-rose-700 dark:text-slate-300 font-medium leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/50 flex items-center justify-between text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-primary hover:underline text-left"
                >
                  Forgot Password?
                </button>
                <Link href="/register" className="text-stone-500 dark:text-slate-400 hover:underline">
                  Create Account
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email Address</label>
              <input
                type="email"
                {...register('email')}
                placeholder="you@example.com"
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 outline-none focus:border-primary text-xs bg-bg dark:bg-slate-800 dark:text-white"
              />
              {errors.email && (
                <span className="text-[10px] text-red-500 font-medium mt-1 block">{errors.email.message}</span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-stone-400 uppercase">Password</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 outline-none focus:border-primary text-xs bg-bg dark:bg-slate-800 dark:text-white"
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-stone-400 font-bold uppercase">Or continue with</span>
            <div className="flex-grow border-t border-stone-200 dark:border-slate-800"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
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
              onClick={handleAppleLogin}
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
          <span className="text-stone-400">Don't have an account? </span>
          <Link href="/register" className="text-primary font-bold hover:underline">
            Sign Up
          </Link>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-black text-heading dark:text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" /> Reset Password
              </h3>
              <button
                onClick={() => { setShowResetModal(false); setResetSent(false); }}
                className="p-1 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resetSent ? (
              <div className="py-6 flex flex-col items-center text-center space-y-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h4 className="font-display text-sm font-extrabold text-heading dark:text-white">Reset Link Sent</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed max-w-xs">
                  We've sent a password reset link to <strong className="text-stone-800 dark:text-white">{resetEmail}</strong>. Please check your email inbox.
                </p>
                <button
                  onClick={() => { setShowResetModal(false); setResetSent(false); }}
                  className="mt-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl active-press"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Enter the email address associated with your NestCare account and we will send you a link to reset your password.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Your Email Address</label>
                  <input
                    required
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 text-xs bg-bg dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3 border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-stone-50 dark:hover:bg-slate-800 active-press"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
