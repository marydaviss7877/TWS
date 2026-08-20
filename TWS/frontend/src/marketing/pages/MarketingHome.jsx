import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout, PrimaryActions, Reveal } from '../components/MarketingShell';
import workspaceDemo from '../assets/housesbase-workspace-demo.webp';

const productAreas = [
  ['Projects & Delivery', 'Keep delivery moving.', 'Plan projects, tasks, sprints and timelines without separating delivery from the business.', '/product/projects', 'delivery'],
  ['People & HR', 'Run the team behind the work.', 'Manage employees, attendance, leave and company structure where teams deliver projects.', '/product/people', 'people'],
  ['Finance', 'Connect the work to the numbers.', 'Keep billing, expenses, budgets and payroll closer to the work generating them.', '/product/finance', 'finance'],
  ['Clients & Growth', 'Keep clients connected to delivery.', 'Organize client information, partners and project relationships in one operating system.', '/product/clients', 'clients'],
  ['Documents & Sheets', 'Keep knowledge where work happens.', 'Create documents, spreadsheets and forms inside the company workspace.', '/product/documents', 'knowledge'],
];

const roles = [
  ['Owners & Operations', 'See projects, teams, clients, finances and operations without assembling reports from disconnected systems.'],
  ['Project Managers', 'Plan projects, coordinate teams, organize work and keep delivery structured.'],
  ['HR Teams', 'Manage employees, attendance, leave, teams and workforce operations.'],
  ['Finance Teams', 'Keep billing, expenses, budgets and payroll closer to operational context.'],
  ['Employees', 'Use one workspace for projects, tasks, documents, attendance and everyday work.'],
];

const breadth = ['Projects', 'Tasks', 'Sprints', 'Gantt', 'Employees', 'Attendance', 'Leave', 'Payroll', 'Finance', 'Billing', 'Expenses', 'Clients', 'Partners', 'Documents', 'Sheets', 'Forms', 'Portfolio', 'Analytics', 'Notifications', 'Nucleus'];

const MarketingHome = () => {
  const [role, setRole] = useState(0);
  return (
    <MarketingLayout>
      <section className="mk-hero">
        <div className="mk-shell mk-hero-grid">
          <Reveal className="mk-hero-copy">
            <p className="mk-eyebrow">The operating platform for software houses</p>
            <h1>Run your software house from one base.</h1>
            <p className="mk-hero-lede">Manage projects, people, clients, finance and operations in one connected platform built for software companies.</p>
            <PrimaryActions />
          </Reveal>
          <Reveal className="mk-product-frame">
            <img src={workspaceDemo} alt="Demo HousesBase workspace connecting project delivery, people, clients, finance, documents and Nucleus" width="1536" height="1024" fetchPriority="high" />
          </Reveal>
        </div>
      </section>

      <section className="mk-problem mk-section">
        <div className="mk-shell mk-problem-layout">
          <Reveal>
            <h2>Your company shouldn't need ten tools to run one business.</h2>
            <p>Delivery, attendance, payroll, clients and documents drift into separate systems. Leadership then spends hours rebuilding the whole picture.</p>
          </Reveal>
          <Reveal className="mk-converge" aria-label="Disconnected operations converge into HousesBase">
            <div>{['Project delivery', 'People operations', 'Client context', 'Finance', 'Company knowledge'].map((item) => <span key={item}>{item}</span>)}</div>
            <div className="mk-converge-line" aria-hidden="true" />
            <strong><i><span>H</span></i>HousesBase<small>One connected workspace</small></strong>
          </Reveal>
        </div>
      </section>

      <section className="mk-section mk-platform">
        <div className="mk-shell">
          <Reveal className="mk-section-intro">
            <p className="mk-eyebrow">One connected platform</p>
            <h2>Every part of your operation has a place.</h2>
            <p>From the first client conversation to delivery, employee operations and finance, your teams share one operational base.</p>
          </Reveal>
          <div className="mk-area-grid">
            {productAreas.map(([label, title, copy, href, tone], index) => (
              <Reveal as="article" key={label} className={`mk-area mk-area-${tone} ${index === 0 ? 'mk-area-featured' : ''}`}>
                <span>{label}</span><h3>{title}</h3><p>{copy}</p><Link to={href}>Explore {label} <b aria-hidden="true">→</b></Link>
                <div className="mk-area-visual" aria-hidden="true"><i /><i /><i /><i /></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section mk-connected">
        <div className="mk-shell">
          <Reveal className="mk-connected-title"><h2>Your systems should know each other.</h2><p>HousesBase turns separate operational tools into one company system.</p></Reveal>
          <div className="mk-connection-map">
            {[
              ['Projects need people', 'Connect delivery with the employees and teams doing the work.'],
              ['Clients need projects', 'Keep client relationships close to delivery.'],
              ['People need context', 'Bring attendance, leave, payroll and structure together.'],
              ['Finance needs operations', 'Keep financial workflows close to the activity creating them.'],
            ].map(([title, copy]) => <Reveal key={title} className="mk-connection"><span>{title}</span><p>{copy}</p></Reveal>)}
            <div className="mk-map-core"><span>H</span><strong>One company system</strong></div>
          </div>
        </div>
      </section>

      <section className="mk-section mk-nucleus">
        <div className="mk-shell mk-nucleus-grid">
          <Reveal className="mk-nucleus-copy"><p className="mk-eyebrow">HousesBase Intelligence</p><h2>Meet Nucleus.</h2><h3>AI that understands project operations.</h3><p>Nucleus helps teams work with project context, organize tasks and support planning without leaving HousesBase.</p><Link className="mk-text-link" to="/product/nucleus">Discover Nucleus <span aria-hidden="true">→</span></Link></Reveal>
          <Reveal className="mk-nucleus-panel">
            <div className="mk-nucleus-head"><span>Nucleus</span><small>Project assistance</small></div>
            {[
              ['Understand context', 'Work with information already connected to a project.'],
              ['Organize tasks', 'Turn requirements into structured project actions.'],
              ['Support planning', 'Bring project context into everyday decisions.'],
            ].map(([title, copy]) => <div key={title}><strong>{title}</strong><p>{copy}</p></div>)}
          </Reveal>
        </div>
      </section>

      <section className="mk-section mk-roles">
        <div className="mk-shell"><Reveal className="mk-section-intro"><h2>One platform. Different views of the same business.</h2></Reveal>
          <div className="mk-role-selector">
            <div role="tablist" aria-label="Value by role">{roles.map(([label], index) => <button key={label} role="tab" aria-selected={role === index} onClick={() => setRole(index)}>{label}</button>)}</div>
            <div className="mk-role-content" role="tabpanel"><span>{roles[role][0]}</span><p>{roles[role][1]}</p><Link to="/product">See the connected platform <b aria-hidden="true">→</b></Link></div>
          </div>
        </div>
      </section>

      <section className="mk-section mk-workspace">
        <div className="mk-shell mk-workspace-grid">
          <Reveal><h2>Every company gets its own HousesBase.</h2><p>Each organization gets a dedicated workspace for its people, projects, clients and operations.</p></Reveal>
          <Reveal className="mk-address"><span>yourcompany</span><b>.housesbase.com</b><small>Your company workspace</small></Reveal>
        </div>
      </section>

      <section className="mk-section mk-breadth">
        <div className="mk-shell"><Reveal className="mk-section-intro"><h2>Replace fragmented operations with one connected foundation.</h2></Reveal>
          <div className="mk-breadth-grid">{breadth.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      </section>

      <section className="mk-section mk-trust">
        <div className="mk-shell mk-trust-grid"><Reveal><h2>Built for the operational reality of software companies.</h2></Reveal><div>{['Dedicated company workspaces', 'Role-aware access', 'Centralized operational modules', 'Audit-aware workflows', 'Cloud file storage', 'Company-wide notifications'].map((item) => <Reveal key={item}><span aria-hidden="true">✓</span>{item}</Reveal>)}</div></div>
      </section>

      <section className="mk-final"><div className="mk-shell"><Reveal><h2>Bring your software house back to one base.</h2><p>Projects. People. Clients. Finance. Operations. Connected through HousesBase.</p><PrimaryActions secondary="Book a Demo" secondaryTo="/contact" /></Reveal></div></section>
    </MarketingLayout>
  );
};

export default MarketingHome;
