import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog/Dialog';
import { Button } from '../ui/Button/Button';

const VARIANT_STYLES = {
  danger: { icon: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-900/30', buttonVariant: 'destructive' },
  warning: { icon: 'text-yellow-600 dark:text-yellow-400', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', buttonVariant: 'default' },
  info: { icon: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/30', buttonVariant: 'default' },
};

/**
 * Shared confirmation dialog — replaces window.confirm() and the three
 * near-identical hand-rolled ConfirmDialog forks that used to exist in
 * components/ConfirmDialog, features/projects/components, and
 * features/tenant/pages/tenant/org/projects/components.
 * Built on the Radix-based Dialog/Button primitives in components/ui.
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.danger;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${styles.iconBg}`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${styles.icon}`} />
            </div>
            <DialogTitle>{title || 'Confirm Action'}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {message || 'Are you sure you want to proceed?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={styles.buttonVariant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
