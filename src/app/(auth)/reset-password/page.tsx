'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateErr) throw updateErr;

      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
      toast.error(err.message || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-black text-heading dark:text-white">Reset Your Password</h1>
          <p className="text-xs text-stone-500 dark:text-slate-400">Enter a new secure password for your NestCare account.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {success ? (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-base font-black text-heading dark:text-white">Password Updated!</h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">Your password has been changed. Redirecting to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 p-3.5 rounded-2xl text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">New Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 outline-none focus:border-primary text-xs bg-bg dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Confirm New Password</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 outline-none focus:border-primary text-xs bg-bg dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Updating Password...
                  </>
                ) : (
                  'Set New Password'
                )}
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-xs">
          <Link href="/login" className="text-stone-400 hover:text-stone-600 font-bold">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
