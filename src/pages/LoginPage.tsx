import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { FileText, Users, Shield, Zap, Star, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon: <FileText size={18} />, text: 'Clinic logo & doctor signature on every certificate' },
  { icon: <Users size={18} />, text: 'Save patients — auto-fill in one click' },
  { icon: <Shield size={18} />, text: 'Zero ads, zero watermarks' },
  { icon: <Zap size={18} />, text: 'Certificate history & re-print anytime' },
  { icon: <Star size={18} />, text: 'MCI registration no. on every cert' },
  { icon: <CheckCircle size={18} />, text: 'Works on desktop, tablet & mobile' },
];

const LoginPage: React.FC = () => {
  const { user, isLoading, signInWithGoogle } = useAuth();

  if (!isLoading && user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen relative overflow-hidden flex">
      {/* ── Background ───────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003840] via-[#005c6e] to-[#006e7e]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(138,212,223,0.15),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(0,138,158,0.2),transparent_50%)]" />
      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col lg:flex-row items-center justify-center px-6 py-12 gap-12 lg:gap-20 max-w-7xl mx-auto">

        {/* Left — Branding & Features */}
        <div className="flex-1 max-w-lg text-center lg:text-left">
          {/* Doctrust Logo */}
          <img
            src="/doctrust-logo-white.svg"
            alt="Doctrust"
            className="h-16 sm:h-20 mx-auto lg:mx-0 mb-1"
          />
          <p className="text-[#8ad4df] text-sm font-semibold tracking-wide uppercase mb-4">
            Medical Certificate Premium
          </p>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
            Professional Certificates,{' '}
            <span className="text-[#8ad4df]">Your Branding</span>
          </h1>
          <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
            Generate clinic-branded medical certificates in seconds. Your name, your logo, your patients — no ads, no watermarks.
          </p>

          {/* Feature list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-white/80 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#8ad4df] flex-shrink-0">
                  {f.icon}
                </div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="flex -space-x-2">
              {['D', 'R', 'S', 'M'].map((letter, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#005c6e] flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: ['#006e7e', '#008a9e', '#00a6be', '#8ad4df'][i] }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <div className="text-white/60 text-sm">
              <span className="font-semibold text-white">5,000+</span> doctors trust Doctrust
            </div>
          </div>
        </div>

        {/* Right — Sign-in Card */}
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.3)]">
            {/* Card header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-[#006e7e]/30 border border-[#8ad4df]/30 text-[#8ad4df] text-xs font-semibold px-4 py-2 rounded-full mb-5">
                <Star size={14} />
                Premium Access
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back, Doctor</h2>
              <p className="text-white/50 text-sm">Sign in to access your premium account</p>
            </div>

            {/* Google Button */}
            <button
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">Secure sign in</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-3 bg-white/[0.04] rounded-xl p-4 mb-6">
              <Shield size={16} className="text-[#8ad4df] flex-shrink-0 mt-0.5" />
              <p className="text-white/50 text-xs leading-relaxed">
                We only request your name and email from Google. Your account data stays private and is never shared.
              </p>
            </div>

            {/* Pricing teaser */}
            <p className="text-center text-white/40 text-sm">
              Starting at <span className="font-semibold text-[#8ad4df]">₹199/month</span> · Cancel anytime
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-white/30 text-xs mt-6">
            By signing in, you agree to our{' '}
            <a href="https://www.doctrust.in/privacy" className="text-white/50 hover:text-white/70 underline">Privacy Policy</a>
            {' & '}
            <a href="https://www.doctrust.in/terms" className="text-white/50 hover:text-white/70 underline">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
