import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type SnackbarType = 'success' | 'error' | 'info';

interface SnackbarProps {
  message: string;
  type: SnackbarType;
  onClose: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: <CheckCircle className="h-6 w-6 text-white" />,
      bg: 'bg-primary-600',
    },
    error: {
      icon: <XCircle className="h-6 w-6 text-white" />,
      bg: 'bg-red-600',
    },
    info: {
      icon: <Info className="h-6 w-6 text-white" />,
      bg: 'bg-slate-700',
    },
  };

  return (
    <div
        role="alert"
        className={`fixed bottom-5 left-5 z-[100] flex items-center p-4 rounded-xl shadow-2xl text-white ${config[type].bg} transition-transform transform-gpu animate-slide-in`}
    >
      <style>
        {`
          @keyframes slide-in-from-left {
            from {
              transform: translateX(-100px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in {
             animation: slide-in-from-left 0.3s ease-out forwards;
          }
        `}
      </style>
      <div className="flex-shrink-0">
        {config[type].icon}
      </div>
      <div className="ml-3 text-sm font-medium">
        {message}
      </div>
      <button onClick={onClose} className="ml-6 -mr-2 p-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
        <span className="sr-only">Close</span>
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Snackbar;
