import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  BriefcaseIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ClockIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';

/* ─────────────────────────────────────────────────────────────────────────────
   Small reusable pieces
───────────────────────────────────────────────────────────────────────────── */
const SidebarStat = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-[3px]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600 leading-none mb-1">{label}</p>
        <p className="text-sm text-white/85 font-medium capitalize leading-snug truncate">{value}</p>
      </div>
    </div>
  );
};

const SectionHeading = ({ children }) => (
  <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500 mb-5">
    {children}
  </h2>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
const EmployeeDetail = () => {
  const { id } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!tenantSlug || !id) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const result = await tenantApiService.getEmployeeById(tenantSlug, id);
        const emp = result?.employee ?? result;
        if (!cancelled) {
          if (emp) setEmployee(emp);
          else setError('Employee not found');
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load employee');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tenantSlug, id]);

  /* ── loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Loading
          </p>
        </div>
      </div>
    );
  }

  /* ── error ────────────────────────────────────────────────────── */
  if (error || !employee) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-5">
            <UserIcon className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Profile not found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || 'Could not load this employee.'}</p>
          <button
            onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to team
          </button>
        </div>
      </div>
    );
  }

  /* ── derived ──────────────────────────────────────────────────── */
  const name        = employee.name || employee.userId?.fullName || 'N/A';
  const email       = employee.email || employee.userId?.email || null;
  const phone       = employee.userId?.phone || employee.phone || null;
  const initial     = name.charAt(0).toUpperCase();
  const isActive    = !employee.status || ['active', 'Active'].includes(employee.status);
  const statusLabel = (employee.status || 'active').replace(/-/g, ' ');

  const salaryBase  = employee.salary?.base ?? employee.salary?.totalCompensation ?? null;
  const salaryCcy   = employee.salary?.currency || 'USD';
  const payFreq     = employee.salary?.payFrequency || null;
  const contract    = employee.contractType || null;

  const hireDate    = employee.hireDate ? new Date(employee.hireDate) : null;
  const hireDateStr = hireDate
    ? hireDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const nowMs        = Date.now();
  const tenureYears  = hireDate ? Math.floor((nowMs - hireDate) / (365.25 * 864e5)) : null;
  const tenureMonths = hireDate ? Math.floor(((nowMs - hireDate) / (30.44 * 864e5)) % 12) : null;
  const tenureStr    = (tenureYears != null && tenureYears >= 0)
    ? ([(tenureYears > 0 && `${tenureYears}y`), (tenureMonths > 0 && `${tenureMonths}mo`)].filter(Boolean).join(' ') || '< 1 mo')
    : null;

  const skills     = employee.skills?.length ? employee.skills : [];
  const hasAddress = employee.address?.city || employee.address?.country || employee.address?.street;
  const ws         = employee.workSchedule;

  const overviewItems = [
    { label: 'Status',        value: statusLabel,                        accent: isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
    { label: 'Contract',      value: contract?.replace(/-/g, ' ')        },
    { label: 'Work model',    value: ws?.type?.replace(/-/g, ' ')        },
    { label: 'Pay frequency', value: payFreq?.replace(/-/g, ' ')         },
  ].filter(r => r.value);

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in pb-16">

      {/* breadcrumb */}
      <div className="flex items-center justify-between mb-7">
        <button
          onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
          className="group flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
            <ArrowLeftIcon className="w-3.5 h-3.5" />
          </span>
          Team
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          Employee profile
        </span>
      </div>

      {/* ── ONE unified container ─── */}
      <div className="rounded-3xl overflow-hidden border border-gray-200/70 dark:border-gray-700/60 shadow-xl flex flex-col lg:flex-row">

        {/* ────────────────────── LEFT: dark identity panel ── */}
        <aside className="lg:w-72 xl:w-80 flex-shrink-0 flex flex-col p-8 xl:p-9"
          style={{ background: 'linear-gradient(160deg,#0d0d14 0%,#111118 60%,#0c0c16 100%)' }}
        >

          {/* avatar */}
          <div className="mb-7">
            <div className="relative w-[72px] h-[72px] rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold font-heading text-white">
                {initial}
              </span>
              {/* active dot */}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-[#0d0d14] ${
                  isActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>
            <h1 className="text-[1.1rem] font-bold font-heading text-white leading-tight">
              {name}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {employee.jobTitle || '—'}
            </p>
          </div>

          {/* divider */}
          <div className="border-t border-white/[0.07] mb-7" />

          {/* stats list */}
          <div className="space-y-5 flex-1">
            <SidebarStat icon={BuildingOfficeIcon} label="Department"   value={employee.department} />
            <SidebarStat icon={CalendarIcon}       label="Joined"       value={hireDateStr} />
            <SidebarStat icon={ClockIcon}          label="Tenure"       value={tenureStr} />
            <SidebarStat icon={BriefcaseIcon}      label="Employee ID"  value={employee.employeeId} />
          </div>

          {/* divider */}
          <div className="border-t border-white/[0.07] mt-7 mb-6" />

          {/* contact */}
          <div className="space-y-3">
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors min-w-0"
              >
                <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </a>
            )}
            {phone && (
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {!email && !phone && (
              <p className="text-xs text-gray-700">No contact info</p>
            )}
          </div>
        </aside>

        {/* ────────────────────── RIGHT: content panel ── */}
        <div className="flex-1 bg-white dark:bg-gray-900/60 divide-y divide-gray-100 dark:divide-gray-800/50 min-w-0">

          {/* overview */}
          <section className="px-8 xl:px-10 py-8">
            <SectionHeading>Overview</SectionHeading>
            {overviewItems.length > 0 ? (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-6">
                {overviewItems.map(({ label, value, accent }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-1">
                      {label}
                    </p>
                    <p className={`text-sm font-semibold capitalize leading-snug ${accent || 'text-gray-900 dark:text-white'}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No overview data available.</p>
            )}
          </section>

          {/* compensation */}
          {salaryBase != null && (
            <section className="px-8 xl:px-10 py-8">
              <SectionHeading>Compensation</SectionHeading>
              <div className="flex items-baseline gap-2.5 mb-2">
                <span className="text-5xl xl:text-6xl font-bold font-heading text-gray-900 dark:text-white tracking-tight leading-none">
                  {Number(salaryBase).toLocaleString()}
                </span>
                <span className="text-base font-medium text-gray-400 dark:text-gray-500 pb-1">
                  {salaryCcy}
                </span>
              </div>
              {payFreq && (
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-2">
                  {payFreq.replace(/-/g, ' ').toUpperCase()}
                </p>
              )}
            </section>
          )}

          {/* skills */}
          {skills.length > 0 && (
            <section className="px-8 xl:px-10 py-8">
              <SectionHeading>Skills</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 20).map((s, i) => {
                  const label = typeof s === 'object' ? s.name : s;
                  return (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/50"
                    >
                      {label}
                    </span>
                  );
                })}
                {skills.length > 20 && (
                  <span className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/50">
                    +{skills.length - 20}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* work schedule — shown only if skills section is absent */}
          {skills.length === 0 && ws && (ws.type || ws.hoursPerWeek != null) && (
            <section className="px-8 xl:px-10 py-8">
              <SectionHeading>Work schedule</SectionHeading>
              <div className="flex items-center gap-6">
                {ws.type && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-1">Model</p>
                    <p className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{ws.type.replace(/-/g, ' ')}</p>
                  </div>
                )}
                {ws.hoursPerWeek != null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-1">Hours</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ws.hoursPerWeek}h / week</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* address */}
          {hasAddress && (
            <section className="px-8 xl:px-10 py-8">
              <SectionHeading>Location</SectionHeading>
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {[
                    employee.address.street,
                    employee.address.city,
                    employee.address.state,
                    employee.address.zipCode,
                    employee.address.country
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </section>
          )}

          {/* empty state for right panel */}
          {overviewItems.length === 0 && salaryBase == null && skills.length === 0 && !hasAddress && (
            <section className="px-8 xl:px-10 py-12 text-center">
              <CodeBracketIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No additional details available.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
