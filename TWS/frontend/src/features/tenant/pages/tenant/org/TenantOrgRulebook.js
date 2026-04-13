import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ClockIcon,
  LockClosedIcon,
  UserGroupIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import {
  TENANT_IDLE_LOGOUT_MINUTES,
  TENANT_IDLE_WARNING_MINUTES,
  TENANT_ACCESS_TOKEN_MINUTES,
  TENANT_REFRESH_SESSION_DAYS,
} from '../../../constants/tenantSessionPolicy';

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
    <div className="flex items-start gap-3 mb-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white pt-1">{title}</h2>
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2">
      {children}
    </div>
  </section>
);

/**
 * Organization rule book — shared policy page for every tenant workspace.
 * Copy is aligned with tenantSessionPolicy.js and typical backend JWT defaults.
 */
const TenantOrgRulebook = () => {
  const { tenantSlug } = useParams();
  const home = `/${tenantSlug}/org/dashboard`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium mb-2">
          <BookOpenIcon className="w-4 h-4" aria-hidden />
          <span>Workspace policy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Organization rule book
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          This page applies to everyone using this organization&apos;s portal. It explains how sessions,
          sign-in, and security controls work so teams know what to expect.
        </p>
      </div>

      <Section icon={ClockIcon} title="Session and inactivity">
        <p>
          After <strong>{TENANT_IDLE_LOGOUT_MINUTES} minutes</strong> without interaction (mouse, touch,
          keyboard, or scrolling in this browser tab), you may be signed out automatically for security.
        </p>
        <p>
          When you are close to the limit, you will see a warning for up to{' '}
          <strong>{TENANT_IDLE_WARNING_MINUTES} minutes</strong> (or less if you were already idle when the
          warning appears). Choose <strong>Stay signed in</strong> to reset the timer without losing your place.
        </p>
        <ul>
          <li>
            <strong>Access tokens</strong> (typical default <strong>{TENANT_ACCESS_TOKEN_MINUTES} minutes</strong>)
            are refreshed in the background while you work. If a request fails with an expired session, the app
            tries to refresh before asking you to sign in again.
          </li>
          <li>
            <strong>Longer sessions</strong> depend on the server refresh policy (often on the order of{' '}
            <strong>{TENANT_REFRESH_SESSION_DAYS} days</strong> unless your administrator changes it). Idle logout
            can still apply sooner.
          </li>
        </ul>
      </Section>

      <Section icon={LockClosedIcon} title="Sign-in and sign-out">
        <ul>
          <li>
            Signing out clears your session with the server and removes refresh credentials where the product is
            configured to do so. Close all browser tabs on shared computers after you finish.
          </li>
          <li>
            Use only your own account. Sharing passwords or bypassing authentication puts the organization at risk.
          </li>
          <li>
            The live site should always be used over <strong>HTTPS</strong> so traffic between your browser and the
            service is encrypted.
          </li>
        </ul>
      </Section>

      <Section icon={ShieldCheckIcon} title="Data and acceptable use">
        <ul>
          <li>Follow your organization&apos;s internal policies for customer data, HR data, and finance records.</li>
          <li>
            Role and permission changes are enforced by the server. If something looks wrong after a role change,
            sign out and sign back in, then contact an administrator.
          </li>
          <li>
            This rule book describes product behaviour; it does not replace employment contracts, NDAs, or
            regulatory obligations your company already follows.
          </li>
        </ul>
      </Section>

      <Section icon={UserGroupIcon} title="Getting help">
        <p>
          If you are signed out unexpectedly, check your network connection, then sign in again. If the problem
          repeats, contact your workspace administrator with the approximate time and what you were doing.
        </p>
      </Section>

      <p className="text-xs text-gray-500 dark:text-gray-500">
        Policy values for idle timeout and warnings are defined in application configuration and may be updated as
        the product evolves. Numeric defaults on this page match the current portal configuration.
      </p>

      <Link
        to={home}
        className="inline-flex text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
};

export default TenantOrgRulebook;
