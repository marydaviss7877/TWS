import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../app/providers/ThemeContext';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';
import './SoftwareHouseForgotPassword.css';

const SoftwareHouseForgotPassword = () => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const emailInputRef = useRef(null);
  const errorBoxRef = useRef(null);
  const successBoxRef = useRef(null);

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
      const response = await axios.post('/api/auth/forgot-password', { email: trimmedEmail });
      setMessage(response.data?.message || 'If the account exists, a reset email has been sent.');
    } catch (err) {
      const fallback = 'Unable to process your request right now. Please try again.';
      setError(err.response?.data?.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`sh-forgot-container${!isDarkMode ? ' day-mode' : ''}`}>
      <SoftwareHouseNavbar isDarkMode={isDarkMode} />

      <div className="sh-forgot-card">
        <h1 className="sh-forgot-title">Reset your password</h1>
        <p className="sh-forgot-subtitle">Enter your work email to receive reset instructions.</p>

        {error && <div id="sh-forgot-error" className="sh-forgot-error" role="alert" aria-live="assertive" tabIndex="-1" ref={errorBoxRef}>{error}</div>}
        {message && <div id="sh-forgot-success" className="sh-forgot-success" role="status" aria-live="polite" tabIndex="-1" ref={successBoxRef}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <label className="sh-forgot-label" htmlFor="forgot-email">Work Email</label>
          <div className="sh-forgot-input-wrap">
            <EnvelopeIcon className="sh-forgot-icon" />
            <input
              ref={emailInputRef}
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="sh-forgot-input"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={[error ? 'sh-forgot-error' : '', message ? 'sh-forgot-success' : ''].filter(Boolean).join(' ') || undefined}
            />
          </div>

          <button type="submit" disabled={loading} className="sh-forgot-submit">
            {loading ? 'Sending...' : 'Send reset instructions'}
          </button>
        </form>

        <div className="sh-forgot-footer">
          <Link to="/software-house-login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default SoftwareHouseForgotPassword;
