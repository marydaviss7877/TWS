import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { useTheme } from '../../../app/providers/ThemeContext';
import ThemeToggle from '../../../shared/components/ui/ThemeToggle';
import toast from 'react-hot-toast';
import './SupraAdminLogin.css';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  ServerStackIcon,
  CircleStackIcon,
  UsersIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

const SupraAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { loginSupraAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await loginSupraAdmin(email, password);
      if (result.success) {
        toast.success('Access Granted. Welcome back.');
        navigate('/supra-admin');
      } else {
        setError(result.error || 'Identity Verification Failed.');
        toast.error(result.error || 'Login failed');
      }
    } catch {
      setError('System Communication Error.');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`supra-login-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="supra-theme-toggle">
        <ThemeToggle size="md" shortcut={true} />
      </div>

      {/* ── Left: Form ── */}
      <div className="supra-login-left">
        <div className="supra-form-wrapper">
          {/* Brand */}
          <div className="supra-logo-area">
            <div className="supra-logo-icon">
              <ShieldCheckIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em', lineHeight: 1 }}>
                The WolfStack
              </div>
              <div style={{ fontSize: '0.62rem', opacity: 0.5, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '2px' }}>
                Platform Admin
              </div>
            </div>
          </div>

          <h1 className="supra-heading">
            Admin <span className="supra-accent-text">Portal</span>
          </h1>
          <p style={{ fontSize: '0.82rem', opacity: 0.5, marginBottom: '1.75rem', marginTop: '-0.5rem' }}>
            Restricted access — authorized personnel only.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="supra-input-group">
              <label className="supra-label">Email Address</label>
              <div className="supra-input-wrapper">
                <EnvelopeIcon className="supra-input-icon" />
                <input
                  type="email"
                  className="supra-input"
                  placeholder="admin@tws.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="supra-input-group">
              <label className="supra-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Password</label>
              <div className="supra-input-wrapper">
                <LockClosedIcon className="supra-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="supra-input"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer' }}
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button type="submit" className="supra-submit-btn" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'SIGN IN TO ADMIN PORTAL →'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.68rem', opacity: 0.35, display: 'flex', justifyContent: 'space-between' }}>
            <div>© 2025 The WolfStack</div>
            <div>v1.0 · Secure Session</div>
          </div>
        </div>
      </div>

      {/* ── Right: Brand Panel ── */}
      <div className="supra-login-right">
        <div className="supra-right-inner">
          {/* Big brand */}
          <div className="supra-brand-block">
            <div className="supra-brand-icon">
              <ShieldCheckIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="supra-brand-name">The WolfStack</h2>
            <p className="supra-brand-tagline">Enterprise Platform · Built for Scale</p>
          </div>

          {/* Stats */}
          <div className="supra-stats-row">
            <div className="supra-stat-card supra-stat-pulse">
              <ServerStackIcon className="supra-stat-icon" />
              <div className="supra-stat-value">99.9%</div>
              <div className="supra-stat-label">Uptime</div>
            </div>
            <div className="supra-stat-card">
              <CircleStackIcon className="supra-stat-icon" />
              <div className="supra-stat-value">256-bit</div>
              <div className="supra-stat-label">Encrypted</div>
            </div>
            <div className="supra-stat-card">
              <UsersIcon className="supra-stat-icon" />
              <div className="supra-stat-value">Multi</div>
              <div className="supra-stat-label">Tenant</div>
            </div>
            <div className="supra-stat-card">
              <BuildingOffice2Icon className="supra-stat-icon" />
              <div className="supra-stat-value">ERP</div>
              <div className="supra-stat-label">Platform</div>
            </div>
          </div>

          {/* Features */}
          <div className="supra-features-list">
            {[
              'Multi-tenant organization management',
              'Role-based access control (RBAC)',
              'Real-time system monitoring',
              'Billing & subscription management',
              'Audit logs & compliance reporting',
            ].map((f, i) => (
              <div key={i} className="supra-feature-item">
                <span className="supra-feature-dot" />
                {f}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="supra-right-footer">
            <span className="supra-live-dot" /> SYSTEM ONLINE
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupraAdminLogin;
