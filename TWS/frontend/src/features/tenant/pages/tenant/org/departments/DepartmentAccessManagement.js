/**
 * Tenant-admin Department Access (Plan Phase 1).
 * List, grant, revoke, suspend department access with optional expiry.
 */
import React, { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  TrashIcon,
  NoSymbolIcon,
  BuildingOfficeIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import tenantProjectApiService from '../projects/services/tenantProjectApiService';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const API = (tenantSlug, path = '') => `/api/tenant/${tenantSlug}/department-access${path}`;

export default function DepartmentAccessManagement() {
  const tenantSlug = useTenantSlug();
  const [list, setList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantDepartmentId, setGrantDepartmentId] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editExpiryId, setEditExpiryId] = useState(null);
  const [editExpiryValue, setEditExpiryValue] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);

  const fetchList = async () => {
    try {
      const res = await fetch(API(tenantSlug), { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) setList(json.data);
      else setList([]);
    } catch (e) {
      setList([]);
      toast.error('Failed to load department access');
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      const arr = Array.isArray(data) ? data : (data?.data || data?.departments || []);
      setDepartments(arr);
    } catch {
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      // Reuse tenantApiService so the shape matches UserList and other screens
      const data = await tenantApiService.getUsers(tenantSlug, { page: 1, limit: 200, status: 'active' });
      const arr = data?.users || data?.data?.users || [];
      setUsers(Array.isArray(arr) ? arr : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchList(), fetchDepartments(), fetchUsers()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantUserId || !grantDepartmentId) {
      toast.error('Select user and department');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API(tenantSlug), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: grantUserId,
          departmentId: grantDepartmentId,
          permissions: ['read'],
          accessLevel: 'viewer',
          ...(grantExpiresAt && { expiresAt: new Date(grantExpiresAt).toISOString() })
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Access granted');
        setGrantOpen(false);
        setGrantUserId('');
        setGrantDepartmentId('');
        setGrantExpiresAt('');
        fetchList();
      } else {
        toast.error(json.message || 'Failed to grant access');
      }
    } catch {
      toast.error('Failed to grant access');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this department access?')) return;
    try {
      const res = await fetch(API(tenantSlug, `/${id}/revoke`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Access revoked');
        fetchList();
      } else toast.error(json.message || 'Failed to revoke');
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleSuspend = async (id) => {
    if (!window.confirm('Suspend this department access?')) return;
    try {
      const res = await fetch(API(tenantSlug, `/${id}/suspend`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Access suspended');
        fetchList();
      } else toast.error(json.message || 'Failed to suspend');
    } catch {
      toast.error('Failed to suspend');
    }
  };

  const openEditExpiry = (row) => {
    setEditExpiryId(row._id);
    if (row.expiresAt) {
      const d = new Date(row.expiresAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setEditExpiryValue(`${y}-${m}-${day}T${h}:${min}`);
    } else {
      setEditExpiryValue('');
    }
  };

  const handleSaveExpiry = async () => {
    if (editExpiryId == null) return;
    setSavingExpiry(true);
    try {
      const res = await fetch(API(tenantSlug, `/${editExpiryId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresAt: editExpiryValue ? new Date(editExpiryValue).toISOString() : null
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Expiry updated');
        setEditExpiryId(null);
        setEditExpiryValue('');
        fetchList();
      } else toast.error(json.message || 'Failed to update expiry');
    } catch {
      toast.error('Failed to update expiry');
    } finally {
      setSavingExpiry(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading department access..." className="min-h-[40vh] bg-transparent" />;
  }

  return (
    <div className="px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BuildingOfficeIcon className="w-6 h-6" />
          Department Access
        </h1>
        <button
          type="button"
          onClick={() => setGrantOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <UserPlusIcon className="w-5 h-5" />
          Grant access
        </button>
      </div>

      {grantOpen && (
        <form onSubmit={handleGrant} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Grant department access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">User</label>
              <select
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">Select user</option>
                {users.map((u) => {
                  const id = u._id || u.id;
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {u.fullName || u.email}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Department</label>
              <select
                value={grantDepartmentId}
                onChange={(e) => setGrantDepartmentId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Expires (optional)</label>
              <input
                type="datetime-local"
                value={grantExpiresAt}
                onChange={(e) => setGrantExpiresAt(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Granting...' : 'Grant'}
            </button>
            <button type="button" onClick={() => setGrantOpen(false)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {editExpiryId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditExpiryId(null)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-gray-900 mb-3">Edit expiry</h3>
            <input
              type="datetime-local"
              value={editExpiryValue}
              onChange={(e) => setEditExpiryValue(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
            />
            <p className="text-xs text-gray-500 mb-3">Leave empty to clear expiry (no expiration).</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveExpiry}
                disabled={savingExpiry}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingExpiry ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditExpiryId(null); setEditExpiryValue(''); }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <EmptyState
                    title="No department access records"
                    message="Grant access to assign users to departments."
                    className="max-w-lg mx-auto"
                  />
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-2">
                    <span className="font-medium text-gray-900">
                      {row.userId?.fullName || row.userId?.email || row.userId || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {row.departmentId?.name || row.department || '—'}
                  </td>
                  <td className="px-4 py-2">{row.accessLevel || 'viewer'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      row.status === 'active' ? 'bg-green-100 text-green-800' :
                      row.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                      row.status === 'revoked' || row.status === 'expired' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditExpiry(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        title="Change expiry"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Expiry
                      </button>
                      {row.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSuspend(row._id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-amber-600 hover:bg-amber-50 rounded"
                            title="Suspend this department access"
                          >
                            <NoSymbolIcon className="w-4 h-4" />
                            Suspend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(row._id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                            title="Revoke"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Revoke
                          </button>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
