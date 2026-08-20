import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import BrandMark from '../../shared/components/ui/BrandMark';
import ThemeToggle from '../../shared/components/ui/ThemeToggle';
import { footerNavigation, pageMetadata, productGroups, solutionGroups } from '../data/marketingData';
import './marketing.css';

const resourceGroups = [{
  title: 'Learn & Explore',
  items: [
    ['Resources', '/resources', 'Guidance for a more connected operation.'],
    ['Changelog', '/changelog', 'See what is new across HousesBase.'],
    ['Security', '/security', 'How security is considered across the platform.'],
  ],
}];

const companyGroups = [{
  title: 'HousesBase',
  items: [
    ['About', '/about', 'Why software companies need one operating base.'],
    ['Contact', '/contact', 'Talk with us about your operation.'],
  ],
}];

const MegaMenu = ({ groups, wide, onClose, feature }) => (
  <div className={`mk-mega ${wide ? 'mk-mega-wide' : ''} ${feature ? 'mk-mega-featured' : ''}`} role="menu">
    <div className="mk-mega-layout">
      {feature && (
        <Link className="mk-mega-spotlight" to={feature.href} onClick={onClose} role="menuitem">
          <span>{feature.label}</span>
          <strong>{feature.title}</strong>
          <p>{feature.copy}</p>
          <b>Explore <i aria-hidden="true">→</i></b>
        </Link>
      )}
      <div className="mk-mega-grid">
        {groups.map((group) => (
          <div key={group.title} className="mk-mega-group">
            <p>{group.title}</p>
            <div className="mk-mega-branch">
              {group.items.map(([label, href, copy]) => (
                <Link key={`${group.title}-${label}`} to={href} role="menuitem" onClick={onClose}>
                  <span className="mk-mega-node" aria-hidden="true" />
                  <strong>{label}</strong>
                  <span>{copy}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    {wide && <Link className="mk-mega-cta" to="/product" onClick={onClose}>Explore every HousesBase capability <span aria-hidden="true">→</span></Link>}
  </div>
);

export const MarketingNav = ({ authMode = false, compact = false }) => {
  const [open, setOpen] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpen(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const toggle = (name) => setOpen((current) => current === name ? null : name);

  return (
    <header className="mk-nav-shell" ref={navRef} onMouseLeave={() => setOpen(null)}>
      <nav className="mk-nav mk-shell" aria-label="Main navigation">
        <Link className="mk-brand" to="/" aria-label="HousesBase home">
          <span className="mk-brand-mark"><BrandMark size={31} /></span>
          <span className="mk-brand-copy"><strong>HousesBase</strong><small>Software House OS</small></span>
        </Link>
        {!compact && <div className="mk-nav-desktop">
          <div className="mk-nav-menu-wrap" onMouseEnter={() => setOpen('product')}>
            <button type="button" className={open === 'product' ? 'active' : ''} onClick={() => toggle('product')} aria-haspopup="menu" aria-expanded={open === 'product'}>Product <span aria-hidden="true">⌄</span></button>
            {open === 'product' && <MegaMenu groups={productGroups} wide onClose={() => setOpen(null)} feature={{ label: 'Platform overview', title: 'One base for the business behind the software.', copy: 'See how projects, people, clients, finance and knowledge work as one system.', href: '/product' }} />}
          </div>
          <div className="mk-nav-menu-wrap" onMouseEnter={() => setOpen('solutions')}>
            <button type="button" className={open === 'solutions' ? 'active' : ''} onClick={() => toggle('solutions')} aria-haspopup="menu" aria-expanded={open === 'solutions'}>Solutions <span aria-hidden="true">⌄</span></button>
            {open === 'solutions' && <MegaMenu groups={solutionGroups} onClose={() => setOpen(null)} feature={{ label: 'Built for operators', title: 'Connect the company behind the code.', copy: 'Choose a view shaped around your company or the team doing the work.', href: '/solutions/software-houses' }} />}
          </div>
          <NavLink to="/pricing">Pricing</NavLink>
          <div className="mk-nav-menu-wrap" onMouseEnter={() => setOpen('resources')}>
            <button type="button" className={open === 'resources' ? 'active' : ''} onClick={() => toggle('resources')} aria-haspopup="menu" aria-expanded={open === 'resources'}>Resources <span aria-hidden="true">⌄</span></button>
            {open === 'resources' && <MegaMenu groups={resourceGroups} onClose={() => setOpen(null)} />}
          </div>
          <div className="mk-nav-menu-wrap" onMouseEnter={() => setOpen('company')}>
            <button type="button" className={open === 'company' ? 'active' : ''} onClick={() => toggle('company')} aria-haspopup="menu" aria-expanded={open === 'company'}>Company <span aria-hidden="true">⌄</span></button>
            {open === 'company' && <MegaMenu groups={companyGroups} onClose={() => setOpen(null)} />}
          </div>
        </div>}
        <div className="mk-nav-actions">
          <ThemeToggle className="mk-theme-toggle" size="sm" showLabel shortcut />
          {!authMode && <Link className="mk-login" to="/login">Log in <span aria-hidden="true">↗</span></Link>}
          {!compact && <Link className="mk-button mk-button-primary mk-nav-cta" to={authMode && location.pathname === '/signup' ? '/login' : '/signup'}>
            {authMode && location.pathname === '/signup' ? 'Log in' : 'Get Started'} <span aria-hidden="true">→</span>
          </Link>}
          {!compact && <button type="button" className="mk-menu-toggle" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label="Toggle navigation"><span /><span /></button>}
        </div>
      </nav>
      {mobileOpen && !compact && (
        <div className="mk-mobile-menu">
          <div className="mk-mobile-brand"><span>Navigate HousesBase</span><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">Close</button></div>
          <details><summary>Product <span aria-hidden="true">+</span></summary><MegaMenu groups={productGroups} onClose={() => setMobileOpen(false)} /></details>
          <details><summary>Solutions <span aria-hidden="true">+</span></summary><MegaMenu groups={solutionGroups} onClose={() => setMobileOpen(false)} /></details>
          <Link to="/pricing">Pricing</Link>
          <details><summary>Resources <span aria-hidden="true">+</span></summary><MegaMenu groups={resourceGroups} onClose={() => setMobileOpen(false)} /></details>
          <details><summary>Company <span aria-hidden="true">+</span></summary><MegaMenu groups={companyGroups} onClose={() => setMobileOpen(false)} /></details>
          <Link className="mk-button mk-button-primary" to="/signup">Get Started</Link>
        </div>
      )}
    </header>
  );
};

export const AuthMarketingNav = ({ compact = false }) => (
  <div className="mk-site mk-auth-nav-host">
    <MarketingNav authMode compact={compact} />
  </div>
);

export const MarketingFooter = () => (
  <footer className="mk-footer">
    <div className="mk-shell">
      <div className="mk-footer-lead">
        <Link className="mk-brand" to="/"><BrandMark size={34} /><span>HousesBase</span></Link>
        <p>The operating base for modern software houses.</p>
      </div>
      <div className="mk-footer-nav">
        {footerNavigation.map(([group, items]) => (
          <div key={group}><strong>{group}</strong>{items.map(([label, href]) => <Link key={label} to={href}>{label}</Link>)}</div>
        ))}
      </div>
      <div className="mk-footer-bottom"><span>© HousesBase</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></div>
    </div>
  </footer>
);

export const MarketingLayout = ({ children, title, description }) => {
  const location = useLocation();
  useEffect(() => {
    const fallback = pageMetadata[location.pathname] || [title ? `${title} | HousesBase` : 'HousesBase', description || 'The operating base for modern software houses.'];
    document.title = fallback[0];
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = fallback[1];
  }, [location.pathname, title, description]);

  return <div className="mk-site"><MarketingNav /><main>{children}</main><MarketingFooter /></div>;
};

export const PrimaryActions = ({ secondary = 'Explore HousesBase', secondaryTo = '/product' }) => (
  <div className="mk-actions">
    <Link className="mk-button mk-button-primary" to="/signup">Get Started <span aria-hidden="true">→</span></Link>
    <Link className="mk-button mk-button-secondary" to={secondaryTo}>{secondary}</Link>
  </div>
);

export const Reveal = ({ as: Tag = 'div', className = '', children }) => <Tag className={`mk-reveal ${className}`.trim()}>{children}</Tag>;
