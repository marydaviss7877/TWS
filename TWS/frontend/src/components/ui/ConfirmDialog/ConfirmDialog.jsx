import * as React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '../Dialog/Dialog';
import { Button } from '../Button/Button';

/**
 * Controlled yes/no confirmation modal — the Radix/Tailwind replacement for antd's
 * `Popconfirm`/`Modal.confirm`. Unlike Popconfirm (which wraps a trigger element inline),
 * this is opened by the caller's own `open` state, e.g.:
 *
 *   const [confirmOpen, setConfirmOpen] = useState(false);
 *   <Button onClick={() => setConfirmOpen(true)}>Delete</Button>
 *   <ConfirmDialog
 *     open={confirmOpen}
 *     onOpenChange={setConfirmOpen}
 *     title="Delete this record?"
 *     description="This can't be undone."
 *     variant="destructive"
 *     onConfirm={handleDelete}
 *   />
 */
const ConfirmDialog = ({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default', // 'default' | 'destructive'
  onConfirm,
  confirming = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? 'Please wait…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ConfirmDialog };
