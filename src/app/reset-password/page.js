'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Settings2, Lock, ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset request. Missing reset token.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSubmitted(true);
    } catch (err) {
      setError(err.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-4 rounded-xl text-sm mb-6">
          <p className="font-bold">Missing Reset Token</p>
          <p className="text-xs mt-1 opacity-80">
            A valid security token is required to reset your password. Please verify the link you clicked.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  return (
    <>
      {!submitted ? (
        <>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Create New Password</h2>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Please enter and confirm your new password below (minimum 8 characters, with uppercase, lowercase, number, and special character).
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-3.5 rounded-xl text-xs mb-6 flex items-start gap-2.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors" />
                <input
                  className="w-full px-3.5 py-3 pl-10.5 border border-slate-800 rounded-xl text-sm text-white outline-none bg-slate-900/50 hover:bg-slate-900 focus:bg-slate-950 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)] placeholder-slate-500 transition-all"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors" />
                <input
                  className="w-full px-3.5 py-3 pl-10.5 border border-slate-800 rounded-xl text-sm text-white outline-none bg-slate-900/50 hover:bg-slate-900 focus:bg-slate-950 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)] placeholder-slate-500 transition-all"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 border-none rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.2)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Password Reset Complete</h2>
          <p className="text-slate-400 text-xs mt-3 leading-relaxed max-w-sm mx-auto">
            Your login password has been updated. You can now use your new password to sign into the system.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-[0_10px_20px_-5px_rgba(16,185,129,0.2)]"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 bg-slate-950 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-[440px] bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Settings2 size={24} className="animate-[spin_40s_linear_infinite]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Asset<span className="text-emerald-400">IQ</span></h1>
          <p className="text-slate-400 text-xs mt-1">Enterprise IT Asset Management</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
