import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
    value: string;
    label: React.ReactNode;
}

interface SelectProps {
    id?: string;
    name?: string;
    label?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
    id,
    name,
    label,
    value,
    onChange,
    options,
    placeholder,
    required = false,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        // Create a synthetic event to match the expected onChange signature
        const syntheticEvent = {
            target: {
                name: name || '',
                value: optionValue,
            },
        } as React.ChangeEvent<HTMLSelectElement>;

        onChange(syntheticEvent);
        setIsOpen(false);
    };

    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = selectedOption?.label || placeholder || 'Select...';

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div ref={selectRef} className="relative">
                <button
                    type="button"
                    id={id}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        disabled
                            ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-60'
                            : 'bg-white dark:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    } ${
                        isOpen
                            ? 'border-primary-500 ring-2 ring-primary-500'
                            : 'border-slate-300 dark:border-slate-600'
                    } text-slate-900 dark:text-slate-100`}
                >
                    <div className="flex items-center justify-between">
                        <span className={!selectedOption ? 'text-slate-400 dark:text-slate-500' : ''}>
                            {displayValue}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`text-slate-500 dark:text-slate-400 transition-transform ${
                                isOpen ? 'transform rotate-180' : ''
                            }`}
                        />
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-between ${
                                    option.value === value
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                        : 'text-slate-900 dark:text-slate-100'
                                }`}
                            >
                                <span>{option.label}</span>
                                {option.value === value && (
                                    <Check size={16} className="text-primary-600 dark:text-primary-400" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Select;
