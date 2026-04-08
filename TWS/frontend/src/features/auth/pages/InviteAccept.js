import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XMarkIcon, KeyIcon } from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../shared/services/tenant/tenant-api.service';

const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | valid | error | done
  const [inviteInfo, setInviteInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No invitation token found in the URL.'); return; }

    // Validate token with the server (public endpoint — no tenant slug needed)
    fetch(`/api/auth/invite/accept?token=${encodeURIComponent(token)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success) { setInviteInfo(json.data); setStatus('valid'); }
        else { setStatus('error'); setErrorMsg(json.message || 'Invalid or expired invitation link.'); }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Could not reach the server. Please try again.'); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErrorMsg('Passwords do not match.'); return; }
    setSubmitting(true); setErrorMsg('');
    try {
      await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password })
      }).then(r => r.json()).then(json => {
        if (!json.success) throw new Error(json.message || 'Activation failed');
      });
      setStatus('done');
    } catch (ex) {
      setErrorMsg(ex.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">TWS Portal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accept your invitation</p>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            <p className="text-gray-500 dark:text-gray-400">Validating your invite link…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <XMarkIcon className="w-12 h-12 text-red-500" />
            <p className="font-bold text-red-700 dark:text-red-400">{errorMsg}</p>
            <button onClick={() => navigate('/software-house-login')}
              className="mt-2 px-6 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700">
              Go to Login
            </button>
          </div>
        )}

        {status === 'valid' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300">
              <p>Hi <strong>{inviteInfo?.fullName || inviteInfo?.email}</strong>,</p>
              <p className="mt-1">You've been invited as <strong>{inviteInfo?.role || 'employee'}</strong>. Set a password to activate your account.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Repeat your password" autoComplete="new-password" />
              </div>
            </div>
            {errorMsg && <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>}
            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-base hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Activating…' : 'Activate Account'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircleIcon className="w-14 h-14 text-green-500" />
            <p className="font-bold text-xl text-gray-900 dark:text-white">Account Activated!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">You can now log in with your email and new password.</p>
            <button onClick={() => navigate('/software-house-login')}
              className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold hover:opacity-90">
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteAccept;
