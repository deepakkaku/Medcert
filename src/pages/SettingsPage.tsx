import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadClinicImage, deleteClinicImage } from '../services/imageService';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import {
  Building2, User, Save, Upload, Trash2, Loader2, LogOut,
  CheckCircle, Image, PenTool, ArrowLeft, ChevronRight, LucideIcon,
  Crown, Sparkles, MessageSquare, BrainCircuit, CreditCard, CalendarClock, LayoutDashboard, ArrowRight, Star
} from 'lucide-react';

type Tab = 'clinic' | 'branding' | 'upgrade' | 'account';

const TABS: { id: Tab; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'clinic', label: 'Clinic Profile', description: 'Doctor details, registration, clinic address, and phone.', icon: Building2 },
  { id: 'branding', label: 'Logo & Signature', description: 'Upload the logo and signature used on certificates.', icon: Image },
  { id: 'account', label: 'Account', description: 'Manage subscription status and sign out.', icon: User },
  { id: 'upgrade', label: 'Upgrade', description: 'Explore premium features for your practice.', icon: Crown },
];

const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition text-sm";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

// ─── Clinic Profile Tab ───────────────────────────────────────────────────────
const ClinicProfileTab: React.FC = () => {
  const { clinic, updateClinic } = useAuth();
  const [form, setForm] = useState({ name: '', doctor: '', degree: '', registration_no: '', address: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (clinic) {
      setForm({
        name: clinic.name ?? '',
        doctor: clinic.doctor ?? '',
        degree: clinic.degree ?? '',
        registration_no: (clinic as any).registration_no ?? '',
        address: clinic.address ?? '',
        phone: clinic.phone ?? '',
      });
    }
  }, [clinic]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateClinic(form as any);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <label className={labelClass}>Doctor Name</label>
        <input name="doctor" value={form.doctor} onChange={handleChange} placeholder="Dr. Ravi Kumar" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Qualifications / Degree</label>
        <input name="degree" value={form.degree} onChange={handleChange} placeholder="MBBS, MD (General Medicine)" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Registration No.</label>
        <input name="registration_no" value={form.registration_no} onChange={handleChange} placeholder="Reg No. 12345" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Clinic Name</label>
        <input name="name" value={form.name} onChange={handleChange} placeholder="City Health Clinic" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Clinic Address</label>
        <textarea name="address" value={form.address} onChange={handleChange} rows={3} placeholder="123, Medical Square, Mumbai - 400001" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputClass} />
      </div>
      <Button onClick={handleSave} disabled={saving} leftIcon={saved ? <CheckCircle size={16} /> : saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}>
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};

// ─── Logo & Signature Tab ─────────────────────────────────────────────────────
const ImageUploader: React.FC<{
  label: string;
  hint: string;
  icon: React.ReactNode;
  currentUrl: string;
  type: 'logo' | 'signature';
  clinicId: string;
  onUpdate: (url: string, path: string) => void;
  onDelete: () => void;
}> = ({ label, hint, icon, currentUrl, type, clinicId, onUpdate, onDelete }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url, path } = await uploadClinicImage(clinicId, file, type);
      onUpdate(url, path);
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { onDelete(); } finally { setDeleting(false); }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1 text-slate-700 font-semibold">
        {icon}{label}
      </div>
      <p className="text-xs text-slate-400 mb-4">{hint}</p>

      {currentUrl ? (
        <div className="flex items-start gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-center min-w-[120px] min-h-[80px]">
            <img src={currentUrl} alt={label} className="max-h-[70px] max-w-[110px] object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1.5"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Replace
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 font-semibold flex items-center gap-1.5"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          {uploading ? <Loader2 size={24} className="animate-spin mb-1" /> : <Upload size={24} className="mb-1" />}
          <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click to upload'}</span>
          <span className="text-xs mt-0.5">PNG, JPG or SVG · Max 2MB</span>
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
};

const BrandingTab: React.FC = () => {
  const { clinic, updateClinic } = useAuth();
  const [localBranding, setLocalBranding] = useState({
    logo: '', logo_path: '', signature: '', signature_path: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (clinic) {
      setLocalBranding({
        logo: clinic.logo ?? '',
        logo_path: clinic.logo_path ?? '',
        signature: clinic.signature ?? '',
        signature_path: (clinic as any).signature_path ?? '',
      });
    }
  }, [clinic]);

  const handleSave = async () => {
    setSaving(true);
    await updateClinic(localBranding as any);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpdate = (url: string, path: string) => {
    setLocalBranding(prev => ({ ...prev, logo: url, logo_path: path }));
  };
  const handleLogoDelete = async () => {
    if (localBranding.logo_path) await deleteClinicImage(localBranding.logo_path);
    setLocalBranding(prev => ({ ...prev, logo: '', logo_path: '' }));
  };
  const handleSigUpdate = (url: string, path: string) => {
    setLocalBranding(prev => ({ ...prev, signature: url, signature_path: path }));
  };
  const handleSigDelete = async () => {
    if (localBranding.signature_path) await deleteClinicImage(localBranding.signature_path);
    setLocalBranding(prev => ({ ...prev, signature: '', signature_path: '' }));
  };

  if (!clinic) return null;

  const hasChanges = (localBranding.logo !== (clinic.logo ?? '')) ||
    (localBranding.signature !== (clinic.signature ?? ''));

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-sm text-slate-500 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
        Your logo and signature will appear on every printed medical certificate.
      </p>
      <ImageUploader
        label="Clinic Logo"
        hint="Appears in the top-left corner of the certificate. Recommended: transparent PNG."
        icon={<Image size={16} />}
        currentUrl={localBranding.logo}
        type="logo"
        clinicId={clinic.id}
        onUpdate={handleLogoUpdate}
        onDelete={handleLogoDelete}
      />
      <ImageUploader
        label="Doctor Signature"
        hint="Appears above the doctor's name in the certificate footer. Use a clear signature on white background."
        icon={<PenTool size={16} />}
        currentUrl={localBranding.signature}
        type="signature"
        clinicId={clinic.id}
        onUpdate={handleSigUpdate}
        onDelete={handleSigDelete}
      />

      <div className="pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          leftIcon={saved ? <CheckCircle size={16} /> : saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        >
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </div>
  );
};

import { useSubscription } from '../hooks/useSubscription';
import ConfirmationModal from '../components/ui/ConfirmationModal';

// ─── Account Tab ──────────────────────────────────────────────────────────────
const AccountTab: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { subscription, isActive, sync } = useSubscription();
  const [signingOut, setSigningOut] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.razorpay_subscription_id) return;
    setCancelling(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.functions.invoke('cancel-razorpay-subscription', {
        body: {
          subscription_id: subscription.razorpay_subscription_id,
          immediate: false
        },
      });

      if (error) throw error;
      await sync(subscription.razorpay_subscription_id);
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
        <Avatar name={profile?.full_name ?? user?.email ?? 'U'} imageUrl={user?.user_metadata?.avatar_url || profile?.avatar_url || undefined} size="lg" />
        <div>
          <div className="font-bold text-slate-800">{profile?.full_name || 'Doctor'}</div>
          <div className="text-sm text-slate-500">{user?.email}</div>
          <div className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isActive
            ? 'text-primary-700 bg-primary-50 border border-primary-100'
            : 'text-slate-600 bg-slate-100 border border-slate-200'
            }`}>
            {isActive ? (
              (subscription?.status === 'cancelled' || subscription?.cancel_at_cycle_end) 
                ? `Premium ends on ${new Date(subscription.current_period_end!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` 
                : 'MedCert Premium'
            ) : 'Free Plan'}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">Subscription Status</div>
            <div className="text-xs text-slate-400 capitalize">
              {isActive && (subscription?.status === 'cancelled' || subscription?.cancel_at_cycle_end) 
                ? `Premium ends on ${new Date(subscription.current_period_end!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                : subscription?.status || 'No active plan'}
            </div>
          </div>
          {isActive && !subscription?.cancel_at_cycle_end ? (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-sm text-red-500 hover:text-red-700 font-semibold"
            >
              Cancel Subscription
            </button>
          ) : (
            <a href="/subscribe" className="text-sm text-primary-600 hover:text-primary-700 font-semibold">Upgrade Now →</a>
          )}
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">Login Method</div>
            <div className="text-xs text-slate-400">Google Account ({user?.email})</div>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">Need support?</div>
            <div className="text-xs text-slate-400">Get help with your account or billing.</div>
          </div>
          <a href="mailto:support@doctrust.in" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
            <MessageSquare size={14} /> Contact Support
          </a>
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={handleSignOut}
        disabled={signingOut}
        leftIcon={signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
        className="!text-red-600 hover:!bg-red-50 border border-red-200 w-full"
      >
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </Button>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription?"
        message="Are you sure you want to cancel your Premium subscription? You will keep access until the end of your current billing period and will not be charged again."
        confirmButtonText="Yes, Cancel Subscription"
        isLoading={cancelling}
        confirmButtonVariant="danger"
      />
    </div>
  );
};

// ─── Upgrade Tab ──────────────────────────────────────────────────────────────
const UpgradeTab: React.FC = () => {
  const features = [
    {
      title: "WhatsApp Automation",
      desc: "Auto-send consultation summaries, prescriptions, and invoices directly to patients on WhatsApp.",
      icon: <MessageSquare className="text-blue-500" />,
      color: "bg-blue-50"
    },
    {
      title: "AI Prescription",
      desc: "Smart, clinical-aware AI suggestions to draft professional prescriptions in seconds.",
      icon: <BrainCircuit className="text-purple-500" />,
      color: "bg-purple-50"
    },
    {
      title: "GST Billing & Razorpay",
      desc: "Generate GST compliant invoices and accept payments with integrated Razorpay links.",
      icon: <CreditCard className="text-emerald-500" />,
      color: "bg-emerald-50"
    },
    {
      title: "AI Appointment Manager",
      desc: "Intelligent scheduling and automated patient reminders for your busy practice.",
      icon: <CalendarClock className="text-orange-500" />,
      color: "bg-orange-50"
    },
    {
      title: "Full Clinic Suite",
      desc: "Comprehensive OPD management, staff access controls, and inventory tracking in one app.",
      icon: <LayoutDashboard className="text-primary-600" />,
      color: "bg-primary-50"
    }
  ];

  return (
    <div className="space-y-8 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#006e7e] to-[#008a9e] p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Crown size={120} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-sm">
            <Sparkles size={14} /> Ultra Premium Access
          </div>
          <h2 className="mt-4 text-3xl font-black">Certificates are just the beginning.</h2>
          <p className="mt-2 text-white/80 max-w-md font-medium">
            Unlock the full power of Doctrust AI and transform your practice into a modern, paperless clinic.
          </p>
          <a
            href="/subscribe"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#006e7e] shadow-xl hover:bg-slate-50 transition-all hover:-translate-y-0.5"
          >
            Upgrade to Full AI Native Experience <ArrowRight size={18} />
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature, i) => (
          <div key={i} className="group relative rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-primary-100 hover:shadow-md">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
              {React.cloneElement(feature.icon as React.ReactElement, { size: 24 })}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{feature.title}</h3>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main SettingsPage ────────────────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('clinic');
  const [mobileActiveTab, setMobileActiveTab] = useState<Tab | null>(null);
  const activeMobileSection = TABS.find(tab => tab.id === mobileActiveTab);

  const renderTabContent = (tab: Tab) => {
    if (tab === 'clinic') return <ClinicProfileTab />;
    if (tab === 'branding') return <BrandingTab />;
    if (tab === 'upgrade') return <UpgradeTab />;
    return <AccountTab />;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 md:py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your clinic profile and account</p>
      </div>

      <div className="md:hidden bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {mobileActiveTab && activeMobileSection ? (
          <div className="flex min-h-[calc(100vh-190px)] flex-col">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3">
              <button
                type="button"
                onClick={() => setMobileActiveTab(null)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                aria-label="Back to settings"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-800">{activeMobileSection.label}</h2>
                <p className="truncate text-xs text-slate-500">{activeMobileSection.description}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderTabContent(mobileActiveTab)}
            </div>
          </div>
        ) : (
          <nav className="space-y-1 p-3">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileActiveTab(tab.id)}
                  className="flex min-h-[68px] w-full items-center justify-between rounded-xl px-3 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800">{tab.label}</div>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{tab.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="ml-3 flex-shrink-0 text-slate-400" />
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="hidden md:flex md:flex-row gap-6">
        {/* Sidebar */}
        <nav className="flex flex-col gap-1 w-52 flex-shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 min-h-[400px]">
          {renderTabContent(activeTab)}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
