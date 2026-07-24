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
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
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
import Breadcrumbs from '../../../shared/components/navigation/Breadcrumbs';
import IdleSessionGuard from './IdleSessionGuard';
import { TenantPermissionsProvider } from '../contexts/TenantPermissionsContext';
import { Sheet, SheetContent } from '../../../components/ui/Sheet/Sheet';
import axiosInstance from '../../../shared/utils/axiosInstance';
import './TenantOrgLayout.css';
import '../styles/tenant-theme.css';
import '../styles/tenant-tokens.css';

const TenantOrgLayout = ({ children }) => {
    // ── Router ────────────────────────────────────────────────────────────────
    const tenantSlug = useTenantSlug();
    const navigate   = useNavigate();
    const location   = useLocation();
    // Works for both clean URLs (/home) and legacy path-based (/slug/org/home)
    const isHomeRoute = location.pathname === '/home' || location.pathname === `/${tenantSlug}/org/home`;

    // ── Auth / Theme ──────────────────────────────────────────────────────────
    const { user, logout, tenant, isAuthenticated, loading: authLoading } = useTenantAuth();
    const normalizedRole = String(user?.role || '').toLowerCase();
    const isAdminUser = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner']
        .includes(normalizedRole);
    const { isDarkMode, themeTransition, toggleTheme } = useTheme();
    const themeStyles   = useThemeStyles();
    const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreen();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [mobileMenuOpen,       setMobileMenuOpen]       = useState(false);
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
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    useEffect(() => {
        if (!authLoading) { setLoadingTimeout(false); return; }
        const t = setTimeout(() => {
            console.warn('⚠️ Auth loading timeout — forcing render');
            setLoadingTimeout(true);
        }, 3000);
        return () => clearTimeout(t);
    }, [authLoading]);

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
        setExpandedMenus(prev => {
            const next = { ...prev, [key]: !prev[key] };
            if (expandedMenuStorageKey) {
                try { localStorage.setItem(expandedMenuStorageKey, JSON.stringify(next)); } catch (_) {}
            }
            return next;
        });
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
    if (authLoading && !loadingTimeout && !isAuthenticated) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-clean-light-pure via-clean-light-soft to-primary-50/30 dark:from-glass-dark-deepest dark:via-glass-dark-deep dark:to-glass-dark-base ${themeTransition ? 'theme-transition' : ''}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent mx-auto" style={{ borderColor: themeStyles.getPrimaryColor(500) }} />
                    <p className="mt-4 text-gray-600 dark:text-gray-300 font-normal">Loading…</p>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <TenantThemeProvider>
        <div
            className={`tenant-org-layout tenant-portal h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-clean-light-pure via-clean-light-soft to-primary-50/30 dark:from-glass-dark-deepest dark:via-glass-dark-deep dark:to-glass-dark-base ${themeTransition ? 'theme-transition' : ''}`}
            data-industry={tenant?.erpCategory || 'business'}
        >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 hidden dark:block opacity-10 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMC0xOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnpNMCA1NGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMTggMGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEiLz48L2c+PC9zdmc+')] " />
            </div>

            {/* ── Top Bar (Odoo-style) ─────────────────────────────────────────── */}
            <div className="flex-shrink-0 z-30 relative">
                <OdooTopBar
                    orgLogoUrl={tenant?.logoUrl || tenant?.logo}
                    orgName={tenant?.name}
                    activeApp={activeApp}
                    user={user}
                    onProfile={() => navigate(`/${tenantSlug}/org/${isAdminUser ? 'profile' : 'employee/profile'}`)}
                    onLogout={logout}
                    onSearch={() => setCommandPaletteOpen(true)}
                    isFullscreen={isFullscreen}
                    onFullscreenToggle={toggleFullscreen}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                    onMobileMenu={() => setMobileMenuOpen(true)}
                />
            </div>

            {/* ── Bookmark Bar (Chrome-style, below top bar) ────────────────────── */}
            <BookmarkBar
                items={favoriteApps}
                activeAppKey={activeAppKey}
                onRemove={toggleFavorite}
            />

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

            {/* ── Main content (full width — no sidebar) ──────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative">
                <div className="flex-1 flex flex-col min-w-0 relative z-10">
                    <main
                        ref={mainContentRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 glass-scrollbar transition-all duration-500"
                    >
                        <div className="px-2 sm:px-3 md:px-4 lg:px-5 pb-2 sm:pb-3 md:pb-4 lg:pb-5 pt-0 relative animate-fade-in">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#cddcff]/100 via-[#dce7ff]/78 to-transparent dark:hidden" />
                            {!isHomeRoute && (
                                <div className="-mx-2 sm:-mx-3 md:-mx-4 lg:-mx-5 mb-1 px-3 sm:px-4 md:px-5 py-1.5 border-b border-[#cfdbf6]/55 bg-gradient-to-b from-[#dde8ff]/48 via-[#e8efff]/30 to-transparent backdrop-blur-[1px] dark:border-gray-700/70 dark:bg-gray-900/70">
                                    <Breadcrumbs className="text-xs text-slate-600/95 dark:text-gray-400" />
                                </div>
                            )}
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
                                                <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent mx-auto" style={{ borderColor: themeStyles.getPrimaryColor(500) }} />
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
