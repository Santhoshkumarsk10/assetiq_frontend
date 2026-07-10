'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Settings2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA challenge states
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');

  const { login, verifyMfaChallenge } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaSetup(data.mfaSetup);
        if (data.mfaSetup) {
          setQrCode(data.qrCode);
          setMfaSecret(data.secret);
        }
        setTempToken(data.tempToken);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMfaChallenge(tempToken, otp, mfaSetup ? mfaSecret : undefined);
      router.push('/dashboard');
    } catch (err) {
      setError(err.data?.error || 'Invalid authenticator code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative overflow-hidden font-sans">
      {/* Left side: Project Showcase & Tech-Mandala (Hidden on mobile) */}
      <div className="hidden md:flex md:w-[55%] lg:w-[60%] xl:w-[65%] flex-col justify-between bg-slate-950 p-12 text-white relative overflow-hidden border-r border-slate-900">
        {/* Subtle grid and glow overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.12),transparent_50%)] pointer-events-none" />

        {/* Logo and Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Settings2 size={20} className="animate-[spin_40s_linear_infinite]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Asset<span className="text-emerald-400">IQ</span></span>
          </div>
        </div>

        {/* Center Mandala Graphics */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square max-w-[800px] pointer-events-none opacity-45 mix-blend-screen select-none">
          <img
            src="/images/tech_mandala.png"
            alt="Technology Mandala Pattern"
            className="w-full h-full object-contain animate-[spin_180s_linear_infinite]"
          />
        </div>

        {/* Center showcase - Project-based design layout */}
        <div className="relative z-10 max-w-lg mt-auto mb-auto">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Project Overview</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mt-2 leading-tight">
              The Intelligent Core of <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">Enterprise IT Infrastructure</span>
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Streamlining physical and virtual asset lifecycles, monitoring real-time system performance, and orchestrating secure, automated multi-level workflows.
            </p>
          </div>
        </div>

        {/* Bottom Credits / Footer */}
        <div className="relative z-10 flex justify-between items-center text-xs text-slate-500 border-t border-white/[0.05] pt-6 mt-auto">
          <span>&copy; 2026 AssetIQ Enterprise.</span>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-white relative z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.04),transparent_50%)] pointer-events-none" />
        
        <div className="w-full max-w-[400px] flex flex-col justify-center relative z-10">
          {/* Floating Header for Mobile (Hidden on Desktop) */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 mb-3 shadow-sm">
              <Settings2 size={24} className="animate-[spin_40s_linear_infinite]" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Asset<span className="text-emerald-500">IQ</span></h1>
            <p className="text-slate-450 text-xs mt-1">Enterprise IT Asset Management</p>
          </div>

          <div>
            {!mfaRequired ? (
              <>
                <div className="mb-8 text-left">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
                  <p className="text-slate-500 text-sm mt-1.5">Please sign in to access your administrative panel.</p>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-600 border border-rose-100 p-3.5 rounded-xl text-xs mb-6 flex items-start gap-2.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" />
                      <input
                        className="w-full px-3.5 py-3 pl-10.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)] placeholder-slate-400 transition-all"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                      <Link href="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" />
                      <input
                        className="w-full px-3.5 py-3 pl-10.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)] placeholder-slate-400 transition-all"
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 bg-transparent border-none cursor-pointer hover:text-slate-600 transition-colors"
                        onClick={() => setShowPass(!showPass)}
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 focus:ring-2 accent-emerald-500 cursor-pointer"
                      />
                      Remember device for 30 days
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 border-none rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {mfaSetup ? '2-Factor Setup' : '2-Factor Verification'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                    {mfaSetup 
                      ? 'Scan the QR code below with your authenticator app to secure your account.' 
                      : 'Please enter the 6-digit verification code from your authenticator app.'}
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-600 border border-rose-100 p-3.5 rounded-xl text-xs mb-6 flex items-start gap-2.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {mfaSetup && qrCode && (
                  <div className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 text-center">
                    <img src={qrCode} alt="MFA QR Code" className="w-40 h-40 border border-slate-200 bg-white p-1 rounded-xl shadow-sm" />
                    <div className="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Manual Code</div>
                    <code className="mt-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono tracking-wider">{mfaSecret}</code>
                  </div>
                )}

                <form onSubmit={handleMfaSubmit} className="space-y-5 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Verification Code</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" />
                      <input
                        className="w-full px-3.5 py-3 pl-10.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)] placeholder-slate-400 transition-all font-bold tracking-[0.25em] text-center"
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 border-none rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                    {!loading && <ArrowRight size={16} />}
                  </button>

                  <button
                    type="button"
                    className="w-full py-2.5 border border-slate-200 rounded-xl bg-transparent hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    onClick={() => {
                      setMfaRequired(false);
                      setOtp('');
                      setError('');
                    }}
                  >
                    Back to Sign In
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-16 text-center">&copy; 2026 AssetIQ. Enterprise-grade IT Asset Management.</p>
        </div>
      </div>
    </div>
  );
}
