import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';

/**
 * Tailwind-styled wrapper around react-day-picker v10 (which ships with no default CSS —
 * every visual class is supplied via `classNames`).
 */
const Calendar = ({ className, ...props }) => (
  <DayPicker
    className={cn('p-3', className)}
    classNames={{
      root: 'text-gray-900 dark:text-gray-100',
      months: 'flex flex-col sm:flex-row gap-4',
      month: 'space-y-3',
      nav: 'flex items-center justify-between absolute inset-x-0 top-0 px-1',
      button_previous: 'h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30',
      button_next: 'h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30',
      chevron: 'h-4 w-4 fill-current',
      month_caption: 'flex items-center justify-center h-7 relative',
      caption_label: 'text-sm font-medium',
      month_grid: 'w-full border-collapse mt-2',
      weekdays: 'flex',
      weekday: 'text-gray-500 dark:text-gray-400 w-9 text-xs font-medium text-center',
      weeks: '',
      week: 'flex w-full mt-1',
      day: 'h-9 w-9 text-center text-sm p-0 relative',
      day_button: cn(
        'h-9 w-9 rounded-md p-0 font-normal text-gray-900 dark:text-gray-100',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
      ),
      selected: '[&>button]:bg-primary-500 [&>button]:text-white [&>button]:hover:bg-primary-600',
      today: '[&>button]:font-bold [&>button]:text-primary-600 dark:[&>button]:text-primary-400',
      outside: '[&>button]:text-gray-300 dark:[&>button]:text-gray-600',
      disabled: '[&>button]:text-gray-300 dark:[&>button]:text-gray-600 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
      hidden: 'invisible',
      range_start: '[&>button]:bg-primary-500 [&>button]:text-white',
      range_middle: '[&>button]:bg-primary-100 dark:[&>button]:bg-primary-900/40 [&>button]:text-gray-900 dark:[&>button]:text-gray-100',
      range_end: '[&>button]:bg-primary-500 [&>button]:text-white',
      ...props.classNames,
    }}
    components={{
      Chevron: ({ orientation, ...iconProps }) =>
        orientation === 'left'
          ? <ChevronLeftIcon {...iconProps} />
          : <ChevronRightIcon {...iconProps} />,
    }}
    {...props}
  />
);
Calendar.displayName = 'Calendar';

export { Calendar };
