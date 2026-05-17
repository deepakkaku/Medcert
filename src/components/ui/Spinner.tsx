
import React from 'react';

const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-slate-200 dark:border-slate-600 border-t-primary-600`}
      // A slightly different style can sometimes work better on buttons.
      // E.g., border-2 border-current border-t-transparent
    ></div>
  );
};

export default Spinner;