/**
 * OrgProfile — compact sidebar-nav design with context-aware field widths.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  SwatchIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PhotoIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

/* ─── tokens ─────────────────────────────────────────────────────────────────── */
const S = {
  card:    'bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 rounded-xl p-3',
  input:   'w-full h-8 px-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-600 transition',
  label:   'block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5 uppercase tracking-wide',
  rbox:    'flex h-8 items-center px-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg truncate',
  sec:     'text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2',
  navitem: (a) => `flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    a ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'}`,
};

/* ─── static ─────────────────────────────────────────────────────────────────── */
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const NAV = [
  { id: 'overview',  label: 'Overview',  Icon: BuildingOfficeIcon },
  { id: 'contact',   label: 'Contact',   Icon: EnvelopeIcon },
  { id: 'business',  label: 'Business',  Icon: BriefcaseIcon },
  { id: 'branding',  label: 'Branding',  Icon: SwatchIcon },
];

const PLAN_CLS = {
  trial:        'bg-gray-100 dark:bg-gray-800 text-gray-500',
  starter:      'bg-blue-50  dark:bg-blue-900/20  text-blue-600  dark:text-blue-400',
  growth:       'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  professional: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  enterprise:   'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
};

/* ─── atoms ──────────────────────────────────────────────────────────────────── */
const Lbl = ({ children }) => <label className={S.label}>{children}</label>;
const Sec = ({ children }) => <p className={S.sec}>{children}</p>;

function F({ label, value, onChange, type = 'text', placeholder, readOnly, span }) {
  return (
    <div className={span ? `col-span-${span}` : ''}>
      <Lbl>{label}</Lbl>
      {readOnly
        ? <div className={S.rbox}><span className="truncate">{value || '—'}</span></div>
        : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} className={S.input} />
      }
    </div>
  );
}

function Sel({ label, value, onChange, options, readOnly, span }) {
  return (
    <div className={span ? `col-span-${span}` : ''}>
      <Lbl>{label}</Lbl>
      {readOnly
        ? <div className={S.rbox}>{value || '—'}</div>
        : <select value={value || ''} onChange={e => onChange(e.target.value)} className={S.input}>
            <option value="">Select…</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
      }
    </div>
  );
}

/* ─── main ───────────────────────────────────────────────────────────────────── */
const OrgProfile = () => {
  const tenantSlug = useTenantSlug();
  const { user, tenant: ctxTenant, updateTenant } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();

  const [tab,           setTab]           = useState('overview');
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [form,          setForm]          = useState({});
  const [savedForm,     setSavedForm]     = useState({});
  const [dirty,         setDirty]         = useState(false);
  const [logoUrl,       setLogoUrl]       = useState(null);
  const [logoPreview,   setLogoPreview]   = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving,  setLogoRemoving]  = useState(false);
  const [rmConfirm,     setRmConfirm]     = useState(false);
  const logoRef = useRef(null);

  const resolveUrl = (u) => (!u || u.startsWith('http') || u.startsWith('blob:')) ? u : u;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/tenant/${tenantSlug}/organization/profile`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load');
      const d = json.data;
      setProfile(d);
      setLogoUrl(resolveUrl(d.branding?.logo));
      setLogoPreview(null);
      const f = {
        name: d.name || '', description: d.description || '',
        contactEmail:   d.contactInfo?.email              || '',
        contactPhone:   d.contactInfo?.phone              || '',
        contactWebsite: d.contactInfo?.website            || '',
        addrStreet:     d.contactInfo?.address?.street    || '',
        addrCity:       d.contactInfo?.address?.city      || '',
        addrState:      d.contactInfo?.address?.state     || '',
        addrZip:        d.contactInfo?.address?.zipCode   || '',
        addrCountry:    d.contactInfo?.address?.country   || '',
        industry:           d.businessInfo?.industry            || '',
        companySize:        d.businessInfo?.companySize         || '',
        taxId:              d.businessInfo?.taxId               || '',
        registrationNumber: d.businessInfo?.registrationNumber  || '',
      };
      setForm(f); setSavedForm(f); setDirty(false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [tenantSlug]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name, description: form.description,
        contactInfo: { email: form.contactEmail, phone: form.contactPhone, website: form.contactWebsite,
          address: { street: form.addrStreet, city: form.addrCity, state: form.addrState, zipCode: form.addrZip, country: form.addrCountry } },
        businessInfo: { industry: form.industry, companySize: form.companySize, taxId: form.taxId, registrationNumber: form.registrationNumber },
      };
      const res  = await fetch(`/api/tenant/${tenantSlug}/organization/profile`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Save failed');
      toast.success('Profile saved');
      setDirty(false); setSavedForm(form); setProfile(json.data);
    } catch (e) { toast.error(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2 MB'); return; }
    setLogoPreview(URL.createObjectURL(file));
    uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    setLogoUploading(true);
    try {
      const fd = new FormData(); fd.append('logo', file);
      const res  = await fetch(`/api/tenant/${tenantSlug}/organization/profile/logo`, { method: 'POST', credentials: 'include', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Upload failed');
      const url = resolveUrl(json.data.logoUrl);
      setLogoUrl(url); setLogoPreview(null);
      updateTenant?.({ logoUrl: url, branding: { logo: json.data.logoUrl } });
      toast.success('Logo uploaded');
    } catch (e) { toast.error(e.message || 'Upload failed'); setLogoPreview(null); }
    finally { setLogoUploading(false); if (logoRef.current) logoRef.current.value = ''; }
  };

  const removeLogo = async () => {
    setLogoRemoving(true); setRmConfirm(false);
    try {
      const res  = await fetch(`/api/tenant/${tenantSlug}/organization/profile/logo`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setLogoUrl(null); setLogoPreview(null);
      updateTenant?.({ logoUrl: null, branding: { logo: null } });
      toast.success('Logo removed');
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setLogoRemoving(false); }
  };

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const isAdmin = hasModulePermission?.('settings', 'admin') || hasModulePermission?.('users', 'admin');

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 rounded-full border-2 border-primary-500 border-t-transparent tws-loading-pulse" />
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 flex items-start gap-2.5 max-w-md">
      <ExclamationTriangleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <button onClick={load} className="mt-1 text-xs text-red-500 underline">Retry</button>
      </div>
    </div>
  );

  const plan    = profile?.subscription?.plan || ctxTenant?.plan || 'starter';
  const status  = profile?.status             || ctxTenant?.status || 'active';
  const cat     = (profile?.erpCategory       || ctxTenant?.erpCategory || '').replace(/_/g,' ');
  const initial = (form.name || 'O')[0].toUpperCase();

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Unsaved changes bar ── */}
      {dirty && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 py-1.5 mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved changes
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setForm(savedForm); setDirty(false); }}
              className="text-xs px-2 py-1 rounded-md text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">Discard</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-60 transition-colors">
              {saving ? <span className="w-3 h-3 rounded-full border border-white border-t-transparent tws-loading-pulse" /> : <CheckIcon className="w-3 h-3" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── Layout ── */}
      <div className="flex flex-col md:flex-row gap-4">

        {/* Sidebar */}
        <nav className="hidden md:flex flex-col gap-0.5 w-36 shrink-0">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={S.navitem(tab === id)}>
              <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
            </button>
          ))}
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                tab === id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                           : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* ── Overview ── */}
          {tab === 'overview' && <>
            <div className={S.card}>
              <Sec>Organization</Sec>
              {/* 4-col grid — name wide, short read-only fields narrow */}
              <div className="grid grid-cols-4 gap-2">
                <F label="Name"          value={form.name}     onChange={set('name')}   placeholder="Org name"  readOnly={!isAdmin} span={2} />
                <F label="ERP Category"  value={cat}                                     readOnly span={1} />
                <F label="Plan"          value={plan}                                     readOnly span={1} />
                <F label="Status"        value={status}                                   readOnly span={1} />
                <F label="Slug"          value={tenantSlug}                               readOnly span={2} />
                <F label="Member Since"  value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short'}) : '—'} readOnly span={1} />
              </div>
            </div>

            <div className={S.card}>
              <Sec>Description</Sec>
              {isAdmin ? (
                <textarea value={form.description || ''} onChange={e => set('description')(e.target.value)} rows={2}
                  placeholder="Describe your organization…"
                  className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none" />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 min-h-[40px]">
                  {form.description || <em className="text-gray-400 not-italic">No description set</em>}
                </p>
              )}
            </div>

            {profile?.subscription && (
              <div className={S.card}>
                <Sec>Subscription</Sec>
                <div className="grid grid-cols-4 gap-2">
                  <F label="Billing Cycle" value={profile.subscription.billingCycle || '—'}  readOnly span={2} />
                  <F label="Next Billing"  value={profile.subscription.nextBillingDate ? new Date(profile.subscription.nextBillingDate).toLocaleDateString() : '—'} readOnly span={2} />
                  <F label="Max Users"     value={String(profile.features?.maxUsers ?? '—')} readOnly span={1} />
                  <F label="Max Projects"  value={String(profile.features?.maxProjects ?? '—')} readOnly span={1} />
                </div>
              </div>
            )}
          </>}

          {/* ── Contact ── */}
          {tab === 'contact' && <>
            <div className={S.card}>
              <Sec>Contact Information</Sec>
              {/* email + phone side by side; website full width */}
              <div className="grid grid-cols-4 gap-2">
                <F label="Email"   value={form.contactEmail}   onChange={set('contactEmail')}   type="email" placeholder="org@example.com"    readOnly={!isAdmin} span={2} />
                <F label="Phone"   value={form.contactPhone}   onChange={set('contactPhone')}   type="tel"   placeholder="+1 555 000 0000"     readOnly={!isAdmin} span={2} />
                <F label="Website" value={form.contactWebsite} onChange={set('contactWebsite')} type="url"   placeholder="https://example.com" readOnly={!isAdmin} span={4} />
              </div>
            </div>
            <div className={S.card}>
              <Sec>Address</Sec>
              {/* street full, city wide, state medium, zip narrow, country medium */}
              <div className="grid grid-cols-4 gap-2">
                <F label="Street"   value={form.addrStreet}  onChange={set('addrStreet')}  placeholder="123 Main St" readOnly={!isAdmin} span={4} />
                <F label="City"     value={form.addrCity}    onChange={set('addrCity')}    placeholder="City"        readOnly={!isAdmin} span={2} />
                <F label="State"    value={form.addrState}   onChange={set('addrState')}   placeholder="State"       readOnly={!isAdmin} span={1} />
                <F label="ZIP"      value={form.addrZip}     onChange={set('addrZip')}     placeholder="00000"       readOnly={!isAdmin} span={1} />
                <F label="Country"  value={form.addrCountry} onChange={set('addrCountry')} placeholder="Country"     readOnly={!isAdmin} span={2} />
              </div>
            </div>
          </>}

          {/* ── Business ── */}
          {tab === 'business' &&
            <div className={S.card}>
              <Sec>Business Information</Sec>
              <div className="grid grid-cols-4 gap-2">
                <F   label="Industry"          value={form.industry}           onChange={set('industry')}           placeholder="e.g. Software"  readOnly={!isAdmin} span={2} />
                <Sel label="Company Size"      value={form.companySize}        onChange={set('companySize')}        options={COMPANY_SIZES}      readOnly={!isAdmin} span={2} />
                <F   label="Tax ID"            value={form.taxId}              onChange={set('taxId')}              placeholder="Tax ID"         readOnly={!isAdmin} span={2} />
                <F   label="Registration No."  value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="Reg. number"    readOnly={!isAdmin} span={2} />
              </div>
            </div>
          }

          {/* ── Branding ── */}
          {tab === 'branding' && <>

            {/* Logo — hover avatar to upload */}
            <div className={S.card}>
              <Sec>Logo</Sec>
              <div className="flex items-center gap-3">
                <div className="relative group shrink-0">
                  <div className="h-14 w-14 rounded-xl overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
                    {logoPreview || logoUrl
                      ? <img src={logoPreview || logoUrl} alt="" className="h-full w-full object-contain bg-white" />
                      : <div className="h-full w-full bg-primary-600 flex items-center justify-center text-white font-bold">{initial}</div>
                    }
                  </div>
                  {isAdmin && (
                    <label htmlFor="logo-upload"
                      className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <PhotoIcon className="w-4 h-4 text-white" />
                    </label>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">PNG, JPG, SVG or WebP — max 2 MB · 256×256 px recommended</p>
                  {isAdmin ? (
                    <div className="flex flex-wrap gap-1.5">
                      <input ref={logoRef} type="file" id="logo-upload"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                        onChange={handleLogoSelect} className="hidden" />
                      <label htmlFor="logo-upload"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors min-w-[96px] justify-center ${
                          logoUploading ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait pointer-events-none'
                                        : 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'}`}>
                        {logoUploading
                          ? <><span className="w-3 h-3 rounded-full border border-gray-400 border-t-transparent tws-loading-pulse" /> Uploading…</>
                          : <><ArrowUpTrayIcon className="w-3 h-3" /> {logoUrl ? 'Replace' : 'Upload'}</>}
                      </label>

                      {logoUrl && !rmConfirm && (
                        <button onClick={() => setRmConfirm(true)} disabled={logoRemoving}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                          <TrashIcon className="w-3 h-3" /> Remove
                        </button>
                      )}
                      {rmConfirm && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs">
                          <span className="text-red-700 dark:text-red-400 font-medium">Remove?</span>
                          <button onClick={removeLogo} className="font-bold text-red-600 dark:text-red-400 underline">Yes</button>
                          <button onClick={() => setRmConfirm(false)} className="text-gray-400 hover:text-gray-600">No</button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Admin access required</p>
                  )}
                </div>
              </div>
            </div>
          </>}

        </div>
      </div>
    </div>
  );
};

export default OrgProfile;
