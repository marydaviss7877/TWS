import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';
import SoftwareHouseFooter from '../../../features/auth/components/SoftwareHouseFooter';
import { Timeline } from '../../../components/ui/Timeline/Timeline';
import './Changelog.css';

function UpdateList({ items }) {
  return (
    <ul className="changelog-update-list">
      {items.map((item) => (
        <li key={item}>
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const entries = [
  {
    title: 'August 2026',
    content: (
      <div>
        <p className="changelog-entry-lede">
          Introduced Nucleus, a central AI agent available across every workspace.
        </p>
        <UpdateList
          items={[
            'Launched Nucleus, a central AI agent replacing the old per-project assistant',
            'Added bulk task creation from Nucleus',
            'Redesigned the Nucleus interface, including a refreshed dark theme',
            'Rebranded to housesbase.com',
            'Added a "find your workspace" lookup by email on the login page',
            'Tightened role-based permissions and tenant session isolation platform-wide',
          ]}
        />
      </div>
    ),
  },
  {
    title: 'July 2026',
    content: (
      <div>
        <p className="changelog-entry-lede">
          Sheets shipped, plus a round of updates to Portfolio, Finance, and HR.
        </p>
        <UpdateList
          items={[
            'Launched Sheets — spreadsheets built directly into your workspace',
            'Added xlsx import and export to Sheets',
            'Expanded the Portfolio, Finance, and HR modules',
            'Hardened document exports with sanitized HTML and safer external links',
            'Refreshed the shared UI system across the app',
          ]}
        />
      </div>
    ),
  },
  {
    title: 'May 2026',
    content: (
      <div>
        <p className="changelog-entry-lede">Cleaner workspace URLs across the board.</p>
        <UpdateList
          items={[
            'Workspace URLs simplified — no more slug/org clutter in the path',
            'Tenant workspaces now resolve entirely from your subdomain',
          ]}
        />
      </div>
    ),
  },
  {
    title: 'April 2026',
    content: (
      <div>
        <p className="changelog-entry-lede">
          A navigation and admin overhaul, plus a friendlier Finance module.
        </p>
        <UpdateList
          items={[
            'Redesigned org navigation and the admin dashboard',
            'Finance: invoices and bills moved from popups to full-page forms',
            'Added permission and role catalogs, plus idle-session protection',
          ]}
        />
      </div>
    ),
  },
];

export default function Changelog() {
  return (
    <div className="changelog-page">
      <SoftwareHouseNavbar isDarkMode={false} fixed showThemeToggle={false} />
      <main className="changelog-main">
        <section className="changelog-hero">
          <span className="changelog-eyebrow">RELEASE NOTES</span>
          <h1>What&apos;s new in TWS</h1>
          <p>Everything we&apos;ve shipped for your workspace, most recent first.</p>
        </section>
        <Timeline
          title="Changelog"
          description="A running record of what shipped, updated whenever something new goes out."
          data={entries}
        />
      </main>
      <SoftwareHouseFooter moduleName="Changelog" />
    </div>
  );
}
