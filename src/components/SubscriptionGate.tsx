import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Crown, Star, Zap, Shield, FileText, Users, CheckCircle, Check, Loader2, LogOut, ChevronDown, Sparkles, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../hooks/useSubscription'
import Avatar from './ui/Avatar'
import OnboardingModal from './OnboardingModal'

interface SubscriptionGateProps {
  children: React.ReactNode;
  fullPage?: boolean;
}

// Plans – Updated as requested
const PLANS = [
  {
    id: 'weekly',
    name: 'Weekly Plan',
    price: '99',
    period: '/week',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_WEEKLY || '',
    popular: false,
    desc: 'Perfect for quick documentation tasks.'
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: '299',
    period: '/month',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_MONTHLY || '',
    popular: false,
    desc: 'Most flexible for growing practices.'
  },
  {
    id: 'yearly',
    name: 'Annual Plan',
    price: '2999',
    period: '/year',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_YEARLY || '',
    popular: true,
    desc: 'Professional choice for dedicated doctors.'
  },
];

const FEATURES = [
  'Professional Medical Certificates',
  'No watermarks or advertisements',
  'Full Branding & Signature',
  'Patient Records & History',
  '1-Click Generation & Export',
  'Unlimited Generations',
];

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children, fullPage = false }) => {
  const { isActive, isLoading: subLoading, sync } = useSubscription()
  const { user, profile, signOut, setIsMobileMenuOpen } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const selectedPlanDetails = PLANS.find(plan => plan.id === selectedPlan) ?? PLANS[2];

  React.useEffect(() => {
    if (!subLoading) {
      setHasInitialized(true);
    }
  }, [subLoading]);

  const handleSubscribe = async (planId?: string | React.MouseEvent) => {
    const targetPlanId = typeof planId === 'string' ? planId : selectedPlan;
    const plan = PLANS.find(p => p.id === targetPlanId);
    
    console.log(`[SUBSCRIPTION_UI] Selected Plan: ${targetPlanId}`);
    console.log(`[SUBSCRIPTION_UI] Sending Razorpay Plan ID: ${plan?.razorpayPlanId}`);
    
    if (!plan?.razorpayPlanId || !user) {
      alert('Subscription plans are being configured. Please try again shortly.');
      return;
    }

    setIsProcessing(true);

    try {
      const { createRazorpaySubscription, openRazorpaySubscription } = await import('../services/razorpayService');
      const subscriptionId = await createRazorpaySubscription(plan.razorpayPlanId, user.id);

      await openRazorpaySubscription({
        subscriptionId,
        userName: profile?.full_name || '',
        userEmail: user.email || '',
        onSuccess: async (response) => {
          // 1. Initial sync check to DB with the NEW subscription ID
          if (response.razorpay_subscription_id) {
            try {
              const { checkSubscriptionStatus } = await import('../services/razorpayService');
              await checkSubscriptionStatus(response.razorpay_subscription_id);
            } catch (e) {
              console.error('Initial sync error:', e);
            }
          }

          // 2. Trigger sync in hook
          await sync(response.razorpay_subscription_id);

          setShowOnboarding(true);
          setIsProcessing(false);
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
    } catch (err) {
      console.error('Subscription error:', err);
      setIsProcessing(false);
    }
  };
  const handleManualSync = async () => {
    setIsProcessing(true);
    try {
      await sync();
      window.location.reload();
    } catch (err) {
      console.error('Manual sync error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (subLoading && !hasInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#006e7e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Checking subscription...</p>
        </div>
      </div>
    )
  }

  if (isActive) {
    return (
      <>
        <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
        {children}
      </>
    )
  }

  const Header = (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button 
            id="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(true)} 
            className="md:hidden p-2.5 rounded-xl bg-gradient-to-r from-[#006e7e] to-[#008a9e] text-white shadow-lg shadow-[#006e7e]/20 active:scale-95 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex flex-col items-center">
                <img
                  src="/doctrust-logo-white.svg"
                  alt="Doctrust"
                  className="h-10"
                  style={{ filter: 'brightness(0)' }}
                />
                <span className="mt-1 px-2 py-0.5 bg-[#dff4f7] text-[#006e7e] text-[8px] font-black rounded uppercase tracking-[0.2em] shadow-sm leading-none z-10 -mb-2">
                  Premium
                </span>
              </div>
            </Link>
            <div className="hidden sm:block h-10 w-px bg-slate-200" />
            <span className="hidden sm:block text-sm font-black text-slate-400 tracking-tighter uppercase leading-tight">
              Medical Certificate<br /> Generator
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-3 p-1.5 pl-2.5 pr-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Avatar name={profile?.full_name || user?.email || 'U'} imageUrl={user?.user_metadata?.avatar_url || profile?.avatar_url} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                {profile?.full_name || 'Doctor'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Active Session</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isProfileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[2px]"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-60 bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 z-50 py-2 overflow-hidden"
                >
                  <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logged in as</p>
                    <p className="text-xs text-slate-600 truncate font-bold">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );

  const PlansSection = (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:py-16 lg:pb-16">
      <div className="mb-8 text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#bde2e8] bg-[#dff4f7] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#006e7e] shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Choose Your Plan
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl"
        >
          Elevate your clinical <span className="text-[#006e7e]">brand identity.</span>
        </motion.h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative order-2 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#006e7e] via-[#008a9e] to-[#7ad3df] p-5 text-white shadow-2xl shadow-[#8ad4df]/30 sm:p-6 lg:order-1 lg:sticky lg:top-28 lg:self-start"
        >
          <div className="absolute right-0 top-0 h-40 w-40 -translate-y-16 translate-x-16 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#006e7e] shadow-lg">
              <Crown className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-2xl font-black leading-tight">Everything included in Premium</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
              Professional certificate workflows with branding, history, and patient context built in.
            </p>

            <div className="mt-6 space-y-3">
              {FEATURES.map((feature, index) => {
                const icons = [FileText, Shield, Star, Users, Zap, CheckCircle];
                const Icon = icons[index] ?? CheckCircle;

                return (
                  <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#006e7e]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold leading-5">{feature}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="order-1 rounded-[32px] border border-[#d6eaee] bg-white p-4 shadow-[0_24px_80px_rgba(0,110,126,0.10)] sm:p-5 lg:order-2"
        >
          <div className="rounded-[26px] bg-[radial-gradient(circle_at_15%_5%,rgba(255,255,255,0.28),transparent_34%),linear-gradient(145deg,#006e7e_0%,#008a9e_72%,#7ad3df_100%)] p-5 text-white shadow-xl shadow-[#8ad4df]/25 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/70">Selected plan</p>
                <p className="mt-1 text-2xl font-black">{selectedPlanDetails.name}</p>
              </div>
              <div className="rounded-2xl bg-white/18 p-3 text-white">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-7 flex items-end gap-1">
              <span className="text-5xl font-black leading-none">₹{selectedPlanDetails.price}</span>
              <span className="pb-1 text-sm font-black uppercase text-white/65">{selectedPlanDetails.period}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/75">{selectedPlanDetails.desc}</p>
          </div>

          <div className="mt-4 space-y-2">
            {PLANS.map(plan => {
              const isSelected = selectedPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-[#006e7e] bg-[#f0fbfc] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-[#bde2e8] hover:bg-[#f8fcfd]'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-[#006e7e] bg-[#006e7e] text-white' : 'border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-950">{plan.name}</span>
                      {plan.popular && (
                        <span className="rounded-full bg-[#006e7e] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                          Best Value
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{plan.desc}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-black text-slate-950">₹{plan.price}</span>
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{plan.period}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleSubscribe(selectedPlan)}
            disabled={isProcessing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#006e7e] to-[#008a9e] px-5 py-4 text-base font-black text-white shadow-lg shadow-[#8ad4df]/40 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Subscribe Now
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-bold text-slate-500">
            <Shield className="h-4 w-4" />
            Secure checkout via Razorpay. Cancel anytime.
          </p>
        </motion.section>
      </div>

      <div className="mt-10 flex items-center justify-center gap-8 text-center">
        <div>
          <p className="text-2xl font-black text-slate-800">5,000+</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Doctors</p>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div>
          <p className="text-2xl font-black text-slate-800">1M+</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certs Generated</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-white/50 bg-white/90 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <button
          onClick={() => handleSubscribe(selectedPlan)}
          disabled={isProcessing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#006e7e] to-[#008a9e] px-5 py-4 text-base font-black text-white disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Subscribe ₹{selectedPlanDetails.price}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#f8fcfd] overflow-y-auto flex flex-col font-sans selection:bg-[#dff4f7] selection:text-[#006e7e] pt-20">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,138,158,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,110,126,0.08),transparent_35%)] pointer-events-none" />
        <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
        {Header}
        <div className="flex-1 relative z-10">
          {PlansSection}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[40px] bg-white p-1 shadow-2xl shadow-[#8ad4df]/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#dff4f7] via-transparent to-[#f2fbfc] pointer-events-none" />
        <div className="rounded-[39px] bg-white p-10 md:p-16 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#dff4f7] border border-[#bde2e8] text-[#006e7e] text-xs font-black px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
              <Crown className="w-3.5 h-3.5" />
              Premium Access Required
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              Unlock the full potential.
            </h2>
            <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
              Join thousands of doctors generating professional, branded certificates every day.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {FEATURES.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#006e7e]">
                  <CheckCircle size={20} strokeWidth={3} />
                </div>
                <span className="text-slate-700 font-bold">{f}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/subscribe"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#006e7e] to-[#008a9e] text-white font-black px-10 py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-[#8ad4df]/40 hover:shadow-2xl hover:-translate-y-1 text-xl"
            >
              <Crown className="w-6 h-6" />
              View Plans & Subscribe
            </Link>
            <p className="text-slate-400 text-sm mt-6 font-bold flex items-center justify-center gap-2 uppercase tracking-widest">
              <Shield className="w-4 h-4" />
              Safe & Secure Payments
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default SubscriptionGate
