import React from 'react';
import ModuleStoryPage from '../ModuleStoryPage/ModuleStoryPage';

const data = {
  type: 'projects',
  name: 'Projects',
  headline: 'From scope to shipped.',
  highlight: 'Nothing gets lost.',
  lede: 'A delivery operating system for software houses—where scope, sprints, people, approvals and project economics stay connected from kickoff to invoice.',
  proof: ['Built for client delivery', 'Agile and milestone workflows', 'Margin-aware by design'],
  cockpit: {
    eyebrow: 'Delivery command center', title: 'Projects in motion', action: 'New project',
    stats: [
      { label: 'Active delivery', value: '17', change: '↑ 3 this quarter' },
      { label: 'On-time rate', value: '92%', change: '↑ 6.4%' },
      { label: 'Team capacity', value: '84%', change: 'Balanced' }
    ],
    panelTitle: 'Sprint 24 · Platform', sideTitle: 'Needs attention',
    alerts: [['Atlas Mobile', 'Scope approval', 'Today'], ['Orbit CRM', 'Budget at 82%', 'Review'], ['Nova Labs', 'QA gate ready', 'Open']]
  },
  tension: {
    title: 'Delivery breaks between the tools.',
    fragments: ['Brief', 'Tasks', 'Timesheets', 'Approvals', 'Invoice'],
    copy: 'A project can look green in the task board while its budget quietly burns somewhere else. TWS keeps the operational chain intact, so every decision carries its scope, time and financial impact.'
  },
  storyTitle: 'One project truth, from promise to profit.',
  chapters: [
    { title: 'Plan reality, not just dates.', copy: 'Build scope around deliverables, dependencies and actual team capacity. The timeline changes when the work changes.', points: ['Templates for common software engagements', 'Gantt, milestones and dependency logic', 'Live resource capacity'] },
    { title: 'Make change visible.', copy: 'Turn every client request into a traceable decision—not a voice note that quietly expands the sprint.', points: ['Impact on cost and delivery date', 'Sequential approval workflows', 'Client-facing status without internal noise'] },
    { title: 'Know the economics while delivering.', copy: 'Billable time, cost and approved scope meet inside the project—before month-end tells you what already went wrong.', points: ['Live project costing', 'Timesheets linked to work', 'Invoice-ready milestones'] }
  ],
  capabilityTitle: 'Everything required to operate delivery.',
  capabilityCopy: 'The module covers the full control surface: portfolio setup, daily execution, delivery governance, client acceptance and operational intelligence.',
  workspaceViews: ['Overview', 'Board', 'Team', 'Calendar', 'Gantt', 'Timeline', 'Activity', 'Workload', 'Table'],
  capabilityGroups: [
    { title: 'Portfolio & project setup', copy: 'Create structured engagements and keep their commercial and client context intact.', items: ['Project type, priority and methodology', 'Client, dates, currency and budget', 'Branding, settings and project members', 'Portfolio metrics and health states'] },
    { title: 'Tasks & execution', copy: 'Run daily work through flexible task views without duplicating the underlying truth.', items: ['Kanban board and quick task creation', 'Assignees, priority, status and due dates', 'Table, calendar and timeline views', 'Context validation and task synchronization'] },
    { title: 'Sprints & agile delivery', copy: 'Move work deliberately from planning into active delivery and measure the result.', items: ['Sprint planning, activation and closure', 'Backlog-to-sprint task context', 'Completion percentage and velocity', 'Active and planned sprint visibility'] },
    { title: 'Gantt & milestones', copy: 'Model the delivery sequence, expose dependencies and protect promised dates.', items: ['Interactive Gantt timeline', 'Task dependencies and critical path', 'Task rescheduling and saved settings', 'Milestone progress and date states'] },
    { title: 'Team, capacity & time', copy: 'Connect accountable people and billable effort directly to project work.', items: ['Owner, manager, contributor and viewer roles', 'Member allocation and resource pool', 'Workload and capacity visibility', 'Timesheet submission and estimated-hours burn'] },
    { title: 'Deliverable control', copy: 'Treat deliverables as governed client outcomes—not renamed task lists.', items: ['Deliverable lifecycle and status control', 'Link and unlink supporting tasks', 'At-risk and date-validation alerts', 'Formal shipping action and history'] },
    { title: 'Approvals & change requests', copy: 'Keep acceptance, scope movement and commercial impact traceable end to end.', items: ['Sequential internal and client approval chains', 'Personal approval queue with approve/reject', 'Acknowledge, evaluate and decide changes', 'Complete change-request audit trail'] },
    { title: 'Analytics & client visibility', copy: 'Give every audience the right level of truth, from leadership to the customer.', items: ['Project health and at-risk analytics', 'Deliverable burndown and sprint velocity', 'Activity history and integration status', 'Client portal for projects and deliverables'] }
  ],
  governanceFlow: ['Work completed', 'Deliverable prepared', 'Date validated', 'Approval chain', 'Client decision', 'Ship'],
  systemTitle: 'Projects become the spine of the operation.',
  systemCopy: 'Delivery decisions update capacity, costing, approvals and billing. That is the difference between managing tasks and operating a software house.',
  orbit: ['People', 'Finance', 'Clients', 'Documents'],
  finalTitle: 'Ship with control. Not bureaucracy.',
  finalCopy: 'Give teams clarity, give clients confidence, and give leadership the complete delivery picture.'
};

export default function ProjectSystemPage() {
  return <ModuleStoryPage data={data} />;
}
