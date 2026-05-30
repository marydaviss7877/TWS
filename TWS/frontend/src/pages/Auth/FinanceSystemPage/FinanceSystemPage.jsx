import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import {
  ArrowRightIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

import './SoftwareHouseFinance.css';
import { useTheme } from '../../../app/providers/ThemeContext';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';

const FinanceSystemPage = () => {
  const { isDarkMode } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const spectrumBars = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      id: i,
      base: 20 + ((i * 17) % 60),
      peak: 35 + ((i * 13) % 55),
      low: 12 + ((i * 7) % 28),
      duration: 2 + ((i * 5) % 3)
    })),
    []
  );

  const modules = [
    { title: 'Chart of Accounts', path: 'Org → Finance → CoA', metric: '100% Audit', icon: DocumentTextIcon, desc: 'Hierarchical structure pre-configured for software houses.' },
    { title: 'Accounts Receivable', path: 'Org → Finance → AR', metric: '$2.4M Active', icon: BanknotesIcon, desc: 'Automated invoicing with real-time payment tracking.' },
    { title: 'Cash Flow', path: 'Org → Finance → Cash', metric: '+12% Forecast', icon: ArrowTrendingUpIcon, desc: 'Predictive liquidity management and bank reconciliation.' },
    { title: 'Project Costing', path: 'Org → Finance → Costing', metric: 'Real-time', icon: ChartBarIcon, desc: 'Track per-project profitability and resource burn.' },
    { title: 'Billing Engine', path: 'Org → Finance → Billing', metric: 'Automated', icon: ArrowPathIcon, desc: 'Recurring retainers and milestone-based invoicing.' },
    { title: 'Time & Expenses', path: 'Org → Finance → T&E', metric: 'Daily Sync', icon: ClockIcon, desc: 'Seamless mapping from dev hours to financial ledger.' },
    { title: 'Accounts Payable', path: 'Org → Finance → AP', metric: '0% Late', icon: BuildingOfficeIcon, desc: 'Vendor management and approval-based payment cycles.' },
    { title: 'Reporting', path: 'Org → Finance → Reports', metric: 'SOC2 Ready', icon: DocumentChartBarIcon, desc: 'Instant P&L, balance sheets, and audit-ready exports.' }
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className={`sh-finance-page${!isDarkMode ? ' day-mode' : ''}`}>
        <SoftwareHouseNavbar isDarkMode={isDarkMode} />
        <main>
        {/* Hero Section: The Cash Horizon */}
        <section className="sh-finance-hero px-6">
          <div className="container mx-auto max-w-6xl relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-8 border border-emerald-500/20">
                Financial Operating System
              </span>
              <h1 className="sh-finance-title leading-none">
                Finance at the <br />
                <span className="text-emerald-500 italic">speed of light.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-xl text-[#8B8BA8] mb-12 font-dm-sans">
                Stop reconciling spreadsheets. TWS Finance unifies project costing, invoicing, and corporate accounting into a single, high-fidelity dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/software-house-signup" className="sh-cta-button">
                  Deploy Financial Core <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <div className="text-xs font-dm-sans text-[#52526A]">
                  Zero setup fees. SOC2 Compliant. <br />
                  Ready in <span className="text-white">60 seconds.</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Spectral Visualization Mock */}
          <div className="sh-spectral-viz" aria-hidden>
            <div className="container mx-auto max-w-6xl h-full relative flex items-end gap-1 px-4">
              {spectrumBars.map((bar) => (
                <motion.div
                  key={bar.id}
                  className="sh-viz-bar flex-1"
                  style={{
                    height: `${bar.base}%`
                  }}
                  animate={prefersReducedMotion ? undefined : { height: [`${bar.base}%`, `${bar.peak}%`, `${bar.low}%`] }}
                  transition={prefersReducedMotion ? undefined : { duration: bar.duration, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid: The Atomic Ledger */}
        <section id="ledger" className="py-24 px-6 scroll-mt-24">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div className="max-w-xl">
                <h2 className="font-sora text-4xl font-bold mb-4 tracking-tighter text-white">The Atomic Ledger</h2>
                <p className="text-[#8B8BA8] font-dm-sans">Every transaction is mapped to your organization's hierarchy. Complete visibility from high-level P&L to individual developer billables.</p>
              </div>
              <div className="p-4 sh-finance-glass flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-[#52526A]">Global Liquidity</div>
                  <div className="text-xl font-black text-white">$14.2M</div>
                </div>
                <div className="h-8 w-[1px] bg-white/10" />
                <div className="flex gap-1">
                  {[0.4, 0.7, 0.5, 0.9, 1].map((o, i) => (
                    <div key={i} className="w-1.5 h-6 bg-emerald-500" style={{ opacity: o }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="sh-ledger-grid">
              {modules.map((m, i) => (
                <motion.div
                  key={m.title}
                  className="sh-ledger-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <span className="sh-ledger-path">{m.path}</span>
                  <span className="sh-ledger-metric">{m.metric}</span>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                    <m.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-sora text-lg font-bold mb-2 text-white">{m.title}</h3>
                  <p className="text-sm text-[#8B8BA8] font-dm-sans leading-relaxed">{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Console View: Account Structure */}
        <section id="console" className="sh-console-container px-6 scroll-mt-24">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-sora text-4xl font-bold mb-4 text-white">Interactive Financial Core</h2>
              <p className="text-[#8B8BA8] font-dm-sans max-w-2xl mx-auto">Proprietary architecture designed specifically for the complexities of global software delivery.</p>
            </div>

            <motion.div
              className="sh-console-view"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="sh-console-scanner" />
              <div className="sh-console-header">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#52526A]">Module // Chart_of_Accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500">SYSTEM_LIVE</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="sh-finance-table">
                  <thead>
                    <tr>
                      <th>Acc_Code</th>
                      <th>Account_Name</th>
                      <th>Type</th>
                      <th>Metric</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: '1000', name: 'ASSETS', type: 'Asset', metric: '$8,420,110', status: 'Optimal' },
                      { code: '2000', name: 'LIABILITIES', type: 'Liability', metric: '$120,400', status: 'Stable' },
                      { code: '4000', name: 'REVENUE_CORE', type: 'Revenue', metric: '$2,400,000', status: 'Yield_High' },
                      { code: '5000', name: 'OPS_EXPENSE', type: 'Expense', metric: '$410,000', status: 'Nominal' }
                    ].map((row) => (
                      <tr key={row.code} className="hover:bg-white/[0.02] transition-colors">
                        <td className="font-mono text-emerald-500 font-bold">{row.code}</td>
                        <td className="font-bold text-white">{row.name}</td>
                        <td><span className="sh-finance-pill sh-pill-velocity">{row.type}</span></td>
                        <td className="font-mono text-white/80">{row.metric}</td>
                        <td><span className="sh-finance-pill sh-pill-success">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final Ledger: CTA */}
        <section className="sh-final-ledger px-6">
          <div className="container mx-auto max-w-xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="font-sora text-5xl font-black text-white mb-6 leading-tight">Complete the ledger.</h2>
              <p className="text-[#8B8BA8] mb-12 font-dm-sans">Join the next generation of software houses operating with absolute financial clarity.</p>
              <Link to="/software-house-signup" className="sh-cta-button">
                Open your singular vision <ArrowRightIcon className="h-6 w-6" />
              </Link>
            </motion.div>
          </div>
        </section>
        </main>

        <footer className="py-12 px-6 border-t border-white/5">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="font-sora font-black text-white">TWS FINANCE</span>
            <span className="text-[10px] text-[#52526A] font-bold uppercase tracking-widest">© 2025 The Wolf Stack</span>
          </div>
          <div className="flex gap-12">
            <Link to="/software-house" className="text-xs font-bold text-[#52526A] hover:text-white transition-colors">Software House</Link>
            <Link to="/software-house/hrm" className="text-xs font-bold text-[#52526A] hover:text-white transition-colors">HRM</Link>
            <Link to="/software-house/projects" className="text-xs font-bold text-[#52526A] hover:text-white transition-colors">Projects</Link>
            <Link to="/software-house-signup" className="text-xs font-bold text-[#52526A] hover:text-white transition-colors">Join Elite</Link>
            <a href="#" className="text-xs font-bold text-[#52526A] hover:text-white transition-colors">SOC2 Report</a>
          </div>
        </div>
        </footer>
      </div>
    </MotionConfig>
  );
};

export default FinanceSystemPage;
