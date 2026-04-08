# Organization ID Standardization Guide

## Overview
This document outlines the standardized approach for handling Organization ID (`orgId`) throughout the TWS ERP system, addressing Issue #3.2: Tenant vs Organization Confusion.

---

## Key Concepts

### Tenant vs Organization

**Tenant (Platform-Level)**
- **Purpose:** Multi-tenant SaaS platform isolation
- **Scope:** Platform-wide (all tenants share the same platform)
- **Model:** `Tenant` model
- **Identifier:** `tenantId` (ObjectId) or `tenantSlug` (string)
- **Usage:** Platform-level operations, billing, subscriptions, platform admin

**Organization (Tenant-Level)**
- **Purpose:** Workspace within a tenant
- **Scope:** Within a single tenant (one tenant can have multiple organizations)
- **Model:** `Organization` model
- **Identifier:** `orgId` (ObjectId) or `orgSlug` (string)
- **Usage:** **Data isolation for tenant-level entities** (projects, users, tasks, etc.)

### The Rule

**For tenant-level data isolation, ALWAYS use `orgId`, not `tenantId`**

- ✅ **Use `orgId`:** Projects, Users, Tasks, Departments, Finance, HR data
- ✅ **Use `tenantId`:** Platform-level operations, billing, subscriptions
- ❌ **Don't mix:** Don't use `tenantId` for tenant-level data isolation

---

## Standardized Utility: `orgIdHelper.js`

### Location
`backend/src/utils/orgIdHelper.js`

### Functions

#### 1. `getOrgId(req, options)`
**Purpose:** Get Organization ID from request context with fallback chain

**Parameters:**
- `req` - Express request object
- `options` - Options object
  - `required` (boolean) - If true, throws error if orgId not found
  - `allowFallback` (boolean) - If false, only uses req.orgId (strict mode)

**Returns:** Promise<String|ObjectId|null>

**Fallback Chain:**
1. `req.orgId` (already set by middleware)
2. `req.tenantContext?.orgId` (from tenant context middleware)
3. `req.tenant?.organizationId` (from tenant model)
4. `req.tenant?.orgId` (legacy tenant field)
5. Organization lookup by tenant slug (`organization.slug === tenant.slug`)
6. `req.user?.orgId` (from authenticated user)
7. Admin user lookup by tenant owner credentials

**Example:**
```javascript
const { getOrgId } = require('../../utils/orgIdHelper');

// Basic usage
const orgId = await getOrgId(req);

// Required mode (throws if not found)
const orgId = await getOrgId(req, { required: true });

// Strict mode (no fallback)
const orgId = await getOrgId(req, { allowFallback: false });
```

#### 2. `getOrgIdSync(req)`
**Purpose:** Get Organization ID synchronously (no DB lookup)

**Use when:** You're certain orgId is already set by middleware

**Example:**
```javascript
const { getOrgIdSync } = require('../../utils/orgIdHelper');

// Fast synchronous access
const orgId = getOrgIdSync(req);
```

#### 3. `ensureOrgId(req)`
**Purpose:** Ensure orgId is set on request object

**Use in:** Middleware to standardize orgId availability

**Example:**
```javascript
const { ensureOrgId } = require('../../utils/orgIdHelper');

// In middleware
const orgId = await ensureOrgId(req);
// Now req.orgId is set for all subsequent handlers
```

#### 4. `getTenantFilter(req, options)`
**Purpose:** Build tenant filter for queries

**Returns:** `{ orgId: ObjectId }` or `{ orgId: ObjectId, tenantId: ObjectId }`

**Example:**
```javascript
const { getTenantFilter } = require('../../utils/orgIdHelper');

// Standard filter (orgId only)
const filter = await getTenantFilter(req);
// { orgId: '...' }

// Include tenantId
const filter = await getTenantFilter(req, { useTenantId: true });
// { orgId: '...', tenantId: '...' }

// Use in query
const projects = await Project.find(filter);
```

#### 5. `validateOrgIdMatch(req, allowSuperAdmin)`
**Purpose:** Validate orgId matches between user and tenant

**Security check:** Prevents users from accessing wrong organization

**Example:**
```javascript
const { validateOrgIdMatch } = require('../../utils/orgIdHelper');

// Validate match (throws if mismatch)
await validateOrgIdMatch(req);

// Allow super admin bypass
await validateOrgIdMatch(req, true);
```

---

## Migration Guide

### Step 1: Update Controllers

**Before:**
```javascript
const getOrgId = (req) => {
  return req.orgId || req.workspace?.organizationId || req.tenantContext?.orgId || null;
};

exports.getProjects = async (req, res) => {
  const orgId = getOrgId(req);
  if (!orgId) {
    return res.status(500).json({ message: 'Organization context not available' });
  }
  // ...
};
```

**After:**
```javascript
const { getOrgId, ensureOrgId } = require('../../utils/orgIdHelper');

exports.getProjects = async (req, res) => {
  try {
    const orgId = await ensureOrgId(req);
    // orgId is guaranteed to be set
    // ...
  } catch (error) {
    return res.status(500).json({ 
      message: 'Organization context not available',
      error: error.message 
    });
  }
};
```

### Step 2: Update Queries

**Before:**
```javascript
const projects = await Project.find({ 
  tenantId: req.tenantId,  // ❌ Wrong - use orgId
  status: 'active' 
});
```

**After:**
```javascript
const { getTenantFilter } = require('../../utils/orgIdHelper');

const filter = await getTenantFilter(req);
const projects = await Project.find({ 
  ...filter,  // ✅ Correct - includes orgId
  status: 'active' 
});
```

### Step 3: Update Models

**Before:**
```javascript
const projectSchema = new mongoose.Schema({
  tenantId: {  // ❌ Wrong field name
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  },
  // ...
});
```

**After:**
```javascript
const projectSchema = new mongoose.Schema({
  orgId: {  // ✅ Correct field name
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  // ...
});
```

### Step 4: Update Middleware

**Before:**
```javascript
// In middleware
let orgId = req.tenantContext?.orgId || req.tenant?.orgId;
if (!orgId) {
  const org = await Organization.findOne({ slug: req.tenant.slug });
  orgId = org?._id;
}
req.orgId = orgId;
```

**After:**
```javascript
const { ensureOrgId } = require('../../utils/orgIdHelper');

// In middleware
const orgId = await ensureOrgId(req);
// req.orgId is now set
```

---

## Best Practices

### ✅ DO

1. **Always use `orgId` for tenant-level data isolation**
   ```javascript
   const projects = await Project.find({ orgId });
   ```

2. **Use the standardized utility**
   ```javascript
   const { getOrgId } = require('../../utils/orgIdHelper');
   const orgId = await getOrgId(req);
   ```

3. **Set orgId in middleware**
   ```javascript
   const { ensureOrgId } = require('../../utils/orgIdHelper');
   const orgId = await ensureOrgId(req);
   ```

4. **Use getTenantFilter for queries**
   ```javascript
   const { getTenantFilter } = require('../../utils/orgIdHelper');
   const filter = await getTenantFilter(req);
   const data = await Model.find(filter);
   ```

5. **Validate orgId match for security**
   ```javascript
   const { validateOrgIdMatch } = require('../../utils/orgIdHelper');
   await validateOrgIdMatch(req);
   ```

### ❌ DON'T

1. **Don't use `tenantId` for tenant-level data isolation**
   ```javascript
   // ❌ Wrong
   const projects = await Project.find({ tenantId: req.tenantId });
   ```

2. **Don't create custom orgId resolution logic**
   ```javascript
   // ❌ Wrong - use utility instead
   const orgId = req.orgId || req.tenant?.orgId || ...;
   ```

3. **Don't mix `tenantId` and `orgId` in same query**
   ```javascript
   // ❌ Wrong - confusing
   const projects = await Project.find({ 
     tenantId: req.tenantId,
     orgId: req.orgId 
   });
   ```

4. **Don't skip orgId validation**
   ```javascript
   // ❌ Wrong - security risk
   const projects = await Project.find({ status: 'active' });
   ```

---

## Common Patterns

### Pattern 1: Controller Method
```javascript
const { ensureOrgId, getTenantFilter } = require('../../utils/orgIdHelper');

exports.getProjects = async (req, res) => {
  try {
    const orgId = await ensureOrgId(req);
    const filter = await getTenantFilter(req);
    
    const projects = await Project.find(filter)
      .populate('clientId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
```

### Pattern 2: Middleware
```javascript
const { ensureOrgId } = require('../../utils/orgIdHelper');

const orgIdMiddleware = async (req, res, next) => {
  try {
    await ensureOrgId(req);
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Organization context not available'
    });
  }
};
```

### Pattern 3: Service Method
```javascript
const { getTenantFilter } = require('../../utils/orgIdHelper');

class ProjectService {
  async getProjectsForTenant(req) {
    const filter = await getTenantFilter(req);
    return await Project.find(filter);
  }
}
```

---

## Database Schema Guidelines

### Models Should Have

```javascript
const schema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true  // ✅ Always index orgId for performance
  },
  // ... other fields
});

// ✅ Always create compound index for common queries
schema.index({ orgId: 1, status: 1 });
schema.index({ orgId: 1, createdAt: -1 });
```

### Models Should NOT Have

```javascript
// ❌ Don't use tenantId for tenant-level data
tenantId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Tenant'
}
```

---

## Testing

### Unit Test Example
```javascript
const { getOrgId } = require('../../utils/orgIdHelper');

describe('getOrgId', () => {
  it('should get orgId from req.orgId', async () => {
    const req = { orgId: '507f1f77bcf86cd799439011' };
    const orgId = await getOrgId(req);
    expect(orgId).toBe('507f1f77bcf86cd799439011');
  });
  
  it('should fallback to tenant slug lookup', async () => {
    const req = {
      tenant: { slug: 'test-org' },
      user: null
    };
    // Mock Organization.findOne
    const orgId = await getOrgId(req);
    expect(orgId).toBeTruthy();
  });
  
  it('should throw if required and not found', async () => {
    const req = {};
    await expect(getOrgId(req, { required: true }))
      .rejects.toThrow('Organization ID not found');
  });
});
```

---

## Migration Checklist

- [ ] Update all controllers to use `orgIdHelper`
- [ ] Update all queries to use `getTenantFilter`
- [ ] Update all models to use `orgId` instead of `tenantId`
- [ ] Update middleware to use `ensureOrgId`
- [ ] Add indexes on `orgId` fields
- [ ] Update tests
- [ ] Update documentation
- [ ] Remove custom `getOrgId` functions

---

## Summary

**Key Takeaway:** 
- **Tenant** = Platform-level (multi-tenant SaaS)
- **Organization** = Tenant-level workspace
- **Always use `orgId` for tenant-level data isolation**
- **Use the standardized `orgIdHelper` utility**

This standardization eliminates confusion, reduces bugs, and makes the codebase more maintainable.
