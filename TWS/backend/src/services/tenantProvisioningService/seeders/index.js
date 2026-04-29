const MasterERP = require('../../../models/integrations/MasterERP');
const { seedSoftwareHouseData } = require('./softwareHouseSeeder');
const defaultSeeder = require('./defaultSeeder');

/**
 * Seed industry-specific data based on Master ERP (Software House only)
 */
async function seedIndustrySpecificData(masterERPId, tenant, organization, session) {
  try {
    console.log(`Starting industry-specific ERP seeding for tenant: ${tenant.tenantId}`);
    
    const masterERP = await MasterERP.findById(masterERPId);
    if (!masterERP) {
      throw new Error('Master ERP template not found');
    }
    
    switch (masterERP.industry) {
      case 'software_house':
        await seedSoftwareHouseData(tenant, organization, session);
        break;
      case 'business':
        await defaultSeeder.seedDefaultData(tenant, organization, session);
        break;
      default:
        console.log(`No specific seeding for industry: ${masterERP.industry}`);
    }
    
    console.log(`Industry-specific ERP seeding completed for tenant: ${tenant.tenantId}`);
    
  } catch (error) {
    console.error('Error seeding industry-specific data:', error);
    throw error;
  }
}

module.exports = {
  seedIndustrySpecificData
};

