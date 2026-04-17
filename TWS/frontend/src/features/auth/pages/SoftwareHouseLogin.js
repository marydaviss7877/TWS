import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { useTheme } from '../../../app/providers/ThemeContext';
import ThemeToggle from '../../../shared/components/ui/ThemeToggle';
import './SoftwareHouseLogin.css';
import {
    UserIcon,
    UserGroupIcon,
    EyeIcon,
    EyeSlashIcon,
    BuildingOffice2Icon,
    LockClosedIcon,
    ShieldCheckIcon,
    CpuChipIcon,
} from '@heroicons/react/24/outline';

const SoftwareHouseLogin = () => {
    const { login, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [selectedPortal, setSelectedPortal] = useState('admin');
    const validationBlockedRef = useRef(false);

    useEffect(() => {
        if (validationBlockedRef.current && window.location.pathname !== '/software-house-login') {
            window.history.replaceState(null, '', '/software-house-login');
        }
    }, []);

    const portals = [
        { id: 'admin',    icon: ShieldCheckIcon,    title: 'Admin',    demoEmail: 'admin@softwarehouse.com' },
        { id: 'employee', icon: UserGroupIcon,       title: 'Employee', demoEmail: 'employee@softwarehouse.com' },
        { id: 'client',   icon: BuildingOffice2Icon, title: 'Client',   demoEmail: 'client@softwarehouse.com' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                const userRole = result.user?.role;
                const adminRoles    = ['admin', 'owner', 'super_admin', 'org_manager'];
                const employeeRoles = ['employee', 'staff', 'developer', 'engineer', 'programmer', 'project_manager', 'manager', 'ceo', 'cfo', 'finance', 'hr', 'department_lead', 'pmo', 'contributor', 'contractor'];
                const clientRoles   = ['client', 'customer'];

                let allowedPortal = null;
                if (adminRoles.includes(userRole))         allowedPortal = 'admin';
                else if (employeeRoles.includes(userRole)) allowedPortal = 'employee';
                else if (clientRoles.includes(userRole))   allowedPortal = 'client';

                if (allowedPortal && selectedPortal !== allowedPortal) {
                    const portalNames = { admin: 'Admin', employee: 'Employee', client: 'Client' };
                    validationBlockedRef.current = true;
                    localStorage.removeItem('user');
                    localStorage.removeItem('tenantData');
                    setError(`Access denied. Switch to the ${portalNames[allowedPortal]} portal.`);
                    setLoading(false);
                    window.history.replaceState(null, '', '/software-house-login');
                    setTimeout(() => logout().catch(console.error), 100);
                    return;
                }

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
                    navigate(`/${tenantSlug}/org/home`);
                } else if (clientRoles.includes(userRole)) {
                    navigate(`/${tenantSlug}/org/client-portal`);
                } else {
                    navigate(`/${tenantSlug}/org/home`);
                }
            } else {
                setError(result.error || 'Invalid credentials.');
            }
        } catch (err) {
            console.error(err);
            setError('Connection error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const fillDemoCredentials = (portalId) => {
        const portal = portals.find(p => p.id === portalId);
        if (portal) {
            setFormData({ email: portal.demoEmail, password: 'demo123' });
            setSelectedPortal(portalId);
        }
    };

    return (
        <div className={`sh-login-container${!isDarkMode ? ' day-mode' : ''}`}>
            <div className="sh-theme-toggle">
                <ThemeToggle size="md" shortcut={true} />
            </div>

            {/* Left: Form */}
            <div className="sh-login-left">
                <div className="sh-form-wrapper">

                    {/* Logo */}
                    <div className="sh-logo-area">
                        <div className="sh-logo-icon">
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: '1rem' }}>T</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em' }}>TWS ERP</div>
                    </div>

                    <h1 className="sh-heading">
                        Sign In to <span className="sh-accent-text">Portal</span>
                    </h1>

                    {/* Portal selector */}
                    <div className="sh-portal-row">
                        {portals.map((portal) => (
                            <button
                                key={portal.id}
                                type="button"
                                onClick={() => fillDemoCredentials(portal.id)}
                                className={`sh-portal-btn${selectedPortal === portal.id ? ' active' : ''}`}
                            >
                                <portal.icon style={{ width: 18, height: 18 }} />
                                {portal.title}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="sh-error-box">{error}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="sh-input-group">
                            <label className="sh-label">Email</label>
                            <div className="sh-input-wrapper">
                                <UserIcon className="sh-input-icon" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    className="sh-input"
                                />
                            </div>
                        </div>

                        <div className="sh-input-group">
                            <label className="sh-label">Password</label>
                            <div className="sh-input-wrapper">
                                <LockClosedIcon className="sh-input-icon" />
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="sh-input"
                                    style={{ paddingRight: '2.75rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '0.875rem', background: 'none', border: 'none', color: 'var(--sh-login-secondary)', cursor: 'pointer', opacity: 0.6 }}
                                >
                                    {showPassword
                                        ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                                        : <EyeIcon     style={{ width: 16, height: 16 }} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="sh-submit-btn" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In →'}
                        </button>
                    </form>

                    <div className="sh-footer-row">
                        <Link to="/forgot-password" className="sh-footer-link">Forgot password?</Link>
                        <Link to="/software-house-signup" className="sh-footer-link">Create account</Link>
                    </div>
                </div>
            </div>

            {/* Right: Orbital Visualizer */}
            <div className="sh-login-right">
                <div className="sh-visualizer-bg" />
                <div className="sh-grid" />
                <div className="sh-core-container">
                    <div className="sh-core-ring" />
                    <div className="sh-core-ring" />
                    <div className="sh-core-ring" />

                    <div className="sh-status-card" style={{ top: '8%', left: '-18%' }}>
                        <div className="sh-status-label">Auth Protocol</div>
                        <div className="sh-status-value">VERIFIED</div>
                    </div>
                    <div className="sh-status-card" style={{ bottom: '8%', right: '-12%' }}>
                        <div className="sh-status-label">Encryption</div>
                        <div className="sh-status-value">AES-256</div>
                    </div>
                    <div className="sh-status-card" style={{ top: '50%', right: '-28%' }}>
                        <div className="sh-status-label">Session Node</div>
                        <div className="sh-status-value">US-EAST-01</div>
                    </div>

                    <div className="sh-visualizer-icon-wrapper">
                        <CpuChipIcon className="sh-visualizer-icon" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoftwareHouseLogin;
