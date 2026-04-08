/**
 * BookmarkBar — Chrome-style bookmarks bar that sits below the OdooTopBar.
 *
 * • Renders only when the user has at least one bookmarked app.
 * • Each chip shows: tiny gradient icon bubble + app label.
 * • Hover a chip → small × appears to remove the bookmark.
 * • Active app chip gets a subtle highlight.
 * • Scrollable horizontally if many items are bookmarked.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { APP_METADATA } from '../../../constants/navigationConstants';
import { cn } from '../../../lib/utils';

const BookmarkBar = ({ items = [], activeAppKey, onRemove }) => {
  const navigate = useNavigate();

  if (!items.length) return null;

  return (
    <div className="flex-shrink-0 z-20 relative border-b border-gray-200/80 dark:border-gray-700/60 bg-gray-50/90 dark:bg-gray-900/80 backdrop-blur-sm">
      <div
        className="flex items-center gap-0.5 px-3 h-9 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >

        {/* ── "Bookmarks" label ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 pr-3 mr-1 border-r border-gray-200 dark:border-gray-700/70 flex-shrink-0">
          <BookmarkIcon className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-500" />
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-wide select-none">
            Bookmarks
          </span>
        </div>

        {/* ── Bookmark chips ─────────────────────────────────────────────── */}
        {items.map((item) => {
          const meta   = APP_METADATA[item.key] ?? { gradient: 'from-gray-400 to-gray-500' };
          const Icon   = item.icon;
          const active = item.key === activeAppKey;

          return (
            <div key={item.key} className="group relative flex-shrink-0">

              {/* Chip button */}
              <button
                type="button"
                onClick={() => navigate(item.path)}
                title={item.label}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-0.5 h-7',
                  'text-[12px] font-medium max-w-[144px]',
                  'transition-colors duration-150 select-none',
                  active
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:shadow-sm'
                )}
              >
                {/* Tiny gradient icon */}
                <span className={cn(
                  'flex-shrink-0 flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-gradient-to-br',
                  meta.gradient
                )}>
                  {Icon && <Icon className="h-2.5 w-2.5 text-white" />}
                </span>

                <span className="truncate leading-none">{item.label}</span>
              </button>

              {/* Remove × — floats over top-right corner on group-hover */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(item.key); }}
                aria-label={`Remove ${item.label} bookmark`}
                className={cn(
                  'absolute -top-1 -right-0.5 z-10',
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full',
                  'bg-gray-400 dark:bg-gray-500 text-white',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-red-400 dark:hover:bg-red-500',
                  'transition-all duration-150 scale-75 group-hover:scale-100',
                )}
              >
                <XMarkIcon className="h-2 w-2" />
              </button>

            </div>
          );
        })}

      </div>
    </div>
  );
};

export default BookmarkBar;
