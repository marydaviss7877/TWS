import React from 'react';
import ModuleStoryPage from '../ModuleStoryPage/ModuleStoryPage';

const data = {
  type: 'finance',
  name: 'Finance',
  headline: 'Every project has a number.',
  highlight: 'Now it has context.',
  lede: 'A financial core designed around service delivery—connecting time, milestones, payroll, receivables and project margin without spreadsheet archaeology.',
  proof: ['Double-entry foundation', 'Project-native costing', 'Audit-ready workflows'],
  cockpit: {
    eyebrow: 'Financial command center', title: 'Money in motion', action: 'Create invoice',
    stats: [
      { label: 'Revenue MTD', value: '$184K', change: '↑ 18.4%' },
      { label: 'Gross margin', value: '31.8%', change: '↑ 4.2%' },
      { label: 'Receivables', value: '$62K', change: '8 due soon' }
    ],
    panelTitle: 'Cash position', sideTitle: 'Finance queue',
    alerts: [['Atlas retainer', 'Invoice approved', 'Send'], ['AWS cloud', 'Expense variance', 'Review'], ['Nova milestone', 'Ready to bill', 'Open']]
  },
  tension: {
    title: 'Month-end is too late to discover the truth.',
    fragments: ['Time', 'Expenses', 'Payroll', 'Milestones', 'Ledger'],
    copy: 'When delivery data reaches finance through exports and messages, margin becomes historical trivia. TWS makes project economics operational and keeps the accounting trail intact.'
  },
  storyTitle: 'Financial clarity at the speed of delivery.',
  chapters: [
    { title: 'A ledger that understands projects.', copy: 'Revenue and cost keep their delivery context, from approved time to infrastructure expense.', points: ['Software-house chart of accounts', 'Project and department dimensions', 'Controlled journal workflows'] },
    { title: 'See cash before it becomes a crisis.', copy: 'Receivables, payables and commitments form one forward-looking cash picture.', points: ['Cash-flow forecasting', 'Aging and collection signals', 'Vendor approval cycles'] },
    { title: 'Turn approved work into revenue.', copy: 'Build accurate invoices from retainers, milestones and billable time without rebuilding evidence.', points: ['Milestone and recurring billing', 'Approval-backed invoice lines', 'Client-ready documents'] }
  ],
  systemTitle: 'Finance stops being the last department to know.',
  systemCopy: 'Projects provide approved work, HR provides people cost, and finance returns margin and cash signals to the same operating system.',
  orbit: ['Projects', 'Payroll', 'Clients', 'Audit'],
  finalTitle: 'Close the gap between work and money.',
  finalCopy: 'See what you earned, what it cost and what happens next—without waiting for another spreadsheet.'
};

export default function FinanceSystemPage() {
  return <ModuleStoryPage data={data} />;
}
