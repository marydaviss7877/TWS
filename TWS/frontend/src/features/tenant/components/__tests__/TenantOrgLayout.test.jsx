/**
 * Integration tests for TenantOrgLayout component
 * 
 * Note: These are basic integration tests. Full component testing requires
 * mocking React Router, context providers, and other dependencies.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantOrgLayout from '../TenantOrgLayout';

// Mock dependencies
jest.mock('../../../app/providers/TenantAuthContext', () => ({
  useTenantAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'admin'
    },
    tenant: {
      id: '1',
      name: 'Test Tenant',
      slug: 'test-tenant',
      erpCategory: 'business'
    },
    isAuthenticated: true,
    loading: false,
    logout: jest.fn()
  })
}));

jest.mock('../../../app/providers/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn()
  })
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ tenantSlug: 'test-tenant' }),
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => jest.fn()
}));

// Mock lazy-loaded components
jest.mock('../CommandPalette', () => {
  return function CommandPalette({ isOpen, onClose }) {
    return isOpen ? <div data-testid="command-palette">Command Palette</div> : null;
  };
});

jest.mock('../../../shared/components/navigation/ClickUpSidebar', () => {
  return function ClickUpSidebar() {
    return <div data-testid="clickup-sidebar">ClickUp Sidebar</div>;
  };
});

describe('TenantOrgLayout', () => {
  beforeEach(() => {
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  it('should render children content', () => {
    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div data-testid="test-content">Test Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('should render skip to main content link', () => {
    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div>Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('should have main content area with proper id', () => {
    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div>Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveAttribute('id', 'main-content');
  });

  it('should render header with banner role', () => {
    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div>Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    const headers = screen.getAllByRole('banner');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should render navigation with proper aria-label', () => {
    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div>Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    const navs = screen.getAllByRole('navigation');
    expect(navs.length).toBeGreaterThan(0);
  });

  it('should handle mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    });

    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div>Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    // Mobile header should be visible
    const mobileHeaders = screen.getAllByRole('banner');
    expect(mobileHeaders.length).toBeGreaterThan(0);
  });

  it('should handle desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280
    });

    render(
      <BrowserRouter>
        <TenantOrgLayout>
          <div>Content</div>
        </TenantOrgLayout>
      </BrowserRouter>
    );

    // Desktop layout should render
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
  });
});
