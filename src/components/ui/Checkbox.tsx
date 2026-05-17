import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
  id
}) => {
  return (
    <div 
      className={`relative inline-flex items-center cursor-pointer select-none group ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={() => {}} // Handled by div onClick for better hit area and animation control
        className="sr-only"
        disabled={disabled}
      />
      <div
        className={`
          w-5 h-5 flex items-center justify-center rounded-md border-2 transition-all duration-200 ease-out
          ${checked 
            ? 'bg-primary-600 border-primary-600 scale-100' 
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-primary-400'
          }
          group-active:scale-90
        `}
      >
        <div 
          className={`
            transition-all duration-200 ease-in-out transform
            ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
          `}
        >
          <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
        </div>
      </div>
    </div>
  );
};

export default Checkbox;
