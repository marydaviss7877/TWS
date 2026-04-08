import { useEffect } from 'react';

/**
 * useKeyboardShortcuts — declarative keyboard shortcut handler.
 * Replaces raw document.addEventListener('keydown') blocks in layout components.
 *
 * @param {Object} shortcuts - Map of key combos to handlers
 *   Keys: 'ctrl+k', 'ctrl+b', 'escape', 'f11', etc.
 *   Values: (event) => void
 * @param {boolean} enabled - Whether shortcuts are active (default true)
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+k': (e) => { e.preventDefault(); openPalette(); },
 *   'ctrl+b': (e) => { e.preventDefault(); toggleSidebar(); },
 *   'escape':  () => closePalette(),
 *   'f11':     (e) => { e.preventDefault(); toggleFullscreen(); },
 * });
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event) => {
      const meta = event.metaKey || event.ctrlKey;
      const key = (event.key || '').toLowerCase();

      // Build a normalized combo string
      let combo = '';
      if (meta) combo += 'ctrl+';
      if (event.shiftKey) combo += 'shift+';
      if (event.altKey) combo += 'alt+';
      combo += key;

      // Also match bare keys (escape, f11, etc.)
      const fn = shortcuts[combo] ?? shortcuts[key];
      if (fn) fn(event);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}
