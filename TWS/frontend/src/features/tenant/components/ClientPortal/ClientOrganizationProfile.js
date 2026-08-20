import React, { useEffect, useState } from 'react';
import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useTenantSlug } from '../../../../shared/hooks/useTenantSlug';

const Field = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value || '-'}</p>
  </div>
);

const ClientOrganizationProfile = () => {
  const tenantSlug = useTenantSlug();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/tenant/${tenantSlug}/organization/profile`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Failed to load organization profile');
        if (mounted) setProfile(json?.data || null);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load organization profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent tws-loading-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  const brandingLogo = profile?.branding?.logo;
  const address = profile?.contactInfo?.address;
  const fullAddress = [address?.street, address?.city, address?.state, address?.zipCode, address?.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <div className="h-28 bg-gradient-to-r from-primary-600 via-accent-600 to-accent-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="h-20 w-20 rounded-xl border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center">
              {brandingLogo ? (
                <img src={brandingLogo} alt="Organization logo" className="h-full w-full object-contain" />
              ) : (
                <BuildingOffice2Icon className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name || 'Organization'}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {profile?.businessInfo?.industry || 'Software House'} · {profile?.businessInfo?.companySize || 'N/A'}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            {profile?.description || 'No organization description available.'}
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Plan" value={profile?.subscription?.plan} />
            <Field label="Status" value={profile?.status} />
            <Field label="Registration Number" value={profile?.businessInfo?.registrationNumber} />
            <Field label="Tax ID" value={profile?.businessInfo?.taxId} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Contact & Presence</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Website" value={profile?.contactInfo?.website} />
          <Field label="Email" value={profile?.contactInfo?.email} />
          <Field label="Phone" value={profile?.contactInfo?.phone} />
          <Field label="Address" value={fullAddress} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1"><GlobeAltIcon className="w-4 h-4" /> Public company profile</span>
          <span className="inline-flex items-center gap-1"><EnvelopeIcon className="w-4 h-4" /> Client-safe view</span>
          <span className="inline-flex items-center gap-1"><PhoneIcon className="w-4 h-4" /> Read only</span>
          <span className="inline-flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> No admin controls</span>
        </div>
      </div>
    </div>
  );
};

export default ClientOrganizationProfile;
