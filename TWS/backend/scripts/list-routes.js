#!/usr/bin/env node

/**
 * Route listing script for Supra-Admin Backend
 * Lists all registered Express routes with their methods and paths
 */

// Set environment variables to disable Redis for route listing
process.env.REDIS_DISABLED = 'true';
process.env.BULLMQ_DISABLED = 'true';

const { app } = require('../server.js');

console.log('🔍 Supra-Admin Backend Route Analysis');
console.log('=====================================\n');

const routes = [];

// Extract routes from Express app
function extractRoutes(layer, basePath = '') {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
    const path = basePath + layer.route.path;
    routes.push({ 
      path: path, 
      methods: methods,
      middleware: layer.route.stack.length
    });
  } else if (layer.name === 'router' && layer.regexp) {
    const routerPath = layer.regexp.source
      .replace('\\/?', '')
      .replace('(?=\\/|$)', '')
      .replace(/\\\//g, '/')
      .replace(/\^/g, '')
      .replace(/\$/g, '')
      .replace(/\\/g, '');
    
    layer.handle.stack.forEach(sublayer => {
      extractRoutes(sublayer, basePath + routerPath);
    });
  }
}

// Process all middleware layers
app._router.stack.forEach(layer => {
  extractRoutes(layer);
});

// Sort routes by path
routes.sort((a, b) => a.path.localeCompare(b.path));

// Group routes by category
const routeCategories = {
  'Health & System': [],
  'Authentication': [],
  'Supra-Admin': [],
  'Tenant Management': [],
  'User Management': [],
  'Project Management': [],
  'File Management': [],
  'Analytics & Reports': [],
  'Infrastructure': [],
  'Other': []
};

routes.forEach(route => {
  const path = route.path;
  
  if (path.includes('/health') || path.includes('/metrics')) {
    routeCategories['Health & System'].push(route);
  } else if (path.includes('/auth')) {
    routeCategories['Authentication'].push(route);
  } else if (path.includes('/supra-admin')) {
    routeCategories['Supra-Admin'].push(route);
  } else if (path.includes('/tenant')) {
    routeCategories['Tenant Management'].push(route);
  } else if (path.includes('/users') || path.includes('/employees')) {
    routeCategories['User Management'].push(route);
  } else if (path.includes('/projects') || path.includes('/tasks') || path.includes('/boards')) {
    routeCategories['Project Management'].push(route);
  } else if (path.includes('/files')) {
    routeCategories['File Management'].push(route);
  } else if (path.includes('/analytics') || path.includes('/reports')) {
    routeCategories['Analytics & Reports'].push(route);
  } else if (path.includes('/infrastructure') || path.includes('/monitoring')) {
    routeCategories['Infrastructure'].push(route);
  } else {
    routeCategories['Other'].push(route);
  }
});

// Display routes by category
Object.entries(routeCategories).forEach(([category, categoryRoutes]) => {
  if (categoryRoutes.length > 0) {
    console.log(`\n📁 ${category} (${categoryRoutes.length} routes)`);
    console.log('─'.repeat(50));
    
    categoryRoutes.forEach(route => {
      const methods = route.methods.padEnd(8);
      const middleware = `(${route.middleware} middleware)`.padEnd(15);
      console.log(`${methods} ${route.path.padEnd(40)} ${middleware}`);
    });
  }
});

// Summary statistics
console.log('\n📊 Route Summary');
console.log('================');
console.log(`Total Routes: ${routes.length}`);
console.log(`GET Routes: ${routes.filter(r => r.methods.includes('GET')).length}`);
console.log(`POST Routes: ${routes.filter(r => r.methods.includes('POST')).length}`);
console.log(`PUT Routes: ${routes.filter(r => r.methods.includes('PUT')).length}`);
console.log(`DELETE Routes: ${routes.filter(r => r.methods.includes('DELETE')).length}`);
console.log(`PATCH Routes: ${routes.filter(r => r.methods.includes('PATCH')).length}`);

// Security analysis
const authRoutes = routes.filter(r => r.path.includes('/auth'));
const protectedRoutes = routes.filter(r => !r.path.includes('/health') && !r.path.includes('/auth'));
const publicRoutes = routes.filter(r => r.path.includes('/health') || r.path.includes('/auth'));

console.log('\n🔒 Security Analysis');
console.log('===================');
console.log(`Public Routes: ${publicRoutes.length}`);
console.log(`Protected Routes: ${protectedRoutes.length}`);
console.log(`Authentication Routes: ${authRoutes.length}`);

// Export routes for testing
const fs = require('fs');
const routeData = {
  timestamp: new Date().toISOString(),
  totalRoutes: routes.length,
  categories: routeCategories,
  allRoutes: routes,
  summary: {
    byMethod: {
      GET: routes.filter(r => r.methods.includes('GET')).length,
      POST: routes.filter(r => r.methods.includes('POST')).length,
      PUT: routes.filter(r => r.methods.includes('PUT')).length,
      DELETE: routes.filter(r => r.methods.includes('DELETE')).length,
      PATCH: routes.filter(r => r.methods.includes('PATCH')).length
    },
    security: {
      public: publicRoutes.length,
      protected: protectedRoutes.length,
      auth: authRoutes.length
    }
  }
};

fs.writeFileSync('route-analysis.json', JSON.stringify(routeData, null, 2));
console.log('\n💾 Route analysis saved to route-analysis.json');

console.log('\n✅ Route analysis complete!');
