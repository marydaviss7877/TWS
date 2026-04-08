/**
 * Global type augmentations for the TWS backend.
 * Referenced automatically by jsconfig.json / IDE tooling.
 * These are ambient declarations — no imports needed in .js files.
 */

import { Request } from 'express';

// ─── JWT Payload ────────────────────────────────────────────────────────────

export interface TWSTokenPayload {
  userId: string;
  email: string;
  role: string;
  orgId?: string;
  tenantId?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

// ─── Augment Express Request ─────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user from JWT middleware */
      user?: {
        _id: string;
        id?: string;
        email: string;
        role: string;
        orgId?: string;
        tenantId?: string;
        permissions?: string[];
      };
      /** Tenant resolved from route param (set by unifiedTenantAuth) */
      tenant?: {
        _id: string;
        slug: string;
        name: string;
        erpCategory?: string;
        erpModules?: string[];
        status: string;
      };
      /** Request ID injected by requestLogger middleware */
      requestId?: string;
    }
  }
}

// ─── Common API Response ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Pagination Query ─────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// ─── Worker Job Data ──────────────────────────────────────────────────────────

export interface NotificationJobData {
  userId: string;
  type: 'push' | 'email' | 'in_app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface FileProcessorJobData {
  fileId: string;
  operation: 'process' | 'thumbnail' | 'compress';
  options?: Record<string, unknown>;
}

// ─── Tenant Context ───────────────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string;
  orgId: string;
  slug: string;
  erpModules: string[];
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
}
