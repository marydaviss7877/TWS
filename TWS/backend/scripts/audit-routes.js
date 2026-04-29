#!/usr/bin/env node
/**
 * Route Authorization Audit Script
 * 
 * This script audits all route files to identify:
 * 1. Routes missing authentication middleware
 * 2. Routes missing authorization checks
 * 3. Routes with inconsistent middleware patterns
 * 
 * Usage: node scripts/audit-routes.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROUTES_DIR = path.join(__dirname, '../src/modules');
const ROUTES_LEGACY_DIR = path.join(__dirname, '../src/routes');

// Authentication middleware patterns
const AUTH_MIDDLEWARE = [
  'authenticateToken',
  'verifyERPToken',
  'verifyTenantOrgAccess',
  'requireTWSAdminAccess'
];

// Authorization middleware patterns
const AUTHZ_MIDDLEWARE = [
  'requireRole',
  'requirePermission',
  'requirePlatformPermission',
  'requirePlatformRole',
  'requirePermission'
];

// Public routes (don't need auth)
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/signup',
  '/api/email/validate',
  '/health',
  '/metrics'
];

class RouteAuditor {
  constructor() {
    this.issues = [];
    this.routes = [];
  }

  /**
   * Find all route files
   */
  findRouteFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.findRouteFiles(filePath, fileList);
      } else if (file.endsWith('.js') && (file.includes('route') || file.includes('Route') || file.includes('index'))) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  /**
   * Parse route file and extract route definitions
   */
  parseRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const routes = [];
    
    let currentRoute = null;
    
    lines.forEach((line, index) => {
      // Match route definitions: router.get/post/put/delete/patch
      const routeMatch = line.match(/router\.(get|post|put|delete|patch|use)\s*\(['"`]([^'"`]+)['"`]/);
      
      if (routeMatch) {
        if (currentRoute) {
          routes.push(currentRoute);
        }
        
        currentRoute = {
          file: filePath,
          line: index + 1,
          method: routeMatch[1].toUpperCase(),
          path: routeMatch[2],
          middlewares: [],
          hasAuth: false,
          hasAuthz: false,
          rawLine: line.trim()
        };
      }
      
      // Check for middleware in current route
      if (currentRoute && index < currentRoute.line + 20) {
        // Check for authentication middleware
        AUTH_MIDDLEWARE.forEach(mw => {
          if (line.includes(mw)) {
            currentRoute.hasAuth = true;
            currentRoute.middlewares.push(mw);
          }
        });
        
        // Check for authorization middleware
        AUTHZ_MIDDLEWARE.forEach(mw => {
          if (line.includes(mw)) {
            currentRoute.hasAuthz = true;
            currentRoute.middlewares.push(mw);
          }
        });
      }
    });
    
    if (currentRoute) {
      routes.push(currentRoute);
    }
    
    return routes;
  }

  /**
   * Check if route is public
   */
  isPublicRoute(routePath) {
    return PUBLIC_ROUTES.some(publicPath => routePath.startsWith(publicPath));
  }

  /**
   * Audit all routes
   */
  audit() {
    console.log('🔍 Starting route audit...\n');
    
    // Find all route files
    const routeFiles = [
      ...this.findRouteFiles(ROUTES_DIR),
      ...this.findRouteFiles(ROUTES_LEGACY_DIR)
    ];
    
    console.log(`📁 Found ${routeFiles.length} route files\n`);
    
    // Parse all routes
    routeFiles.forEach(file => {
      try {
        const routes = this.parseRouteFile(file);
        this.routes.push(...routes);
      } catch (error) {
        console.error(`❌ Error parsing ${file}:`, error.message);
      }
    });
    
    console.log(`📊 Found ${this.routes.length} routes\n`);
    
    // Audit routes
    this.routes.forEach(route => {
      const isPublic = this.isPublicRoute(route.path);
      
      if (isPublic) {
        return; // Skip public routes
      }
      
      // Check for missing authentication
      if (!route.hasAuth) {
        this.issues.push({
          severity: 'CRITICAL',
          type: 'MISSING_AUTH',
          route: `${route.method} ${route.path}`,
          file: route.file,
          line: route.line,
          message: `Route missing authentication middleware`
        });
      }
      
      // Check for missing authorization
      if (route.hasAuth && !route.hasAuthz) {
        this.issues.push({
          severity: 'HIGH',
          type: 'MISSING_AUTHZ',
          route: `${route.method} ${route.path}`,
          file: route.file,
          line: route.line,
          message: `Route has authentication but missing authorization check`
        });
      }
    });
    
    return this;
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('📋 ROUTE AUDIT REPORT\n');
    console.log('='.repeat(80));
    console.log(`Total Routes Audited: ${this.routes.length}`);
    console.log(`Total Issues Found: ${this.issues.length}\n`);
    
    // Group by severity
    const critical = this.issues.filter(i => i.severity === 'CRITICAL');
    const high = this.issues.filter(i => i.severity === 'HIGH');
    
    console.log(`🔴 CRITICAL Issues: ${critical.length}`);
    console.log(`🟠 HIGH Issues: ${high.length}\n`);
    
    // Group by type
    const missingAuth = this.issues.filter(i => i.type === 'MISSING_AUTH');
    const missingAuthz = this.issues.filter(i => i.type === 'MISSING_AUTHZ');
    
    console.log(`Missing Authentication: ${missingAuth.length}`);
    console.log(`Missing Authorization: ${missingAuthz.length}\n`);
    
    // Show critical issues
    if (critical.length > 0) {
      console.log('🔴 CRITICAL ISSUES:\n');
      critical.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.route}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Line: ${issue.line}`);
        console.log(`   Issue: ${issue.message}\n`);
      });
    }
    
    // Show high issues (first 20)
    if (high.length > 0) {
      console.log('🟠 HIGH ISSUES (showing first 20):\n');
      high.slice(0, 20).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.route}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Line: ${issue.line}`);
        console.log(`   Issue: ${issue.message}\n`);
      });
      
      if (high.length > 20) {
        console.log(`... and ${high.length - 20} more high-priority issues\n`);
      }
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRoutes: this.routes.length,
        totalIssues: this.issues.length,
        critical: critical.length,
        high: high.length
      },
      issues: this.issues,
      routes: this.routes.map(r => ({
        method: r.method,
        path: r.path,
        file: r.file,
        line: r.line,
        hasAuth: r.hasAuth,
        hasAuthz: r.hasAuthz,
        middlewares: r.middlewares
      }))
    };
    
    const reportPath = path.join(__dirname, '../route-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Detailed report saved to: ${reportPath}`);
    
    // Exit with error code if critical issues found
    if (critical.length > 0) {
      console.log('\n❌ Audit failed: Critical issues found');
      process.exit(1);
    }
    
    if (high.length > 0) {
      console.log('\n⚠️  Audit completed with warnings');
      process.exit(0);
    }
    
    console.log('\n✅ Audit passed: No critical issues found');
    process.exit(0);
  }
}

// Run audit
const auditor = new RouteAuditor();
auditor.audit().generateReport();
