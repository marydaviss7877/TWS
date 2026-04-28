import React from 'react';
import { Link } from 'react-router-dom';
import {
  ComputerDesktopIcon,
  CodeBracketIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PlayIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { motion, MotionConfig, useScroll } from 'framer-motion';
import { useTheme } from '../../../app/providers/ThemeContext';
import SoftwareHouseNavbar from '../components/SoftwareHouseNavbar';
import './tws-finance-design.css';
import './SoftwareHousePremium.css';

const MANY_TABS = [
  'Jira', 'Slack', 'HR Portal', 'Time Tracker', 'Billing', 'GitHub',
  'Email', 'Docs', 'Payroll', 'Projects', 'Clients', '...'
];

const SoftwareHouseLanding = () => {
  const { isDarkMode } = useTheme();
  const { scrollYProgress } = useScroll();

  const features = [
    { icon: CodeBracketIcon, title: 'Project Management', description: 'Agile/Scrum, sprints, backlog', color: 'from-purple-500 to-purple-700' },
    { icon: ClockIcon, title: 'Time Tracking', description: 'Billable hours, client logs', color: 'from-blue-500 to-blue-700' },
    { icon: UserGroupIcon, title: 'Team & HR', description: 'Payroll, attendance, reviews', color: 'from-green-500 to-green-700' },
    { icon: CurrencyDollarIcon, title: 'Finance (full system)', description: 'AP, AR, invoicing, budgeting, expenses, cash flow, project costing, financial reports—all in one tab', color: 'from-emerald-500 to-emerald-700', detailUrl: '/software-house/finance' },
    { icon: ShieldCheckIcon, title: 'Code Quality', description: 'Reviews, metrics', color: 'from-red-500 to-red-700' },
    { icon: ChartBarIcon, title: 'Analytics & Reports', description: 'Projects, finance KPIs, insights', color: 'from-yellow-500 to-yellow-700' },
    { icon: ComputerDesktopIcon, title: 'Client Portal', description: 'Projects, invoices, comms', color: 'from-indigo-500 to-indigo-700' }
  ];

  const modules = [
    { name: 'Projects', icon: '📋' }, { name: 'Sprints', icon: '🎯' }, { name: 'Time', icon: '⏱️' },
    { name: 'HR & Payroll', icon: '💼' }, { name: 'Finance', icon: '💰' }, { name: 'Accounts Payable', icon: '📤' }, { name: 'Accounts Receivable', icon: '📥' },
    { name: 'Invoicing', icon: '🧾' }, { name: 'Budgeting', icon: '📊' }, { name: 'Expenses', icon: '💳' }, { name: 'Cash Flow', icon: '🌊' },
    { name: 'Financial Reports', icon: '📈' }, { name: 'Project Costing', icon: '🔢' }, { name: 'Clients', icon: '🤝' }, { name: 'Docs', icon: '📚' }
  ];

  const stats = [
    { value: '500+', label: 'Software Houses' },
    { value: '50k+', label: 'Active Projects' },
    { value: '30%', label: 'Time Saved' },
    { value: '99.9%', label: 'Uptime' }
  ];

  const Section = ({ id, chapterLabel, children, className = '', timelineNode = false }) => (
    <section id={id} className={`relative ${timelineNode ? 'md:pl-16 lg:pl-20' : ''} ${className}`}>
      {timelineNode && (
        <div
          className="tws-timeline-dot absolute left-6 md:left-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 shadow z-10 hidden md:block"
          style={{ marginLeft: '-6px' }}
          aria-hidden
        />
      )}
      {chapterLabel && (
        <span className="block text-xs font-semibold uppercase tracking-widest mb-4 font-sora" style={{ color: 'var(--tws-accent)' }}>
          {chapterLabel}
        </span>
      )}
      {children}
    </section>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div className={`tws-landing-page tws-dot-grid min-h-screen relative${!isDarkMode ? ' day-mode' : ''}`} style={{ background: 'var(--tws-bg-primary)', color: 'var(--tws-text-primary)' }}>
      {/* Scroll progress — accent */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-[60]" style={{ background: 'var(--tws-border)' }} aria-hidden>
        <motion.div
          className="h-full origin-left"
          style={{ scaleX: scrollYProgress, background: 'var(--tws-accent)' }}
        />
      </div>

      <SoftwareHouseNavbar isDarkMode={isDarkMode} fixed />

      {/* Story timeline: vertical line connecting chapters 1–5 */}
      <div className="relative">
        <div
          className="tws-timeline-line absolute left-6 md:left-8 top-0 bottom-0 w-0.5 z-0 hidden md:block"
          style={{ marginLeft: '-1px' }}
          aria-hidden
        />
        {/* Chapter 1 — The Entropy (Designed Mockup) */}
        <section className="sh-premium-entropy min-h-screen relative overflow-hidden">
          <div className="sh-noise-overlay" />
          <div className="sh-glow-orb sh-glow-orb-1" />
          <div className="sh-glow-orb sh-glow-orb-2" />

          {/* Chaos Elements Floating in Background */}
          <div className="sh-entropy-grid">
            {[
              { id: 1, text: 'Jira: 42 tickets waiting', icon: '🎟️', color: 'rgba(57, 126, 243, 0.1)' },
              { id: 2, text: 'Slack: @here is anyone online?', icon: '💬', color: 'rgba(232, 28, 79, 0.1)' },
              { id: 3, text: 'GitHub: 15 failing PRs', icon: '🐙', color: 'rgba(255, 255, 255, 0.05)' },
              { id: 4, text: 'Time: Billable gap found', icon: '⏱️', color: 'rgba(247, 185, 85, 0.1)' },
              { id: 5, text: 'Billing: Unsent invoice', icon: '🧾', color: 'rgba(52, 211, 153, 0.1)' },
              { id: 6, text: 'Context Switch: High', icon: '🧠', color: 'rgba(244, 114, 182, 0.1)' },
            ].map((item) => (
              <motion.div
                key={item.id}
                className={`sh-floating-card sh-chaos-item-${item.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 2
                }}
              >
                <div className="sh-icon-box" style={{ backgroundColor: item.color }}>{item.icon}</div>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="sh-entropy-container container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <span className="block text-xs font-bold uppercase tracking-widest mb-6 opacity-60 font-sora">
                Chapter 01: The Fragmentation
              </span>
              <h1 className="sh-entropy-title text-6xl md:text-8xl lg:text-9xl mb-8">
                Work today <br />
                <span className="italic">is broken.</span>
              </h1>
              <p className="sh-entropy-subtitle text-lg md:text-xl md:px-0 px-4">
                Developers juggle an average of 12 tools daily. Each tab is a distraction. Each context switch is a 20-minute cognitive tax. Complexity has outpaced the dashboard.
              </p>
            </motion.div>

            <motion.div
              className="sh-glass-tabs"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="sh-tab-strip">
                {['Jira', 'Slack', 'GitHub', 'Linear', 'Loom', 'Figma', 'Stripe', 'TWS'].map((t, i) => (
                  <div key={t} className={`sh-tab ${t === 'TWS' ? 'active' : ''}`}>
                    <div className="w-2 h-2 rounded-full" style={{ background: t === 'TWS' ? 'var(--tws-accent)' : 'rgba(255,255,255,0.2)' }} />
                    {t}
                  </div>
                ))}
              </div>
              <div className="sh-tab-content-mock">
                <div className="text-center px-6">
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-xs uppercase tracking-widest text-[#4F6EF7] font-bold mb-4"
                  >
                    7 separate tools. 1 workflow.
                  </motion.div>
                  <div className="flex gap-2 justify-center mb-6">
                    {[1, 2, 3, 4, 5].map(i => (
                      <motion.div
                        key={i}
                        className="w-1 h-8 bg-[#4F6EF7]"
                        animate={{ height: [8, 24, 8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">
                    Projects · HR · Finance · Clients · Docs — unified in TWS
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="mt-16 flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="w-px h-16 bg-gradient-to-b from-transparent to-blue-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Scroll to unify</span>
            </motion.div>
          </div>
        </section>

        {/* Chapter 2 — The Quantified Leak */}
        <section className="sh-premium-cost py-24 px-4 sm:px-6 lg:px-8 border-y" style={{ borderColor: 'var(--tws-border)' }}>
          <div className="container mx-auto max-w-6xl">
            <div className="sh-cost-grid">
              {/* Left Column: Narrative */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
              >
                <span className="block text-xs font-bold uppercase tracking-widest mb-4 font-sora text-red-500">
                  Chapter 02: The Economic Drain
                </span>
                <h2 className="font-sora text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-[1.1] text-white">
                  The hidden tax <br />
                  on every <span className="sh-glitch-text text-red-500">sprint.</span>
                </h2>
                <p className="font-dm-sans text-lg text-gray-400 mb-12 max-w-xl">
                  Fragmentation isn't just annoying—it's expensive. Every time an engineer hunts for a ticket or chases a thread for a requirement, momentum dies.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: 'Avg. Dev Waste', value: '4.8h', suffix: '/week', desc: 'Industry avg — tool juggling (Atlassian Research)' },
                    { label: 'Flow Disruption', value: '23 min', suffix: '', desc: 'To regain focus after a context switch (UC Irvine)' },
                  ].map((stat, i) => (
                    <div key={i} className="sh-cost-card group">
                      <div className="sh-cost-glow-red" />
                      <div className="relative z-10">
                        <span className="sh-impact-label">{stat.label}</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="sh-cost-value text-3xl text-white">{stat.value}</span>
                          <span className="text-gray-500 text-sm">{stat.suffix}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{stat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right Column: Visualization */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="sh-leak-visualization">
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 font-sora">Unbilled Hours Accumulating</span>
                  </div>

                  <div className="flex items-end gap-1.5 h-48 px-8">
                    {[...Array(24)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="sh-leak-bar"
                        initial={{ height: 0 }}
                        whileInView={{ height: [8, 40 + (((i * 37 + 13) % 7) / 7) * 100, 20] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: 'reverse',
                          delay: i * 0.05
                        }}
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="text-center p-8 rounded-3xl backdrop-blur-md border border-white/5 bg-black/40"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2 block">TWS gives you visibility into</span>
                      <span className="text-4xl md:text-5xl font-black text-white font-sora">Tracked vs<br/>Billed</span>
                      <span className="block text-[10px] text-orange-400 font-bold mt-2 font-dm-sans">HOURS · COSTS · INVOICES · PER PROJECT</span>
                    </motion.div>
                  </div>
                </div>

                {/* HUD callout — real TWS capability */}
                <motion.div
                  className="absolute -bottom-6 -left-6 p-4 rounded-xl border border-white/5 bg-gray-900/80 backdrop-blur-xl shadow-2xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-200">Project Costing Module</div>
                      <div className="text-[9px] text-gray-500">Budget · Burn Rate · Profitability — all in one place</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Chapter 3 — The Singular Vision */}
        <section id="solution" className="sh-premium-solution px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="container mx-auto max-w-6xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <span className="block text-xs font-bold uppercase tracking-widest mb-4 font-sora text-emerald-400">
                Chapter 03: The Singular Vision
              </span>
              <h2 className="font-sora text-4xl md:text-5xl lg:text-7xl font-bold mb-8 leading-[1.1] text-white">
                Stop shifting tabs. <br />
                <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Start building.</span>
              </h2>
              <p className="font-dm-sans text-lg text-gray-400 mb-16 max-w-2xl mx-auto">
                TWS brings your projects, people, and finances into one workspace — so your team spends less time coordinating and more time delivering.
              </p>
            </motion.div>

            {/* The Unified Dashboard Mockup */}
            <motion.div
              className="sh-divine-tab max-w-5xl mx-auto shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div className="sh-divine-glow" />

              {/* Unification Animation: module dots converging into the dashboard */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                  { x: -500, y: -150, delay: 0.0 },
                  { x: 500,  y: -120, delay: 0.1 },
                  { x: -500, y: -60,  delay: 0.2 },
                  { x: 500,  y: -30,  delay: 0.3 },
                  { x: -500, y: 30,   delay: 0.4 },
                  { x: 500,  y: 60,   delay: 0.5 },
                  { x: -500, y: 120,  delay: 0.6 },
                  { x: 500,  y: 150,  delay: 0.7 },
                  { x: -500, y: 0,    delay: 0.8 },
                  { x: 500,  y: 0,    delay: 0.9 },
                  { x: -500, y: -90,  delay: 1.0 },
                  { x: 500,  y: 90,   delay: 1.1 },
                ].map((dot, i) => (
                  <motion.div
                    key={i}
                    className="sh-unify-dot"
                    initial={{ x: dot.x, y: dot.y, opacity: 0 }}
                    whileInView={{ x: 0, y: 0, opacity: [0, 1, 0] }}
                    transition={{
                      duration: 2,
                      delay: dot.delay,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  />
                ))}
              </div>

              <div className="sh-unified-dashboard-mock text-left">
                <div className="flex gap-6">
                  {/* Sidebar — named modules */}
                  <div className="sh-mock-sidebar hidden md:flex flex-col gap-2 pt-1">
                    {[
                      { label: 'Projects', color: 'bg-blue-500/40' },
                      { label: 'HR', color: 'bg-purple-500/40' },
                      { label: 'Finance', color: 'bg-emerald-500/40' },
                      { label: 'Clients', color: 'bg-orange-500/40' },
                      { label: 'Docs', color: 'bg-gray-500/40' },
                    ].map(({ label, color }) => (
                      <div key={label} className="sh-mock-sidebar-item flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-8">
                      <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">TWS Workspace</span>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded bg-white/5" />
                        <div className="h-8 w-8 rounded bg-white/5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Main card — active project */}
                      <div className="md:col-span-2 sh-mock-card">
                        <div className="text-[10px] uppercase font-bold text-blue-400 mb-4">Active Project</div>
                        <div className="space-y-3 mb-6">
                          {[
                            { label: 'Sprint 4 — In Progress', w: 'w-full', color: 'bg-blue-500/30' },
                            { label: 'Deliverables: 6 of 9 done', w: 'w-5/6', color: 'bg-emerald-500/20' },
                            { label: 'Budget: 68% consumed', w: 'w-4/6', color: 'bg-orange-500/20' },
                          ].map(({ label, w, color }) => (
                            <div key={label} className="flex items-center gap-3">
                              <div className={`h-2 ${w} ${color} rounded`} />
                              <span className="text-[9px] text-gray-500 whitespace-nowrap">{label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="h-20 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Invoices Pending</span>
                            <span className="text-lg font-black text-white">3</span>
                          </div>
                          <div className="h-20 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Leave Requests</span>
                            <span className="text-lg font-black text-white">2</span>
                          </div>
                        </div>
                      </div>

                      {/* Right column — project + sprint stats */}
                      <div className="space-y-6">
                        <div className="sh-mock-card border-emerald-500/20">
                          <div className="text-[10px] uppercase font-bold text-emerald-400 mb-2">Project: Phoenix</div>
                          <div className="text-xl font-bold text-white mb-4">On Track</div>
                          <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
                            <motion.div
                              className="h-full bg-emerald-500"
                              initial={{ width: 0 }}
                              whileInView={{ width: '74%' }}
                              transition={{ duration: 2, delay: 1 }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-500 mt-2 block">74% milestones complete</span>
                        </div>
                        <div className="sh-mock-card">
                          <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">Sprint Velocity</div>
                          <div className="text-xl font-bold text-white">82 pts</div>
                          <span className="text-[9px] text-gray-500">This sprint · tracked in Nucleus PM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-20 flex flex-col items-center gap-4">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <Link
                  to="/software-house-signup"
                  className="sh-unify-button group inline-flex items-center gap-3 transition-all"
                >
                  Start from the singular vision
                  <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2">
                Multi-tenant · Role-based access · Audit logs · Built for software houses
              </p>
            </div>
          </div>
        </section>

        {/* Chapter 4 — The Atomic Engine */}
        <section id="features" className="sh-premium-atomic px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <span className="block text-xs font-bold uppercase tracking-[0.2em] mb-4 font-sora text-blue-400">
                Inside the Tab: The Atomic Engine
              </span>
              <h2 className="font-sora text-3xl md:text-5xl font-bold mb-6 text-white">
                SaaS complexity. <br />
                <span className="text-gray-500">Zero context switching.</span>
              </h2>
              <p className="font-dm-sans text-gray-400 max-w-xl mx-auto">
                Underneath the singular vision lies a titan of engineering. Every module is a standalone power-tool, seamlessly integrated into one core architecture.
              </p>
            </motion.div>

            <div className="sh-atomic-grid">
              {[
                {
                  title: 'Project Engine',
                  icon: CodeBracketIcon,
                  specs: { core: 'React / Node.js', sync: 'WebSocket', modules: 'Kanban, Sprints, Backlog' },
                  preview: [40, 70, 50, 90],
                  link: '/software-house/projects'
                },
                {
                  title: 'Global Finance',
                  icon: CurrencyDollarIcon,
                  specs: { core: 'Double-Entry', sync: 'On Save', modules: 'Ledger, AP/AR, Invoicing' },
                  preview: [20, 40, 80, 60],
                  link: '/software-house/finance'
                },
                {
                  title: 'HRM (Talent)',
                  icon: UserGroupIcon,
                  specs: { core: 'Entity-Based', sync: 'Role-Driven', modules: 'Attendance, Payroll, Leaves' },
                  preview: [90, 30, 70, 40],
                  link: '/software-house/hrm'
                },
                {
                  title: 'Analytics',
                  icon: ShieldCheckIcon,
                  specs: { core: 'Per-Tenant', sync: 'Aggregated', modules: 'Reports, KPIs, Exports' },
                  preview: [50, 75, 45, 85],
                  link: '/software-house/analytics'
                },
                {
                  title: 'Time & Billing',
                  icon: ClockIcon,
                  specs: { core: 'Manual Entry', sync: 'Billable', modules: 'Timesheets, Expenses, Costs' },
                  preview: [30, 60, 90, 20]
                },
                {
                  title: 'Client Portal',
                  icon: ComputerDesktopIcon,
                  specs: { core: 'Per-Tenant', sync: 'Secure', modules: 'Invoices, Contracts, Docs' },
                  preview: [60, 20, 40, 80]
                }
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  className="sh-atomic-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link to={feature.link || '#'} className="block">
                    <div className="sh-atomic-icon">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-sora text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <div className="sh-module-preview-box">
                      <span className="text-[8px] text-gray-600 uppercase tracking-widest mb-1 block">Activity preview</span>
                      <div className="flex gap-1 flex-1">
                        {feature.preview.map((p, idx) => (
                          <motion.div
                            key={idx}
                            className="sh-preview-bar"
                            style={{ width: `${p}%` }}
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            transition={{ duration: 1.5, delay: 0.5 + (idx * 0.1) }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="sh-atomic-specs">
                      <div className="sh-spec-item">Stack <span>{feature.specs.core}</span></div>
                      <div className="sh-spec-item">Sync <span>{feature.specs.sync}</span></div>
                      <div className="sh-spec-item md:col-span-2">Modules <span>{feature.specs.modules}</span></div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-20 p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
                {[
                  { l: 'Modules', v: '15+' },
                  { l: 'Auth', v: 'JWT + bcrypt' },
                  { l: 'Architecture', v: 'Multi-Tenant' },
                  { l: 'Access Control', v: 'Role-Based' }
                ].map(s => (
                  <div key={s.l} className="text-left">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.l}</div>
                    <div className="text-2xl font-black text-white font-sora">{s.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Chapter 5 — Why One Tab Wins (The Sovereign Operator) */}
        <section className="sh-sovereign-section px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <span className="block text-xs font-bold uppercase tracking-[0.2em] mb-4 font-sora text-emerald-400">
                Chapter 05: The Sovereign Operator
              </span>
              <h2 className="font-sora text-3xl md:text-5xl font-bold mb-6 text-white">
                Ultimate control. <br />
                <span className="text-gray-500">Zero infrastructure debt.</span>
              </h2>
              <p className="font-dm-sans text-gray-400 max-w-xl mx-auto">
                TWS isn't just software; it's the operating system for your entire organization. Build faster, secure your assets, and scale without boundaries.
              </p>
            </motion.div>

            <div className="sh-sovereign-grid">
              {[
                {
                  icon: RocketLaunchIcon,
                  title: 'Built for Developers',
                  desc: 'One tab for projects, sprints, timesheets, and team management. No context switching, just pure flow state.'
                },
                {
                  icon: ShieldCheckIcon,
                  title: 'Security by Design',
                  desc: 'Role-based access control, per-tenant data isolation, JWT authentication, and a full audit log on every action.'
                },
                {
                  icon: ChartBarIcon,
                  title: 'Grows with You',
                  desc: 'From startup to enterprise — TWS remains your singular dashboard. Add users, projects, and departments without adding tools.'
                }
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="sh-sovereign-card"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="sh-control-icon-box">
                    <div className="sh-control-glow" />
                    <item.icon className="h-8 w-8 relative z-10" />
                  </div>
                  <h3 className="font-sora text-xl font-bold text-white mb-4">{item.title}</h3>
                  <p className="font-dm-sans text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing — The Power Console */}
        <section id="pricing" className="sh-pricing-console px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-sora text-3xl md:text-4xl font-bold text-white mb-4">Simple pricing. One tab.</h2>
              <p className="font-dm-sans text-gray-400">Start from one tab. Scale as you grow. No hidden fees.</p>
            </div>

            <div className="sh-pricing-grid">
              {[
                { name: 'Trial', price: '0', period: '/ 7 days', desc: 'Full access. No CC.', features: ['All modules', 'Up to 5 users', '2 GB Storage'] },
                { name: 'Starter', price: '10', period: '/ org / mo', desc: 'Small teams.', features: ['All modules', 'Up to 25 users', '10 GB Storage'] },
                { name: 'Growth', price: '29', period: '/ org / mo', desc: 'Growing teams.', features: ['Everything in Starter', 'Up to 50 users', '50 GB Storage'], popular: true },
                { name: 'Enterprise', price: 'Custom', period: '', desc: 'Unlimited scale.', features: ['Unlimited users', 'Dedicated support', 'SLA & Custom Terms'] }
              ].map((tier, i) => (
                <motion.div
                  key={tier.name}
                  className={`sh-pricing-card ${tier.popular ? 'premium' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  {tier.popular && <div className="sh-popular-badge">Popular</div>}
                  <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">{tier.name}</div>
                  <div className="sh-price-value">
                    {tier.price !== 'Custom' && <span className="text-xl align-top mr-1">$</span>}
                    {tier.price}
                  </div>
                  <div className="text-xs text-gray-500 mb-4">{tier.period}</div>
                  <p className="text-sm text-white/60 mb-8">{tier.desc}</p>

                  <ul className="space-y-3 mb-10 flex-1">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link to="/software-house-signup" className="sh-pricing-button">
                    {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  </Link>
                </motion.div>
              ))}
            </div>
            <p className="font-dm-sans text-center text-xs text-gray-600 mt-12">All plans: 7-day free trial. One dashboard tab. Cancel anytime.</p>
          </div>
        </section>

        {/* CTA — The Event Horizon */}
        <section className="sh-event-horizon px-4 sm:px-6 lg:px-8">
          <div className="sh-horizon-glow" />
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="sh-event-title">
                One tab. <br />
                Infinite power.
              </h2>
              <p className="font-dm-sans text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                The shift is inevitable. Stop juggling tools and start building with the wolf stack.
              </p>
              <Link to="/software-house-signup" className="sh-event-button">
                Start your singular vision <ArrowRightIcon className="h-6 w-6" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="sh-premium-footer px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="sh-footer-grid mb-20">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="font-sora text-2xl font-bold text-white">TWS</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-400/20 rounded">SH</span>
                </div>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  The operative system for elite software houses. One dashboard. One tab. Total control.
                </p>
              </div>

              <div>
                <h4 className="font-sora text-sm font-bold text-white mb-6 uppercase tracking-widest">Platform</h4>
                <div className="space-y-4">
                  <a href="#features" className="sh-footer-link">Features</a>
                  <Link to="/software-house/finance" className="sh-footer-link">Finance</Link>
                  <Link to="/software-house/hrm" className="sh-footer-link">HRM</Link>
                  <Link to="/software-house/projects" className="sh-footer-link">Projects</Link>
                  <a href="#pricing" className="sh-footer-link">Pricing</a>
                </div>
              </div>

              <div>
                <h4 className="font-sora text-sm font-bold text-white mb-6 uppercase tracking-widest">Company</h4>
                <div className="space-y-4">
                  <Link to="/" className="sh-footer-link">About</Link>
                  <a href="#" className="sh-footer-link">Blog</a>
                  <a href="#" className="sh-footer-link">Contact</a>
                </div>
              </div>

              <div>
                <h4 className="font-sora text-sm font-bold text-white mb-6 uppercase tracking-widest">Legal</h4>
                <div className="space-y-4">
                  <a href="#" className="sh-footer-link">Privacy</a>
                  <a href="#" className="sh-footer-link">Terms</a>
                  <a href="#" className="sh-footer-link">Security</a>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-xs text-gray-600 font-dm-sans">
                © 2025 TWS (The Wolf Stack). Built for the sovereign operator.
              </div>
              <div className="flex gap-6 opacity-40">
                {['SOC2', 'GDPR', 'HIPAA'].map(t => (
                  <span key={t} className="text-[10px] font-black tracking-widest text-white">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
    </MotionConfig>
  );
};

export default SoftwareHouseLanding;
