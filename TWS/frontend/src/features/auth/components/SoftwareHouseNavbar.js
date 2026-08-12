import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '../../../shared/components/ui/ThemeToggle';
import BrandMark from '../../../shared/components/ui/BrandMark';
import './SoftwareHouseNavbar.css';

const SoftwareHouseNavbar = ({
  isDarkMode,
  fixed = true,
  showThemeToggle = true,
  className = ''
}) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = useMemo(
    () => [
      { id: 'story', label: 'Story', href: '/#story', isRoute: false },
      { id: 'modules', label: 'Platform', href: '/#platform', isRoute: false },
      { id: 'projects', label: 'Projects', href: '/projects', isRoute: true },
      { id: 'hrm', label: 'HRM', href: '/hrm', isRoute: true },
      { id: 'finance', label: 'Finance', href: '/finance', isRoute: true }
    ],
    []
  );

  const isActive = (link) => {
    if (link.isRoute) return location.pathname === link.href;
    return location.pathname === '/software-house' && link.id === 'modules';
  };

  const isPublicShell = location.pathname.startsWith('/software-house');

  return (
    <header className={`sh-nav-shell ${fixed ? 'sh-nav-fixed' : ''} ${isPublicShell ? 'sh-nav-landing' : ''} ${className}`.trim()}>
      <nav
        className={`sh-nav ${isDarkMode ? 'sh-nav-dark' : 'sh-nav-light'}`}
        aria-label="Software House navigation"
      >
        <div className="sh-nav-inner">
          <Link to="/" className="sh-brand" onClick={() => setMobileOpen(false)}>
            <span className="sh-brand-mark" aria-hidden="true">
              <BrandMark simple size={18} />
            </span>
            <span className="sh-brand-lockup">
              <span className="sh-brand-wordmark">HouseBase</span>
              <span className="sh-brand-badge">Software House OS</span>
            </span>
          </Link>

          <div className="sh-nav-links-desktop">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.id}
                  to={link.href}
                  className={`sh-nav-link ${isActive(link) ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.id}
                  href={link.href}
                  className={`sh-nav-link ${isActive(link) ? 'active' : ''}`}
                >
                  {link.label}
                </a>
              )
            )}
          </div>

          <div className="sh-nav-actions">
            {showThemeToggle ? <ThemeToggle size="sm" shortcut={true} /> : null}
            <Link to="/login" className="sh-nav-login">
              Sign in
            </Link>
            <Link to="/signup" className="sh-nav-cta">
              Start free <span aria-hidden="true">↗</span>
            </Link>
            <button
              type="button"
              className="sh-nav-mobile-toggle"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <XMarkIcon /> : <Bars3Icon />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="sh-nav-mobile-menu">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.id}
                  to={link.href}
                  className={`sh-nav-link ${isActive(link) ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.id}
                  href={link.href}
                  className={`sh-nav-link ${isActive(link) ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              )
            )}
            <Link to="/login" className="sh-nav-login" onClick={() => setMobileOpen(false)}>
              Login
            </Link>
            <Link to="/signup" className="sh-nav-cta" onClick={() => setMobileOpen(false)}>
              Build your workspace
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default SoftwareHouseNavbar;
