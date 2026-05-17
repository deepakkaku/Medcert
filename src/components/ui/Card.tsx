import React, { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl shadow-sm p-2 sm:p-3 dark:bg-slate-800 dark:border-slate-700 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;