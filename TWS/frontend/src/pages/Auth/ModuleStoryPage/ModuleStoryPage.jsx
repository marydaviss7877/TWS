import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useReducedMotion, useScroll } from 'framer-motion';
import {
  ArrowRightIcon, ArrowUpRightIcon, CheckIcon, CommandLineIcon, BellIcon,
  FolderIcon, ClockIcon, UserGroupIcon, BanknotesIcon, ChartBarIcon,
  CalendarDaysIcon, DocumentCheckIcon, ShieldCheckIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';
import SoftwareHouseFooter from '../../../features/auth/components/SoftwareHouseFooter';
import './ModuleStoryPage.css';

const icons = {
  projects: [FolderIcon, ClockIcon, UserGroupIcon],
  finance: [BanknotesIcon, ChartBarIcon, DocumentCheckIcon],
  hrm: [UserGroupIcon, CalendarDaysIcon, ShieldCheckIcon]
};

function ProductCockpit({ type, data }) {
  const [Primary, Secondary, Tertiary] = icons[type];
  return (
    <div className={`msp-cockpit msp-cockpit--${type}`}>
      <div className="msp-windowbar">
        <span className="msp-window-dots"><i /><i /><i /></span>
        <span className="msp-command"><CommandLineIcon /> Search workspace <kbd>⌘K</kbd></span>
        <span className="msp-window-user"><BellIcon /><b>AM</b></span>
      </div>
      <div className="msp-app">
        <aside>
          <b>T</b>
          {[Primary, Secondary, Tertiary, ChartBarIcon].map((Icon, index) => (
            <span className={index === 0 ? 'active' : ''} key={index}><Icon /></span>
          ))}
        </aside>
        <div className="msp-app-main">
          <div className="msp-app-head">
            <div><small>{data.cockpit.eyebrow}</small><h3>{data.cockpit.title}</h3></div>
            <button type="button">+ {data.cockpit.action}</button>
          </div>
          <div className="msp-stat-row">
            {data.cockpit.stats.map((stat, index) => (
              <div key={stat.label}>
                <span><i className={`tone-${index}`} /><small>{stat.label}</small></span>
                <strong>{stat.value}</strong><em>{stat.change}</em>
              </div>
            ))}
          </div>
          <div className="msp-workspace">
            <div className="msp-primary-panel">
              <header><b>{data.cockpit.panelTitle}</b><small>This month</small></header>
              {type === 'projects' && <BoardVisual />}
              {type === 'finance' && <FinanceVisual />}
              {type === 'hrm' && <PeopleVisual />}
            </div>
            <div className="msp-side-panel">
              <header><b>{data.cockpit.sideTitle}</b><span>{data.cockpit.alerts.length}</span></header>
              {data.cockpit.alerts.map((alert, index) => (
                <div className="msp-alert" key={alert[0]}>
                  <i className={`tone-${index}`} />
                  <span><b>{alert[0]}</b><small>{alert[1]}</small></span>
                  <em>{alert[2]}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardVisual() {
  return <div className="msp-board">{['Ready', 'In progress', 'Review'].map((column, i) => <div key={column}><small>{column}<b>{i + 2}</b></small>{Array.from({ length: i === 1 ? 3 : 2 }).map((_, j) => <span key={j}><i /><b>{['API authentication', 'Mobile navigation', 'QA release gate'][j]}</b><em>{i === 2 ? 'AM' : 'SK'}</em></span>)}</div>)}</div>;
}

function FinanceVisual() {
  return <div className="msp-finance-chart"><div className="msp-chart-head"><strong>$184,250</strong><span>↑ 18.4%</span></div><svg viewBox="0 0 520 150" preserveAspectRatio="none"><defs><linearGradient id="mspFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><path className="fill" d="M0 125 C55 112 62 80 115 92 S190 115 235 65 S315 86 362 44 S445 55 520 18 L520 150 L0 150Z" /><path d="M0 125 C55 112 62 80 115 92 S190 115 235 65 S315 86 362 44 S445 55 520 18" /></svg><div className="msp-chart-labels"><span>May 01</span><span>May 08</span><span>May 15</span><span>May 22</span></div></div>;
}

function PeopleVisual() {
  return <div className="msp-people"><div className="msp-capacity"><span style={{ '--score': '82%' }}><b>82%</b><small>Capacity</small></span></div><div className="msp-team-bars">{[['Engineering', 88], ['Design', 72], ['Quality', 64], ['Product', 79]].map(([name, score]) => <div key={name}><span><b>{name}</b><em>{score}%</em></span><i><b style={{ width: `${score}%` }} /></i></div>)}</div></div>;
}

function ChapterVisual({ type, index }) {
  const patterns = {
    projects: [
      <div className="msp-mini-gantt"><i /><i /><i /><i /><i /></div>,
      <div className="msp-mini-approval"><span>Scope change #14</span><b><CheckIcon /> Approved</b><small>Budget and timeline updated automatically</small></div>,
      <div className="msp-mini-margin"><strong>31.8%</strong><span>Live project margin</span><i><b /></i></div>
    ],
    finance: [
      <div className="msp-mini-ledger">{['Retainer — Atlas', 'AWS infrastructure', 'Sprint milestone'].map((x, i) => <span key={x}><i />{x}<b>{i === 1 ? '−$4,280' : `+$${[18, 32][i || 0]},000`}</b></span>)}</div>,
      <div className="msp-mini-margin"><strong>14.6 wk</strong><span>Cash runway forecast</span><i><b style={{ width: '74%' }} /></i></div>,
      <div className="msp-mini-approval"><span>Invoice TWS-1048</span><b><CheckIcon /> Ready to send</b><small>Approved time and milestone included</small></div>
    ],
    hrm: [
      <div className="msp-mini-people-row">{['AK', 'SM', 'HZ', 'RA'].map((x, i) => <span key={x} style={{ '--i': i }}>{x}</span>)}</div>,
      <div className="msp-mini-gantt msp-mini-attendance"><i /><i /><i /><i /><i /></div>,
      <div className="msp-mini-approval"><span>Payroll · July 2026</span><b><CheckIcon /> 34 verified</b><small>Attendance, leave and adjustments reconciled</small></div>
    ]
  };
  return <div className={`msp-chapter-visual msp-chapter-visual--${type}`}>{patterns[type][index]}</div>;
}

function CapabilityAtlas({ data }) {
  if (!data.capabilityGroups?.length) return null;
  const atlasIcons = [FolderIcon, CommandLineIcon, CalendarDaysIcon, ChartBarIcon, UserGroupIcon, DocumentCheckIcon, ShieldCheckIcon, SparklesIcon];
  return (
    <section className="msp-capabilities">
      <div className="msp-shell">
        <div className="msp-capability-head">
          <div><span>THE COMPLETE SYSTEM</span><h2>{data.capabilityTitle}</h2></div>
          <p>{data.capabilityCopy}</p>
        </div>
        <div className="msp-view-rail">
          <small>Switch the same project truth into</small>
          <div>{data.workspaceViews.map((view, index) => <span key={view}><i>{String(index + 1).padStart(2, '0')}</i>{view}</span>)}</div>
        </div>
        <div className="msp-capability-grid">
          {data.capabilityGroups.map((group, index) => {
            const Icon = atlasIcons[index % atlasIcons.length];
            return (
              <article key={group.title}>
                <header><span><Icon /></span><small>{String(index + 1).padStart(2, '0')}</small></header>
                <h3>{group.title}</h3><p>{group.copy}</p>
                <ul>{group.items.map(item => <li key={item}><CheckIcon />{item}</li>)}</ul>
              </article>
            );
          })}
        </div>
        <div className="msp-governance-flow">
          <div><small>DELIVERY GOVERNANCE</small><strong>A controlled route from work to acceptance.</strong></div>
          {data.governanceFlow.map((step, index) => <React.Fragment key={step}><span><i>{index + 1}</i>{step}</span>{index < data.governanceFlow.length - 1 && <ArrowRightIcon />}</React.Fragment>)}
        </div>
      </div>
    </section>
  );
}

export default function ModuleStoryPage({ data }) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const reveal = { initial: { opacity: 0, y: reduceMotion ? 0 : 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: .7, ease: [0.16, 1, 0.3, 1] } };

  return (
    <MotionConfig reducedMotion="user">
      <div className={`msp-page msp-page--${data.type}`}>
        <motion.div className="msp-progress" style={{ scaleX: scrollYProgress }} />
        <SoftwareHouseNavbar isDarkMode={false} fixed showThemeToggle={false} />
        <main>
          <section className="msp-hero">
            <div className="msp-aurora one" /><div className="msp-aurora two" />
            <div className="msp-shell msp-hero-grid">
              <motion.div className="msp-hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
                <span className="msp-eyebrow"><i /> TWS {data.name}</span>
                <h1>{data.headline}<em>{data.highlight}</em></h1>
                <p>{data.lede}</p>
                <div className="msp-actions">
                  <Link to="/signup" className="msp-primary">Start free <ArrowRightIcon /></Link>
                  <a href="#story" className="msp-secondary">Explore the workflow <ArrowUpRightIcon /></a>
                </div>
                <div className="msp-proof">{data.proof.map(item => <span key={item}><CheckIcon />{item}</span>)}</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: .96, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .9, delay: .15 }}>
                <ProductCockpit type={data.type} data={data} />
              </motion.div>
            </div>
          </section>

          <section className="msp-tension">
            <div className="msp-shell">
              <motion.span {...reveal}>THE OLD WAY</motion.span>
              <motion.h2 {...reveal}>{data.tension.title}</motion.h2>
              <motion.div className="msp-fragments" {...reveal}>
                {data.tension.fragments.map((item, i) => <React.Fragment key={item}><b>{item}</b>{i < data.tension.fragments.length - 1 && <i>→</i>}</React.Fragment>)}
                <strong>TWS</strong>
              </motion.div>
              <motion.p {...reveal}>{data.tension.copy}</motion.p>
            </div>
          </section>

          <section id="story" className="msp-story">
            <div className="msp-shell">
              <div className="msp-story-head"><span>ONE CONNECTED WORKFLOW</span><h2>{data.storyTitle}</h2></div>
              {data.chapters.map((chapter, index) => (
                <motion.article className={index % 2 ? 'reverse' : ''} key={chapter.title} {...reveal}>
                  <div className="msp-chapter-copy"><small>0{index + 1}</small><h3>{chapter.title}</h3><p>{chapter.copy}</p><ul>{chapter.points.map(point => <li key={point}><CheckIcon />{point}</li>)}</ul></div>
                  <ChapterVisual type={data.type} index={index} />
                </motion.article>
              ))}
            </div>
          </section>

          <CapabilityAtlas data={data} />

          <section className="msp-system">
            <div className="msp-shell msp-system-grid">
              <div><span>NOT ANOTHER SILO</span><h2>{data.systemTitle}</h2><p>{data.systemCopy}</p></div>
              <div className="msp-orbit"><strong>TWS</strong>{data.orbit.map((item, i) => <span key={item} style={{ '--i': i }}><i />{item}</span>)}</div>
            </div>
          </section>

          <section className="msp-final">
            <div className="msp-shell">
              <SparklesIcon /><span>{data.name.toUpperCase()}, CONNECTED</span><h2>{data.finalTitle}</h2><p>{data.finalCopy}</p>
              <Link to="/signup">Build your workspace <ArrowRightIcon /></Link>
            </div>
          </section>
        </main>
        <SoftwareHouseFooter moduleName={`TWS ${data.name}`} />
      </div>
    </MotionConfig>
  );
}
