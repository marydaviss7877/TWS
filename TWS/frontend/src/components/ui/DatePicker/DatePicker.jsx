import * as React from 'react';
import { format } from 'date-fns';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover/Popover';
import { Calendar } from './Calendar';
import { Button } from '../Button/Button';
import { cn } from '../../../lib/utils';

/**
 * Single-date picker — the Radix/react-day-picker replacement for antd's `DatePicker`.
 * Controlled: pass `value` (Date | undefined) and `onChange`.
 */
const DatePicker = ({ value, onChange, placeholder = 'Pick a date', className, disabled, ...props }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !value && 'text-gray-400 dark:text-gray-500', className)}
        >
          <CalendarDaysIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(value, 'PP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
};

export { DatePicker };
