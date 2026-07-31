import * as React from 'react';
import { cn } from '../../../lib/utils';

const SIZE_CLASSES = {
  sm: 'h-5 w-5 border-2',
  default: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

/**
 * Shared loading spinner — the single loading pattern for pages migrated
 * onto components/ui. Renders inline; wrap in a centering container for
 * full-page loading states.
 */
const Spinner = React.forwardRef(({ className, size = 'default', label, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col items-center justify-center gap-3', className)} {...props}>
    <div
      className={cn(
        'tws-loading-pulse rounded-full border-gray-200 dark:border-gray-700 border-t-primary-500 dark:border-t-primary-400',
        SIZE_CLASSES[size]
      )}
      role="status"
      aria-label={label || 'Loading'}
    />
    {label && <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>}
  </div>
));
Spinner.displayName = 'Spinner';

export { Spinner };
