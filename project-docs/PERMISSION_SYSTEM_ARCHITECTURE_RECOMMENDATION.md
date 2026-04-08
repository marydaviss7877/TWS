# Permission System Architecture Recommendation
## RBAC + ABAC + Tenant Scoping Analysis

**Date:** January 24, 2026  
**Context:** Multiple Permission Systems (Problem 6)  
**Question:** Should we implement RBAC + ABAC + Tenant Scoping?

---

## 🎯 EXECUTIVE SUMMARY

**Your intuition is CORRECT!** 

- ✅ **RBAC + ABAC + Tenant Scoping** = **BEST for Tenant ERPs** (Education, Healthcare, Software House)
- ❌ **RBAC + ABAC + Tenant Scoping** = **OVER-ENGINEERED for Supra Admin**

**Why?**
- **Tenant ERPs** need complex, context-aware permissions (student can view own grades, teacher can view assigned classes, etc.)
- **Supra Admin** needs simple, platform-level permissions (manage tenants, view billing, system settings)

---

## 📊 CURRENT STATE ANALYSIS

### Current Permission Systems (3 Different Implementations):

1. **`rbac.js`** - RBAC with role hierarchy (791 lines)
   - Platform roles: `platform_super_admin`, `platform_admin`, `platform_support`, `platform_billing`
   - Tenant roles: `super_admin`, `admin`, `teacher`, `student`, `doctor`, `nurse`, etc.
   - Role hierarchy with numeric levels
   - Permission arrays per role

2. **`permissions.js`** - Permission matrix (171 lines)
   - Education-specific permissions
   - Resource-action-role mapping
   - Example: `students.view: ['principal', 'admin', 'teacher']`

3. **`auth.js`** - Hardcoded role checks (75 lines)
   - `requirePermission` function
   - Hardcoded role checks in routes
   - No tenant scoping

**Problems:**
- ❌ 3 different systems, no single source of truth
- ❌ Platform permissions mixed with tenant permissions
- ❌ No tenant scoping (except at route level)
- ❌ No ABAC (context-based permissions)
- ❌ Hardcoded in code, not database-driven

---

## 🏗️ RECOMMENDED ARCHITECTURE

### **Option 1: RBAC + ABAC + Tenant Scoping (For Tenant ERPs)** ✅

**Best For:** Education ERP, Healthcare ERP, Software House ERP

**Why:**
- **Complex Permissions:** Students can view own grades, teachers can view assigned classes
- **Context Matters:** Time-based (exam period), location-based (campus), resource-based (assigned students)
- **Tenant Isolation:** Each tenant has different permission rules
- **Dynamic Rules:** Permissions change based on context (semester, class assignment, etc.)

**Implementation:**
```javascript
// RBAC: Role defines base permissions
role: 'teacher'

// ABAC: Context adds conditions
attributes: {
  assignedClasses: ['math-101', 'math-102'],
  currentSemester: 'fall-2024',
  campus: 'main-campus'
}

// Tenant Scoping: Permissions scoped to tenant
tenantId: 'education-tenant-123'

// Combined Check:
canAccess('grades:view', {
  role: 'teacher',
  resource: { classId: 'math-101' },
  context: { 
    assignedClasses: ['math-101'], // ✅ Has access
    currentSemester: 'fall-2024'
  },
  tenantId: 'education-tenant-123'
})
```

**Example Use Cases:**
1. **Student Views Own Grades:**
   - RBAC: `role: 'student'` → `grades:viewOwn`
   - ABAC: `resource.studentId === user.id` → ✅ Allow
   - Tenant Scoping: `resource.tenantId === user.tenantId` → ✅ Allow

2. **Teacher Views Assigned Classes:**
   - RBAC: `role: 'teacher'` → `classes:view`
   - ABAC: `resource.classId IN user.assignedClasses` → ✅ Allow
   - Tenant Scoping: `resource.tenantId === user.tenantId` → ✅ Allow

3. **Doctor Views Assigned Patients:**
   - RBAC: `role: 'doctor'` → `patients:view`
   - ABAC: `resource.patientId IN user.assignedPatients` → ✅ Allow
   - Tenant Scoping: `resource.tenantId === user.tenantId` → ✅ Allow

**Benefits:**
- ✅ Fine-grained permissions
- ✅ Context-aware access control
- ✅ Tenant isolation
- ✅ Flexible for complex business rules

**Complexity:** HIGH (but necessary for tenant ERPs)

---

### **Option 2: Simple RBAC (For Supra Admin)** ✅

**Best For:** Supra Admin Platform

**Why:**
- **Simple Permissions:** Platform admin manages tenants, billing, system settings
- **No Context Needed:** Permissions don't change based on time/location/resource
- **No Tenant Scoping:** Platform admin operates at platform level, not tenant level
- **Static Rules:** Permissions are straightforward (read, write, delete)

**Implementation:**
```javascript
// Simple RBAC: Role → Permissions
role: 'platform_admin'
permissions: [
  'tenants:read',
  'tenants:write',
  'billing:read',
  'billing:write',
  'analytics:read'
]

// Check:
hasPermission('tenants:read') // ✅ Simple check
```

**Example Use Cases:**
1. **View All Tenants:**
   - RBAC: `role: 'platform_admin'` → `tenants:read` → ✅ Allow
   - No ABAC needed (no context)
   - No tenant scoping (platform-level)

2. **Update Tenant Status:**
   - RBAC: `role: 'platform_admin'` → `tenants:write` → ✅ Allow
   - No ABAC needed (no context)
   - No tenant scoping (platform-level)

3. **View Billing:**
   - RBAC: `role: 'platform_billing'` → `billing:read` → ✅ Allow
   - No ABAC needed (no context)
   - No tenant scoping (platform-level)

**Benefits:**
- ✅ Simple and fast
- ✅ Easy to understand
- ✅ Low maintenance
- ✅ Sufficient for platform operations

**Complexity:** LOW (appropriate for Supra Admin)

---

## 🎯 RECOMMENDED SOLUTION

### **Hybrid Approach: Different Systems for Different Contexts**

#### **1. Supra Admin: Simple RBAC** ✅

```javascript
// backend/src/middleware/auth/platformRBAC.js
class PlatformRBAC {
  constructor() {
    this.rolePermissions = {
      platform_super_admin: ['*'],
      platform_admin: [
        'tenants:read', 'tenants:write', 'tenants:delete',
        'billing:read', 'billing:write',
        'analytics:read', 'analytics:export',
        'system:read', 'system:write'
      ],
      platform_support: [
        'tenants:read',
        'support:tickets:read', 'support:tickets:write'
      ],
      platform_billing: [
        'billing:read', 'billing:write',
        'tenants:read'
      ]
    };
  }

  hasPermission(role, permission) {
    const permissions = this.rolePermissions[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }
}
```

**Characteristics:**
- ✅ Simple role → permissions mapping
- ✅ No tenant scoping (platform-level)
- ✅ No ABAC (no context needed)
- ✅ Fast and efficient
- ✅ Easy to maintain

---

#### **2. Tenant ERPs: RBAC + ABAC + Tenant Scoping** ✅

```javascript
// backend/src/middleware/auth/tenantRBAC.js
class TenantRBAC {
  constructor() {
    // RBAC: Base permissions per role
    this.rolePermissions = {
      admin: ['*'],
      teacher: ['classes:view', 'students:view', 'grades:view'],
      student: ['grades:viewOwn', 'classes:viewOwn']
    };
  }

  // ABAC: Context-based permission check
  canAccess(role, permission, resource, context, tenantId) {
    // 1. RBAC Check: Does role have base permission?
    const basePermissions = this.rolePermissions[role] || [];
    if (!basePermissions.includes('*') && !basePermissions.includes(permission)) {
      return false; // ❌ Role doesn't have base permission
    }

    // 2. Tenant Scoping: Is resource in same tenant?
    if (resource.tenantId !== tenantId) {
      return false; // ❌ Cross-tenant access denied
    }

    // 3. ABAC Check: Context-based conditions
    if (permission === 'grades:viewOwn') {
      return resource.studentId === context.userId; // ✅ Own grades only
    }

    if (permission === 'classes:view' && role === 'teacher') {
      return context.assignedClasses.includes(resource.classId); // ✅ Assigned classes only
    }

    if (permission === 'patients:view' && role === 'doctor') {
      return context.assignedPatients.includes(resource.patientId); // ✅ Assigned patients only
    }

    // Default: Allow if RBAC and tenant scoping passed
    return true;
  }
}
```

**Characteristics:**
- ✅ RBAC: Base permissions per role
- ✅ ABAC: Context-based conditions (assigned classes, own data, etc.)
- ✅ Tenant Scoping: Tenant isolation
- ✅ Flexible for complex business rules
- ✅ Supports dynamic permissions

---

## 📋 IMPLEMENTATION PLAN

### **Phase 1: Separate Platform RBAC from Tenant RBAC**

**Current Problem:**
- `rbac.js` mixes platform roles with tenant roles
- Platform permissions mixed with tenant permissions

**Solution:**
1. **Create `platformRBAC.js`** - Simple RBAC for Supra Admin
   - Platform roles only: `platform_super_admin`, `platform_admin`, `platform_support`, `platform_billing`
   - Platform permissions only: `tenants:*`, `billing:*`, `analytics:*`, `system:*`
   - No tenant scoping (platform-level)
   - No ABAC (not needed)

2. **Refactor `rbac.js` → `tenantRBAC.js`** - RBAC + ABAC + Tenant Scoping for Tenant ERPs
   - Tenant roles only: `admin`, `teacher`, `student`, `doctor`, `nurse`, etc.
   - Tenant permissions: `students:*`, `classes:*`, `grades:*`, `patients:*`, etc.
   - Tenant scoping: All permissions scoped to tenant
   - ABAC support: Context-based conditions

3. **Remove `permissions.js`** - Merge into `tenantRBAC.js`
   - Education permissions → `tenantRBAC.js`
   - Healthcare permissions → `tenantRBAC.js`
   - Software House permissions → `tenantRBAC.js`

4. **Remove `auth.js` permission checks** - Use proper RBAC middleware
   - Replace hardcoded checks with `platformRBAC` or `tenantRBAC`
   - Consistent permission checking

---

### **Phase 2: Database-Driven Permissions (Optional)**

**Current:** Permissions hardcoded in code

**Future:** Store permissions in database for flexibility

```javascript
// Permission Model (already exists: backend/src/models/Permission.js)
{
  code: 'grades:viewOwn',
  description: 'View own grades',
  permissionGroup: 'education',
  tenantId: null, // Global permission
  conditions: {
    role: ['student'],
    abac: {
      resource: { studentId: '{{userId}}' }
    }
  }
}
```

**Benefits:**
- ✅ Permissions can be customized per tenant
- ✅ New permissions added without code changes
- ✅ Permission changes without deployment

**Complexity:** MEDIUM (can be done later)

---

## ✅ FINAL RECOMMENDATION

### **For Supra Admin:**
- ✅ **Simple RBAC** (role → permissions)
- ❌ **No ABAC** (not needed)
- ❌ **No Tenant Scoping** (platform-level)

**Why:** Supra Admin permissions are simple and static. Adding ABAC + Tenant Scoping would be over-engineering.

### **For Tenant ERPs:**
- ✅ **RBAC** (role → base permissions)
- ✅ **ABAC** (context-based conditions)
- ✅ **Tenant Scoping** (tenant isolation)

**Why:** Tenant ERPs need complex, context-aware permissions. RBAC + ABAC + Tenant Scoping is necessary.

---

## 🎯 CONCLUSION

**You are 100% correct!**

- **RBAC + ABAC + Tenant Scoping** = Perfect for **Tenant ERPs** (Education, Healthcare)
- **Simple RBAC** = Perfect for **Supra Admin** (Platform Management)

**Don't over-engineer Supra Admin** - keep it simple.  
**Don't under-engineer Tenant ERPs** - they need the complexity.

**Next Steps:**
1. Separate `platformRBAC.js` from `tenantRBAC.js`
2. Implement simple RBAC for Supra Admin
3. Implement RBAC + ABAC + Tenant Scoping for Tenant ERPs
4. Remove duplicate permission systems
5. (Optional) Move to database-driven permissions

---

**Status:** ✅ Recommendation Complete  
**Priority:** HIGH (Problem 6 - Multiple Permission Systems)  
**Effort:** 2-3 weeks
