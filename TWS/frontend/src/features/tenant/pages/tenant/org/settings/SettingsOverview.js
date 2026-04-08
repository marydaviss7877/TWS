import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import toast from 'react-hot-toast';
import {
  CogIcon, ShieldCheckIcon, BellIcon,
  GlobeAltIcon, CurrencyDollarIcon, CalendarIcon, ClockIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

/* ─── shared tokens (mirrors OrgProfile) ────────────────────────────────────── */
const S = {
  card:    'bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 rounded-xl p-3',
  input:   'w-full h-8 px-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-600 transition',
  label:   'block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5 uppercase tracking-wide',
  sec:     'text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2',
  navitem: (a) => `flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    a ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'}`,
};

/* ─── static (outside component) ───────────────────────────────────────────── */
const NAV = [
  { id: 'general',       label: 'General',       Icon: CogIcon },
  { id: 'workspace',     label: 'Workspace',      Icon: Squares2X2Icon, isLink: true, to: 'workspace' },
  { id: 'notifications', label: 'Notifications',  Icon: BellIcon },
  { id: 'security',      label: 'Security',       Icon: ShieldCheckIcon },
];

const DEFAULT_EVENT_TYPES = {
  task_assigned: true,       leave_approved: true,      leave_rejected: true,
  invoice_overdue: true,     deliverable_rejected: true, budget_warning: true,
  project_delayed: true,     critical_bug: true,         dept_access_granted: true,
  dept_access_revoked: true, emergency_offboard: true,
  document_submitted: true,  document_approved: true,   document_rejected: true,
};

const EVENT_LABELS = {
  task_assigned:        'Task assigned',
  leave_approved:       'Leave approved',
  leave_rejected:       'Leave rejected',
  invoice_overdue:      'Invoice overdue',
  deliverable_rejected: 'Deliverable rejected',
  budget_warning:       'Budget 80% warning',
  project_delayed:      'Project delayed',
  critical_bug:         'Critical bug',
  dept_access_granted:  'Dept access granted',
  dept_access_revoked:  'Dept access revoked',
  emergency_offboard:   'Emergency offboard',
  document_submitted:   'Doc submitted',
  document_approved:    'Doc approved',
  document_rejected:    'Doc rejected',
};

/* ─── atoms ─────────────────────────────────────────────────────────────────── */
const Sec = ({ children }) => <p className={S.sec}>{children}</p>;

function Lbl({ children, icon: Icon }) {
  return (
    <label className={S.label}>
      {Icon && <Icon className="inline w-3 h-3 mr-0.5 text-gray-400" />}
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600" />
    </label>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</p>
        {desc && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SaveBtn({ saving, onClick, label = 'Save' }) {
  return (
    <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
      <button onClick={onClick} disabled={saving}
        className="px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}

/* ─── main ───────────────────────────────────────────────────────────────────── */
const SettingsOverview = () => {
  const { tenantSlug } = useParams();
  const { tenant } = useTenantAuth();
  const navigate = useNavigate();
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState('general');

  const [general, setGeneral] = useState({
    organizationName: '', timezone: 'Asia/Karachi',
    dateFormat: 'DD/MM/YYYY', timeFormat: '24h',
    language: 'en', currency: 'PKR',
  });
  const [notif, setNotif] = useState({
    emailNotifications: true, pushNotifications: true,
    smsNotifications: false, taskReminders: true, attendanceAlerts: true,
  });
  const [inAppEnabled,      setInAppEnabled]      = useState(true);
  const [eventTypes,        setEventTypes]        = useState(DEFAULT_EVENT_TYPES);
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);
  const [security, setSecurity] = useState({
    sessionTimeout: 30, passwordPolicy: 'medium',
    requireStrongPassword: true, loginAlerts: true,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch(`/api/tenant/${tenantSlug}/organization/settings`, {
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        const { data } = await r.json();
        if (data?.general)       setGeneral(data.general);
        if (data?.notifications) {
          const { feeReminders, examNotifications, announcementNotifications, ...rest } = data.notifications;
          setNotif(rest);
        }
        if (data?.security) setSecurity(data.security);
      } else if (tenant) {
        setGeneral(p => ({ ...p, organizationName: tenant.name || '' }));
      }
    } catch {
      if (tenant) setGeneral(p => ({ ...p, organizationName: tenant.name || '' }));
    }

    setNotifPrefsLoading(true);
    try {
      const r = await fetch('/api/notifications/preferences', {
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        const { data } = await r.json();
        if (typeof data?.inApp?.enabled === 'boolean') setInAppEnabled(data.inApp.enabled);
        if (data?.eventTypes) setEventTypes(p => ({ ...DEFAULT_EVENT_TYPES, ...data.eventTypes }));
      }
    } catch {}
    finally { setNotifPrefsLoading(false); }
  }, [tenantSlug, tenant]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveGeneral = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/tenant/${tenantSlug}/organization/settings/general`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(general),
      });
      if (!r.ok) throw new Error('Failed');
      toast.success('General settings saved');
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveNotif = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/tenant/${tenantSlug}/organization/settings/notifications`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notif),
      });
      if (!r.ok) throw new Error('Failed');
      toast.success('Channels saved');
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveNotifPrefs = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/notifications/preferences', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inApp: { enabled: inAppEnabled }, eventTypes }),
      });
      if (!r.ok) throw new Error('Failed');
      toast.success('Preferences saved');
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveSecurity = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/tenant/${tenantSlug}/organization/settings/security`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(security),
      });
      if (!r.ok) throw new Error('Failed');
      toast.success('Security settings saved');
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 py-2 px-0.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <CogIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Settings</h1>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Organization preferences</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col md:flex-row gap-4">

        {/* Sidebar */}
        <nav className="hidden md:flex flex-col gap-0.5 w-36 shrink-0">
          {NAV.map(({ id, label, Icon, isLink, to }) => (
            <button key={id}
              onClick={() => isLink ? navigate(to) : setTab(id)}
              className={S.navitem(!isLink && tab === id)}>
              <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
            </button>
          ))}
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ id, label, Icon, isLink, to }) => (
            <button key={id}
              onClick={() => isLink ? navigate(to) : setTab(id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                !isLink && tab === id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                           : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* ── General ── */}
          {tab === 'general' && (
            <div className={S.card}>
              <Sec>Preferences</Sec>
              <div className="space-y-2">

                {/* Org name — full width */}
                <div>
                  <Lbl>Organization Name</Lbl>
                  <input type="text" value={general.organizationName}
                    onChange={e => setGeneral(p => ({ ...p, organizationName: e.target.value }))}
                    className={S.input} placeholder="Enter organization name" />
                </div>

                {/* 3 selects per row — all roughly equal and short */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Lbl icon={GlobeAltIcon}>Timezone</Lbl>
                    <select value={general.timezone} onChange={e => setGeneral(p => ({ ...p, timezone: e.target.value }))} className={S.input}>
                      <option value="Asia/Karachi">PKT (Karachi)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">EST (New York)</option>
                      <option value="Europe/London">GMT (London)</option>
                    </select>
                  </div>
                  <div>
                    <Lbl icon={CalendarIcon}>Date Format</Lbl>
                    <select value={general.dateFormat} onChange={e => setGeneral(p => ({ ...p, dateFormat: e.target.value }))} className={S.input}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <Lbl icon={ClockIcon}>Time</Lbl>
                    <select value={general.timeFormat} onChange={e => setGeneral(p => ({ ...p, timeFormat: e.target.value }))} className={S.input}>
                      <option value="24h">24h</option>
                      <option value="12h">12h AM/PM</option>
                    </select>
                  </div>
                </div>

                {/* Currency + Language — 2 cols, narrower */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Lbl icon={CurrencyDollarIcon}>Currency</Lbl>
                    <select value={general.currency} onChange={e => setGeneral(p => ({ ...p, currency: e.target.value }))} className={S.input}>
                      <option value="PKR">PKR — Pakistani Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                    </select>
                  </div>
                  <div>
                    <Lbl>Language</Lbl>
                    <select value={general.language} onChange={e => setGeneral(p => ({ ...p, language: e.target.value }))} className={S.input}>
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                    </select>
                  </div>
                </div>

                <SaveBtn saving={saving} onClick={saveGeneral} label="Save General" />
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && <>
            <div className={S.card}>
              <Sec>In-app & Email Events</Sec>
              <div className="space-y-1.5">
                <ToggleRow label="In-app notifications" desc="Bell icon & notification panel"
                  checked={inAppEnabled} onChange={e => setInAppEnabled(e.target.checked)} />

                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 pt-1.5">Email by event</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(EVENT_LABELS).map(([key, lbl]) => (
                    <ToggleRow key={key} label={lbl}
                      checked={eventTypes[key] !== false}
                      onChange={e => setEventTypes(p => ({ ...p, [key]: e.target.checked }))} />
                  ))}
                </div>
                <SaveBtn saving={saving || notifPrefsLoading} onClick={saveNotifPrefs} label="Save Preferences" />
              </div>
            </div>

            <div className={S.card}>
              <Sec>Channels</Sec>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(notif)
                  .filter(([k]) => !['feeReminders','examNotifications','announcementNotifications'].includes(k))
                  .map(([key, val]) => (
                    <ToggleRow key={key}
                      label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      checked={val}
                      onChange={e => setNotif(p => ({ ...p, [key]: e.target.checked }))} />
                  ))}
              </div>
              <SaveBtn saving={saving} onClick={saveNotif} label="Save Channels" />
            </div>
          </>}

          {/* ── Security ── */}
          {tab === 'security' && (
            <div className={S.card}>
              <Sec>Security</Sec>
              <div className="space-y-2">
                {/* Timeout narrow, policy takes remaining space */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <Lbl>Timeout (min)</Lbl>
                    <input type="number" value={security.sessionTimeout} min="5" max="120"
                      onChange={e => setSecurity(p => ({ ...p, sessionTimeout: parseInt(e.target.value) }))}
                      className={S.input} />
                  </div>
                  <div className="col-span-3">
                    <Lbl>Password Policy</Lbl>
                    <select value={security.passwordPolicy}
                      onChange={e => setSecurity(p => ({ ...p, passwordPolicy: e.target.value }))}
                      className={S.input}>
                      <option value="low">Low — 6+ characters</option>
                      <option value="medium">Medium — 8+ chars, mixed case</option>
                      <option value="high">High — 10+ chars, symbols required</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <ToggleRow label="Require Strong Password" desc="Enforce complexity"
                    checked={security.requireStrongPassword}
                    onChange={e => setSecurity(p => ({ ...p, requireStrongPassword: e.target.checked }))} />
                  <ToggleRow label="Login Alerts" desc="Notify on new sign-ins"
                    checked={security.loginAlerts}
                    onChange={e => setSecurity(p => ({ ...p, loginAlerts: e.target.checked }))} />
                </div>

                <SaveBtn saving={saving} onClick={saveSecurity} label="Save Security" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsOverview;
