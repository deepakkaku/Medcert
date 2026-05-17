
import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: 'button' | 'label';
  isLoading?: boolean;
  htmlFor?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className,
  as = 'button',
  isLoading = false,
  htmlFor,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 shadow-sm';

  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-400 shadow-primary-500/20',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400 disabled:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400 shadow-red-500/20',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 dark:focus:ring-slate-500 shadow-none',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${isLoading ? 'cursor-wait' : ''}`;

  const content = (
    <>
      {isLoading && <Spinner size="sm" />}
      {!isLoading && leftIcon && <span className="mr-2 -ml-1 h-5 w-5 flex items-center justify-center">{leftIcon}</span>}
      {!isLoading && children}
      {!isLoading && rightIcon && <span className="ml-2 -mr-1 h-5 w-5 flex items-center justify-center">{rightIcon}</span>}
    </>
  );

  if (as === 'label') {
    // Remove button-specific `type` prop before passing to label, and cast props to avoid type conflicts.
    const { type, ...labelProps } = props;
    return (
      <label className={`${combinedClassName} cursor-pointer`} htmlFor={htmlFor} {...labelProps as any}>
        {content}
      </label>
    );
  }

  return (
    <button
      className={combinedClassName}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;