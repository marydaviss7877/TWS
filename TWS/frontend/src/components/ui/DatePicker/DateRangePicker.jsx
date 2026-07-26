import * as React from 'react';
import { format } from 'date-fns';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover/Popover';
import { Calendar } from './Calendar';
import { Button } from '../Button/Button';
import { cn } from '../../../lib/utils';

/**
 * Date-range picker — the Radix/react-day-picker replacement for antd's `DatePicker.RangePicker`.
 * Controlled: pass `value` ({ from: Date, to: Date } | undefined) and `onChange`.
 */
const DateRangePicker = ({ value, onChange, placeholder = 'Pick a date range', className, disabled }) => {
  const [open, setOpen] = React.useState(false);

  const label = value?.from
    ? value.to
      ? `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
      : format(value.from, 'MMM d, yyyy')
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('justify-start text-left font-normal', !value?.from && 'text-gray-400 dark:text-gray-500', className)}
        >
          <CalendarDaysIcon className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            onChange?.(range);
            if (range?.from && range?.to) setOpen(false);
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
};

export { DateRangePicker };
