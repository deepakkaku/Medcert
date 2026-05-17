

import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  onCancel?: () => void;
  // New props for a second, distinct action
  onSecondaryAction?: () => void;
  secondaryButtonText?: string;
  secondaryButtonVariant?: 'primary' | 'secondary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  confirmButtonVariant = 'primary',
  isLoading = false,
  onCancel,
  onSecondaryAction,
  secondaryButtonText,
  secondaryButtonVariant = 'secondary',
}) => {
  const handleCancelClick = onCancel || onClose;

  const footer = (
    <div className="flex items-center gap-4">
      <Button variant="secondary" onClick={handleCancelClick} disabled={isLoading}>
        {cancelButtonText}
      </Button>
      {onSecondaryAction && secondaryButtonText && (
        <Button 
          variant={secondaryButtonVariant} 
          onClick={onSecondaryAction}
          isLoading={isLoading}
        >
          {secondaryButtonText}
        </Button>
      )}
      <Button 
        variant={confirmButtonVariant} 
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmButtonText}
      </Button>
    </div>
  );

  const icons = {
    primary: <HelpCircle className="h-6 w-6 text-primary-600" />,
    secondary: <Info className="h-6 w-6 text-slate-600" />,
    danger: <AlertTriangle className="h-6 w-6 text-red-600" />,
  };

  const bgColors = {
      primary: 'bg-primary-100 dark:bg-primary-900/40',
      secondary: 'bg-slate-100 dark:bg-slate-700',
      danger: 'bg-red-100 dark:bg-red-900/40',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${bgColors[confirmButtonVariant]} sm:mx-0 sm:h-10 sm:w-10`}>
          {icons[confirmButtonVariant]}
        </div>
        <div className="mt-1">
          <p className="text-slate-600 dark:text-slate-300">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;