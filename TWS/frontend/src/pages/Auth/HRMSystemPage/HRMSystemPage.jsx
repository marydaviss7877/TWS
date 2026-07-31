import React from 'react';
import ModuleStoryPage from '../ModuleStoryPage/ModuleStoryPage';

const data = {
  type: 'hrm',
  name: 'HRM',
  headline: 'People operations that know',
  highlight: 'how work gets done.',
  lede: 'A people system for software houses—connecting employee records, attendance, leave, payroll, performance and project capacity in one responsible workflow.',
  proof: ['Employee self-service', 'Policy-aware attendance', 'Payroll separation of duties'],
  cockpit: {
    eyebrow: 'People command center', title: 'Team operating picture', action: 'Add employee',
    stats: [
      { label: 'Team members', value: '84', change: '4 joined recently' },
      { label: 'Present today', value: '91%', change: 'Across 6 teams' },
      { label: 'Capacity', value: '82%', change: 'Healthy range' }
    ],
    panelTitle: 'Capacity by function', sideTitle: 'People queue',
    alerts: [['Sarah Khan', 'Onboarding · day 3', 'View'], ['Design team', '2 leave overlaps', 'Review'], ['July payroll', '34 verified', 'Open']]
  },
  tension: {
    title: 'A person is more than a row in payroll.',
    fragments: ['Hiring', 'Attendance', 'Leave', 'Projects', 'Payroll'],
    copy: 'Generic HR tools store employee data but miss delivery reality. TWS connects policy and people operations to the teams, projects and financial responsibilities they support.'
  },
  storyTitle: 'A continuous employee journey—not disconnected forms.',
  chapters: [
    { title: 'One responsible employee record.', copy: 'From offer to role, documents, department and access, every change stays traceable.', points: ['Structured onboarding and offboarding', 'Documents and employment history', 'Role-based data visibility'] },
    { title: 'Time with policy and context.', copy: 'Attendance, shifts, remote work and leave become a reliable operational signal—not manual policing.', points: ['Flexible work criteria', 'Leave balance and approvals', 'Capacity impact visibility'] },
    { title: 'Payroll that reconciles itself.', copy: 'Verified attendance, leave and adjustments flow into a controlled payroll process connected to finance.', points: ['Pay cycles and salary slips', 'Separation of HR and payroll duties', 'Finance-ready payroll posting'] }
  ],
  systemTitle: 'People data becomes useful beyond HR.',
  systemCopy: 'Projects understand capacity, finance understands people cost, and employees get a clean self-service experience without exposing sensitive controls.',
  orbit: ['Projects', 'Finance', 'Employees', 'Access'],
  finalTitle: 'Run people operations with dignity and clarity.',
  finalCopy: 'Less chasing, less duplication, and a better operating experience for HR, managers and every employee.'
};

export default function HRMSystemPage() {
  return <ModuleStoryPage data={data} />;
}
