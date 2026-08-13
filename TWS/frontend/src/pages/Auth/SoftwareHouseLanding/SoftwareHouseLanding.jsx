import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useReducedMotion, useScroll } from 'framer-motion';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  CodeBracketIcon,
  CommandLineIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';
import './SoftwareHousePremium.css';

const flow = [
  { icon: CodeBracketIcon, label: 'Delivery', value: '17', meta: 'projects on track', tone: 'blue' },
  { icon: UserGroupIcon, label: 'People', value: '84%', meta: 'team capacity', tone: 'violet' },
  { icon: BanknotesIcon, label: 'Margin', value: '31.8%', meta: '+4.2% this month', tone: 'lime' },
  { icon: ShieldCheckIcon, label: 'Clients', value: '96%', meta: 'approval health', tone: 'amber' }
];

const modules = [
  {
    number: '01',
    icon: CodeBracketIcon,
    eyebrow: 'Delivery system',
    title: 'Projects move. Everyone sees why.',
    copy: 'Plan scope, run sprints, track dependencies and turn approved work into billable reality—without rebuilding the truth in a spreadsheet.',
    pills: ['Backlog & sprints', 'Deliverables', 'Client approvals'],
    link: '/projects',
    accent: 'blue'
  },
  {
    number: '02',
    icon: UserGroupIcon,
    eyebrow: 'People system',
    title: 'Capacity without the guesswork.',
    copy: 'Connect attendance, payroll, performance and allocation to the work your people actually deliver.',
    pills: ['Attendance', 'Payroll', 'Performance'],
    link: '/hrm',
    accent: 'violet'
  },
  {
    number: '03',
    icon: BanknotesIcon,
    eyebrow: 'Finance system',
    title: 'Know the margin before month-end.',
    copy: 'See project costing, cash flow, invoices, payables and receivables in one audit-ready financial core.',
    pills: ['Project costing', 'Cash flow', 'Invoicing'],
    link: '/finance',
    accent: 'lime'
  }
];

const outcomes = [
  ['One operating truth', 'Projects, people and finance reconcile in the same workspace.'],
  ['Built for service delivery', 'Milestones, billable time, client approvals and project margin are native—not plugins.'],
  ['Control without surveillance', 'Role-based access, audit trails and clear ownership keep work accountable.'],
  ['Ready for the real world', 'Multi-tenant architecture and workflows designed for growing software houses.']
];

const SoftwareHouseLanding = () => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const reveal = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="shx-page shx-day shx-sky">
        <motion.div className="shx-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
        <SoftwareHouseNavbar isDarkMode={false} fixed showThemeToggle={false} />

        <main>
          <section className="shx-hero">
            <div className="shx-aurora shx-aurora-one" />
            <div className="shx-aurora shx-aurora-two" />
            <div className="shx-shell shx-hero-grid">
              <motion.div
                className="shx-hero-copy"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="shx-kicker">
                  <span className="shx-live-dot" />
                  Chapter 01 · The fragmentation
                </div>
                <h1>
                  Work today is <span>broken.</span>
                </h1>
                <p className="shx-hero-lede">
                  Your team switches between projects, chat, time, payroll, invoices and client updates. Every handoff creates another gap. TWS turns that operational entropy into one visible system.
                </p>
                <div className="shx-hero-actions">
                  <Link to="/signup" className="shx-button shx-button-primary">
                    Unify your operation <ArrowRightIcon />
                  </Link>
                  <a href="#platform" className="shx-button shx-button-ghost">
                    See how the story unfolds
                  </a>
                </div>
                <div className="shx-proof-line">
                  <span><CheckIcon /> Free to start</span>
                  <span><CheckIcon /> No card required</span>
                  <span><CheckIcon /> Set up in minutes</span>
                </div>
              </motion.div>

              <motion.div
                className="shx-cockpit-wrap"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 35 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="shx-cockpit-glow" />
                <div className="shx-cockpit">
                  <div className="shx-cockpit-top">
                    <div className="shx-window-dots"><i /><i /><i /></div>
                    <div className="shx-command"><CommandLineIcon /> Command center <kbd>⌘ K</kbd></div>
                    <div className="shx-avatar-stack"><i>ZA</i><i>MK</i><i>+8</i></div>
                  </div>
                  <div className="shx-cockpit-body">
                    <aside className="shx-mini-nav">
                      <div className="shx-mini-brand">T</div>
                      {[ChartBarIcon, CodeBracketIcon, ClockIcon, UserGroupIcon, BanknotesIcon, DocumentTextIcon].map((Icon, i) => (
                        <span key={i} className={i === 0 ? 'active' : ''}><Icon /></span>
                      ))}
                    </aside>
                    <div className="shx-dashboard">
                      <div className="shx-dashboard-head">
                        <div>
                          <small>Thursday, 30 July</small>
                          <h2>Good morning, Areeb.</h2>
                        </div>
                        <button type="button">+ New project</button>
                      </div>
                      <div className="shx-metric-grid">
                        {flow.map(({ icon: Icon, label, value, meta, tone }) => (
                          <div className={`shx-metric ${tone}`} key={label}>
                            <span><Icon /></span>
                            <small>{label}</small>
                            <strong>{value}</strong>
                            <em>{meta}</em>
                          </div>
                        ))}
                      </div>
                      <div className="shx-dashboard-lower">
                        <div className="shx-pulse-card">
                          <div className="shx-card-title"><span>Delivery pulse</span><small>Last 7 days</small></div>
                          <div className="shx-chart">
                            <div className="shx-chart-grid" />
                            <svg viewBox="0 0 420 124" role="img" aria-label="Delivery pulse trending upward">
                              <defs>
                                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#718cff" stopOpacity=".36" />
                                  <stop offset="100%" stopColor="#718cff" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <path className="area" d="M0 104 C52 92,62 72,112 81 S183 107,224 61 S292 70,329 38 S385 41,420 12 L420 124 L0 124Z" />
                              <path className="line" d="M0 104 C52 92,62 72,112 81 S183 107,224 61 S292 70,329 38 S385 41,420 12" />
                            </svg>
                          </div>
                        </div>
                        <div className="shx-attention-card">
                          <div className="shx-card-title"><span>Needs attention</span><b>3</b></div>
                          {[
                            ['Atlas Mobile', 'Scope approval', 'Today'],
                            ['Orbit CRM', 'Budget at 82%', 'Review'],
                            ['Nova Labs', 'Invoice ready', 'Send']
                          ].map((item, i) => (
                            <div className="shx-attention-row" key={item[0]}>
                              <i>{i + 1}</i><span><strong>{item[0]}</strong><small>{item[1]}</small></span><em>{item[2]}</em>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shx-float shx-float-one"><SparklesIcon /><span><strong>Margin signal</strong>Project Nova is up 6.4%</span></div>
                <div className="shx-float shx-float-two"><span className="shx-ring">84%</span><span><strong>Capacity balanced</strong>Across 6 delivery teams</span></div>
              </motion.div>
            </div>

            <div className="shx-trust-strip">
              <span>The scattered software-house stack</span>
              <div>{['SCOPE', 'SPRINT', 'TIME', 'PAYROLL', 'COSTING', 'CLIENT PORTAL'].map(x => <b key={x}>{x}</b>)}</div>
            </div>
          </section>

          <section id="story" className="shx-problem">
            <div className="shx-shell shx-problem-grid">
              <motion.div {...reveal}>
                <span className="shx-section-index">02 / THE ECONOMIC DRAIN</span>
                <h2>Fragmentation has a price.<br />You pay it every sprint.</h2>
              </motion.div>
              <motion.div className="shx-problem-copy" {...reveal}>
                <p>Projects live in one app. Attendance in another. Finance arrives weeks later in a spreadsheet. Momentum disappears into context switching, unbilled hours and decisions made without the full picture.</p>
                <div className="shx-chaos-to-order">
                  <div>{['Tasks', 'Chat', 'Time', 'Payroll', 'Invoices'].map((x, i) => <span key={x} style={{ '--i': i }}>{x}</span>)}</div>
                  <ArrowRightIcon />
                  <strong>TWS</strong>
                </div>
                <div className="shx-leak-panel" aria-label="Operational leakage example">
                  <div className="shx-leak-head">
                    <span><i /> Sprint 24 · leakage scan</span>
                    <b>Live</b>
                  </div>
                  <div className="shx-leak-metrics">
                    <div><small>Unbilled time</small><strong>38.5h</strong><em>− PKR 184k</em></div>
                    <div><small>Context switches</small><strong>147</strong><em>this week</em></div>
                    <div><small>Margin drift</small><strong>−6.2%</strong><em>2 projects</em></div>
                  </div>
                  <div className="shx-leak-track"><i /><i /><i /><i /><i /><i /><i /></div>
                </div>
              </motion.div>
            </div>
          </section>

          <section id="platform" className="shx-platform">
            <div className="shx-shell">
              <motion.div className="shx-section-head" {...reveal}>
                <div>
                  <span className="shx-section-index">03 / THE SINGULAR VISION</span>
                  <h2>Stop shifting tabs. Start building.</h2>
                </div>
                <p>Projects, people and finance stop behaving like separate departments. They become one connected flow—from work planned to cash collected.</p>
              </motion.div>

              <div className="shx-module-list">
                {modules.map(({ icon: Icon, ...module }, i) => (
                  <motion.article className={`shx-module shx-${module.accent}`} key={module.number} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
                    <div className="shx-module-number">{module.number}</div>
                    <div className="shx-module-icon"><Icon /></div>
                    <div className="shx-module-copy">
                      <span>{module.eyebrow}</span>
                      <h3>{module.title}</h3>
                      <p>{module.copy}</p>
                      <div>{module.pills.map(pill => <b key={pill}>{pill}</b>)}</div>
                    </div>
                    <div className={`shx-module-scene scene-${i}`} aria-hidden="true">
                      {i === 0 && (
                        <>
                          <div className="shx-scene-top"><span>SPRINT 08</span><b>72%</b></div>
                          <div className="shx-sprint-bars"><i /><i /><i /><i /><i /></div>
                          <div className="shx-scene-row"><span><i /> API integration</span><b>In review</b></div>
                          <div className="shx-scene-row"><span><i /> Client portal</span><b>Shipping</b></div>
                        </>
                      )}
                      {i === 1 && (
                        <>
                          <div className="shx-scene-top"><span>TEAM CAPACITY</span><b>Balanced</b></div>
                          <div className="shx-team-orbit">
                            {['ZA','MK','AR','HS','+8'].map((name, n) => <i key={name} style={{ '--n': n }}>{name}</i>)}
                            <strong>84<small>%</small></strong>
                          </div>
                          <div className="shx-capacity-line"><i /><span>32h available next sprint</span></div>
                        </>
                      )}
                      {i === 2 && (
                        <>
                          <div className="shx-scene-top"><span>PROJECT MARGIN</span><b>Live</b></div>
                          <div className="shx-margin-value">31.8% <small>+4.2%</small></div>
                          <div className="shx-margin-chart"><i /><i /><i /><i /><i /><i /><i /></div>
                          <div className="shx-finance-split"><span>Revenue <b>4.8m</b></span><span>Cost <b>3.27m</b></span></div>
                        </>
                      )}
                    </div>
                    <Link to={module.link} aria-label={`Explore ${module.eyebrow}`}><ArrowUpRightIcon /></Link>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          <section className="shx-outcomes">
            <div className="shx-shell shx-outcomes-grid">
              <motion.div className="shx-outcomes-sticky" {...reveal}>
                <span className="shx-section-index">04 / THE TRANSFORMATION</span>
                <h2>Chaos becomes clarity.<br /><span>Activity becomes intelligence.</span></h2>
                <p>The story ends where your next operating rhythm begins: one source of truth for how your people deliver client value, profitably.</p>
                <Link to="/signup" className="shx-text-link">See it with your own workflow <ArrowRightIcon /></Link>
              </motion.div>
              <div className="shx-outcome-list">
                {outcomes.map(([title, copy], i) => (
                  <motion.div className="shx-outcome" key={title} {...reveal}>
                    <span>0{i + 1}</span><div><h3>{title}</h3><p>{copy}</p></div><CheckIcon />
                  </motion.div>
                ))}
                <motion.div className="shx-intelligence-card" {...reveal}>
                  <div className="shx-intelligence-head">
                    <span><SparklesIcon /> Operating intelligence</span>
                    <b>Just now</b>
                  </div>
                  <div className="shx-intelligence-body">
                    <div className="shx-health-score">
                      <span>HOUSE<br />HEALTH</span>
                      <strong>92<small>/100</small></strong>
                    </div>
                    <div className="shx-insight">
                      <span>Recommended action</span>
                      <strong>Move 1 engineer to Orbit CRM</strong>
                      <p>Protects Friday’s milestone and recovers an estimated 3.8% project margin.</p>
                      <div><i /> Capacity <b>+12%</b><i /> Delivery risk <b>−18%</b></div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="shx-final">
            <div className="shx-final-grid" aria-hidden="true" />
            <motion.div className="shx-shell shx-final-inner" {...reveal}>
              <span className="shx-kicker"><span className="shx-live-dot" /> Chapter 05 · The new operating rhythm</span>
              <h2>One house.<br />One <span>system.</span></h2>
              <p>Bring your delivery, team, clients and financial truth into one focused workspace.</p>
              <div className="shx-final-actions">
                <Link to="/signup" className="shx-button shx-button-primary">Start building free <ArrowRightIcon /></Link>
                <Link to="/login" className="shx-button shx-button-ghost">Sign in</Link>
              </div>
            </motion.div>
          </section>
        </main>

        <footer className="shx-footer">
          <div className="shx-shell">
            <div className="shx-footer-main">
              <div className="shx-footer-promise">
                <div className="shx-footer-brand"><strong>T</strong><span><b>TWS</b>Software House OS</span></div>
                <h3>The whole house,<br />finally in sync.</h3>
                <p>One operating truth for the teams building tomorrow.</p>
                <div className="shx-footer-status"><i /> All systems operational</div>
              </div>
              <div className="shx-footer-nav">
                <div><span>Platform</span><a href="#story">The story</a><a href="#platform">Overview</a><Link to="/projects">Projects</Link></div>
                <div><span>Systems</span><Link to="/hrm">People & HR</Link><Link to="/finance">Finance</Link><Link to="/signup">Client portal</Link></div>
                <div><span>Get started</span><Link to="/signup">Create workspace</Link><Link to="/login">Sign in</Link><a href="mailto:hello@housesbase.com">Talk to us</a></div>
              </div>
            </div>
            <div className="shx-footer-bottom">
              <p>© {new Date().getFullYear()} TWS · An official Delta Labs product</p>
              <a className="shx-footer-powered" href="https://deltalabs.tech" target="_blank" rel="noopener noreferrer">Powered by Delta Labs <ArrowUpRightIcon /></a>
              <div><a href="#story">Privacy</a><a href="#story">Terms</a></div>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
};

export default SoftwareHouseLanding;
