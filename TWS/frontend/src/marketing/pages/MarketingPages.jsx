import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout, PrimaryActions, Reveal } from '../components/MarketingShell';
import { modulePages, productGroups } from '../data/marketingData';

const PageHero = ({ eyebrow, title, intro, actions = true, children }) => (
  <section className="mk-page-hero"><div className="mk-shell"><Reveal>{eyebrow && <p className="mk-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{intro}</p>{actions && <PrimaryActions />}{children}</Reveal></div></section>
);

export const ProductOverview = () => (
  <MarketingLayout title="HousesBase Platform">
    <PageHero eyebrow="HousesBase Platform" title="One platform for the business behind the software." intro="Connect delivery, people, clients, finance, knowledge and AI-assisted project work in one software-house workspace." />
    <section className="mk-section"><div className="mk-shell"><div className="mk-product-index">{productGroups.slice(0, 4).map((group) => <Reveal key={group.title}><h2>{group.title}</h2>{group.items.slice(0, 4).map(([label, href, copy]) => <Link key={label} to={href}><span>{label}</span><p>{copy}</p><b aria-hidden="true">→</b></Link>)}</Reveal>)}</div></div></section>
    <section className="mk-section mk-connected"><div className="mk-shell mk-workspace-grid"><Reveal><h2>Connected workflows, clear responsibility.</h2><p>Role-aware access gives people the right view of the same company system.</p></Reveal><Reveal className="mk-system-path">Projects <span>→</span> People <span>→</span> Clients <span>→</span> Finance <span>→</span> Knowledge <span>→</span> Nucleus</Reveal></div></section>
    <FinalBlock />
  </MarketingLayout>
);

export const ModulePage = ({ type }) => {
  const page = modulePages[type];
  return (
    <MarketingLayout title={page.eyebrow} description={page.intro}>
      <PageHero eyebrow={page.eyebrow} title={page.title} intro={page.intro} />
      <section className={`mk-section mk-module-story ${page.nucleus ? 'mk-module-nucleus' : ''}`}><div className="mk-shell"><div className="mk-module-grid">{page.sections.map(([title, copy], index) => <Reveal as="article" key={title}><span>{String(index + 1).padStart(2, '0')}</span><h2>{title}</h2><p>{copy}</p></Reveal>)}</div></div></section>
      <section className="mk-section mk-capability-section"><div className="mk-shell"><Reveal><h2>What lives in this part of the base</h2></Reveal><div className="mk-capability-grid">{page.features.map((item) => <span key={item}>{item}</span>)}</div></div></section>
      <FinalBlock title={type === 'projects' ? 'Bring project delivery into HousesBase.' : undefined} />
    </MarketingLayout>
  );
};

const solutionContent = {
  software: {
    eyebrow: 'Built for software companies', title: 'Software houses need more than project management.',
    intro: 'Projects are only one part of the company. HousesBase connects delivery, employees, clients, finance and everyday operations.',
    pain: 'The bigger your software house gets, the more fragmented operations become.',
    points: ['PM tools know nothing about HR', 'HR tools lose project context', 'Finance sits outside delivery', 'Client data gets duplicated', 'Reporting needs manual consolidation', 'Employees switch between systems'],
  },
  agency: {
    eyebrow: 'Built for digital agencies', title: 'Run client delivery and agency operations from one base.',
    intro: 'Coordinate multiple clients, simultaneous projects, teams, time, billing, documents and internal operations.',
    pain: 'Client work moves quickly. Your operating picture should keep up.',
    points: ['Keep every client connected to delivery', 'Coordinate teams across active accounts', 'Bring time and billing closer to projects', 'Organize approval and client context', 'Keep portfolio material ready', 'Run internal operations beside client work'],
  },
};

export const SolutionPage = ({ type }) => {
  const page = solutionContent[type];
  return <MarketingLayout title={page.eyebrow} description={page.intro}><PageHero {...page} />
    <section className="mk-section mk-solution-pain"><div className="mk-shell"><Reveal><h2>{page.pain}</h2></Reveal><div>{page.points.map((item) => <Reveal key={item}><span aria-hidden="true">↗</span>{item}</Reveal>)}</div></div></section>
    <section className="mk-section"><div className="mk-shell"><Reveal className="mk-section-intro"><h2>HousesBase connects the company behind the code.</h2></Reveal><Reveal className="mk-system-path">Projects <span>→</span> People <span>→</span> Clients <span>→</span> Finance <span>→</span> Knowledge <span>→</span> Intelligence</Reveal></div></section><FinalBlock /></MarketingLayout>;
};

export const PricingPage = () => <MarketingLayout title="Pricing"><PageHero eyebrow="Pricing" title="Simple pricing for growing teams." intro="Choose a HousesBase setup that fits your company today and grow into more operational capabilities as your team expands." actions={false}><div className="mk-actions"><Link className="mk-button mk-button-primary" to="/contact">Talk to Sales <span aria-hidden="true">→</span></Link><Link className="mk-button mk-button-secondary" to="/signup">Get Started</Link></div></PageHero><section className="mk-section"><div className="mk-shell"><Reveal className="mk-pricing-placeholder"><span>Pricing is being finalized</span><h2>A setup shaped around your operation.</h2><p>We will help you understand the right workspace, modules and rollout path for your team. No invented tiers or surprise comparison table.</p><Link to="/contact">Discuss your setup <b aria-hidden="true">→</b></Link></Reveal></div></section></MarketingLayout>;

export const SecurityPage = () => <MarketingLayout title="Security"><PageHero eyebrow="Security" title="Security designed into the platform." intro="HousesBase considers security across authentication, authorization, workspace isolation, validation, file handling and monitoring." /><section className="mk-section"><div className="mk-shell"><div className="mk-security-grid">{[['Authentication', 'Protected authentication systems help control access to company workspaces.'], ['Authorization', 'Server-side authorization supports role-aware product access.'], ['Workspace isolation', 'The platform architecture separates organization data and activity.'], ['Validation', 'Input validation and sanitization are part of application handling.'], ['File handling', 'File controls and cloud object storage support operational documents.'], ['Monitoring', 'Monitoring and audit logging infrastructure support operational visibility.']].map(([title, copy]) => <Reveal key={title}><h2>{title}</h2><p>{copy}</p></Reveal>)}</div><p className="mk-security-note">HousesBase does not claim external certification on this page.</p></div></section></MarketingLayout>;

export const AboutPage = () => <MarketingLayout title="About HousesBase"><PageHero title="Software companies deserve software built around how they actually operate." intro="HousesBase began with a simple idea: running a software company involves much more than managing projects." /><section className="mk-section"><div className="mk-shell mk-about-story"><Reveal><h2>Why HousesBase exists</h2><p>As software companies grow, the business behind delivery spreads across tools that cannot understand each other.</p></Reveal><Reveal><h2>The idea behind one base</h2><p>Projects, people, clients, finance and knowledge should meet in a shared operating context.</p></Reveal><Reveal><h2>Product principles</h2><p>Be concrete. Keep context connected. Respect responsibility. Make company operations easier to understand.</p></Reveal></div></section><FinalBlock title="Build your company from one base." /></MarketingLayout>;

export const ContactPage = () => {
  const [sent, setSent] = useState(false);
  const submit = (event) => { event.preventDefault(); setSent(true); };
  return <MarketingLayout title="Contact HousesBase"><PageHero title="Let's talk about how your company operates." intro="Tell us what you are trying to connect, and we will help you understand whether HousesBase fits." actions={false} /><section className="mk-section"><div className="mk-shell mk-contact-layout"><div><h2>Start with your operation.</h2><p>Projects, people, clients, finance or the full company system. We will meet you where the complexity starts.</p></div>{sent ? <div className="mk-form-success" role="status"><span aria-hidden="true">✓</span><h2>Message prepared.</h2><p>Thanks. Connect this form to your approved public contact endpoint before production launch.</p></div> : <form className="mk-contact-form" onSubmit={submit}><label>Name<input name="name" autoComplete="name" required /></label><label>Work email<input name="email" type="email" autoComplete="email" required /></label><label>Company<input name="company" autoComplete="organization" required /></label><label>Team size<select name="teamSize" defaultValue=""><option value="" disabled>Select a range</option><option>10-49</option><option>50-99</option><option>100-249</option><option>250+</option></select></label><label>What are you interested in?<select name="interest" defaultValue="HousesBase overview"><option>HousesBase overview</option><option>Projects</option><option>HR</option><option>Finance</option><option>Client operations</option><option>Nucleus</option><option>Pricing</option><option>Other</option></select></label><label className="mk-form-wide">Message<textarea name="message" rows="5" required /></label><button className="mk-button mk-button-primary" type="submit">Send Message <span aria-hidden="true">→</span></button></form>}</div></section></MarketingLayout>;
};

export const ResourcesPage = () => <MarketingLayout title="Resources"><PageHero title="Resources for a more connected operation." intro="Follow product changes, review our security approach and learn how HousesBase fits software-company work." /><section className="mk-section"><div className="mk-shell mk-resource-grid"><Link to="/changelog"><span>Product</span><h2>Changelog</h2><p>See what is new, improved and fixed.</p></Link><Link to="/security"><span>Platform</span><h2>Security</h2><p>Read how security is considered across HousesBase.</p></Link><Link to="/contact"><span>Company</span><h2>Talk to us</h2><p>Discuss your operation with the HousesBase team.</p></Link></div></section></MarketingLayout>;

export const LegalPage = ({ type }) => <MarketingLayout title={type === 'privacy' ? 'Privacy' : 'Terms'}><PageHero title={`${type === 'privacy' ? 'Privacy' : 'Terms'} information`} intro="This public page is reserved for approved legal copy before production launch." actions={false} /><section className="mk-section"><div className="mk-shell mk-legal"><h2>Legal copy required</h2><p>HousesBase should publish reviewed legal language here. Placeholder marketing language has intentionally not been used.</p><Link to="/contact">Contact HousesBase</Link></div></section></MarketingLayout>;

const FinalBlock = ({ title = 'Bring your software house back to one base.' }) => <section className="mk-final"><div className="mk-shell"><Reveal><h2>{title}</h2><p>Projects. People. Clients. Finance. Operations. Connected through HousesBase.</p><PrimaryActions secondary="Book a Demo" secondaryTo="/contact" /></Reveal></div></section>;
