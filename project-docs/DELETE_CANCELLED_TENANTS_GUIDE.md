# Delete All Cancelled Tenants - Guide

**Date:** January 24, 2026  
**Purpose:** Permanently delete all tenants with status 'cancelled'

---

## ⚠️ WARNING

**This is a DESTRUCTIVE operation that cannot be undone!**

Deleting cancelled tenants will permanently remove:
- ✅ Tenant record
- ✅ All associated users
- ✅ All organizations
- ✅ All sessions
- ✅ All billing data
- ✅ All roles and permissions
- ✅ All departments
- ✅ All projects and deliverables
- ✅ All industry-specific data (Education, Healthcare, etc.)
- ✅ All analytics and audit logs
- ✅ All tenant settings and configurations

---

## 🎯 Methods to Delete Cancelled Tenants

### **Method 1: Using the API Endpoint** (Recommended)

**Endpoint:** `DELETE /api/supra-admin/tenants/cancelled`

**Requirements:**
- ✅ Must be authenticated as platform admin
- ✅ Must provide access reason (via `x-access-reason` header or `accessReason` in body)
- ✅ Must provide justification (minimum 50 characters)

**Example using cURL:**
```bash
curl -X DELETE http://localhost:5000/api/supra-admin/tenants/cancelled \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -H "x-access-reason: cleanup_cancelled_tenants" \
  -d '{
    "justification": "Permanently deleting all cancelled tenants to clean up the database and remove unused data. These tenants have been cancelled and are no longer in use."
  }'
```

**Example using JavaScript (Frontend):**
```javascript
const response = await fetch('/api/supra-admin/tenants/cancelled', {
  method: 'DELETE',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'x-access-reason': 'cleanup_cancelled_tenants'
  },
  body: JSON.stringify({
    justification: 'Permanently deleting all cancelled tenants to clean up the database and remove unused data. These tenants have been cancelled and are no longer in use.',
    accessReason: 'cleanup_cancelled_tenants'
  })
});

const result = await response.json();
console.log(result);
```

**Response:**
```json
{
  "success": true,
  "message": "4 cancelled tenant(s) permanently deleted",
  "data": {
    "deleted": ["tenant_id_1", "tenant_id_2", "tenant_id_3", "tenant_id_4"],
    "failed": [],
    "totalCancelled": 4,
    "deletedCount": 4,
    "failedCount": 0
  }
}
```

---

### **Method 2: Using the Node.js Script**

**Script Location:** `TWS/backend/scripts/delete-cancelled-tenants.js`

**Usage:**
```bash
cd TWS/backend
node scripts/delete-cancelled-tenants.js
```

**What it does:**
1. Connects to MongoDB
2. Finds all tenants with `status: 'cancelled'`
3. Lists them for review
4. Permanently deletes each one
5. Logs deletion to audit trail
6. Shows summary of results

**Note:** The script currently proceeds without confirmation. You can modify it to add a confirmation prompt if needed.

---

### **Method 3: Using Bulk Delete Endpoint**

**Endpoint:** `DELETE /api/supra-admin/tenants/bulk`

**Usage:**
1. First, get all cancelled tenant IDs:
```bash
curl http://localhost:5000/api/supra-admin/tenants?status=cancelled \
  -H "Cookie: your-auth-cookie"
```

2. Then delete them in bulk:
```bash
curl -X DELETE http://localhost:5000/api/supra-admin/tenants/bulk \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -H "x-access-reason: cleanup_cancelled_tenants" \
  -d '{
    "ids": ["tenant_id_1", "tenant_id_2", "tenant_id_3", "tenant_id_4"],
    "justification": "Permanently deleting all cancelled tenants to clean up the database and remove unused data. These tenants have been cancelled and are no longer in use."
  }'
```

---

## 🔍 Verify Before Deletion

**Check how many cancelled tenants exist:**
```bash
curl http://localhost:5000/api/supra-admin/tenants?status=cancelled \
  -H "Cookie: your-auth-cookie"
```

**Or check the summary:**
```bash
curl http://localhost:5000/api/supra-admin/tenants?includeCancelled=true \
  -H "Cookie: your-auth-cookie"
```

Look for `summary.cancelled` in the response.

---

## 📊 After Deletion

**Verify deletion:**
1. Check dashboard - should show 0 tenants (if all were cancelled)
2. Check tenants list - should be empty
3. Check database - cancelled tenants should be gone

**Check audit logs:**
All deletions are logged to the platform admin access audit trail with:
- Platform admin ID
- Tenant ID and name
- Reason: `bulk_delete_cancelled_tenants`
- Timestamp
- IP address and user agent

---

## 🛡️ Security

**Access Control:**
- ✅ Requires platform admin authentication
- ✅ Requires access reason
- ✅ Requires justification (minimum 50 characters)
- ✅ All actions logged to audit trail

**Safety Features:**
- ✅ Only deletes tenants with `status: 'cancelled'`
- ✅ Cannot accidentally delete active tenants
- ✅ Provides detailed error messages if deletion fails
- ✅ Returns summary of deleted vs failed

---

## 🚨 Troubleshooting

### **Error: "No cancelled tenants found"**
- ✅ Good! There are no cancelled tenants to delete
- No action needed

### **Error: "Justification is required"**
- Provide a justification with at least 50 characters
- Include it in request body or `x-justification` header

### **Error: "Permission denied"**
- Check that you're authenticated as platform admin
- Check that your role has `tenants:delete` permission

### **Some tenants failed to delete**
- Check the `failed` array in the response
- Review error messages for each failed tenant
- Retry deletion for failed tenants individually

---

## ✅ Recommended Approach

**For Production:**
1. Use **Method 1 (API Endpoint)** - Most secure, logged, and auditable
2. Verify cancelled tenants first
3. Provide clear justification
4. Review audit logs after deletion

**For Development/Testing:**
1. Use **Method 2 (Script)** - Quick and automated
2. Review the list before deletion
3. Check results summary

---

**Status:** ✅ **READY TO USE**  
**Last Updated:** January 24, 2026
