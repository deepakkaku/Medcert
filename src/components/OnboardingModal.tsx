
import React from 'react';
import { Settings, CheckCircle, Image as ImageIcon, Sparkles, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200 transition-all animate-in fade-in zoom-in duration-300">
        {/* Beautiful Gradient Header */}
        <div className="relative h-32 bg-gradient-to-br from-[#006e7e] via-[#008a9e] to-[#7ad3df] p-6 text-white sm:h-40">
          <div className="absolute right-0 top-0 p-4">
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex h-full flex-col justify-end pb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={24} className="text-yellow-300" />
              <h2 className="text-2xl font-black sm:text-3xl tracking-tight">Welcome to Premium!</h2>
            </div>
            <p className="mt-1 text-sm font-bold text-white/80 uppercase tracking-wider">Let's get your clinic ready</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f0fbfc] text-[#006e7e]">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">1. Setup Clinic Details</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                  Head to <span className="font-bold text-slate-900">Settings</span> to fill in your Name, Registration Number, and Clinic address.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">2. Save Tremendous Time</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                  Once setup, all future certificates will <span className="font-bold text-slate-900">automatically fill</span> these details for you instantly.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <ImageIcon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">3. Brand Your Documents</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                  Upload your <span className="font-bold text-slate-900">Logo and Signature</span> in settings to create professional, branded documents.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
