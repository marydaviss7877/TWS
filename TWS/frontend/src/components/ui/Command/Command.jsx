import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';
import { Dialog, DialogContent, DialogTitle } from '../Dialog/Dialog';

const Command = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, title = 'Command Palette', ...props }) => (
  <Dialog {...props}>
    <DialogContent showClose={false} className="overflow-hidden p-0 shadow-2xl max-w-2xl border border-slate-200 dark:border-slate-800 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.98] motion-safe:duration-200">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-500 dark:[&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-1 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:h-4.5 [&_[cmdk-item]_svg]:w-4.5">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
);

const CommandInput = React.forwardRef(({ className, rightHint, ...props }, ref) => (
  <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-3 h-12 transition-[box-shadow] duration-150 ease-out focus-within:ring-2 focus-within:ring-primary-500/40" cmdk-input-wrapper="">
    <MagnifyingGlassIcon className="mr-2 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-full w-full rounded-md bg-transparent py-2 text-sm font-medium outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 dark:text-slate-100',
        className
      )}
      {...props}
    />
    {rightHint ? (
      <span className="ml-2 hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {rightHint}
      </span>
    ) : null}
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[420px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400" {...props} />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden py-1 text-slate-900 dark:text-slate-100 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-slate-500 dark:[&_[cmdk-group-heading]]:text-slate-400',
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-slate-200 dark:bg-slate-700', className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm outline-none transition-all duration-150 ease-out hover:bg-slate-100 dark:hover:bg-slate-800 hover:translate-x-0.5 aria-selected:border-primary-200 dark:aria-selected:border-primary-800 aria-selected:bg-primary-50 dark:aria-selected:bg-primary-900/40 aria-selected:text-primary-800 dark:aria-selected:text-primary-200 aria-selected:shadow-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }) => (
  <span className={cn('ml-auto text-xs tracking-widest text-gray-400 dark:text-gray-500', className)} {...props} />
);
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
};
