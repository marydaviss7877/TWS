import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../../shared/components/feedback/EmptyState';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CameraIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const sectionCardClass = 'rounded-2xl border border-gray-200/80 dark:border-gray-700/70 bg-white/95 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5';
const inputClass = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 dark:focus:ring-indigo-400/70 focus:border-indigo-400 dark:focus:border-indigo-500 transition';
const sectionDividerClass = 'h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent transition-opacity';

const EmployeeProfileView = ({ tenantSlug: tenantSlugProp }) => {
  const tenantSlugParam = useTenantSlug();
  const tenantSlug = tenantSlugProp || tenantSlugParam;
  const { user, updateUser } = useTenantAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [removingPic, setRemovingPic] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }
  });

  const getProfilePicApiUrl = (url) => {
    if (!url || !tenantSlug) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/profile-pictures/')) {
      return `/api/tenant/${tenantSlug}/organization${url}`;
    }
    return url;
  };

  useEffect(() => {
    fetchEmployeeProfile();
  }, [tenantSlug, user]);

  const fetchEmployeeProfile = async () => {
    try {
      setLoadError('');
      const response = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees?userId=${user.id}`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.employees?.length > 0) {
          const emp = data.data.employees[0];
          setEmployee(emp);
          setProfilePicUrl(emp.userId?.profilePicUrl || user?.profilePicUrl || '');
          setFormData({
            phone: emp.userId?.phone || '',
            address: emp.address || {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: ''
            },
            emergencyContact: emp.emergencyContact || {
              name: '',
              relationship: '',
              phone: '',
              email: ''
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch employee profile:', error);
      setLoadError(error?.message || 'Failed to load profile');
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPic(true);
    try {
      const fd = new FormData();
      fd.append('profilePic', file);
      const res = await fetch(`/api/tenant/${tenantSlug}/organization/users/profile/picture`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to upload profile picture');
      const nextUrl = json?.data?.profilePicUrl || '';
      setProfilePicUrl(nextUrl);
      if (nextUrl) updateUser?.({ profilePicUrl: nextUrl });
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleProfilePictureRemove = async () => {
    setRemovingPic(true);
    try {
      const res = await fetch(`/api/tenant/${tenantSlug}/organization/users/profile/picture`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || 'Remove profile picture is not available yet');
      }
      setProfilePicUrl('');
      updateUser?.({ profilePicUrl: '' });
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error(error.message || 'Could not remove profile picture');
    } finally {
      setRemovingPic(false);
    }
  };

  const handleUpdate = async () => {
    try {
      if (!employee?._id) {
        toast.error('Employee record not found');
        return;
      }

      const response = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees/${employee._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // SECURITY FIX: Use cookies instead of localStorage token
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        setEditing(false);
        fetchEmployeeProfile();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading employee profile..." className="min-h-[40vh] bg-transparent" />;
  }

  if (loadError) {
    return <ErrorState title="Profile unavailable" message={loadError} onRetry={fetchEmployeeProfile} className="max-w-xl mx-auto" />;
  }

  if (!employee) {
    return (
      <div className={`${sectionCardClass} p-8 text-center`}>
        <EmptyState title="Employee profile not found" message="No employee profile data is available for this account yet." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`${sectionCardClass} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">My Profile</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpdate}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  fetchEmployeeProfile();
                }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Picture and Basic Info */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-1">
          <div className="flex flex-col items-start gap-2">
            <div className="h-24 w-24 rounded-2xl bg-indigo-600 flex items-center justify-center overflow-hidden">
              {getProfilePicApiUrl(profilePicUrl) ? (
                <img
                  src={getProfilePicApiUrl(profilePicUrl)}
                  alt={employee.userId?.fullName || user?.fullName || 'Profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-11 w-11 text-white" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPic}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                <CameraIcon className="h-3.5 w-3.5" />
                {getProfilePicApiUrl(profilePicUrl) ? 'Update photo' : 'Add photo'}
              </button>
              {getProfilePicApiUrl(profilePicUrl) && (
                <button
                  type="button"
                  onClick={handleProfilePictureRemove}
                  disabled={removingPic}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {employee.userId?.fullName || user?.fullName}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-0.5">{employee.jobTitle || 'Team member'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 text-xs font-medium">
                {employee.department || 'Department not set'}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 text-xs font-medium">
                Employee ID: {employee.employeeId || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className={`${sectionDividerClass} ${editing ? 'opacity-100' : 'opacity-60'}`} />

      {/* Personal Information */}
      <div className={`${sectionCardClass} p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>
              <EnvelopeIcon className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100 break-words">{employee.userId?.email || user?.email}</p>
          </div>
          <div>
            <label className={labelClass}>
              <PhoneIcon className="h-4 w-4 inline mr-2" />
              Phone
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            ) : (
              <p className="text-sm text-gray-900 dark:text-gray-100">{formData.phone || 'Not provided'}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              <BriefcaseIcon className="h-4 w-4 inline mr-2" />
              Job Title
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">{employee.jobTitle || 'Not set'}</p>
          </div>
          <div>
            <label className={labelClass}>
              <CalendarIcon className="h-4 w-4 inline mr-2" />
              Hire Date
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
      <div className={`${sectionDividerClass} ${formData.address.street || formData.address.city ? 'opacity-70' : 'opacity-40'}`} />

      {/* Address */}
      <div className={`${sectionCardClass} p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          <MapPinIcon className="h-5 w-5 inline mr-2" />
          Address
        </h3>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Street</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Zip Code</label>
              <input
                type="text"
                value={formData.address.zipCode}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, zipCode: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, country: e.target.value }
                })}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-900 dark:text-gray-100 space-y-0.5">
            {formData.address.street && (
              <p>{formData.address.street}</p>
            )}
            {(formData.address.city || formData.address.state || formData.address.zipCode) && (
              <p>
                {[formData.address.city, formData.address.state, formData.address.zipCode]
                  .filter(Boolean).join(', ')}
              </p>
            )}
            {formData.address.country && (
              <p>{formData.address.country}</p>
            )}
            {!formData.address.street && !formData.address.city && (
              <p className="text-gray-500 dark:text-gray-400">No address provided</p>
            )}
          </div>
        )}
      </div>
      <div className={`${sectionDividerClass} ${formData.emergencyContact.name || formData.emergencyContact.phone ? 'opacity-70' : 'opacity-40'}`} />

      {/* Emergency Contact */}
      <div className={`${sectionCardClass} p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Emergency Contact</h3>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formData.emergencyContact.email}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, email: e.target.value }
                })}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{formData.emergencyContact.name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Relationship</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{formData.emergencyContact.relationship || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Phone</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{formData.emergencyContact.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{formData.emergencyContact.email || 'Not provided'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfileView;
