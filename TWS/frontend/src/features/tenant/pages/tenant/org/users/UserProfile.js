import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import toast from 'react-hot-toast';
import RoleAssignment from '../../../../components/RoleAssignment';

// Legacy profile page used for account-level fields.
// Primary end-user profile navigation now goes to /org/employee/profile.
import {
  UserIcon,
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const UserProfile = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const { user, tenant, updateUser } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();

  // Profile pictures: build API URL and load via fetch with credentials so auth cookie is sent
  const getProfilePicApiUrl = (url) => {
    if (!url || !tenantSlug) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/profile-pictures/')) {
      return `/api/tenant/${tenantSlug}/organization${url}`;
    }
    return url;
  };
  const getProfilePicSrc = getProfilePicApiUrl; // alias for any remaining references

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    jobTitle: '',
    profilePicUrl: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileImageBlobUrl, setProfileImageBlobUrl] = useState(null);
  const profileImageBlobUrlRef = useRef(null);
  useEffect(() => {
    const apiUrl = getProfilePicApiUrl(profileData.profilePicUrl);
    if (!apiUrl) {
      if (profileImageBlobUrlRef.current) {
        URL.revokeObjectURL(profileImageBlobUrlRef.current);
        profileImageBlobUrlRef.current = null;
      }
      setProfileImageBlobUrl(null);
      return;
    }
    let cancelled = false;
    fetch(apiUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) return null;
        return res.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return;
        if (profileImageBlobUrlRef.current) {
          URL.revokeObjectURL(profileImageBlobUrlRef.current);
        }
        const blobUrl = URL.createObjectURL(blob);
        profileImageBlobUrlRef.current = blobUrl;
        setProfileImageBlobUrl(blobUrl);
      })
      .catch(() => setProfileImageBlobUrl(null));
    return () => {
      cancelled = true;
      if (profileImageBlobUrlRef.current) {
        URL.revokeObjectURL(profileImageBlobUrlRef.current);
        profileImageBlobUrlRef.current = null;
      }
      setProfileImageBlobUrl(null);
    };
  }, [profileData.profilePicUrl, tenantSlug]);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        jobTitle: user.jobTitle || '',
        profilePicUrl: user.profilePicUrl || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // SECURITY FIX: Use credentials: 'include' instead of Authorization header
      const response = await fetch(`/api/tenant/${tenantSlug}/organization/users/profile`, {
        method: 'PATCH',
        credentials: 'include', // SECURITY FIX: Include cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const data = await response.json();
      toast.success('Profile updated successfully!');
      setEditing(false);
      if (data.data && data.data.user) {
        updateUser(data.data.user);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    
    try {
      // SECURITY FIX: Use credentials: 'include' instead of Authorization header
      const response = await fetch(`/api/tenant/${tenantSlug}/organization/users/password`, {
        method: 'PATCH',
        credentials: 'include', // SECURITY FIX: Include cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      // SECURITY FIX: Use credentials: 'include' instead of Authorization header
      // Note: Don't set Content-Type for FormData - browser sets it automatically with boundary
      const response = await fetch(`/api/tenant/${tenantSlug}/organization/users/profile/picture`, {
        method: 'POST',
        credentials: 'include', // SECURITY FIX: Include cookies
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to upload image');
      }

      const data = await response.json();
      const newUrl = data.data?.profilePicUrl;
      setProfileData(prev => ({ ...prev, profilePicUrl: newUrl || prev.profilePicUrl }));
      if (newUrl) updateUser({ profilePicUrl: newUrl });
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
    <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Account Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your personal information and account settings</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-md"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Basic Info */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="relative h-32 w-32 rounded-full bg-primary-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white overflow-hidden">
                  <span className="absolute inset-0 flex items-center justify-center" aria-hidden={!!profileImageBlobUrl}>
                    {profileData.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                  {profileImageBlobUrl ? (
                    <img
                      src={profileImageBlobUrl}
                      alt={profileData.fullName}
                      className="h-full w-full rounded-full object-cover relative z-10"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : null}
                </div>
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-lg">
                    <CameraIcon className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">{profileData.fullName || 'User'}</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{profileData.email}</p>
              <div className="mt-3 space-y-2">
                <span className="inline-block px-3 py-1 text-sm font-semibold bg-primary-100 text-primary-700 rounded-full">
                  {user.role || 'Member'}
                </span>
                {user.roles && user.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {user.roles
                      .filter(r => r.status === 'active')
                      .map((roleAssignment, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full"
                        >
                          {roleAssignment.role}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Role Management (for admins) */}
          {(hasModulePermission?.('users', 'admin') || hasModulePermission?.('settings', 'admin')) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mt-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-primary-600" />
                Role Management
              </h3>
              <RoleAssignment
                userId={user._id || user.id}
                currentRoles={user.roles || []}
                onUpdate={() => {
                  // Refresh user data
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* Account Security */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-primary-600" />
              Account Security
            </h3>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Change Password</span>
              <LockClosedIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-primary-600" />
              Personal Information
            </h3>
            
            {editing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="+92-300-1234567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={profileData.jobTitle}
                      onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Principal, Teacher, Admin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <BuildingOfficeIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Administration, Academic"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      // Reset to original values
                      if (user) {
                        setProfileData({
                          fullName: user.fullName || '',
                          email: user.email || '',
                          phone: user.phone || '',
                          department: user.department || '',
                          jobTitle: user.jobTitle || '',
                          profilePicUrl: user.profilePicUrl || ''
                        });
                      }
                    }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 inline mr-2" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="inline-block tws-loading-pulse rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5 inline mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.fullName || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.phone || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <BriefcaseIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.jobTitle || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{profileData.department || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{user.role || 'Member'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Password Change Modal */}
          {showPasswordChange && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <LockClosedIcon className="h-5 w-5 mr-2 text-primary-600" />
                Change Password
              </h3>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
