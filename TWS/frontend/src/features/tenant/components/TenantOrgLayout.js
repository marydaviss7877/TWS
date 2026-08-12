/**
 * TenantOrgLayout — Odoo-style shell for the tenant org portal.
 *
 * Navigation surface:
 *   - OdooTopBar:  app-grid trigger │ org logo │ active-app + sub-nav tabs │ search / actions
 *   - Command palette (Ctrl+K) for app search; bookmarks bar for favourites
 *   - Mobile:      app grid opens on hamburger tap; sub-nav hidden, accessible via grid
 *
 * No persistent sidebar — sub-module navigation lives in the top-bar tabs.
 * Deep-page navigation (project board, client detail, etc.) is self-contained in content area.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';
import {
    ArrowRightOnRectangleIcon,
    BellIcon,
    CheckIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    ChevronRightIcon,
    ComputerDesktopIcon,
    MoonIcon,
    SunIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../app/providers/TenantAuthContext';
import { useTheme } from '../../../app/providers/ThemeContext';
import { getIndustryMenuItems } from '../utils/industryMenuBuilder';
import { TenantThemeProvider } from '../providers/TenantThemeProvider';
import { useThemeStyles } from '../utils/useThemeStyles';
import { useFullscreen } from '../../../hooks/useFullscreen';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useMenuFiltering } from '../hooks/useMenuFiltering';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { TenantNavProvider } from '../contexts/TenantNavContext';

import CommandPalette from './CommandPalette';
import OdooTopBar from './OdooTopBar';
import BookmarkBar from './BookmarkBar';
import SidebarNav from '../../../shared/components/navigation/SidebarNav';
import IdleSessionGuard from './IdleSessionGuard';
import { TenantPermissionsProvider } from '../contexts/TenantPermissionsContext';
import { Sheet, SheetContent } from '../../../components/ui/Sheet/Sheet';
import { Avatar, AvatarFallback } from '../../../components/ui/Avatar/Avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu/DropdownMenu';
import axiosInstance from '../../../shared/utils/axiosInstance';
import { tenantPath } from '../../../shared/utils/tenantRoutes';
import './TenantOrgLayout.css';
import '../styles/tenant-theme.css';
import '../styles/tenant-tokens.css';

const TenantOrgLayout = ({ children }) => {
    // ── Router ────────────────────────────────────────────────────────────────
    const tenantSlug = useTenantSlug();
    const navigate   = useNavigate();
    const location   = useLocation();
    const isProjectsRoute = location.pathname.includes('/org/projects') || location.pathname === '/projects' || location.pathname.startsWith('/projects/');
    const isSkyWorkspaceRoute = isProjectsRoute || location.pathname.endsWith('/org/home') || location.pathname === '/home';
    // ── Auth / Theme ──────────────────────────────────────────────────────────
    const { user, logout, tenant, isAuthenticated, loading: authLoading } = useTenantAuth();
    const normalizedRole = String(user?.role || '').toLowerCase();
    const isAdminUser = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner']
        .includes(normalizedRole);
    const { isDarkMode, themeTransition, setTheme, resetToSystemTheme, isSystemTheme } = useTheme();
    const themeStyles   = useThemeStyles();
    const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreen();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [mobileMenuOpen,       setMobileMenuOpen]       = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return localStorage.getItem('tws-sidebar-collapsed') === 'true'; } catch (_) { return false; }
    });
    const [commandPaletteOpen,   setCommandPaletteOpen]   = useState(false);
    const [commandPaletteQuery,  setCommandPaletteQuery]  = useState('');
    const mainContentRef = useRef(null);

    // ── Sidebar expanded menus — still used by the mobile sheet ───────────────
    const expandedMenuStorageKey = tenantSlug ? `tws-nav-expanded-${tenantSlug}` : null;
    const [expandedMenus, setExpandedMenus] = useState(() => {
        if (!expandedMenuStorageKey || typeof window === 'undefined') return {};
        try {
            const raw = localStorage.getItem(expandedMenuStorageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (_) { return {}; }
    });

    // ── Permission data ───────────────────────────────────────────────────────
    const [userDepartments, setUserDepartments] = useState([]);
    const [userPermissions, setUserPermissions] = useState(null);

    // ── Auth loading safety timeout ───────────────────────────────────────────
    // If the auth check hangs, fail closed (send to /login) instead of forcing
    // the dashboard shell to render without a confirmed session. 8s (not 3s)
    // because a first-load/new-device check in TenantAuthContext can involve
    // up to 3 sequential (non-parallel) round trips before resolving.
    useEffect(() => {
        if (!authLoading) return;
        const t = setTimeout(() => {
            console.warn('⚠️ Auth loading timeout — redirecting to login');
            navigate('/login', { replace: true });
        }, 8000);
        return () => clearTimeout(t);
    }, [authLoading, navigate]);

    // ── Close mobile menu on route change ────────────────────────────────────
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // ── Fetch departments + permissions ───────────────────────────────────────
    const logoutRef = useRef(logout);
    useEffect(() => { logoutRef.current = logout; }, [logout]);

    useEffect(() => {
        if (!isAuthenticated || !user || !tenantSlug || authLoading) return;
        let active = true;

        (async () => {
            try {
                const cacheBust = Date.now();
                const [deptsRes, permsRes] = await Promise.all([
                    axiosInstance.get(`/api/tenant/${tenantSlug}/organization/user-departments`, {
                        params: { _t: cacheBust },
                        headers: { 'Cache-Control': 'no-cache' }
                    }),
                    axiosInstance.get(`/api/tenant/${tenantSlug}/organization/me/permissions`, {
                        params: { _t: cacheBust },
                        headers: { 'Cache-Control': 'no-cache' }
                    }),
                ]);
                if (!active) return;
                setUserDepartments(deptsRes.data?.data ?? []);
                setUserPermissions(permsRes.data?.data ?? null);
            } catch (err) {
                if (!active) return;
                const status = err?.response?.status;
                if (status === 401) logoutRef.current();
                // Network / proxy / server down — avoid uncaught rejection (React error overlay)
                console.warn('Tenant layout: could not load departments or permissions', err?.message || err);
                setUserDepartments([]);
                setUserPermissions(null);
            }
        })();

        return () => { active = false; };
    }, [isAuthenticated, user?.id, tenantSlug, authLoading]);

    // ── Menu generation + filtering ───────────────────────────────────────────
    const menuItems = useMemo(
        () => getIndustryMenuItems(tenant?.erpCategory || 'business', tenantSlug),
        [tenant?.erpCategory, tenantSlug]
    );
    const filteredMenuItems = useMenuFiltering(menuItems, user, tenant, userDepartments, userPermissions);

    // ── Odoo-style app navigation ─────────────────────────────────────────────
    const {
        activeAppKey,
        activeApp,
        favoriteApps,
        favoriteKeys,
        isFavorite,
        toggleFavorite,
    } = useAppNavigation(tenantSlug, filteredMenuItems);

    // ── Auto-expand mobile sidebar parent for current route ───────────────────
    useEffect(() => {
        const newExpanded = {};
        menuItems.forEach(item => {
            if (!item.children) return;
            const hasActiveChild = item.children.some(c =>
                location.pathname === c.path || location.pathname.startsWith(c.path + '/')
            );
            if (hasActiveChild) newExpanded[item.key] = true;
        });
        setExpandedMenus(prev => ({ ...prev, ...newExpanded }));
    }, [location.pathname, menuItems]);

    const toggleMenuExpansion = (key) => {
        const next = { ...expandedMenus, [key]: !expandedMenus[key] };
        if (expandedMenuStorageKey) {
            try { localStorage.setItem(expandedMenuStorageKey, JSON.stringify(next)); } catch (_) {}
        }
        setExpandedMenus(next);
    };

    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        try { localStorage.setItem('tws-sidebar-collapsed', String(next)); } catch (_) {}
        setSidebarCollapsed(next);
    };

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useKeyboardShortcuts({
        'ctrl+k': (e) => { e.preventDefault(); setCommandPaletteOpen(true); },
        'f11':    (e) => { e.preventDefault(); toggleFullscreen(); },
        'escape': () => {
            if (commandPaletteOpen) { setCommandPaletteOpen(false); return; }
            if (mobileMenuOpen)     { setMobileMenuOpen(false);     return; }
            if (isFullscreen)         exitFullscreen();
        },
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    // ── Loading guard (must be after all hooks) ───────────────────────────────
    // Only ever render the dashboard shell once isAuthenticated is confirmed
    // true — never on "still loading" or "not authenticated" (including an
    // org/subdomain mismatch), so a wrong or expired session can't flash
    // protected content before its redirect takes effect.
    if (!isAuthenticated) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-clean-light-pure via-clean-light-soft to-primary-50/30 dark:from-glass-dark-deepest dark:via-glass-dark-deep dark:to-glass-dark-base ${themeTransition ? 'theme-transition' : ''}`}>
                <div className="text-center">
                    <div className="tws-loading-pulse rounded-full h-12 w-12 border-2 border-t-transparent mx-auto" style={{ borderColor: themeStyles.getPrimaryColor(500) }} />
                    <p className="mt-4 text-gray-600 dark:text-gray-300 font-normal">Loading…</p>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <TenantThemeProvider>
        <div
            className={`tenant-org-layout tenant-portal ${isSkyWorkspaceRoute ? 'projects-sky-shell' : ''} h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-clean-light-pure via-clean-light-soft to-primary-50/30 dark:from-glass-dark-deepest dark:via-glass-dark-deep dark:to-glass-dark-base ${themeTransition ? 'theme-transition' : ''}`}
            data-industry={tenant?.erpCategory || 'business'}
        >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 hidden dark:block opacity-10 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMC0xOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnpNMCA1NGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMTggMGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEiLz48L2c+PC9zdmc+')] " />
            </div>

            {/* ── Mobile sidebar sheet (hamburger → full module list) ─────────── */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="left" className="p-0 w-64 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                    {(tenant?.name || 'W').charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{tenant?.name || 'Organization'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace('_', ' ') || 'Member'}</p>
                            </div>
                        </div>
                    </div>
                    <SidebarNav
                        filteredMenuItems={filteredMenuItems}
                        expandedMenus={expandedMenus}
                        toggleMenuExpansion={toggleMenuExpansion}
                        isDarkMode={isDarkMode}
                        themeStyles={themeStyles}
                    />
                    <div className="p-4 border-t border-gray-200/50 dark:border-white/10">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        >
                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Enterprise workspace: module sidebar + content ─────────────── */}
            <div className="flex flex-1 overflow-hidden relative">
                <aside className={`tws-enterprise-sidebar hidden md:flex ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
                    <div className="tws-enterprise-sidebar__brand">
                        <button
                            type="button"
                            className="tws-enterprise-sidebar__identity"
                            onClick={() => navigate(tenantPath(tenantSlug, 'org', 'home'))}
                            title={tenant?.name || 'Organization'}
                        >
                            <span className="tws-enterprise-sidebar__mark">
                                {(tenant?.name || 'W').charAt(0).toUpperCase()}
                            </span>
                            <span className="tws-enterprise-sidebar__brand-copy">
                                <strong>{tenant?.name || 'Organization'}</strong>
                                <small>Software House OS</small>
                            </span>
                        </button>
                        <button
                            type="button"
                            className="tws-sidebar-collapse"
                            onClick={toggleSidebar}
                            aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                            title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                        >
                            {sidebarCollapsed
                                ? <ChevronDoubleRightIcon />
                                : <ChevronDoubleLeftIcon />}
                        </button>
                    </div>
                    <div className="tws-enterprise-sidebar__label">Workspace</div>
                    <SidebarNav
                        filteredMenuItems={filteredMenuItems}
                        expandedMenus={expandedMenus}
                        toggleMenuExpansion={toggleMenuExpansion}
                        isDarkMode={isDarkMode}
                        themeStyles={themeStyles}
                        collapsed={sidebarCollapsed}
                    />
                    {!sidebarCollapsed && favoriteApps.length > 0 && (
                        <div className="tws-enterprise-sidebar__favorites">
                            <BookmarkBar
                                items={favoriteApps}
                                activeAppKey={activeAppKey}
                                onRemove={toggleFavorite}
                            />
                        </div>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className={`tws-sidebar-account ${sidebarCollapsed ? 'is-collapsed' : ''}`}
                                aria-label="Open account menu"
                            >
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="tws-sidebar-account__avatar text-[11px] font-bold">
                                        {(user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="tws-sidebar-account__copy">
                                            <strong>{user?.fullName || user?.email || 'User'}</strong>
                                            <small>{user?.email || String(user?.role || 'member').replace(/_/g, ' ')}</small>
                                        </span>
                                        <ChevronRightIcon className="tws-sidebar-account__chevron" />
                                    </>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            align="start"
                            sideOffset={8}
                            collisionPadding={10}
                            className="tws-sidebar-profile-menu"
                        >
                            <DropdownMenuLabel className="tws-sidebar-profile-menu__user">
                                <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarFallback className="tws-sidebar-account__avatar text-[11px] font-bold">
                                        {(user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span><strong>{user?.fullName || 'User'}</strong><small>{user?.email}</small></span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(tenantPath(tenantSlug, 'org', isAdminUser ? 'profile' : 'employee/profile'))} className="tws-sidebar-profile-menu__item">
                                <UserCircleIcon /><span>Account</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(tenantPath(tenantSlug, 'org', 'settings', 'notifications'))} className="tws-sidebar-profile-menu__item">
                                <BellIcon /><span>Notifications</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="tws-sidebar-profile-menu__section">Theme</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => setTheme('light')} className="tws-sidebar-profile-menu__item">
                                <SunIcon /><span>Light</span>{!isDarkMode && !isSystemTheme && <CheckIcon className="menu-check" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTheme('dark')} className="tws-sidebar-profile-menu__item">
                                <MoonIcon /><span>Dark</span>{isDarkMode && !isSystemTheme && <CheckIcon className="menu-check" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={resetToSystemTheme} className="tws-sidebar-profile-menu__item">
                                <ComputerDesktopIcon /><span>System</span>{isSystemTheme && <CheckIcon className="menu-check" />}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="tws-sidebar-profile-menu__item is-danger">
                                <ArrowRightOnRectangleIcon /><span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </aside>
                <div className="flex-1 flex flex-col min-w-0 relative z-10">
                    {/* Workspace utility header: scoped to content, never above org navigation */}
                    <div className="tws-workspace-header flex-shrink-0 z-30 relative">
                        <OdooTopBar
                            orgLogoUrl={tenant?.logoUrl || tenant?.logo}
                            orgName={tenant?.name}
                            activeApp={activeApp}
                            user={user}
                            onProfile={() => navigate(tenantPath(tenantSlug, 'org', isAdminUser ? 'profile' : 'employee/profile'))}
                            onLogout={logout}
                            onSearch={() => setCommandPaletteOpen(true)}
                            isFullscreen={isFullscreen}
                            onFullscreenToggle={toggleFullscreen}
                            onMobileMenu={() => setMobileMenuOpen(true)}
                            showAccount={false}
                        />
                    </div>
                    <main
                        ref={mainContentRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 bg-[#dce7ff]/52 dark:bg-transparent glass-scrollbar transition-all duration-500"
                    >
                        <div className="px-2 sm:px-3 md:px-4 lg:px-5 pb-2 sm:pb-3 md:pb-4 lg:pb-5 pt-0 relative animate-fade-in">
                            <TenantNavProvider value={{
                                filteredMenuItems,
                                activeAppKey,
                                activeApp,
                                favoriteApps,
                                favoriteKeys,
                                isFavorite,
                                toggleFavorite,
                            }}>
                                <TenantPermissionsProvider value={{ userPermissions }}>
                                    {children ?? (
                                        <div className="flex items-center justify-center h-full min-h-[400px]">
                                            <div className="text-center">
                                                <div className="tws-loading-pulse rounded-full h-12 w-12 border-2 border-t-transparent mx-auto" style={{ borderColor: themeStyles.getPrimaryColor(500) }} />
                                                <p className="mt-4 text-gray-600 dark:text-gray-300">Loading…</p>
                                            </div>
                                        </div>
                                    )}
                                </TenantPermissionsProvider>
                            </TenantNavProvider>
                        </div>
                    </main>
                </div>
            </div>

        </div>

        {/* ── Portalled overlays ───────────────────────────────────────────── */}
        <IdleSessionGuard
            enabled={Boolean(isAuthenticated && !authLoading)}
            onLogout={logout}
        />
        <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => { setCommandPaletteOpen(false); setCommandPaletteQuery(''); }}
            tenantSlug={tenantSlug}
            initialSearchTerm={commandPaletteQuery}
        />
        <Toaster
            position="top-center"
            gutter={8}
            toastOptions={{
                duration: 3000,
                style: { borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontWeight: '500' },
                success: { duration: 2500, style: { background: '#10b981', color: '#fff' } },
                error:   { duration: 4000, style: { background: '#ef4444', color: '#fff' } },
            }}
        />
        </TenantThemeProvider>
    );
};

export default TenantOrgLayout;
