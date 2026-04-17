import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const TenantAuthContext = createContext();

export const useTenantAuth = () => {
  const context = useContext(TenantAuthContext);
  if (!context) {
    throw new Error('useTenantAuth must be used within a TenantAuthProvider');
  }
  return context;
};

export const TenantAuthProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const lastInitializedSlug = useRef(null); // Track last initialized tenant slug
  const isInitializing = useRef(false); // Prevent concurrent initializations
  const redirectAttempted = useRef(false); // Prevent multiple redirect attempts
  
  // Extract tenantSlug from URL path (FR2: /<tenant-slug>/org/... e.g. /ahmad/org/dashboard)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];
  const secondSegment = pathParts[1];
  // Tenant workspace routes: /:slug/org/... or /:slug/dashboard
  const isTenantPath = secondSegment === 'org' || secondSegment === 'dashboard';
  let tenantSlug = isTenantPath && firstSegment ? firstSegment : null;
  
  // Check if tenantSlug is an ObjectId (24 hex characters) - if so, we need to get the actual slug
  const isObjectId = tenantSlug && /^[0-9a-f]{24}$/i.test(tenantSlug);

  const normalizeProfilePicUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('/api/tenant/')) {
      const match = url.match(/\/uploads\/profile-pictures\/[^/?#]+/);
      return match ? match[0] : url;
    }
    return url;
  };

  useEffect(() => {
    // Don't initialize on login pages - let login handle authentication
    const isOnLoginPage = location.pathname.includes('/login') || 
                         location.pathname.includes('/signup') ||
                         location.pathname === '/software-house-login';
    
    if (isOnLoginPage) {
      setLoading(false);
      return; // Don't initialize on login pages
    }
    
    // Prevent infinite loops by only initializing when tenant slug actually changes
    // Also skip if we're currently redirecting (to prevent race conditions)
    const isRedirecting = tenantSlug && /^[0-9a-f]{24}$/i.test(tenantSlug);
    
    // Reset redirect flag when slug changes (new tenant context)
    if (tenantSlug && lastInitializedSlug.current !== tenantSlug) {
      redirectAttempted.current = false;
    }
    
    if (tenantSlug && lastInitializedSlug.current !== tenantSlug && !isInitializing.current && !isRedirecting) {
      isInitializing.current = true;
      lastInitializedSlug.current = tenantSlug;
      initializeAuth().finally(() => {
        isInitializing.current = false;
      });
    } else if (!tenantSlug) {
      setLoading(false);
    } else if (lastInitializedSlug.current === tenantSlug && isAuthenticated && tenant?.slug === tenantSlug) {
      // Already initialized and authenticated for this tenant
      setLoading(false);
    } else if (isRedirecting) {
      // If we're redirecting, just wait (don't initialize yet)
      setLoading(true);
      // Safety timeout for redirects - don't wait forever
      const redirectTimeout = setTimeout(() => {
        console.warn('⚠️ Redirect timeout - forcing loading to false');
        setLoading(false);
      }, 3000);
      return () => clearTimeout(redirectTimeout);
    } else {
      // Fallback: if we're not initializing and not redirecting, ensure loading is false
      // This prevents stuck loading states
      if (!isInitializing.current && !isRedirecting) {
        setLoading(false);
      }
    }
  }, [tenantSlug, location.pathname]); // Include location.pathname to detect redirects

  // Fetch fresh tenant data from the server and merge into state + localStorage.
  // Called after every successful auth confirmation so data is always up-to-date
  // regardless of device or deployment. localStorage is only a fast-render cache.
  const refreshTenantFromServer = async (slug) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/organization/profile`, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      const fresh = json.data?.tenant || json.data;
      if (!fresh) return;
      const freshFields = {
        id: fresh._id || fresh.id,
        _id: fresh._id || fresh.id,
        name: fresh.name,
        slug: fresh.slug,
        status: fresh.status || 'active',
        plan: fresh.subscription?.plan || fresh.plan,
        erpModules: fresh.erpModules || [],
        erpCategory: fresh.erpCategory || 'software_house',
        logoUrl: fresh.branding?.logo || null,
        branding: fresh.branding || null,
      };
      setTenant(prev => prev ? { ...prev, ...freshFields } : freshFields);
      // Sync localStorage so the next same-device load is also fast
      try {
        const stored = JSON.parse(localStorage.getItem('tenantData') || '{}');
        localStorage.setItem('tenantData', JSON.stringify({ ...stored, ...freshFields, branding: fresh.branding }));
      } catch { /* ignore */ }
    } catch { /* non-critical — best-effort server refresh */ }
  };

  const initializeAuth = async () => {
    // Helper: get redirect path (FR2: path is /<slug>/org/dashboard)
    // Defined before try so it's in scope for catch block
    const getRedirectPath = () => '/software-house-login';

    try {
      setLoading(true);
      
      // Prevent redirect loops - don't redirect if already on a login page
      const isOnLoginPage = location.pathname.includes('/login') || location.pathname.includes('/signup') || location.pathname === '/software-house-login';
      
      // Helper function to check if a string is an ObjectId
      const isObjectId = (str) => str && /^[0-9a-f]{24}$/i.test(str);
      
      // SECURITY FIX: Don't read tokens from localStorage - they're in HttpOnly cookies
      // Check authentication via API (cookies sent automatically)
      const mainUserStr = localStorage.getItem('user');
      
      // Check if user is authenticated via cookies
      let isMainAuth = false;
      try {
        const authCheckResponse = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include' // SECURITY FIX: Include cookies
        });
        isMainAuth = authCheckResponse.ok;
      } catch (error) {
        console.error('Auth check failed:', error);
        isMainAuth = false;
      }
      
      // If URL has ObjectId as tenantSlug, get actual slug from user data and redirect
      if (isObjectId(tenantSlug) && !isOnLoginPage && isMainAuth && mainUserStr) {
        try {
          const mainUser = JSON.parse(mainUserStr);
          let userTenantSlug = mainUser.tenantId || (typeof mainUser.orgId === 'object' ? mainUser.orgId.slug : null);
          if (!userTenantSlug || isObjectId(userTenantSlug)) {
            try {
              const response = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
              if (response.ok) {
                const userData = await response.json();
                if (userData.success && userData.data?.user) {
                  const updatedUser = userData.data.user;
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                  userTenantSlug = updatedUser.tenantId || (typeof updatedUser.orgId === 'object' ? updatedUser.orgId.slug : null);
                }
              }
            } catch (e) { /* ignore */ }
          }
          if (userTenantSlug && !isObjectId(userTenantSlug)) {
            const correctPath = location.pathname.replace(new RegExp(`^/${tenantSlug}(/|$)`), `/${userTenantSlug}$1`);
            setLoading(false);
            navigate(correctPath, { replace: true });
            return;
          }
        } catch (e) { /* ignore */ }
      }
      
      // SECURITY FIX: Check if user is authenticated via cookies (isMainAuth already checked above)
      // Always refresh /api/auth/me so profile fields (like profilePicUrl) stay current.
      let mainUser = mainUserStr ? (() => { try { return JSON.parse(mainUserStr); } catch { return null; } })() : null;
      if (isMainAuth) {
        try {
          const meResponse = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            if (meData.success && meData.data?.user) {
              mainUser = meData.data.user;
              localStorage.setItem('user', JSON.stringify(mainUser));
            }
          }
        } catch (e) {
          console.warn('Could not fetch user from /api/auth/me:', e);
        }
      }
      if (isMainAuth && mainUser) {
        try {
          let userTenantSlug = mainUser.tenantId || (typeof mainUser.orgId === 'object' ? mainUser.orgId.slug : null);
          if (isObjectId(userTenantSlug)) userTenantSlug = typeof mainUser.orgId === 'object' ? mainUser.orgId.slug : null;
          if (!userTenantSlug || isObjectId(userTenantSlug)) userTenantSlug = null;
          const tenantMatches = userTenantSlug && userTenantSlug === tenantSlug;

          const tenantDataStr = localStorage.getItem('tenantData');
          if (tenantDataStr && tenantSlug && (tenantMatches || !userTenantSlug)) {
            try {
              const tenantData = JSON.parse(tenantDataStr);
              if (tenantData.slug === tenantSlug) {
                const slugOk = userTenantSlug === tenantSlug || !userTenantSlug;
                if (slugOk) {
                  setTenant({
                    id: tenantData.id,
                    _id: tenantData.id,
                    name: tenantData.name,
                    slug: tenantData.slug,
                    status: tenantData.status || 'active',
                    plan: tenantData.plan,
                    erpModules: tenantData.erpModules || [],
                    erpCategory: tenantData.erpCategory || 'software_house',
                    orgId: tenantData.orgId || null,
                    owner: tenantData.owner,
                    logoUrl: tenantData.branding?.logo || tenantData.logoUrl || null,
                  });
                  setUser({
                    id: mainUser._id || mainUser.id,
                    _id: mainUser._id || mainUser.id,
                    username: mainUser.email,
                    email: mainUser.email,
                    fullName: mainUser.fullName,
                    role: mainUser.role || 'owner',
                    profilePicUrl: normalizeProfilePicUrl(mainUser.profilePicUrl),
                    phone: mainUser.phone,
                    department: mainUser.department,
                    jobTitle: mainUser.jobTitle
                  });
                  setIsAuthenticated(true);
                  setLoading(false);
                  refreshTenantFromServer(tenantSlug); // non-blocking: updates logo/branding from server
                  return;
                }
              }
            } catch (e) {
              console.warn('Error parsing tenantData:', e);
            }
          }
          if (userTenantSlug && tenantSlug && userTenantSlug !== tenantSlug && !isOnLoginPage) {
            const correctPath = location.pathname.replace(new RegExp(`^/${tenantSlug}(/|$)`), `/${userTenantSlug}$1`);
            setLoading(false);
            setIsAuthenticated(false);
            navigate(correctPath, { replace: true });
            return;
          }
        } catch (e) {
          console.error('Error parsing main user:', e);
        }
      }
      
      // SECURITY FIX: Don't read tokens from localStorage - they're in HttpOnly cookies
      // Get tenant data from localStorage (set during tenant login)
      let tenantDataStr = localStorage.getItem('tenantData');
      
      if (!tenantDataStr) {
        // No localStorage data — new device or cleared storage.
        // If the session cookie is valid, fetch tenant data directly from the server.
        if (isMainAuth && tenantSlug) {
          try {
            const res = await fetch(`/api/tenant/${tenantSlug}/organization/profile`, { credentials: 'include' });
            if (res.ok) {
                const json = await res.json();
                const fresh = json.data?.tenant || json.data;
              if (fresh) {
                const freshTenant = {
                  id: fresh._id || fresh.id,
                  _id: fresh._id || fresh.id,
                  name: fresh.name,
                  slug: fresh.slug,
                  status: fresh.status || 'active',
                  plan: fresh.subscription?.plan || fresh.plan,
                  erpModules: fresh.erpModules || [],
                  erpCategory: fresh.erpCategory || 'software_house',
                    logoUrl: fresh.branding?.logo || null,
                    branding: fresh.branding || null,
                };
                setTenant(freshTenant);
                // Cache for future same-device fast loads
                localStorage.setItem('tenantData', JSON.stringify({ ...freshTenant, branding: fresh.branding }));
                // Set user from mainUser if available
                if (mainUser) {
                  setUser({
                    id: mainUser._id || mainUser.id,
                    _id: mainUser._id || mainUser.id,
                    username: mainUser.email,
                    email: mainUser.email,
                    fullName: mainUser.fullName,
                    role: mainUser.role || 'owner',
                    profilePicUrl: normalizeProfilePicUrl(mainUser.profilePicUrl),
                    phone: mainUser.phone,
                    department: mainUser.department,
                    jobTitle: mainUser.jobTitle
                  });
                }
                setIsAuthenticated(true);
                setLoading(false);
                return;
              }
            }
          } catch { /* fall through to login redirect */ }
        }
        // No auth or server fetch failed → redirect to login
        if (!isMainAuth && !isOnLoginPage && !redirectAttempted.current) {
          console.log('No tenant data found and no main auth token, redirecting to login');
          redirectAttempted.current = true;
          setLoading(false);
          setIsAuthenticated(false);
          const redirectPath = getRedirectPath();
          if (navigate) {
            navigate(redirectPath);
          } else {
            window.location.href = redirectPath;
          }
        } else {
          setLoading(false);
          setIsAuthenticated(false);
        }
        return;
      }
      
      // Reset redirect flag if we have tenant data (successful initialization)
      if (tenantDataStr) {
        redirectAttempted.current = false;
      }

      try {
        const tenantData = JSON.parse(tenantDataStr);
        
        // Verify tenant slug matches
        // Tokens are in HttpOnly cookies, not in localStorage
        const slugMatches = tenantData && tenantData.slug === tenantSlug;
        
        if ((isMainAuth || tenantDataStr) && slugMatches) {
          setTenant({
            id: tenantData.id,
            _id: tenantData.id,
            name: tenantData.name,
            slug: tenantData.slug,
            status: tenantData.status || 'active',
            plan: tenantData.plan,
            erpModules: tenantData.erpModules || [],
            erpCategory: tenantData.erpCategory || 'software_house',
            orgId: tenantData.orgId || null,
            owner: tenantData.owner,
            logoUrl: tenantData.branding?.logo || tenantData.logoUrl || null,
          });
          
          // Set user from tenant owner data or main user data
          if (tenantData.owner) {
            setUser({
              id: tenantData.owner._id || tenantData.owner.id || tenantData.owner.username || tenantData.owner.email,
              _id: tenantData.owner._id || tenantData.owner.id,
              username: tenantData.owner.username || tenantData.owner.email,
              email: tenantData.owner.email,
              fullName: tenantData.owner.fullName,
              role: tenantData.owner.role || 'owner',
              profilePicUrl: normalizeProfilePicUrl(tenantData.owner.profilePicUrl),
              phone: tenantData.owner.phone,
              department: tenantData.owner.department,
              jobTitle: tenantData.owner.jobTitle
            });
          } else if (mainUserStr) {
            // Fallback to main user if owner not in tenant data
            try {
              const mainUser = JSON.parse(mainUserStr);
              setUser({
                id: mainUser._id || mainUser.id,
                _id: mainUser._id || mainUser.id,
                username: mainUser.email,
                email: mainUser.email,
                fullName: mainUser.fullName || `${mainUser.firstName || ''} ${mainUser.lastName || ''}`.trim(),
                role: mainUser.role || 'admin',
                profilePicUrl: normalizeProfilePicUrl(mainUser.profilePicUrl),
                phone: mainUser.phone,
                department: mainUser.department,
                jobTitle: mainUser.jobTitle
              });
            } catch (e) {
              console.error('Error parsing main user for tenant context:', e);
            }
          }
          
          setIsAuthenticated(true);
          setLoading(false);
          refreshTenantFromServer(tenantSlug); // non-blocking: always sync logo/branding from server
        } else {
          console.error('Tenant slug mismatch or invalid tenant data');
          setLoading(false);
          setIsAuthenticated(false);
          // Token exists but tenant slug doesn't match, redirect to login (but not if already on login page)
          const isOnLoginPage = location.pathname.includes('/login') || location.pathname.includes('/signup');
          if (!isOnLoginPage) {
            const redirectPath = '/software-house-login';
            if (navigate) {
              navigate(redirectPath);
            } else {
              window.location.href = redirectPath;
            }
          }
          return;
        }
      } catch (parseError) {
        console.error('Error parsing tenant data:', parseError);
        setLoading(false);
        setIsAuthenticated(false);
        // SECURITY FIX: Only clear user data, tokens are in HttpOnly cookies
        // Invalid tenant data, clear and redirect (but not if already on login page)
        localStorage.removeItem('tenantData');
        const isOnLoginPage = location.pathname.includes('/login') || location.pathname.includes('/signup');
        if (!isOnLoginPage) {
          const redirectPath = getRedirectPath();
          if (navigate) {
            navigate(redirectPath);
          } else {
            window.location.href = redirectPath;
          }
        }
        return;
      }
    } catch (error) {
      console.error('Error initializing tenant auth:', error);
      setLoading(false);
      setIsAuthenticated(false);
      // SECURITY FIX: Only clear user data, tokens are in HttpOnly cookies
      // On error, clear auth and redirect to login (but not if already on login page)
      localStorage.removeItem('tenantData');
        const isOnLoginPage = location.pathname.includes('/login') || location.pathname.includes('/signup');
        if (!isOnLoginPage) {
          const redirectPath = getRedirectPath();
        if (navigate) {
          navigate(redirectPath);
        } else {
          window.location.href = redirectPath;
        }
      }
      return;
    } finally {
      // Ensure loading is always set to false, even if earlier returns were hit
      // This is a safety net to prevent infinite loading states
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      // This should be called from tenant-specific login components
      // After successful login, tenant data is stored in localStorage
      // So we just need to reload the auth state
      await initializeAuth();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // SECURITY FIX: Call backend logout endpoint with credentials to clear cookies
      // Works for both main auth and tenant auth
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include' // SECURITY FIX: Include cookies
        });
      } catch (error) {
        console.error('Backend logout error (non-critical):', error);
        // Continue with logout even if backend call fails
      }
      
      // Try tenant auth logout as well (for tenant owners)
      try {
        await fetch('/api/tenant-auth/logout', {
          method: 'POST',
          credentials: 'include' // SECURITY FIX: Include cookies
        });
      } catch (error) {
        // Ignore - may not be tenant auth
      }
      
      // SECURITY FIX: Only clear user data, tokens are in HttpOnly cookies
      localStorage.removeItem('user');
      localStorage.removeItem('tenantData');
      
      // Clear state
      setTenant(null);
      setUser(null);
      setIsAuthenticated(false);
      
      toast.success('Logged out successfully');
      window.location.href = '/software-house-login';
    } catch (error) {
      console.error('Logout error:', error);
      
      // SECURITY FIX: Even if there's an error, clear user data and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('tenantData');
      
      setTenant(null);
      setUser(null);
      setIsAuthenticated(false);
      
      window.location.href = '/software-house-login';
    }
  };

  const updateUser = (userData) => {
    setUser(prev => (prev ? { ...prev, ...userData } : userData));
  };

  const updateTenant = (tenantData) => {
    setTenant(prev => {
      if (!prev) return prev;
      // Deep-merge branding so a partial { logo } update doesn't wipe other branding fields
      const mergedBranding = tenantData.branding
        ? { ...(prev.branding || {}), ...tenantData.branding }
        : prev.branding;
      const updated = { ...prev, ...tenantData, branding: mergedBranding };
      // Keep localStorage in sync
      try {
        const stored = JSON.parse(localStorage.getItem('tenantData') || '{}');
        const mergedStoredBranding = tenantData.branding
          ? { ...(stored.branding || {}), ...tenantData.branding }
          : stored.branding;
        localStorage.setItem('tenantData', JSON.stringify({
          ...stored,
          ...tenantData,
          branding: mergedStoredBranding,
        }));
      } catch { /* ignore */ }
      return updated;
    });
  };

  const value = {
    tenant,
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    updateTenant,
  };

  return (
    <TenantAuthContext.Provider value={value}>
      {children}
    </TenantAuthContext.Provider>
  );
};

export default TenantAuthContext;