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
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
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
