import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely — clsx for conditionals, twMerge to deduplicate.
 * Drop-in replacement for manual className concatenation throughout the app.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
