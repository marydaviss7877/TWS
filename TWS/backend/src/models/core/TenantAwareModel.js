/**
 * Tenant-Aware Model Helper
 * Provides utility function to create schemas with automatic tenant isolation fields
 */

const mongoose = require('mongoose');

/**
 * Creates a tenant-aware schema by adding orgId and tenantId fields
 * @param {Object} schemaDefinition - The base schema definition
 * @returns {Object} Schema definition with tenant fields added
 */
function createTenantAwareSchema(schemaDefinition) {
  return {
    // Tenant isolation fields
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    // Merge with provided schema definition
    ...schemaDefinition
  };
}

module.exports = {
  createTenantAwareSchema
};
