import React from 'react';
import { MarketingLayout, Reveal } from '../../../marketing/components/MarketingShell';

const entries = [
  {
    date: 'August 2026',
    title: 'Nucleus arrives across HousesBase',
    category: 'New',
    summary: 'A central AI assistant for project work, plus workspace discovery and stronger session isolation.',
    changes: [
      'Launched Nucleus as a central assistant across the company workspace',
      'Added bulk task creation from Nucleus',
      'Refreshed the Nucleus interface',
      'Moved the public brand to housesbase.com',
      'Added workspace discovery by work email',
      'Tightened role-aware access and workspace session isolation',
    ],
  },
  {
    date: 'July 2026',
    title: 'Sheets joins the workspace',
    category: 'New',
    summary: 'Spreadsheets now live beside documents, projects and company operations.',
    changes: [
      'Launched Sheets inside HousesBase',
      'Added XLSX import and export',
      'Expanded Portfolio, Finance and HR workflows',
      'Improved document exports with sanitized HTML and safer external links',
      'Refreshed the shared interface system',
    ],
  },
  {
    date: 'May 2026',
    title: 'Cleaner workspace addresses',
    category: 'Improved',
    summary: 'Company workspaces now use simpler paths built around their own subdomain.',
    changes: ['Simplified workspace URLs', 'Resolved company workspaces directly from their subdomain'],
  },
  {
    date: 'April 2026',
    title: 'Navigation and administration refresh',
    category: 'Improved',
    summary: 'A clearer operating shell and more focused Finance workflows.',
    changes: [
      'Redesigned company navigation and the administration dashboard',
      'Moved invoices and bills from popups to full-page forms',
      'Added permission and role catalogs with idle-session protection',
    ],
  },
];

export default function Changelog() {
  return (
    <MarketingLayout title="HousesBase Changelog" description="New, improved and fixed across HousesBase.">
      <section className="mk-page-hero">
        <div className="mk-shell"><Reveal><p className="mk-eyebrow">Changelog</p><h1>What is new in HousesBase.</h1><p>Customer-facing updates to the platform, most recent first.</p></Reveal></div>
      </section>
      <section className="mk-section">
        <div className="mk-shell mk-changelog">
          {entries.map((entry) => (
            <Reveal as="article" key={entry.date}>
              <div><time>{entry.date}</time><span>{entry.category}</span></div>
              <div><h2>{entry.title}</h2><p>{entry.summary}</p><ul>{entry.changes.map((change) => <li key={change}>{change}</li>)}</ul></div>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
