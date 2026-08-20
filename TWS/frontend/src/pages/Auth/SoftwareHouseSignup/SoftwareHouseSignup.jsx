import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../../app/providers/ThemeContext';
import { AuthMarketingNav } from '../../../marketing/components/MarketingShell';
import SoftwareHouseFooter from '../../../features/auth/components/SoftwareHouseFooter';
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
import { getTenantSubdomainUrl, navigateTo, BASE_DOMAIN } from '../../../shared/utils/subdomain';

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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
  const fullNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const orgNameInputRef = useRef(null);
  const orgSlugInputRef = useRef(null);
  const errorBoxRef = useRef(null);
  const otpInputRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Sign up | HousesBase';
    return () => {
      document.title = previousTitle;
    };
  }, []);

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

  useEffect(() => {
    if (error && errorBoxRef.current) {
      errorBoxRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timeoutId = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timeoutId);
  }, [resendCooldown]);

  useEffect(() => {
    if (otpStep && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpStep]);

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
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
    const nextFieldErrors = {};
    const trimmedFullName = String(formData.fullName || '').trim();
    const trimmedEmail = String(formData.email || '').trim();
    const trimmedPassword = String(formData.password || '').trim();
    const trimmedConfirmPassword = String(formData.confirmPassword || '').trim();
    const trimmedOrgName = String(formData.organizationName || '').trim();
    const trimmedOrgSlug = String(formData.organizationSlug || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const slugPattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
    const hasLower = /[a-z]/.test(trimmedPassword);
    const hasUpper = /[A-Z]/.test(trimmedPassword);
    const hasDigit = /\d/.test(trimmedPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(trimmedPassword);

    if (!trimmedFullName) nextFieldErrors.fullName = 'Full name is required.';
    else if (trimmedFullName.length < 2) nextFieldErrors.fullName = 'Full name must be at least 2 characters.';
    if (!trimmedEmail) nextFieldErrors.email = 'Work email is required.';
    else if (!emailPattern.test(trimmedEmail)) nextFieldErrors.email = 'Enter a valid work email address.';
    if (!trimmedPassword) nextFieldErrors.password = 'Password is required.';
    else if (trimmedPassword.length < 8 || !hasLower || !hasUpper || !hasDigit || !hasSpecial) {
      nextFieldErrors.password = 'Use 8+ chars with upper, lower, number, and symbol.';
    }
    if (!trimmedConfirmPassword) nextFieldErrors.confirmPassword = 'Confirm password is required.';
    if (!trimmedOrgName) nextFieldErrors.organizationName = 'Organization name is required.';
    if (!trimmedOrgSlug) nextFieldErrors.organizationSlug = 'Workspace URL is required.';
    else if (!slugPattern.test(trimmedOrgSlug)) {
      nextFieldErrors.organizationSlug = 'Workspace URL must be 3-63 chars, lowercase letters, numbers, and hyphens.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please complete all required fields.');
      if (nextFieldErrors.fullName && fullNameInputRef.current) fullNameInputRef.current.focus();
      else if (nextFieldErrors.email && emailInputRef.current) emailInputRef.current.focus();
      else if (nextFieldErrors.password && passwordInputRef.current) passwordInputRef.current.focus();
      else if (nextFieldErrors.confirmPassword && confirmPasswordInputRef.current) confirmPasswordInputRef.current.focus();
      else if (nextFieldErrors.organizationName && orgNameInputRef.current) orgNameInputRef.current.focus();
      else if (nextFieldErrors.organizationSlug && orgSlugInputRef.current) orgSlugInputRef.current.focus();
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      setError('Please fix the highlighted fields.');
      if (confirmPasswordInputRef.current) confirmPasswordInputRef.current.focus();
      return;
    }

    if (slugAvailable === false) {
      setFieldErrors((prev) => ({ ...prev, organizationSlug: 'Workspace URL is already taken.' }));
      setError('Please choose a different workspace URL.');
      if (orgSlugInputRef.current) orgSlugInputRef.current.focus();
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const response = await axios.post('/api/signup/software-house/request-otp', {
        email: trimmedEmail,
        fullName: trimmedFullName
      });
      if (response.data.success) {
        setOtpStep(true);
        toast.success('Verification code sent! Check your email.');
      } else {
        setError(response.data.message || 'Signup failed.');
      }
    } catch (err) {
      const rawError = String(err.response?.data?.message || err.message || '').trim();
      const safeMessage = /too many|rate limit/i.test(rawError)
        ? 'Too many signup attempts. Please wait and try again.'
        : /already exists/i.test(rawError)
          ? rawError
          : /network|failed to fetch|connection|timeout/i.test(rawError)
            ? 'Network issue detected. Please check your connection and retry.'
            : (rawError || 'Signup failed.');
      setError(safeMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setOtpError('');
    const trimmedOtp = String(otp || '').trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    try {
      const response = await axios.post('/api/signup/software-house/complete', {
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        organizationName: formData.organizationName.trim(),
        organizationSlug: formData.organizationSlug.trim(),
        otp: trimmedOtp
      });
      if (response.data.success) {
        setSuccess(true);
        toast.success('Account and workspace created!');
        const slug = formData.organizationSlug.trim();
        setTimeout(() => {
          const loginUrl = getTenantSubdomainUrl(slug, '/login');
          navigateTo(loginUrl, (path) => navigate(path, { state: { signupSuccess: true, email: formData.email } }));
        }, 1800);
      } else {
        setOtpError(response.data.message || 'Verification failed.');
      }
    } catch (err) {
      const status = err.response?.status;
      const rawError = String(err.response?.data?.message || err.message || '').trim();
      const safeMessage = status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : /network|failed to fetch|connection|timeout/i.test(rawError)
          ? 'Network issue detected. Please check your connection and retry.'
          : (rawError || 'Verification failed. Please try again.');
      setOtpError(safeMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setOtpError('');
    try {
      const response = await axios.post('/api/signup/resend-otp', { email: formData.email.trim() });
      if (response.data.success) {
        toast.success('A new code has been sent.');
        setResendCooldown(60);
      }
    } catch (err) {
      const status = err.response?.status;
      const retryAfter = Number(err.response?.headers?.['retry-after']) || Number(err.response?.data?.retryAfter);
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
      if (status === 429) {
        setOtpError(`Too many attempts. Try again in ${wait}s.`);
        setResendCooldown(wait);
      } else {
        setOtpError(String(err.response?.data?.message || 'Could not resend code. Please try again.'));
      }
    } finally {
      setResending(false);
    }
  };

  const handleEditDetails = () => {
    setOtpStep(false);
    setOtp('');
    setOtpError('');
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
        <AuthMarketingNav />
        <div className="sh-signup-left">
          <div className="sh-signup-wrapper">
            <div className="sh-success-wrapper sh-animate-fade-up">
              <CheckCircleIcon className="sh-success-icon" />
              <h2 className="sh-signup-heading">Command Center Ready</h2>
              <p className="sh-signup-subtext" style={{ marginBottom: '2rem' }}>Your workspace has been initialized. Redirecting to login...</p>
              <button onClick={() => navigate('/login')} className="sh-signup-submit-btn">
                Go to Login
              </button>
            </div>
          </div>
        </div>
        {rightPanel}
      </div>
    );
  }

  if (otpStep) {
    return (
      <div className={`sh-signup-container ${!isDarkMode ? 'day-mode' : ''}`}>
        <AuthMarketingNav />
        <div className="sh-signup-left">
          <div className="sh-signup-wrapper">
            <h1 className="sh-signup-heading">Check your <span style={{ color: 'var(--sh-signup-accent)' }}>inbox.</span></h1>
            <p className="sh-signup-subtext">
              We sent a 6-digit code to <strong>{formData.email}</strong>. Enter it below to finish creating your workspace.
            </p>

            {otpError && (
              <div
                id="sh-otp-form-error"
                className="sh-signup-error-box"
                role="alert"
                aria-live="assertive"
              >
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerify}>
              <div>
                <label className="sh-signup-label">Verification Code *</label>
                <div className="sh-signup-input-wrap">
                  <input
                    ref={otpInputRef}
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="sh-signup-input"
                    style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.25rem' }}
                    aria-invalid={Boolean(otpError)}
                    aria-describedby={otpError ? 'sh-otp-form-error' : undefined}
                  />
                </div>
              </div>

              <button type="submit" disabled={verifying || otp.length !== 6} className="sh-signup-submit-btn">
                {verifying ? 'Verifying...' : 'Verify & Create Workspace'}
              </button>
            </form>

            <SoftwareHouseFooter compact moduleName="Create workspace">
              <div className="sh-signup-footer">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="sh-signup-link"
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: (resending || resendCooldown > 0) ? 'default' : 'pointer' }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : (resending ? 'Sending...' : 'Resend code')}
              </button>
              <p style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleEditDetails}
                  className="sh-signup-link"
                  style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
                >
                  Use a different email
                </button>
              </p>
              </div>
            </SoftwareHouseFooter>
          </div>
        </div>
        {rightPanel}
      </div>
    );
  }

  return (
    <div className={`sh-signup-container ${!isDarkMode ? 'day-mode' : ''}`}>
      <AuthMarketingNav />

      <div className="sh-signup-left">
        <div className="sh-signup-wrapper">
          <h1 className="sh-signup-heading">Forge your <span style={{ color: 'var(--sh-signup-accent)' }}>Empire.</span></h1>
          <p className="sh-signup-subtext">Initialize your software house's operating system in seconds.</p>

          {error && (
            <div
              id="sh-signup-form-error"
              className="sh-signup-error-box"
              role="alert"
              aria-live="assertive"
              tabIndex="-1"
              ref={errorBoxRef}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="sh-signup-form-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Full Name *</label>
                <div className="sh-signup-input-wrap">
                  <UserIcon className="sh-signup-icon" />
                  <input ref={fullNameInputRef} name="fullName" placeholder="Elon Musk" value={formData.fullName} onChange={handleChange} required className="sh-signup-input" aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={[fieldErrors.fullName ? 'sh-signup-fullname-error' : '', error ? 'sh-signup-form-error' : ''].filter(Boolean).join(' ') || undefined} />
                </div>
                {fieldErrors.fullName && <div id="sh-signup-fullname-error" className="sh-signup-field-error">{fieldErrors.fullName}</div>}
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Work Email *</label>
                <div className="sh-signup-input-wrap">
                  <EnvelopeIcon className="sh-signup-icon" />
                  <input ref={emailInputRef} name="email" type="email" placeholder="elon@spacex.com" value={formData.email} onChange={handleChange} required className="sh-signup-input" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={[fieldErrors.email ? 'sh-signup-email-error' : '', error ? 'sh-signup-form-error' : ''].filter(Boolean).join(' ') || undefined} />
                </div>
                {fieldErrors.email && <div id="sh-signup-email-error" className="sh-signup-field-error">{fieldErrors.email}</div>}
              </div>
            </div>

            <div className="sh-signup-form-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Password *</label>
                <div className="sh-signup-input-wrap">
                  <LockClosedIcon className="sh-signup-icon" />
                  <input ref={passwordInputRef} name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={handleChange} required className="sh-signup-input" style={{ paddingRight: '3rem' }} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={[fieldErrors.password ? 'sh-signup-password-error' : '', error ? 'sh-signup-form-error' : ''].filter(Boolean).join(' ') || undefined} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sh-signup-secondary)', cursor: 'pointer', zIndex: 10 }} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeSlashIcon style={{ width: 18, height: 18 }} /> : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                {fieldErrors.password && <div id="sh-signup-password-error" className="sh-signup-field-error">{fieldErrors.password}</div>}
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label className="sh-signup-label">Confirm Password *</label>
                <div className="sh-signup-input-wrap">
                  <LockClosedIcon className="sh-signup-icon" />
                  <input ref={confirmPasswordInputRef} name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required className="sh-signup-input" style={{ paddingRight: '3rem' }} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={[fieldErrors.confirmPassword ? 'sh-signup-confirm-password-error' : '', error ? 'sh-signup-form-error' : ''].filter(Boolean).join(' ') || undefined} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sh-signup-secondary)', cursor: 'pointer', zIndex: 10 }} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword}>
                    {showConfirmPassword ? <EyeSlashIcon style={{ width: 18, height: 18 }} /> : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <div id="sh-signup-confirm-password-error" className="sh-signup-field-error">{fieldErrors.confirmPassword}</div>}
              </div>
            </div>

            <div>
              <label className="sh-signup-label">Organization Name *</label>
              <div className="sh-signup-input-wrap">
                <BuildingOfficeIcon className="sh-signup-icon" />
                <input ref={orgNameInputRef} name="organizationName" placeholder="Acme Industries" value={formData.organizationName} onChange={handleChange} required className="sh-signup-input" aria-invalid={Boolean(fieldErrors.organizationName)} aria-describedby={[fieldErrors.organizationName ? 'sh-signup-org-name-error' : '', error ? 'sh-signup-form-error' : ''].filter(Boolean).join(' ') || undefined} />
              </div>
              {fieldErrors.organizationName && <div id="sh-signup-org-name-error" className="sh-signup-field-error">{fieldErrors.organizationName}</div>}
            </div>

            <div>
              <label className="sh-signup-label">Workspace URL *</label>
              <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
                <input ref={orgSlugInputRef} name="organizationSlug" value={formData.organizationSlug} onChange={handleSlugChange} required placeholder="acme" className="sh-signup-input" style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} aria-invalid={Boolean(fieldErrors.organizationSlug)} aria-describedby={[fieldErrors.organizationSlug ? 'sh-signup-org-slug-error' : '', error ? 'sh-signup-form-error' : ''].filter(Boolean).join(' ') || undefined} />
                <div className="sh-signup-input-suffix">.{BASE_DOMAIN}</div>
              </div>
              {fieldErrors.organizationSlug && <div id="sh-signup-org-slug-error" className="sh-signup-field-error">{fieldErrors.organizationSlug}</div>}
              <div style={{ fontSize: '0.75rem', minHeight: 20, marginBottom: '1rem' }}>
                {checkingSlug && <span style={{ color: 'var(--sh-signup-secondary)' }}>Checking URL...</span>}
                {!checkingSlug && slugAvailable === true && <span style={{ color: 'var(--sh-signup-accent)' }}><CheckCircleIcon style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} /> URL Available</span>}
                {!checkingSlug && slugAvailable === false && <span style={{ color: 'var(--sh-signup-caution)' }}><ExclamationTriangleIcon style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} /> URL Taken</span>}
              </div>
            </div>

            <button type="submit" disabled={loading || slugAvailable === false} className="sh-signup-submit-btn">
              {loading ? 'Sending Code...' : 'Continue'}
            </button>
          </form>

          <SoftwareHouseFooter compact moduleName="Create workspace">
            <Link to="/login" className="sh-signup-link">Already have an account? Sign in</Link>
          </SoftwareHouseFooter>
        </div>
      </div>
      {rightPanel}
    </div>
  );
};

export default SoftwareHouseSignup;
