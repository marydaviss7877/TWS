import * as React from 'react';
import { cn } from '../../../lib/utils';

/**
 * Shared empty-state pattern — the single "nothing here yet" treatment for
 * pages migrated onto components/ui. Replaces the mix of bare text, missing
 * icons, and inconsistent CTAs found across the old hand-rolled pages.
 */
const EmptyState = React.forwardRef(({ className, icon: Icon, title, description, action, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)} {...props}>
    {Icon && (
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
      </div>
    )}
    {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>}
    {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
));
EmptyState.displayName = 'EmptyState';

export { EmptyState };
