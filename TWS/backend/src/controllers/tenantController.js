const databaseProvisioningService = require('../services/databaseProvisioningService');
const emailNotificationService = require('../services/emailNotificationService');
const logger = require('../utils/logger');

async function createTenant(req, res) {
    try {
        const { companyName, industryType, adminUser } = req.body;

        // 1. Provision dedicated database
        const dbProvisionResult = await databaseProvisioningService.provisionTenantDatabase(
            generateTenantId(companyName),
            industryType
        );

        // 2. Create tenant record
        const tenant = await Tenant.create({
            companyName,
            industryType,
            databaseName: dbProvisionResult.dbName,
            adminUser: adminUser._id,
            status: 'active',
            modules: getIndustryModules(industryType)
        });

        // 3. Send welcome email
        await emailNotificationService.sendWelcomeEmail(tenant, adminUser);

        // 4. Send onboarding instructions
        await emailNotificationService.sendOnboardingInstructions(tenant, adminUser);

        // 5. Schedule setup wizard reminder (if not completed in 24 hours)
        scheduleSetupReminder(tenant, adminUser);

        res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            data: {
                tenant,
                database: {
                    name: dbProvisionResult.dbName,
                    status: dbProvisionResult.status
                }
            }
        });

    } catch (error) {
        logger.error(`Failed to create tenant: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to create tenant',
            error: error.message
        });
    }
}

function generateTenantId(companyName) {
    return `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
}

function getIndustryModules(industryType) {
    const modulesByIndustry = {
        software_house: [
            'employees',
            'projects',
            'finance',
            'reports',
            'development_methodology',
            'tech_stack',
            'project_types',
            'time_tracking',
            'code_quality',
            'client_portal'
        ]
        // Add more industry types as needed
    };

    return modulesByIndustry[industryType] || [];
}

function scheduleSetupReminder(tenant, adminUser) {
    // Schedule reminder for 24 hours later
    setTimeout(async () => {
        try {
            // Check if setup is still incomplete
            const updatedTenant = await Tenant.findById(tenant._id);
            if (!updatedTenant.setupCompleted) {
                await emailNotificationService.sendSetupWizardReminder(
                    tenant,
                    adminUser,
                    updatedTenant.completedSetupSteps || [],
                    getNextSetupStep(updatedTenant.completedSetupSteps || [])
                );
            }
        } catch (error) {
            logger.error(`Failed to send setup reminder: ${error.message}`);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
}

function getNextSetupStep(completedSteps) {
    const allSteps = [
        { name: 'Company Profile', description: 'Set up your company information and branding' },
        { name: 'User Roles', description: 'Configure user roles and permissions' },
        { name: 'Module Configuration', description: 'Customize your activated modules' },
        { name: 'Data Import', description: 'Import your existing business data' },
        { name: 'Workflow Setup', description: 'Set up your business processes and workflows' }
    ];

    return allSteps[completedSteps.length] || allSteps[0];
}

module.exports = {
    createTenant
};