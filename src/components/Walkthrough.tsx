
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X, ChevronLeft, Settings, Users, History, CheckCircle, Lightbulb, Menu, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

interface WalkthroughStep {
  title: string;
  description: string;
  targetId?: string;
  icon: React.ReactNode;
  accent: string;
}

const STEPS: WalkthroughStep[] = [
  {
    title: "Welcome to Premium",
    description: "Your professional clinic toolkit is ready. We've unlocked tools to help you manage patients and documents effortlessly.",
    icon: <Sparkles className="text-white" size={24} />,
    accent: "from-[#006e7e] to-[#008a9e]"
  },
  {
    title: "Quick Access Menu",
    description: "Tap here anytime to jump between your patients, history, and clinic settings.",
    targetId: "mobile-menu-button",
    icon: <Menu className="text-white" size={24} />,
    accent: "from-[#006e7e] to-[#008a9e]"
  },
  {
    title: "Professional Branding",
    description: "Upload your clinic logo and digital signature in Settings. They will appear on every document you print.",
    targetId: "nav-settings",
    icon: <Settings className="text-white" size={24} />,
    accent: "from-[#006e7e] to-[#7ad3df]"
  },
  {
    title: "Smart Patient Records",
    description: "Every patient you treat is saved automatically. Search by name to auto-fill details instantly next time.",
    targetId: "nav-patients",
    icon: <Users className="text-white" size={24} />,
    accent: "from-emerald-600 to-teal-500"
  },
  {
    title: "Digital Archives",
    description: "Every certificate and summary is safely archived. Re-print or download your history with one click.",
    targetId: "nav-history",
    icon: <History className="text-white" size={24} />,
    accent: "from-slate-800 to-slate-600"
  },
  {
    title: "You're All Set!",
    description: "Start generating professional, branded medical documents for your patients today.",
    icon: <CheckCircle className="text-white" size={24} />,
    accent: "from-[#006e7e] via-[#008a9e] to-[#7ad3df]"
  }
];

const SEARCH_TIP_STEP: WalkthroughStep = {
  title: "Quick Patient Search",
  description: "Search for an existing patient here to auto-fill their details instantly. This saves lot of manual entry time! You can manage your patients in the Patients page.",
  targetId: "patient-search-field",
  icon: <Search className="text-white" size={24} />,
  accent: "from-[#006e7e] to-[#008a9e]"
};

const Walkthrough: React.FC = () => {
  const { profile, completeWalkthrough, isMobileMenuOpen, setIsMobileMenuOpen } = useAuth();
  const { isActive: isSubscriptionActive } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isSearchTipMode, setIsSearchTipMode] = useState(false);

  const steps = React.useMemo(() => {
    if (isSearchTipMode) return [SEARCH_TIP_STEP];
    
    return STEPS.filter(step => {
      // Only show mobile menu step on mobile
      if (step.targetId === "mobile-menu-button") {
        return isMobile;
      }
      return true;
    });
  }, [isMobile, isSearchTipMode]);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Walkthrough Trigger
  useEffect(() => {
    if (profile && profile.has_completed_walkthrough === false && isSubscriptionActive) {
      const timer = setTimeout(() => {
        setIsSearchTipMode(false);
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [profile, isSubscriptionActive]);

  // Contextual Search Tip Trigger
  useEffect(() => {
    if (profile?.has_completed_walkthrough && isSubscriptionActive && !isVisible) {
      const hasSeenTip = localStorage.getItem('has_seen_search_tip');
      const isCorrectPage = location.pathname === '/' || location.pathname === '/discharge-summary';
      
      if (!hasSeenTip && isCorrectPage) {
        const timer = setTimeout(() => {
          // Check if target exists
          if (document.getElementById('patient-search-field')) {
            setIsSearchTipMode(true);
            setCurrentStep(0);
            setIsVisible(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, isSubscriptionActive, location.pathname, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    
    const step = steps[currentStep];
    let intervalId: number;
    let retryCount = 0;

    const findAndSetTarget = () => {
      if (!step.targetId) {
        setTargetRect(null);
        return true; 
      }

      const elements = document.querySelectorAll(`[id="${step.targetId}"]`);
      // Filter for elements that are visible (width > 0) AND on screen (left >= 0)
      const el = Array.from(elements).find(e => {
        const rect = e.getBoundingClientRect();
        // On mobile, the desktop sidebar item is hidden (width 0), 
        // while the mobile sidebar item might be off-screen (left < 0) during animation.
        return rect.width > 0 && rect.height > 0 && rect.left >= 0;
      });

      if (el) {
        const newRect = el.getBoundingClientRect();
        setTargetRect(newRect);
        
        // If the rect is still moving significantly, we haven't "stabilized" yet
        // but we return true to indicate we found A valid target.
        return true; 
      }
      return false;
    };

    if (step.targetId) {
      // Only auto-open the mobile menu if we are PAST the "Quick Access Menu" step
      // This allows the user to see the tooltip pointing to the button BEFORE the menu covers it.
      if (isMobile && !isMobileMenuOpen && step.targetId !== "mobile-menu-button" && !isSearchTipMode) {
        setIsMobileMenuOpen(true);
      }
      
      // Poll frequently to track the sidebar animation
      intervalId = window.setInterval(() => {
        const found = findAndSetTarget();
        retryCount++;
        
        // Stop polling after 3 seconds or if we've found it and it's stabilized (optional)
        if (retryCount > 30) { 
          window.clearInterval(intervalId);
        }
      }, 100);
    } else {
      if (isMobile && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
      setTargetRect(null);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentStep, isVisible, isMobile, isMobileMenuOpen, isSearchTipMode]); // Re-added isMobileMenuOpen to respond to manual sidebar state changes

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setIsMobileMenuOpen(false);
    if (isSearchTipMode) {
      localStorage.setItem('has_seen_search_tip', 'true');
      setIsSearchTipMode(false);
    } else {
      completeWalkthrough();
      navigate('/settings');
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[11000] pointer-events-none select-none">
      {/* Dimmed Overlay with Spotlight Hole */}
      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <defs>
          <mask id="walkthrough-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <motion.rect
                initial={false}
                animate={{
                  x: targetRect.left - 6,
                  y: targetRect.top - 6,
                  width: targetRect.width + 12,
                  height: targetRect.height + 12,
                }}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <motion.rect 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          width="100%" 
          height="100%" 
          fill="rgba(15, 23, 42, 0.75)" // Slightly darker for better contrast
          mask="url(#walkthrough-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={handleComplete}
        />
        
        {/* Spotlight Border */}
        {targetRect && (
          <motion.rect
            initial={false}
            animate={{
              x: targetRect.left - 6,
              y: targetRect.top - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            rx="14"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeDasharray="4 4"
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          />
        )}
      </svg>

      {/* Tooltip Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={isMobile ? { y: 20, opacity: 0 } : { opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
          animate={isMobile && targetRect ? { 
            opacity: 1, 
            x: Math.max(12, Math.min(window.innerWidth - 312, targetRect.left - 6)), 
            top: Math.min(window.innerHeight - 200, targetRect.bottom + 16),
            left: 0,
            y: 0
          } : isMobile ? {
            opacity: 1,
            left: '50%',
            top: '50%',
            x: '-50%',
            y: '-50%'
          } : targetRect && isSearchTipMode ? {
            opacity: 1, 
            scale: 1,
            top: targetRect.bottom + 20,
            left: Math.max(12, targetRect.right - 360),
            x: 0,
            y: 0
          } : { 
            opacity: 1, 
            scale: 1,
            x: targetRect ? targetRect.left + targetRect.width + 24 : '0',
            top: targetRect ? targetRect.top + (targetRect.height / 2) : '50%',
            left: targetRect ? 0 : '50%',
            y: targetRect ? '-50%' : '-50%'
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`pointer-events-auto absolute z-20 overflow-hidden bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] ring-2 ring-white
            ${isMobile && targetRect
              ? 'w-[300px] rounded-[24px] p-5' 
              : isMobile
                ? 'w-[calc(100vw-40px)] rounded-[32px] p-7'
                : 'w-full max-w-[360px] rounded-[32px] p-7'
            }`}
        >
          {/* Accent Header */}
          <div className={`${isMobile && targetRect ? 'mb-4 h-10 w-10' : 'mb-6 h-14 w-14'} flex items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} shadow-lg shadow-teal-900/10`}>
            {React.cloneElement(step.icon as React.ReactElement, { size: isMobile && targetRect ? 20 : 24 })}
          </div>

          <div className="space-y-2.5">
            <h3 className={`${isMobile && targetRect ? 'text-lg' : 'text-2xl'} font-black tracking-tight text-slate-900 leading-tight`}>
              {step.title}
            </h3>
            <p className={`${isMobile && targetRect ? 'text-[13px]' : 'text-[15px]'} font-medium leading-relaxed text-slate-500`}>
              {step.description}
            </p>
          </div>

          <div className={`${isMobile && targetRect ? 'mt-6' : 'mt-8'} flex items-center justify-between gap-4`}>
            {/* Dots (Hidden on small overlapping popup) */}
            {(!isMobile || !targetRect) && (
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? 'w-6 bg-[#006e7e]' : 'w-1.5 bg-slate-200'
                    }`} 
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className={`flex ${isMobile && targetRect ? 'h-9 w-9' : 'h-11 w-11'} items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all`}
                >
                  <ChevronLeft size={isMobile && targetRect ? 18 : 20} />
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex items-center gap-2 rounded-2xl bg-slate-950 ${isMobile && targetRect ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'} font-black text-white shadow-lg transition hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0`}
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight size={isMobile && targetRect ? 14 : 18} />
              </button>
            </div>
          </div>

          {/* Desktop/Mobile Arrow */}
          {targetRect && (
            (isMobile || isSearchTipMode) ? (
              <div 
                className="absolute top-0 left-6 -translate-y-full"
                style={{ 
                  left: isMobile 
                    ? Math.max(12, Math.min(280, targetRect.left - Math.max(12, Math.min(window.innerWidth - 312, targetRect.left - 6)) + 12))
                    : Math.max(12, Math.min(340, targetRect.left + (targetRect.width / 2) - Math.max(12, targetRect.right - 360) - 10))
                }}
              >
                <div className="h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent border-b-white" />
              </div>
            ) : (
              <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-3">
                <div className="h-0 w-0 border-y-[10px] border-r-[10px] border-y-transparent border-r-white" />
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Walkthrough;
