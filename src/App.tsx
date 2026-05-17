import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SubscriptionGate from './components/SubscriptionGate';
import Walkthrough from './components/Walkthrough';
import LoginPage from './pages/LoginPage';
import { MedicalCertificate } from './pages/MedicalCertificate';
import PatientsPage from './pages/PatientsPage';
import SettingsPage from './pages/SettingsPage';
import SubscribePage from './pages/SubscribePage';
import DischargeSummary from './pages/DischargeSummary';
import DocumentHistory from './pages/DocumentHistory';
import { FileText, Users, Settings, Crown, Menu, X, LogOut, ChevronLeft, ClipboardList, History, Sparkles, ArrowRight } from 'lucide-react';
import Avatar from './components/ui/Avatar';

// ─── Sub-components ────────────────────────────────────────────────────────────
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isCollapsed: boolean; id?: string }> = ({ to, icon, label, isCollapsed, id }) => (
  <NavLink
    to={to}
    id={id}
    end={to === '/'}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${isActive
        ? 'bg-primary-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      } ${isCollapsed ? 'justify-center' : ''}`
    }
  >
    {icon}
    {!isCollapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
  </NavLink>
);

const UpgradeBanner: React.FC = () => {
  const [isMinimized, setIsMinimized] = React.useState(() => {
    return localStorage.getItem('doctrust_banner_minimized') === 'true';
  });
  const [index, setIndex] = React.useState(0);
  const messages = [
    {
      title: "WhatsApp Automation",
      desc: "Auto-send consultation, prescriptions & invoices directly to patients."
    },
    {
      title: "AI Prescription",
      desc: "Smart, clinical-aware AI suggestions to draft prescriptions in seconds."
    },
    {
      title: "GST & Razorpay",
      desc: "Hassle-free GST invoicing with professional Razorpay payment links."
    },
    {
      title: "AI Appointment Manager",
      desc: "Smart scheduling and automated reminders for your busy practice."
    },
    {
      title: "Full Clinic Suite",
      desc: "OPD management, staff access, and inventory tracking in one app."
    }
  ];

  React.useEffect(() => {
    localStorage.setItem('doctrust_banner_minimized', isMinimized.toString());
  }, [isMinimized]);

  React.useEffect(() => {
    if (isMinimized) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isMinimized]);

  const message = messages[index];

  if (isMinimized) {
    return (
      <a 
        href="https://www.doctrust.in/features" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#006e7e] to-[#008a9e] text-white text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      >
        <Crown size={14} /> Upgrade Now
      </a>
    );
  }

  return (
    <div className="relative group/banner">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMinimized(true);
        }}
        className="absolute top-2 right-2 z-20 p-1 rounded-md bg-white/20 text-white hover:bg-white/30 md:bg-white/10 md:text-white/60 md:hover:text-white md:hover:bg-white/20 transition-all opacity-100 md:opacity-0 md:group-hover/banner:opacity-100"
        title="Minimize"
      >
        <X size={14} />
      </button>
      <a 
        href="https://www.doctrust.in/features" 
        target="_blank" 
        rel="noopener noreferrer"
        className="relative block p-5 rounded-2xl bg-gradient-to-br from-[#006e7e] via-[#008a9e] to-[#7ad3df] shadow-lg shadow-[#006e7e]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-white/20 px-2 py-1 rounded-md backdrop-blur-sm">Doctrust AI</span>
            <Sparkles size={14} className="text-white animate-pulse" />
          </div>
          <div key={index} className="h-28 animate-fade-in-up">
            <h4 className="text-base font-black text-white leading-tight mb-2">
              {message.title}
            </h4>
            <p className="text-[13px] font-medium text-white/90 leading-snug mb-4">
              {message.desc}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006e7e] bg-white px-3 py-2 rounded-xl group-hover:bg-[#f8fcfd] transition-colors shadow-sm w-full justify-center">
            Upgrade Now <ArrowRight size={14} />
          </div>
        </div>
      </a>
    </div>
  );
};

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/', label: 'Certificates', icon: <FileText size={20} />, id: 'nav-certificates' },
  { to: '/discharge-summary', label: 'Discharge Summary', icon: <ClipboardList size={20} />, id: 'nav-discharge' },
  { to: '/history', label: 'History', icon: <History size={20} />, id: 'nav-history' },
  { to: '/patients', label: 'Patients', icon: <Users size={20} />, id: 'nav-patients' },
  { to: '/settings', label: 'Settings', icon: <Settings size={20} />, id: 'nav-settings' },
  { to: '/subscribe', label: 'Subscription', icon: <Crown size={20} />, id: 'nav-subscribe' },
];

const MobileMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  user: any;
  signOut: () => void;
}> = ({ isOpen, onClose, userProfile, user, signOut }) => {
  return (
    <div className={`fixed inset-0 z-[10000] md:hidden transition-all duration-300 ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute inset-y-0 left-0 w-[280px] bg-white shadow-xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex flex-col items-start gap-2">
            <img src="/doctrust-logo-white.svg" alt="Doctrust" className="h-10" style={{ filter: 'brightness(0)' }} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-[#006e7e] to-[#008a9e] text-white text-[11px] font-black uppercase tracking-widest shadow-md">
              <Crown size={14} /> Premium
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.id}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {userProfile?.has_completed_walkthrough !== false && (
          <div className="px-4 pb-4">
            <UpgradeBanner />
          </div>
        )}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <Avatar name={userProfile?.full_name || user?.email || 'U'} imageUrl={user?.user_metadata?.avatar_url || userProfile?.avatar_url} />
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{userProfile?.full_name || 'Doctor'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, signOut, isMobileMenuOpen, setIsMobileMenuOpen } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-[100dvh] font-sans flex flex-col md:flex-row md:p-4 md:gap-4 overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Sidebar — Desktop */}
      <aside className={`relative flex-shrink-0 bg-white dark:bg-slate-800 rounded-3xl shadow-lg flex-col hidden md:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(p => !p)}
          className="absolute -right-3 top-32 -translate-y-1/2 z-30 p-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 shadow-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={`h-4 w-4 text-slate-600 dark:text-slate-300 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Logo Section */}
        <div className={`h-36 flex items-center justify-center border-b border-slate-100 dark:border-slate-700 transition-all duration-300 ${isSidebarCollapsed ? 'px-2' : 'px-6'}`}>
          <div className="flex flex-col items-center mt-4">
            <img src="/doctrust-logo-white.svg" alt="Doctrust" className={isSidebarCollapsed ? 'h-12' : 'h-20'} style={{ filter: 'brightness(0)' }} />
            {!isSidebarCollapsed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-md bg-gradient-to-r from-[#006e7e] to-[#008a9e] text-white text-[11px] font-black uppercase tracking-widest shadow-md">
                <Crown size={14} /> Premium
              </span>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isCollapsed={isSidebarCollapsed}
              id={item.id}
            />
          ))}
        </nav>

        {/* Ad Card */}
        {!isSidebarCollapsed && profile?.has_completed_walkthrough !== false && (
          <div className="px-4 pb-4">
            <UpgradeBanner />
          </div>
        )}

        {/* User footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'flex-col justify-center' : 'px-2'}`}>
            <Avatar name={profile?.full_name || user?.email || 'U'} imageUrl={user?.user_metadata?.avatar_url || profile?.avatar_url} />
            {!isSidebarCollapsed ? (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{profile?.full_name || 'Doctor'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-2"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 md:rounded-3xl md:shadow-lg relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 z-20">
          <button 
            id="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2.5 rounded-xl bg-gradient-to-r from-[#006e7e] to-[#008a9e] text-white shadow-lg shadow-[#006e7e]/20 active:scale-95 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center flex-1 pr-8">
            <img src="/doctrust-logo-white.svg" alt="Doctrust" className="h-10" style={{ filter: 'brightness(0)' }} />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:pb-8 lg:p-8">
          {children}
        </main>
      </div>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userProfile={profile}
        user={user}
        signOut={signOut}
      />
    </div>
  );
};

// ─── App Layout ──────────────────────────────────────────────────────────────
const AppLayout: React.FC = () => {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes with Persistent Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Walkthrough />
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/"
          element={
            <SubscriptionGate fullPage>
              <MedicalCertificate />
            </SubscriptionGate>
          }
        />
        <Route
          path="/patients"
          element={
            <SubscriptionGate fullPage>
              <PatientsPage />
            </SubscriptionGate>
          }
        />
        <Route
          path="/discharge-summary"
          element={
            <SubscriptionGate fullPage>
              <DischargeSummary />
            </SubscriptionGate>
          }
        />
        <Route
          path="/history"
          element={
            <SubscriptionGate fullPage>
              <DocumentHistory />
            </SubscriptionGate>
          }
        />
        <Route
          path="/settings"
          element={
            <SubscriptionGate>
              <SettingsPage />
            </SubscriptionGate>
          }
        />
        <Route path="/subscribe" element={<SubscribePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ─── PostHog Initialization ──────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY || '', {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'always',
    capture_pageview: true,
    session_recording: {
      maskAllInputs: false,
      maskTextSelector: ".sensitive",
    }
  });
  posthog.register({ site: 'medcert' });
}

export default function App() {
  return (
    <PostHogProvider client={posthog}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </PostHogProvider>
  );
}
