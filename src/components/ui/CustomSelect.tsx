import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";
export const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: (string | number)[];
  placeholder?: string;
  className?: string;
  label?: string;
  icon?: LucideIcon;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  label,
  icon: Icon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 transition-all outline-none focus:border-[#006e7e] hover:border-[#006e7e] h-[56px]",
          isOpen && "border-[#006e7e] ring-1 ring-[#006e7e]/10",
          Icon && "pl-12"
        )}
      >
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />}
        <span className={cn("font-bold text-lg", !value && value !== 0 && "text-slate-400 dark:text-slate-400 font-normal text-base")}>
          {value !== undefined && value !== "" ? value : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-slate-400 dark:text-slate-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            <div
              className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-50 transform transition-all duration-200 origin-top"
            >
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 last:border-0",
                    value === option ? "bg-slate-50 dark:bg-slate-700/50 text-[#006e7e] dark:text-[#4fd1c5] font-bold" : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}
    </div>
  );
}
