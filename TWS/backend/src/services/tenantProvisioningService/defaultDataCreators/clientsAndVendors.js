const Client = require('../../../models/Client');
const { Vendor } = require('../../../models/Finance');

/**
 * Create sample clients and vendors
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createSampleClientsAndVendors(tenant, organization, session) {
  try {
    // Create sample clients
    const clients = [
      {
        name: 'TechCorp Solutions',
        slug: 'techcorp-solutions',
        orgId: organization._id,
        type: 'company',
        status: 'active',
        company: {
          name: 'TechCorp Solutions',
          industry: 'Technology'
        },
        contact: {
          primary: {
            email: 'contact@techcorp.com',
            phone: '+1-555-0123'
          }
        },
        address: {
          street: '123 Business Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        },
        isSample: true
      },
      {
        name: 'StartupXYZ',
        slug: 'startupxyz',
        orgId: organization._id,
        type: 'company',
        status: 'active',
        company: {
          name: 'StartupXYZ',
          industry: 'Technology'
        },
        contact: {
          primary: {
            email: 'hello@startupxyz.com',
            phone: '+1-555-0456'
          }
        },
        address: {
          street: '456 Innovation St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'US'
        },
        isSample: true
      }
    ];

    for (const clientData of clients) {
      const client = new Client(clientData);
      await client.save({ session });
    }

    // Create sample vendors
    const vendors = [
      {
        name: 'CloudHosting Inc',
        email: 'billing@cloudhosting.com',
        phone: '+1-555-0789',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        type: 'service',
        status: 'active',
        paymentTerms: 'Net 30',
        isSample: true
      },
      {
        name: 'Office Supplies Co',
        email: 'orders@officesupplies.com',
        phone: '+1-555-0321',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        type: 'supplier',
        status: 'active',
        paymentTerms: 'Net 15',
        isSample: true
      }
    ];

    for (const vendorData of vendors) {
      const vendor = new Vendor(vendorData);
      await vendor.save({ session });
    }
    
  } catch (error) {
    console.error('Error creating sample clients and vendors:', error);
    throw error;
  }
}

module.exports = {
  createSampleClientsAndVendors
};

