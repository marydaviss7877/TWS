import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import BrandMark from '../../../shared/components/ui/BrandMark';
import './SoftwareHouseFooter.css';

const SoftwareHouseFooter = ({ moduleName, compact = false, children }) => (
  <footer className={`sh-public-footer ${compact ? 'sh-public-footer--compact' : ''}`}>
    <div className="sh-public-footer__inner">
      <div className="sh-public-footer__brand">
        <Link to="/" aria-label="HouseBase — Software House OS">
          <strong><BrandMark simple size={20} /></strong><span><b>HouseBase</b><small>{moduleName || 'Software House OS'}</small></span>
        </Link>
        {!compact && <p>Projects, people and finance—one operating truth for software delivery.</p>}
        <span className="sh-public-footer__status"><i /> Systems operational</span>
      </div>

      {!compact && (
        <div className="sh-public-footer__links">
          <div><b>Platform</b><Link to="/">Overview</Link><Link to="/projects">Projects</Link><Link to="/hrm">HRM</Link><Link to="/finance">Finance</Link></div>
          <div><b>Start</b><Link to="/signup">Create workspace <ArrowUpRightIcon /></Link><Link to="/login">Sign in</Link><Link to="/#security">Security</Link></div>
        </div>
      )}

      {compact && <nav><Link to="/">Platform</Link><Link to="/projects">Projects</Link><Link to="/hrm">HRM</Link><Link to="/finance">Finance</Link></nav>}
    </div>
    <div className="sh-public-footer__bottom">
      <span>© {new Date().getFullYear()} HouseBase · An official Delta Labs product</span>
      <div className="sh-public-footer__meta">
        {children || <span>Software House Operating System</span>}
        <a href="https://deltalabs.tech" target="_blank" rel="noopener noreferrer">
          Powered by Delta Labs <ArrowUpRightIcon />
        </a>
      </div>
    </div>
  </footer>
);

export default SoftwareHouseFooter;
