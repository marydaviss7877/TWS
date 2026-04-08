/**
 * TWS ERP — First-Login Tutorial Steps
 *
 * Each step has:
 *   key         – unique identifier
 *   title       – bold heading shown in the card
 *   body        – descriptive paragraph
 *   target      – CSS selector for the element to spotlight (null = centered modal)
 *   position    – where to place the tooltip relative to the target:
 *                 'center' | 'bottom' | 'top' | 'bottom-left' | 'bottom-right'
 *   illustration – optional emoji shown large at the top of the card
 */

export const TUTORIAL_STEPS = [
  {
    key: 'welcome',
    title: 'Welcome to TWS ERP! 👋',
    body: "You're all set up. Let's take a quick 2-minute tour so you know your way around. You can skip at any time.",
    target: null,
    position: 'center',
    illustration: '🎉',
  },
  {
    key: 'app-home',
    title: 'Your App Home',
    body: 'This is your home screen. Every module your organisation has access to appears here as an app card. Click any card to open that module.',
    target: '[data-tutorial="app-grid"]',
    position: 'top',
  },
  {
    key: 'home-btn',
    title: 'Home Button',
    body: 'The org logo in the top-left corner is your home button. Click it from anywhere in the ERP to return to this app grid.',
    target: '[data-tutorial="home-btn"]',
    position: 'bottom',
  },
  {
    key: 'top-bar-nav',
    title: 'App Sub-Navigation',
    body: "Once you open an app, its pages appear as tabs here in the top bar — for example: Projects → Tasks, Kanban, Sprints, Reports.",
    target: '[data-tutorial="top-bar"]',
    position: 'bottom',
  },
  {
    key: 'search',
    title: 'Smart Search  ⌘K',
    body: 'Press Ctrl+K (or ⌘K on Mac) from anywhere to instantly search apps, pages, people, and commands across the entire platform.',
    target: '[data-tutorial="search-btn"]',
    position: 'bottom',
  },
  {
    key: 'quick-add',
    title: 'Quick Add  +',
    body: 'Tap "+ New" to instantly create a task, project, or user — or log time — without navigating away from your current view.',
    target: '[data-tutorial="quick-add"]',
    position: 'bottom-left',
  },
  {
    key: 'user-menu',
    title: 'Profile & Settings',
    body: 'Your profile, org settings, billing, and sign-out are all here. Admins can also manage users, roles, and permissions from Settings.',
    target: '[data-tutorial="user-menu"]',
    position: 'bottom-left',
  },
  {
    key: 'favourites',
    title: 'Pin Your Favourites ⭐',
    body: 'Hover any app card and click the ⭐ star to pin it. Pinned apps appear at the top of this screen and in the bookmark bar below the top bar for one-click access.',
    target: '[data-tutorial="app-grid"]',
    position: 'top',
  },
  {
    key: 'departments',
    title: 'Step 1 — Set Up Departments 🏢',
    body: 'Before adding employees or creating projects, set up your departments (e.g. Engineering, HR, Finance). Everything in the ERP is scoped to a department.',
    target: null,
    position: 'center',
    illustration: '🏢',
  },
  {
    key: 'employees',
    title: 'Step 2 — Add Your Team 👥',
    body: "Invite employees via HR → Users. Assign them a department, role, and job title. They'll each get a login to their own employee portal.",
    target: null,
    position: 'center',
    illustration: '👥',
  },
  {
    key: 'projects',
    title: 'Step 3 — Create Projects 📋',
    body: 'In the Projects module, create a project, assign a department and team, then break it into sprints and manage tasks on a Kanban board.',
    target: null,
    position: 'center',
    illustration: '📋',
  },
  {
    key: 'finance',
    title: 'Finance & Payroll 💰',
    body: 'Track invoices, expenses, and project costs in Finance. Run payroll for your team from HR → Payroll. Get real-time financial reports at a glance.',
    target: null,
    position: 'center',
    illustration: '💰',
  },
  {
    key: 'done',
    title: "You're all set! 🚀",
    body: "That's the full tour! Explore freely — every app works independently. Pin your favourites with ⭐, and use ⌘K to search anything. Happy building!",
    target: null,
    position: 'center',
    illustration: '🎊',
  },
];
