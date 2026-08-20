export const productGroups = [
  {
    title: 'Plan & Deliver',
    items: [
      ['Projects', '/product/projects', 'Plan client and internal projects.'],
      ['Tasks', '/product/projects', 'Assign, prioritize and track work.'],
      ['Kanban & Boards', '/product/projects', 'Visualize work across flexible boards.'],
      ['Sprints', '/product/projects', 'Organize iterative delivery cycles.'],
      ['Gantt & Timeline', '/product/projects', 'Understand schedules and milestones.'],
      ['Time Tracking', '/product/projects', 'Connect work with time spent.'],
    ],
  },
  {
    title: 'Manage Your Team',
    items: [
      ['Employees', '/product/people', 'Maintain your employee workspace.'],
      ['Attendance', '/product/people', 'Track daily attendance and patterns.'],
      ['Leave', '/product/people', 'Manage leave and requests.'],
      ['Teams & Departments', '/product/people', 'Structure people around operations.'],
      ['Payroll', '/product/people', 'Connect people with payroll workflows.'],
    ],
  },
  {
    title: 'Run the Business',
    items: [
      ['Finance', '/product/finance', 'Manage financial operations.'],
      ['Billing', '/product/finance', 'Keep billing close to delivery.'],
      ['Expenses', '/product/finance', 'Track operational spending.'],
      ['Budgets', '/product/finance', 'Plan company spending.'],
      ['Clients', '/product/clients', 'Manage client operations.'],
      ['Partners', '/product/clients', 'Maintain business relationships.'],
    ],
  },
  {
    title: 'Work & Knowledge',
    items: [
      ['Documents', '/product/documents', 'Create and organize documents.'],
      ['Sheets', '/product/documents', 'Work with spreadsheets in HousesBase.'],
      ['Forms', '/product/documents', 'Capture structured information.'],
      ['Files', '/product/documents', 'Keep files connected to operations.'],
      ['Templates', '/product/documents', 'Standardize recurring processes.'],
    ],
  },
  {
    title: 'Intelligence',
    items: [
      ['Nucleus AI', '/product/nucleus', 'AI-assisted project operations.'],
      ['Analytics', '/product/nucleus', 'Understand operational activity.'],
      ['Notifications', '/product', 'Stay informed about important changes.'],
    ],
  },
];

export const solutionGroups = [
  {
    title: 'By Company',
    items: [
      ['Software Houses', '/solutions/software-houses', 'Built around software-company workflows.'],
      ['Digital Agencies', '/solutions/digital-agencies', 'Connect clients, delivery and operations.'],
      ['IT Service Companies', '/solutions/software-houses', 'Coordinate people, delivery and business.'],
    ],
  },
  {
    title: 'By Team',
    items: [
      ['Project Teams', '/product/projects', 'Plan and deliver work.'],
      ['Operations', '/product', 'See how the company is running.'],
      ['HR Teams', '/product/people', 'Manage people and workforce operations.'],
      ['Finance Teams', '/product/finance', 'Connect finance with operations.'],
      ['Leadership', '/product', 'See the company from one platform.'],
    ],
  },
];

export const footerNavigation = [
  ['Product', [['Overview', '/product'], ['Projects', '/product/projects'], ['People & HR', '/product/people'], ['Finance', '/product/finance'], ['Clients', '/product/clients'], ['Documents & Sheets', '/product/documents'], ['Nucleus', '/product/nucleus']]],
  ['Solutions', [['Software Houses', '/solutions/software-houses'], ['Digital Agencies', '/solutions/digital-agencies']]],
  ['Resources', [['Resources', '/resources'], ['Changelog', '/changelog'], ['Security', '/security']]],
  ['Company', [['About', '/about'], ['Contact', '/contact']]],
  ['Account', [['Log in', '/login'], ['Find workspace', '/login']]],
];

export const modulePages = {
  projects: {
    eyebrow: 'Projects & Delivery',
    title: "Projects don't run in isolation.",
    intro: 'Plan work, coordinate teams and keep delivery connected to the rest of your company.',
    sections: [
      ['Plan the work', 'Projects, milestones, deliverables and timelines give every engagement a clear shape.'],
      ['Organize execution', 'Move work through tasks, lists, boards, dependencies and project templates.'],
      ['Deliver iteratively', 'Run sprints and keep changing priorities visible to the whole delivery team.'],
      ['Understand responsibility', 'Connect project members and access to the work each person owns.'],
      ['Keep change visible', 'Track change requests, approvals and delivery history alongside the project.'],
      ['Add intelligence', 'Use Nucleus to work with project context and support day-to-day planning.'],
    ],
    features: ['Projects', 'Tasks', 'Boards', 'Lists', 'Sprints', 'Milestones', 'Deliverables', 'Timelines', 'Gantt', 'Dependencies', 'Change requests', 'Time tracking'],
  },
  people: {
    eyebrow: 'People & HR',
    title: 'Manage the people behind every project.',
    intro: 'Bring employee records, attendance, leave, teams, departments and workforce operations into the same company system.',
    sections: [
      ['Employee management', 'Give every employee a clear place in the company workspace.'],
      ['Attendance', 'Keep daily attendance and working patterns connected to people operations.'],
      ['Leave management', 'Handle requests and decisions with the right company context.'],
      ['Departments', 'Reflect how your organization is actually structured.'],
      ['Teams', 'Organize people around delivery and company responsibilities.'],
      ['Payroll workflows', 'Keep payroll-related work closer to employee operations.'],
    ],
    features: ['Employees', 'Attendance', 'Leave', 'Departments', 'Teams', 'Payroll workflows', 'Workforce visibility'],
  },
  finance: {
    eyebrow: 'Finance',
    title: 'Keep finance connected to operations.',
    intro: 'Bring billing, expenses, budgets, payroll and finance closer to the people, clients and projects driving the business.',
    sections: [
      ['Financial overview', 'Understand finance in the context of the company operating it.'],
      ['Billing', 'Keep billing information close to clients and delivered work.'],
      ['Expenses', 'Record operational spending without losing its business context.'],
      ['Budgets', 'Plan spending alongside the teams and projects it supports.'],
      ['Payroll', 'Connect payroll workflows with employee operations.'],
      ['Client and project context', 'See the relationships behind financial activity.'],
    ],
    features: ['Finance overview', 'Billing', 'Expenses', 'Budgets', 'Payroll', 'Client context', 'Project context'],
  },
  clients: {
    eyebrow: 'Client Operations',
    title: 'Connect client relationships with the work you deliver.',
    intro: 'Keep client information, project relationships, approvals and sales material in the same operational system.',
    sections: [
      ['Client management', 'Give client information a structured home beside delivery.'],
      ['Project relationships', 'Connect each client to the projects and work that matter.'],
      ['Client portal', 'Create a focused client-facing path into relevant project activity.'],
      ['Partners', 'Maintain the business relationships that support delivery.'],
      ['Portfolio library', 'Organize internal case-study and sales-enablement material.'],
      ['Sales workflows', 'Keep growth activity closer to operational context.'],
    ],
    features: ['Clients', 'Partners', 'Project relationships', 'Client portal', 'Portfolio library', 'Sales workflows'],
  },
  documents: {
    eyebrow: 'Work & Knowledge',
    title: 'Keep company knowledge inside the company workspace.',
    intro: 'Create documents, spreadsheets and forms where company operations already happen.',
    sections: [
      ['Documents', 'Create rich documents with folders, versions, comments, tags, sharing and audit history.'],
      ['Sheets', 'Work with spreadsheets, XLSX import and export, versions, folders, tags and sharing.'],
      ['Forms', 'Capture structured responses through reusable form templates.'],
      ['Files with context', 'Keep operational files near the projects, teams and processes they support.'],
    ],
    features: ['Rich documents', 'Folders', 'Versions', 'Comments', 'Tags', 'Sharing', 'Spreadsheets', 'XLSX import/export', 'Forms', 'Audit history'],
  },
  nucleus: {
    eyebrow: 'HousesBase Intelligence',
    title: 'Project intelligence where the work already lives.',
    intro: 'Nucleus brings AI-assisted project workflows into HousesBase so teams can organize actions and support planning without switching systems.',
    sections: [
      ['Project context', 'Work with information already connected to your projects.'],
      ['Task assistance', 'Turn requirements and ideas into more organized work.'],
      ['Planning assistance', 'Use project context to support everyday planning decisions.'],
      ['Bulk task workflows', 'Prepare and organize multiple project actions together.'],
      ['Analytics assistance', 'Work with available project activity and operational context.'],
      ['Conversation history', 'Return to useful project conversations when context matters.'],
    ],
    features: ['Project context', 'Task assistance', 'Planning assistance', 'Bulk workflows', 'Analytics assistance', 'Conversation history', 'Usage-aware AI'],
    nucleus: true,
  },
};

export const pageMetadata = {
  '/': ['HousesBase | The operating base for software houses', 'Run projects, people, clients, finance and operations from one connected platform.'],
  '/product': ['HousesBase Platform | Connected software-house operations', 'Explore the HousesBase platform for delivery, people, finance, clients, knowledge and AI-assisted project work.'],
  '/pricing': ['HousesBase Pricing | Plans for growing software companies', 'Talk to HousesBase about a setup that fits your software company.'],
  '/security': ['HousesBase Security | Security designed into the platform', 'Learn how security is considered across authentication, authorization, workspace isolation, validation and monitoring.'],
  '/about': ['About HousesBase | One base for software companies', 'Learn why HousesBase brings the business behind software delivery into one operational platform.'],
  '/contact': ['Contact HousesBase', 'Talk with HousesBase about how your software company operates.'],
};
