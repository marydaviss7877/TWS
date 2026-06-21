import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button/Button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/Avatar/Avatar';
import { Badge } from '../../../components/ui/Badge/Badge';
import { QUICK_ADD_ACTIONS } from '../../../constants/navigationConstants';

/**
 * TenantTopBar — horizontal top navigation bar for the tenant org portal.
 *
 * Replaces SoftwareHouseTopNavbar. Key changes:
 * - All dropdowns use Radix DropdownMenu (keyboard-navigable, proper ARIA, no raw mousedown listeners)
 * - Search button opens CommandPalette (no duplicate action list)
 * - Avatar uses Radix AvatarPrimitive
 * - Fullscreen uses useFullscreen hook (passed via props from TenantOrgLayout)
 */
const TenantTopBar = ({
  orgLogoUrl,
  orgName = 'Organization',
  user,
  onSearch,
  onAddAction,
  isFullscreen = false,
  onFullscreenToggle,
  isDarkMode = false,
  onToggleTheme,
  onProfile,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const initial = (orgName || 'O').charAt(0).toUpperCase();
  const userInitial = (user?.fullName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  const displayName = user?.fullName || user?.email || 'User';
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => { setLogoError(false); }, [orgLogoUrl]);
  useEffect(() => { setAvatarError(false); }, [user?.avatarUrl, user?.profilePicUrl, tenantSlug]);
  const avatarSrc = (() => {
    const raw = user?.avatarUrl || user?.profilePicUrl;
    if (!raw) return null;
    if (raw.startsWith('/api/tenant/')) {
      const match = raw.match(/\/uploads\/profile-pictures\/[^/?#]+/);
      if (match) return match[0];
      return raw;
    }
    if (raw.startsWith('/uploads/profile-pictures/')) {
      return `/api/tenant/${tenantSlug}/organization${raw}`;
    }
    return raw;
  })();

  return (
    <header className="flex h-10 shrink-0 items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 sm:px-3 shadow-sm">

      {/* Left: Org logo */}
      <button
        type="button"
        onClick={() => navigate(`/${tenantSlug}/org/home`)}
        className="flex items-center gap-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
        aria-label="Go to dashboard"
      >
        {orgLogoUrl && !logoError ? (
          <img
            src={orgLogoUrl}
            alt={orgName}
            className="h-7 w-auto max-w-[100px] object-contain object-left"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-500 to-accent-500 text-white font-semibold text-xs shadow-sm">
            {initial}
          </div>
        )}
      </button>

      {/* Center: Search trigger (opens CommandPalette) */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSearch}
        className="flex-1 max-w-xs h-7 justify-start px-2 text-gray-400 dark:text-gray-500 font-normal text-xs gap-1.5 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
      >
        <MagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline text-[10px] opacity-50 font-mono">⌘K</kbd>
      </Button>

      {/* Right actions */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* Quick Add */}
        {onAddAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-7 px-2 gap-1 text-xs">
                <PlusIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {QUICK_ADD_ACTIONS.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem key={id} onClick={() => onAddAction(id)}>
                  <Icon className="h-4 w-4 text-primary-500 dark:text-primary-400" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Theme toggle */}
        {typeof onToggleTheme === 'function' && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleTheme}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            {isDarkMode
              ? <SunIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              : <MoonIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
          </Button>
        )}

        {/* Fullscreen */}
        {typeof onFullscreenToggle === 'function' && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFullscreenToggle}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen
              ? <ArrowsPointingInIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              : <ArrowsPointingOutIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Notifications">
          <BellIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="User menu">
              <Avatar className="h-6 w-6">
                {avatarSrc && !avatarError && <AvatarImage src={avatarSrc} alt={displayName} onError={() => setAvatarError(true)} />}
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary-500 to-accent-500 text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onProfile}>
              <UserIcon className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${tenantSlug}/org/settings`)}>
              <CogIcon className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20">
              <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
};

export default TenantTopBar;
