import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary-500 text-white hover:bg-primary-600',
        secondary:   'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
        destructive: 'border-transparent bg-red-500 text-white hover:bg-red-600',
        outline:     'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
        success:     'border-transparent bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        warning:     'border-transparent bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

const Badge = ({ className, variant, ...props }) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
