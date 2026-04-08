/**
 * Global type declarations for the TWS frontend.
 * Referenced by jsconfig.json. No import needed in .js/.jsx files.
 */

// ─── Auth / User ─────────────────────────────────────────────────────────────

export interface AuthUser {
  _id: string;
  id?: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  orgId?: string;
  tenantId?: string;
  permissions?: string[];
  avatar?: string;
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  erpCategory: string;
  erpModules: string[];
  status: 'active' | 'suspended' | 'cancelled';
  plan?: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  permissions?: string[];
  children?: NavItem[];
}

// ─── Common Component Props ────────────────────────────────────────────────────

export interface LoadingProps {
  loading?: boolean;
  error?: string | null;
  children?: React.ReactNode;
}

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string | number;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  status: 'active' | 'inactive' | 'terminated';
  joinDate?: string;
  avatar?: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  clientId?: string;
  teamMembers?: string[];
  progress?: number;
}

// ─── Environment Variables ────────────────────────────────────────────────────

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL?: string;
      REACT_APP_WS_URL?: string;
      REACT_APP_WSL_URL?: string;
      REACT_APP_ENV?: 'development' | 'staging' | 'production';
      NODE_ENV: 'development' | 'test' | 'production';
    }
  }
}
