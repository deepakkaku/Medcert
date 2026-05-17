import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  className?: string;
  headerClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const SlideOver: React.FC<SlideOverProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  maxWidth,
  className = '',
  headerClassName = '',
  size = 'md'
}) => {
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const resolvedMaxWidth = maxWidth || sizeMap[size];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 md:p-4">
          <div 
            className={`pointer-events-auto w-screen ${resolvedMaxWidth} animate-in slide-in-from-right duration-300 transform transition ease-in-out`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex h-full flex-col overflow-y-auto ${className || 'bg-white dark:bg-slate-900'} shadow-2xl md:rounded-3xl`}>
              <header className={`flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 ${headerClassName}`}>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                <Button variant="ghost" className="!p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
                  <X size={20} />
                </Button>
              </header>

              <main className="flex-grow p-4 md:p-6">
                {children}
              </main>

              {footer && (
                <footer className="flex items-center justify-end p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                  {footer}
                </footer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideOver;