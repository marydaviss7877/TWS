import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../app/providers/ThemeContext';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';
import { BASE_DOMAIN } from '../../../shared/utils/subdomain';
import './FindWorkspace.css';

const FindWorkspace = () => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const emailInputRef = useRef(null);
  const errorBoxRef = useRef(null);
  const successBoxRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Find Your Workspace | HouseBase';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (error && errorBoxRef.current) errorBoxRef.current.focus();
  }, [error]);

  useEffect(() => {
    if (message && successBoxRef.current) successBoxRef.current.focus();
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = String(email || '').trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      setMessage('');
      if (emailInputRef.current) emailInputRef.current.focus();
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post('/api/auth/find-workspace', { email: trimmedEmail });
      setMessage(response.data?.message || 'We found your workspace. Check your email for the link.');
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        const retryAfter = err.response?.headers?.['retry-after'];
        setError(retryAfter
          ? `Too many attempts. Please try again in ${retryAfter}s.`
          : 'Too many attempts. Please wait a few minutes before trying again.');
      } else if (status === 404) {
        setError(err.response?.data?.message || 'No account found for that email address.');
      } else {
        setError(err.response?.data?.message || 'Unable to process your request right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`sh-workspace-container${!isDarkMode ? ' day-mode' : ''}`}>
      <SoftwareHouseNavbar isDarkMode={isDarkMode} />

      <div className="sh-workspace-card">
        <h1 className="sh-workspace-title">Find your workspace</h1>
        <p className="sh-workspace-subtitle">Enter your work email and we'll send you the link to your organization's workspace.</p>

        {error && <div id="sh-workspace-error" className="sh-workspace-error" role="alert" aria-live="assertive" tabIndex="-1" ref={errorBoxRef}>{error}</div>}
        {message && <div id="sh-workspace-success" className="sh-workspace-success" role="status" aria-live="polite" tabIndex="-1" ref={successBoxRef}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <label className="sh-workspace-label" htmlFor="workspace-email">Work Email</label>
          <div className="sh-workspace-input-wrap">
            <EnvelopeIcon className="sh-workspace-icon" />
            <input
              ref={emailInputRef}
              id="workspace-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="sh-workspace-input"
              required
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={[error ? 'sh-workspace-error' : '', message ? 'sh-workspace-success' : ''].filter(Boolean).join(' ') || undefined}
            />
          </div>

          <button type="submit" disabled={loading} className="sh-workspace-submit">
            {loading ? 'Sending...' : 'Send me my workspace link'}
          </button>
        </form>

        <div className="sh-workspace-footer sh-workspace-admin-hint">
          Software House Admin? <a href={`https://admin.${BASE_DOMAIN}/login`}>Sign in here</a>
        </div>
      </div>
    </div>
  );
};

export default FindWorkspace;
