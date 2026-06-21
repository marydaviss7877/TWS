import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList,
  CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
} from '../../../components/ui/Command/Command';
import { DialogDescription } from '@radix-ui/react-dialog';
import { getNavigationActions } from '../../../constants/navigationConstants';
import { useTenantAuth } from '../../../app/providers/TenantAuthContext';

const getFuzzyScore = (action, term) => {
  const label = action.label.toLowerCase();
  const id = action.id.toLowerCase();
  const category = action.category.toLowerCase();
  const query = term.toLowerCase().trim();
  if (!query) return 1;

  if (label === query) return 1000;
  if (id === query) return 950;
  if (label.startsWith(query)) return 900;
  if (id.startsWith(query)) return 860;
  if (label.includes(query)) return 760;
  if (id.includes(query)) return 700;
  if (category.includes(query)) return 500;

  // Ordered fuzzy character match against label
  let qIdx = 0;
  let hits = 0;
  for (let i = 0; i < label.length && qIdx < query.length; i += 1) {
    if (label[i] === query[qIdx]) {
      hits += 1;
      qIdx += 1;
    }
  }
  if (hits === query.length) {
    return 350 + Math.max(0, 120 - label.length);
  }

  return 0;
};

/**
 * CommandPalette — Cmd/K quick-navigation modal.
 * Powered by cmdk: keyboard navigation, fuzzy search, and grouping are built-in.
 * Action list comes from navigationConstants (no more duplicate arrays).
 */
const CommandPalette = ({ isOpen, onClose, tenantSlug, initialSearchTerm = '' }) => {
  const navigate = useNavigate();
  const { user } = useTenantAuth();
  const actions = useMemo(() => getNavigationActions(tenantSlug, user?.role), [tenantSlug, user?.role]);
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const RECENT_STORAGE_KEY = 'tenant.commandPalette.recent';

  // Sync search to initialSearchTerm each time the palette opens
  useEffect(() => {
    if (isOpen) setSearch(initialSearchTerm || '');
  }, [isOpen, initialSearchTerm]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setRecentIds(parsed.slice(0, 5));
    } catch {
      setRecentIds([]);
    }
  }, [isOpen]);

  // Group categories — same order every time
  const categories = ['Navigate', 'Quick Create'];
  const searchTerm = search.trim().toLowerCase();
  const visibleActions = useMemo(() => {
    const scored = actions
      .map((action, idx) => ({ action, score: getFuzzyScore(action, searchTerm), idx }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.idx - b.idx;
      })
      .map((entry) => entry.action);
    return scored;
  }, [actions, searchTerm]);

  const recentActions = useMemo(() => {
    const byId = new Map(actions.map((a) => [a.id, a]));
    const selected = recentIds.map((id) => byId.get(id)).filter(Boolean);
    if (!searchTerm) return selected;
    return selected
      .map((action) => ({ action, score: getFuzzyScore(action, searchTerm) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.action);
  }, [actions, recentIds, searchTerm]);

  const handleSelect = (action) => {
    const nextRecent = [action.id, ...recentIds.filter((id) => id !== action.id)].slice(0, 5);
    setRecentIds(nextRecent);
    try {
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
    } catch {
      // Silent fallback when storage is unavailable.
    }
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
        placeholder="Jump to module, page, or action..."
        value={search}
        onValueChange={setSearch}
        rightHint="Ctrl+K"
        autoFocus
      />
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
        <span className="font-semibold">{visibleActions.length} result{visibleActions.length !== 1 ? 's' : ''}</span>
        <span className="hidden sm:inline">Press <kbd className="font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5">Enter</kbd> to open</span>
      </div>
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recentActions.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={`recent-${action.id}`}
                    value={`${action.label} ${action.category} ${action.id}`}
                    onSelect={() => handleSelect(action)}
                    className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
                    style={{ animationDelay: `${Math.min(index * 24, 160)}ms` }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                    <span className="flex-1 font-semibold text-slate-900 dark:text-slate-100">{action.label}</span>
                    <span className="rounded-full border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {action.category === 'Quick Create' ? 'Action' : 'Page'}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {categories.map(category => {
          const items = visibleActions.filter(a => a.category === category && !recentActions.some((r) => r.id === a.id));
          if (!items.length) return null;
          return (
            <CommandGroup key={category} heading={category}>
              {items.map((action, index) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    value={`${action.label} ${category}`}
                    onSelect={() => handleSelect(action)}
                    className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
                    style={{ animationDelay: `${Math.min(index * 18, 140)}ms` }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                    <span className="flex-1 font-medium text-slate-900 dark:text-slate-100">{action.label}</span>
                    <span className="rounded-full border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {category === 'Quick Create' ? 'Action' : 'Page'}
                    </span>
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
      <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/80">
        <span><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 rounded">↑↓</kbd> Navigate</span>
        <span><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 rounded">↵</kbd> Open</span>
        <span><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 rounded">Esc</kbd> Close</span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
