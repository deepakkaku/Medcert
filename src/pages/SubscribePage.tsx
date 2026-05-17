import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle,
  Crown,
  FileText,
  HeartPulse,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import confettiAnimation from '../assets/confetti.json';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

const Lottie = React.lazy(() => import('lottie-react'));

// Plans - Synchronized with SubscriptionGate for production consistency
const PLANS = [
  {
    id: 'weekly',
    name: 'Weekly',
    eyebrow: 'Try it out',
    price: '₹99',
    period: '/week',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_WEEKLY || '',
    popular: false,
    desc: 'For quick documentation sprints.',
  },
  {
    id: 'monthly',
    name: 'Monthly',
    eyebrow: 'Flexible',
    price: '₹299',
    period: '/month',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_MONTHLY || '',
    popular: false,
    desc: 'A simple rhythm for active clinics.',
  },
  {
    id: 'yearly',
    name: 'Annual',
    eyebrow: 'Best value',
    price: '₹2,999',
    period: '/year',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_YEARLY || '',
    popular: true,
    desc: 'Set it once for the whole year.',
  },
];

const FEATURES = [
  { icon: <FileText size={18} />, text: 'Unlimited medical certificates' },
  { icon: <Star size={18} />, text: 'Clinic logo and doctor signature' },
  { icon: <Users size={18} />, text: 'Patient records with auto-fill' },
  { icon: <Shield size={18} />, text: 'No ads or watermarks' },
  { icon: <Zap size={18} />, text: 'Certificate history and re-print' },
  { icon: <BadgeCheck size={18} />, text: 'MCI registration on every cert' },
];

const TRUST_POINTS = [
  { icon: <Lock size={16} />, text: 'Secure Razorpay billing' },
  { icon: <HeartPulse size={16} />, text: 'Built for Indian practices' },
  { icon: <Sparkles size={16} />, text: 'Premium branding tools' },
];

const ConfettiOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
    <React.Suspense fallback={null}>
      <Lottie
        animationData={confettiAnimation}
        loop={false}
        autoplay
        onComplete={onComplete}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
        className="h-full w-full"
      />
    </React.Suspense>
  </div>
);

const SubscribePage: React.FC = () => {
  const { user, profile } = useAuth();
  const { subscription, isActive, isLoading: subLoading, sync } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const selectedPlanDetails = useMemo(
    () => PLANS.find(plan => plan.id === selectedPlan) ?? PLANS[2],
    [selectedPlan]
  );

  const currentPlan = useMemo(() => {
    if (!subscription?.razorpay_plan_id) return null;
    return PLANS.find(plan => plan.razorpayPlanId === subscription.razorpay_plan_id) ?? null;
  }, [subscription?.razorpay_plan_id]);

  const billingDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  useEffect(() => {
    if (!showConfetti) return;

    const timeoutId = window.setTimeout(() => {
      setShowConfetti(false);
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [showConfetti]);

  const handleCancelSubscription = async () => {
    if (!user || !subscription?.razorpay_subscription_id) return;
    setIsCancelling(true);
    try {
      const { supabase } = await import('../lib/supabase');
      // Keep access active until the current billing cycle ends.
      const { error } = await supabase.functions.invoke('cancel-razorpay-subscription', {
        body: {
          subscription_id: subscription.razorpay_subscription_id,
          immediate: false,
        },
      });
      if (error) throw error;

      await sync();
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel subscription. Please contact support@doctrust.in');
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  const handleSubscribe = async (planId?: string | React.MouseEvent) => {
    const targetPlanId = typeof planId === 'string' ? planId : selectedPlan;
    const plan = PLANS.find(p => p.id === targetPlanId);

    console.log(`[SUBSCRIPTION_UI] Initiating subscription for: ${targetPlanId}`);
    console.log(`[SUBSCRIPTION_UI] Razorpay Plan ID: ${plan?.razorpayPlanId}`);

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
        userName: profile?.full_name ?? '',
        userEmail: user.email ?? '',
        onSuccess: async (response) => {
          if (response.razorpay_subscription_id) {
            await sync(response.razorpay_subscription_id);
          } else {
            await sync();
          }
          setShowConfetti(true);
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

  if (subLoading) {
    return (
      <div className="flex min-h-[68vh] items-center justify-center rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col items-center gap-4 text-[#006e7e]">
          <Loader2 size={36} className="animate-spin" />
          <p className="text-sm font-bold tracking-wide uppercase">Loading subscription</p>
        </div>
      </div>
    );
  }

  if (isActive && subscription) {
    const isCancellingSoon = !!subscription.cancel_at_cycle_end;

    return (
      <>
      {showConfetti && (
        <ConfettiOverlay onComplete={() => setShowConfetti(false)} />
      )}
      <div className="mx-auto max-w-6xl pb-6">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm">
              <Crown size={14} className="text-[#006e7e]" />
              Premium
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              Subscription
            </h1>
            <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-600">
              Your billing state, renewal date, and premium access details in one place.
            </p>
          </div>
          <button
            onClick={() => sync()}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            title="Sync with Razorpay"
          >
            <RefreshCw size={15} className={subLoading ? 'animate-spin' : ''} />
            Sync status
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 sm:p-7">
            <div className={`absolute inset-0 ${isCancellingSoon ? 'bg-[radial-gradient(circle_at_8%_0%,rgba(234,88,12,0.14),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(220,38,38,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#fef2f2_100%)]' : 'bg-[radial-gradient(circle_at_8%_0%,rgba(0,138,158,0.14),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(0,110,126,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]'}`} />
            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
                    isCancellingSoon
                      ? 'bg-red-100 text-red-700'
                      : subscription.is_promo 
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <CheckCircle size={14} />
                    {isCancellingSoon ? 'Premium ending' : subscription.is_promo ? 'Promotional access' : 'Premium active'}
                  </span>
                  <h2 className={`mt-5 max-w-xl text-3xl font-black leading-tight sm:text-4xl ${isCancellingSoon ? 'text-red-600' : 'text-slate-950'}`}>
                    {isCancellingSoon 
                      ? 'You have premium access until your cycle ends.' 
                      : subscription.is_promo 
                        ? 'Your promotional period is active.' 
                        : 'Your clinic tools are unlocked.'}
                  </h2>
                  <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-600">
                    {subscription.is_promo 
                      ? 'Enjoy full premium access for 1 month. All professional branding and history tools are available to you.'
                      : 'Branding, patient records, professional certificates, and document history remain available on this account.'}
                  </p>
                </div>
                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${isCancellingSoon ? 'bg-orange-600' : 'bg-slate-950'}`}>
                  <CalendarDays size={25} />
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {isCancellingSoon ? 'Access ends' : 'Next billing'}
                  </p>
                  <p className="mt-2 text-2xl font-black leading-tight text-slate-950">{billingDate ?? 'Not available'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Current plan</p>
                  <p className="mt-2 text-2xl font-black leading-tight text-slate-950">
                    {subscription.is_promo ? 'Promotional' : (currentPlan ? currentPlan.name : 'Premium')}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{subscription.is_promo ? 'Free Access' : (currentPlan ? currentPlan.price : 'Active')}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Renewal</p>
                  <p className={`mt-2 text-lg font-black leading-tight ${isCancellingSoon || subscription.is_promo ? 'text-red-600' : 'text-emerald-700'}`}>
                    {isCancellingSoon || subscription.is_promo ? 'Off' : 'On'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {isCancellingSoon || subscription.is_promo ? 'Will not auto-renew' : 'Auto-renewing'}
                  </p>
                </div>
              </div>

              {!subscription.is_promo && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white/75 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-black text-slate-500">Subscription ID</span>
                    <span className="break-all font-mono text-sm font-bold text-slate-800">
                      {subscription.razorpay_subscription_id}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 sm:p-7">
            <div className="flex h-full flex-col">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Billing support</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {subscription.is_promo 
                    ? 'Your promotional access is managed automatically. No action is required from your side.'
                    : 'Plan changes are handled by support so renewals and invoices stay tidy.'}
                </p>
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <span className="text-sm font-bold text-slate-500">Status</span>
                  <span className={`text-right text-sm font-black ${isCancellingSoon ? 'text-red-600' : 'text-emerald-700'}`}>
                    {subscription.is_promo ? 'Active Promo' : (isCancellingSoon ? 'Cancellation scheduled' : subscription.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-3">
                  <span className="text-sm font-bold text-slate-500">Support</span>
                  <a href="mailto:support@doctrust.in" className="text-sm font-black text-[#006e7e] underline decoration-[#bde2e8] underline-offset-4">
                    support@doctrust.in
                  </a>
                </div>
              </div>

              {!subscription.is_promo ? (
                <>
                  {!isCancellingSoon ? (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="mt-auto w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
                    >
                      Cancel Subscription
                    </button>
                  ) : (
                    <div className="mt-auto rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                      Cancellation confirmed. Premium remains active until the date shown.
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-auto rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-700">
                  This promotional plan will automatically end on the expiry date.
                </div>
              )}

              <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
                You can still use all premium features until the current period ends.
              </p>
            </div>
          </div>
        </section>

        <ConfirmationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          title="Cancel Subscription?"
          message="Are you sure you want to cancel your Premium subscription? You will still have access to all professional branding and patient management features until the end of your current billing period."
          confirmButtonText="Yes, Cancel Subscription"
          isLoading={isCancelling}
          confirmButtonVariant="danger"
        />
      </div>
      </>
    );
  }

  return (
    <>
    {showConfetti && (
      <ConfettiOverlay onComplete={() => setShowConfetti(false)} />
    )}
    <div className="mx-auto max-w-6xl pb-24 sm:pb-6">
      <section className="relative overflow-hidden rounded-[36px] bg-white px-5 py-7 shadow-[0_24px_80px_rgba(0,110,126,0.10)] ring-1 ring-[#d6eaee] sm:px-8 sm:py-9 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,138,158,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(0,110,126,0.10),transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#bde2e8] bg-[#dff4f7] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#006e7e] shadow-sm">
              <Crown size={14} />
              Doctrust Premium
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Certificates that look like your clinic made them.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
              Add your logo, signature, registration details, patient records, and re-print history to every certificate without ads or watermarks.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {TRUST_POINTS.map(point => (
                <span
                  key={point.text}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm"
                >
                  {point.icon}
                  {point.text}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#d6eaee] bg-white p-4 shadow-[0_20px_60px_rgba(0,110,126,0.14)] sm:p-5">
            <div className="rounded-[26px] bg-[radial-gradient(circle_at_15%_5%,rgba(255,255,255,0.28),transparent_34%),linear-gradient(145deg,#006e7e_0%,#008a9e_72%,#7ad3df_100%)] p-5 text-white shadow-xl shadow-[#8ad4df]/25">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white/70">Selected plan</p>
                  <p className="mt-1 text-2xl font-black">{selectedPlanDetails.name}</p>
                </div>
                <div className="rounded-2xl bg-white/18 p-3 text-white">
                  <Sparkles size={24} />
                </div>
              </div>
              <div className="mt-8 flex items-end gap-1">
                <span className="text-5xl font-black leading-none">{selectedPlanDetails.price}</span>
                <span className="pb-1 text-sm font-black uppercase text-white/65">{selectedPlanDetails.period}</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/72">{selectedPlanDetails.desc}</p>
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
                      <Check size={14} strokeWidth={4} />
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
                      <span className="block text-lg font-black text-slate-950">{plan.price}</span>
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
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Subscribe Now
                  <ArrowRight size={20} />
                </>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-bold text-slate-500">
              <Shield size={14} />
              Secure payment via Razorpay. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#006e7e] via-[#008a9e] to-[#7ad3df] p-5 text-white shadow-2xl shadow-[#8ad4df]/30 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white/70">Everything included</p>
            <h2 className="mt-1 text-2xl font-black text-white">Premium tools for cleaner clinic paperwork</h2>
          </div>
          <a
            href="mailto:support@doctrust.in"
            className="text-sm font-black text-white underline decoration-white/40 underline-offset-4"
          >
            Questions? Contact support
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <div key={index} className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[#006e7e]">
                {feature.icon}
              </div>
              <span className="text-sm font-bold leading-5 text-white">{feature.text}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-white/90 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <button
          onClick={() => handleSubscribe(selectedPlan)}
          disabled={isProcessing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#006e7e] to-[#008a9e] px-5 py-4 text-base font-black text-white disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Subscribe {selectedPlanDetails.price}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
    </>
  );
};

export default SubscribePage;
