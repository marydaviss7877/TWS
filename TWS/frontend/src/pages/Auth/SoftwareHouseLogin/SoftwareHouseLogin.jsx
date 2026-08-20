import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { useTheme } from '../../../app/providers/ThemeContext';
import { AuthMarketingNav } from '../../../marketing/components/MarketingShell';
import './SoftwareHouseLogin.css';
import {
    UserIcon,
    UserGroupIcon,
    EyeIcon,
    EyeSlashIcon,
    BuildingOffice2Icon,
    LockClosedIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import BrandMark from '../../../shared/components/ui/BrandMark';
import { getTenantWorkspaceUrl, navigateTo, isAdminHost, isSubdomainContext, getSubdomainSlug } from '../../../shared/utils/subdomain';

const SoftwareHouseLogin = () => {
    const { login, loginSupraAdmin, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [infoMessage, setInfoMessage] = useState(location.state?.signupSuccess ? 'Account created successfully. Please sign in.' : '');
    const [selectedPortal, setSelectedPortal] = useState('admin');
    const [workspaceName, setWorkspaceName] = useState('');
    const validationBlockedRef = useRef(false);
    const emailInputRef = useRef(null);
    const passwordInputRef = useRef(null);
    const errorBoxRef = useRef(null);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'Sign in | HousesBase';
        return () => {
            document.title = previousTitle;
        };
    }, []);

    useEffect(() => {
        const tenantSlug = getSubdomainSlug();
        if (!tenantSlug) return undefined;

        const controller = new AbortController();

        const loadWorkspaceName = async () => {
            try {
                const response = await fetch(`/api/tenant/${encodeURIComponent(tenantSlug)}/info`, {
                    signal: controller.signal,
                });
                if (!response.ok) return;

                const result = await response.json();
                const name = String(result?.data?.name || '').trim();
                if (name) setWorkspaceName(name);
            } catch (fetchError) {
                if (fetchError.name !== 'AbortError') {
                    console.warn('Unable to load workspace name for sign-in page.');
                }
            }
        };

        loadWorkspaceName();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (validationBlockedRef.current && window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
        }
    }, []);

    useEffect(() => {
        if (location.state?.email) {
            setFormData((prev) => ({ ...prev, email: location.state.email }));
        }
    }, [location.state]);

    useEffect(() => {
        if (error && errorBoxRef.current) {
            errorBoxRef.current.focus();
        }
    }, [error]);

    // admin.housesbase.com is the Software House Admin's own dedicated login
    // host — there's no employee/client ambiguity there, so it gets distinct
    // copy and skips the portal selector and org-signup link entirely.
    const isAdmin = isAdminHost();
    // /signup only renders on the root domain (App.jsx) — on a tenant
    // subdomain or admin host, "Create account" would be a dead link.
    const canSignUp = !isAdmin && !isSubdomainContext();

    const portals = [
        { id: 'admin',    icon: ShieldCheckIcon,    title: 'Admin' },
        { id: 'employee', icon: UserGroupIcon,       title: 'Employee' },
        { id: 'client',   icon: BuildingOffice2Icon, title: 'Client' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedEmail = String(formData.email || '').trim();
        const trimmedPassword = String(formData.password || '').trim();
        const nextFieldErrors = {};
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!trimmedEmail) nextFieldErrors.email = 'Email is required.';
        else if (!emailPattern.test(trimmedEmail)) nextFieldErrors.email = 'Enter a valid email address.';
        if (!trimmedPassword) nextFieldErrors.password = 'Password is required.';

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            setError('Please fix the highlighted fields and try again.');
            if (nextFieldErrors.email && emailInputRef.current) {
                emailInputRef.current.focus();
            } else if (nextFieldErrors.password && passwordInputRef.current) {
                passwordInputRef.current.focus();
            }
            return;
        }

        setLoading(true);
        setError('');
        setInfoMessage('');
        setFieldErrors({});
        try {
            // admin.housesbase.com/login is the single entry point for both
            // Software House Admins (User model) and the platform Supra Admin
            // (TWSAdmin model — a completely separate collection/auth route).
            // Try the tenant-admin login first; only on a credential failure,
            // silently retry against the Supra Admin endpoint so one URL works
            // for both without merging the two auth flows on the backend.
            let result = await login(trimmedEmail, trimmedPassword, {
                silent: isAdmin,
                portal: isAdmin ? 'admin' : selectedPortal,
            });
            if (!result.success && isAdmin && /invalid email or password/i.test(result.error || '')) {
                const supraResult = await loginSupraAdmin(trimmedEmail, trimmedPassword);
                if (supraResult.success) {
                    navigate('/supra-admin');
                    setLoading(false);
                    return;
                }
                result = supraResult;
            }
            if (result.success) {
                const userRole = result.user?.role;
                const employeeRoles = ['employee', 'staff', 'developer', 'engineer', 'programmer', 'project_manager', 'manager', 'ceo', 'cfo', 'finance', 'hr', 'department_lead', 'pmo', 'contributor', 'contractor'];
                const clientRoles   = ['client', 'customer'];

                let tenantSlug = result.user?.tenantId || (typeof result.user?.orgId === 'object' ? result.user.orgId.slug : null) || result.user?.orgId?.slug;
                const isObjectId = (str) => str && /^[0-9a-f]{24}$/i.test(str);
                if (isObjectId(tenantSlug)) tenantSlug = typeof result.user?.orgId === 'object' ? result.user.orgId.slug : null;

                if (!tenantSlug || isObjectId(tenantSlug)) {
                    setError('Unable to resolve organization identity.');
                    setLoading(false);
                    return;
                }

                const orgId = typeof result.user?.orgId === 'object' ? result.user.orgId._id : result.user?.orgId;
                const tenantData = {
                    id: orgId,
                    name: typeof result.user?.orgId === 'object' ? result.user.orgId.name : tenantSlug,
                    slug: tenantSlug,
                    status: 'active',
                    erpCategory: 'software_house',
                    erpModules: ['projects', 'tasks', 'clients', 'invoices', 'time_tracking', 'employees', 'payroll', 'hr', 'attendance', 'departments', 'roles', 'role_management', 'operations'],
                    orgId,
                    owner: { username: result.user?.email, email: result.user?.email, fullName: result.user?.fullName || `${result.user?.firstName} ${result.user?.lastName}` },
                };

                localStorage.setItem('tenantData', JSON.stringify(tenantData));
                localStorage.setItem('user', JSON.stringify({
                    id: result.user?.id || result.user?._id,
                    _id: result.user?._id,
                    email: result.user?.email,
                    fullName: result.user?.fullName,
                    role: result.user?.role,
                    tenantId: tenantSlug,
                    orgId: result.user?.orgId,
                }));

                if (employeeRoles.includes(userRole)) {
                    navigateTo(getTenantWorkspaceUrl(tenantSlug, 'org', 'home'), navigate);
                } else if (clientRoles.includes(userRole)) {
                    navigateTo(getTenantWorkspaceUrl(tenantSlug, 'org', 'client-portal'), navigate);
                } else {
                    navigateTo(getTenantWorkspaceUrl(tenantSlug, 'org', 'home'), navigate);
                }
            } else {
                const rawError = String(result.error || '').trim();
                const safeError = /invalid email or password|invalid credentials/i.test(rawError)
                    ? 'Invalid email or password.'
                    : /too many login attempts|too many requests|rate limit/i.test(rawError)
                        ? 'Too many attempts. Please wait a few minutes before trying again.'
                        : /network|failed to fetch|connection|timeout/i.test(rawError)
                            ? 'Network issue detected. Please check your connection and retry.'
                    : (rawError || 'Unable to sign in. Please try again.');
                setError(safeError);
            }
        } catch (err) {
            console.error(err);
            setError('Unable to reach the server. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        }
        if (error) setError('');
        if (infoMessage) setInfoMessage('');
    };

    const selectPortal = (portalId) => {
        setSelectedPortal(portalId);
    };

    return (
        <div className={`sh-login-container${!isDarkMode ? ' day-mode' : ''}`}>
            <AuthMarketingNav compact={!canSignUp} />

            <div className="sh-login-stage">
                <div className="sh-form-wrapper">

                    {/* Logo */}
                    <div className="sh-logo-area">
                        <div className="sh-logo-icon">
                            <BrandMark size={26} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em' }}>HousesBase</div>
                    </div>

                    <h1 className="sh-heading">
                        {isAdmin
                            ? 'Sign in to HousesBase Admin'
                            : workspaceName
                                ? `Sign in to ${workspaceName}\u2019s workspace`
                                : 'Sign in'}
                    </h1>

                    {/* Portal selector — only relevant on a tenant subdomain
                        (admin/employee/client all share that login form);
                        admin.housesbase.com is admin-only, so skip it. */}
                    {!isAdmin && (
                        <div className="sh-portal-row">
                            {portals.map((portal) => (
                                <button
                                    key={portal.id}
                                    type="button"
                                    onClick={() => selectPortal(portal.id)}
                                    className={`sh-portal-btn${selectedPortal === portal.id ? ' active' : ''}`}
                                >
                                    <portal.icon style={{ width: 18, height: 18 }} />
                                    {portal.title}
                                </button>
                            ))}
                        </div>
                    )}

                    {infoMessage && (
                        <div className="sh-info-box" role="status" aria-live="polite">{infoMessage}</div>
                    )}
                    {error && (
                        <div
                            id="sh-login-form-error"
                            className="sh-error-box"
                            role="alert"
                            aria-live="assertive"
                            tabIndex="-1"
                            ref={errorBoxRef}
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="sh-input-group">
                            <label className="sh-label">Email</label>
                            <div className="sh-input-wrapper">
                                <UserIcon className="sh-input-icon" />
                                <input
                                    ref={emailInputRef}
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    className="sh-input"
                                    aria-invalid={Boolean(fieldErrors.email)}
                                    aria-describedby={[fieldErrors.email ? 'sh-login-email-error' : '', error ? 'sh-login-form-error' : ''].filter(Boolean).join(' ') || undefined}
                                />
                            </div>
                            {fieldErrors.email && <div id="sh-login-email-error" className="sh-field-error">{fieldErrors.email}</div>}
                        </div>

                        <div className="sh-input-group">
                            <label className="sh-label">Password</label>
                            <div className="sh-input-wrapper">
                                <LockClosedIcon className="sh-input-icon" />
                                <input
                                    ref={passwordInputRef}
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="sh-input"
                                    style={{ paddingRight: '2.75rem' }}
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    aria-describedby={[fieldErrors.password ? 'sh-login-password-error' : '', error ? 'sh-login-form-error' : ''].filter(Boolean).join(' ') || undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '0.875rem', background: 'none', border: 'none', color: 'var(--sh-login-secondary)', cursor: 'pointer', opacity: 0.6 }}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword
                                        ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                                        : <EyeIcon     style={{ width: 16, height: 16 }} />}
                                </button>
                            </div>
                            {fieldErrors.password && <div id="sh-login-password-error" className="sh-field-error">{fieldErrors.password}</div>}
                        </div>

                        <button type="submit" className="sh-submit-btn" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In →'}
                        </button>
                    </form>

                    <div className="sh-footer-row">
                        <Link to="/forgot-password" className="sh-footer-link">Forgot password?</Link>
                        {canSignUp && <Link to="/signup" className="sh-footer-link">Create account</Link>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoftwareHouseLogin;
