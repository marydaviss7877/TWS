import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList,
  CommandEmpty, CommandGroup, CommandItem, CommandShortcut,
} from '../../../components/ui/command';
import { DialogDescription } from '@radix-ui/react-dialog';
import { getNavigationActions } from '../../../constants/navigationConstants';

/**
 * CommandPalette — Cmd/K quick-navigation modal.
 * Powered by cmdk: keyboard navigation, fuzzy search, and grouping are built-in.
 * Action list comes from navigationConstants (no more duplicate arrays).
 */
const CommandPalette = ({ isOpen, onClose, tenantSlug, initialSearchTerm = '' }) => {
  const navigate = useNavigate();
  const actions = useMemo(() => getNavigationActions(tenantSlug), [tenantSlug]);
  const [search, setSearch] = useState('');

  // Sync search to initialSearchTerm each time the palette opens
  useEffect(() => {
    if (isOpen) setSearch(initialSearchTerm || '');
  }, [isOpen, initialSearchTerm]);

  // Group categories — same order every time
  const categories = ['Navigate', 'Quick Create'];

  const handleSelect = (action) => {
    navigate(action.path);
    onClose();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      {/* Satisfies Radix DialogContent's aria-describedby requirement */}
      <DialogDescription className="sr-only">
        Search for pages and actions to navigate the workspace.
      </DialogDescription>
      <CommandInput
        placeholder="Search pages and actions…"
        value={search}
        onValueChange={setSearch}
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {categories.map(category => {
          const items = actions.filter(a => a.category === category);
          if (!items.length) return null;
          return (
            <CommandGroup key={category} heading={category}>
              {items.map(action => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    value={`${action.label} ${category}`}
                    onSelect={() => handleSelect(action)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="flex-1 font-medium">{action.label}</span>
                    {action.shortcut && (
                      <CommandShortcut>{action.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>

      {/* Footer hints */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
        <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↑↓</kbd> Navigate</span>
        <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↵</kbd> Select</span>
        <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Esc</kbd> Close</span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
