import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../../app/providers/ThemeContext';
import ThemeToggle from '../../../shared/components/ui/ThemeToggle';
import './SoftwareHouseSignup.css';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  BriefcaseIcon,
  ChartBarIcon,
  UserGroupIcon,
  SquaresPlusIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const ModuleMockup = ({ moduleKey }) => {
  const renderMockup = () => {
    switch (moduleKey) {
      case 'projects':
        return (
          <div className="sh-mockup-board">
            {[1, 2, 3].map(i => (
              <div key={i} className="sh-mockup-card">
                <div className="sh-mockup-card-header" />
                <div className="sh-mockup-card-line" style={{ width: '80%' }} />
                <div className="sh-mockup-card-line" style={{ width: '60%', opacity: 0.5 }} />
                <div className="sh-mockup-progress">
                  <div className="sh-mockup-progress-fill" style={{ width: `${i * 30}%` }} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'hr':
        return (
          <div className="sh-mockup-list">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="sh-mockup-list-item">
                <div className="sh-mockup-avatar" />
                <div className="sh-mockup-item-text">
                  <div className="sh-mockup-card-line" style={{ width: '40%', marginBottom: '4px' }} />
                  <div className="sh-mockup-card-line" style={{ width: '25%', opacity: 0.5 }} />
                </div>
                <div className="sh-mockup-status-dot" />
              </div>
            ))}
          </div>
        );
      case 'finance':
        return (
          <div className="sh-mockup-chart">
            <div className="sh-mockup-chart-bars">
              {[40, 70, 45, 90, 65, 80].map((h, i) => (
                <div key={i} className="sh-mockup-chart-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="sh-mockup-chart-labels">
              <div className="sh-mockup-card-line" style={{ width: '100%', height: '2px', opacity: 0.1 }} />
            </div>
          </div>
        );
      case 'workspace':
        return (
          <div className="sh-mockup-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <div key={i} className="sh-mockup-grid-tile">
                <div className="sh-mockup-tile-icon" />
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`sh-module-mockup sh-mockup-${moduleKey}`}>
      {renderMockup()}
    </div>
  );
};

const SoftwareHouseSignup = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationSlug: ''
  });
  const slugCheckTimeoutRef = useRef(null);

  const showcaseModules = [
    {
      key: 'projects',
      title: 'Projects. Tasks. Clients.',
      description:
        'Unified command center for your software house. Manage sprints, approvals, and resources in one place.'
    },
    {
      key: 'hr',
      title: 'HR & Attendance.',
      description:
        'Track time, shifts, and teams across remote and on-site squads with one connected attendance layer.'
    },
    {
      key: 'finance',
      title: 'Billing & Finance.',
      description:
        'Invoice clients, track project profitability, and sync with your finance stack without leaving the workspace.'
    },
    {
      key: 'workspace',
      title: 'One Workspace. All Modules.',
      description:
        'Spin up a workspace where delivery, people, and finance data live together—not in silos.'
    }
  ];

  useEffect(() => {
    if (showcaseModules.length <= 1) return;
    const id = setInterval(() => {
      setActiveModuleIndex(prev => (prev + 1) % showcaseModules.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'organizationName') {
        const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        next.organizationSlug = slug;
      }
      return next;
    });
    if (error) setError('');
    if (name === 'organizationName') {
      const slug = (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (slug.length >= 3) checkSlugAvailability(slug);
      else setSlugAvailable(null);
    }
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, organizationSlug: slug }));
    if (slug.length >= 3) {
      if (slugCheckTimeoutRef.current) clearTimeout(slugCheckTimeoutRef.current);
      slugCheckTimeoutRef.current = setTimeout(() => checkSlugAvailability(slug), 400);
    } else {
      if (slugCheckTimeoutRef.current) clearTimeout(slugCheckTimeoutRef.current);
      setSlugAvailable(null);
    }
  };

  const checkSlugAvailability = async (slug) => {
    if (slug.length < 3) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    try {
      const response = await axios.get(`/api/signup/check-slug-availability?slug=${slug}`);
      if (response.data.success) setSlugAvailable(response.data.data.available);
    } catch (err) {
      if (err.response?.status !== 429) console.error(err);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/api/signup/software-house/complete', {
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        organizationName: formData.organizationName,
        organizationSlug: formData.organizationSlug
      });
      if (response.data.success) {
        setSuccess(true);
        toast.success('Account and workspace created!');
        setTimeout(() => navigate('/software-house-login'), 2000);
      } else {
        setError(response.data.message || 'Signup failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };


  const activeModule = showcaseModules[activeModuleIndex];

  const rightPanel = (
    <div className="sh-signup-right">
      <div key={activeModule.key} className="sh-showcase-card sh-animate-fade-up">
        <ModuleMockup moduleKey={activeModule.key} />
        <h3 className="sh-showcase-title">{activeModule.title}</h3>
        <p className="sh-showcase-desc">{activeModule.description}</p>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className={`sh-signup-container ${!isDarkMode ? 'day-mode' : ''}`}>
        <div className="sh-signup-left">
          <div className="sh-signup-wrapper">
            <div className="sh-success-wrapper sh-animate-fade-up">
              <CheckCircleIcon className="sh-success-icon" />
              <h2 className="sh-signup-heading">Command Center Ready</h2>
              <p className="sh-signup-subtext" style={{ marginBottom: '2rem' }}>Your workspace has been initialized. Redirecting to login...</p>
              <button onClick={() => navigate('/software-house-login')} className="sh-signup-submit-btn" style={{ background: '#fff', color: '#000' }}>
                Go to Login
              </button>
            </div>
          </div>
        </div>
        {rightPanel}
      </div>
    );
  }

  return (
    <div className={`sh-signup-container ${!isDarkMode ? 'day-mode' : ''}`}>
      <div className="sh-day-mode-toggle">
        <ThemeToggle size="md" shortcut={true} />
      </div>

      <div className="sh-signup-left">
        <div className="sh-signup-wrapper">
          <h1 className="sh-signup-heading">Forge your <span style={{ color: '#06B6D4' }}>Empire.</span></h1>
          <p className="sh-signup-subtext">Initialize your software house's operating system in seconds.</p>

          {error && <div className="sh-signup-error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="sh-signup-form-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Full Name *</label>
                <div className="sh-signup-input-wrap">
                  <UserIcon className="sh-signup-icon" />
                  <input name="fullName" placeholder="Elon Musk" value={formData.fullName} onChange={handleChange} required className="sh-signup-input" />
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Work Email *</label>
                <div className="sh-signup-input-wrap">
                  <EnvelopeIcon className="sh-signup-icon" />
                  <input name="email" type="email" placeholder="elon@spacex.com" value={formData.email} onChange={handleChange} required className="sh-signup-input" />
                </div>
              </div>
            </div>

            <div className="sh-signup-form-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Password *</label>
                <div className="sh-signup-input-wrap">
                  <LockClosedIcon className="sh-signup-icon" />
                  <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={handleChange} required className="sh-signup-input" style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8BA8', cursor: 'pointer', zIndex: 10 }}>
                    {showPassword ? <EyeSlashIcon style={{ width: 18, height: 18 }} /> : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Confirm Password *</label>
                <div className="sh-signup-input-wrap">
                  <LockClosedIcon className="sh-signup-icon" />
                  <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required className="sh-signup-input" style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8BA8', cursor: 'pointer', zIndex: 10 }}>
                    {showConfirmPassword ? <EyeSlashIcon style={{ width: 18, height: 18 }} /> : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="sh-signup-label">Organization Name *</label>
              <div className="sh-signup-input-wrap">
                <BuildingOfficeIcon className="sh-signup-icon" />
                <input name="organizationName" placeholder="Acme Industries" value={formData.organizationName} onChange={handleChange} required className="sh-signup-input" />
              </div>
            </div>

            <div>
              <label className="sh-signup-label">Workspace URL *</label>
              <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
                <input name="organizationSlug" value={formData.organizationSlug} onChange={handleSlugChange} required placeholder="acme" className="sh-signup-input" style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                <div className="sh-signup-input-suffix">.tws.com</div>
              </div>
              <div style={{ fontSize: '0.75rem', minHeight: 20, marginBottom: '1rem' }}>
                {checkingSlug && <span style={{ color: '#8B8BA8' }}>Checking URL...</span>}
                {!checkingSlug && slugAvailable === true && <span style={{ color: '#06B6D4' }}><CheckCircleIcon style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} /> URL Available</span>}
                {!checkingSlug && slugAvailable === false && <span style={{ color: '#ef4444' }}><ExclamationTriangleIcon style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} /> URL Taken</span>}
              </div>
            </div>

            <button type="submit" disabled={loading || slugAvailable === false} className="sh-signup-submit-btn">
              {loading ? 'Processing Workspace...' : 'Initialize Organization'}
            </button>
          </form>

          <div className="sh-signup-footer">
            <p style={{ marginBottom: '1rem' }}>© 2026 The Wolf Stack / Auth.Layer.01</p>
            <Link to="/software-house-login" className="sh-signup-link">Already have an account? Login</Link>
          </div>
        </div>
      </div>
      {rightPanel}
    </div>
  );
};

export default SoftwareHouseSignup;
