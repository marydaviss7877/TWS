const mongoose = require('mongoose');
const config = require('../config/environment');
const logger = require('../utils/logger');

class DatabaseProvisioningService {
    constructor() {
        this.baseUri = config.get('MONGO_URI');
    }

    async provisionTenantDatabase(tenantId, industryType) {
        try {
            // Generate unique database name for tenant
            const dbName = `tws_${tenantId}_${Date.now()}`;
            
            // Create connection string for new database
            const connectionString = this.baseUri.replace(/\/[^/]*$/, `/${dbName}`);
            
            // Create new connection
            const connection = await mongoose.createConnection(connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });

            // Create indexes and initial collections
            await this.initializeTenantCollections(connection, industryType);

            logger.info(`Successfully provisioned database for tenant ${tenantId}: ${dbName}`);
            
            return {
                dbName,
                connectionString,
                status: 'success'
            };
        } catch (error) {
            logger.error(`Failed to provision database for tenant ${tenantId}: ${error.message}`);
            throw error;
        }
    }

    async initializeTenantCollections(connection, industryType) {
        // Define base collections every tenant needs
        const baseCollections = [
            'users',
            'roles',
            'permissions',
            'departments',
            'notifications',
            'audit_logs'
        ];

        // Industry-specific collections
        const industryCollections = this.getIndustrySpecificCollections(industryType);

        // Create all collections and indexes
        const allCollections = [...baseCollections, ...industryCollections];
        
        for (const collectionName of allCollections) {
            const collection = connection.collection(collectionName);
            await collection.createIndex({ createdAt: 1 });
            await collection.createIndex({ updatedAt: 1 });
        }

        // Create specific indexes based on industry type
        await this.createIndustrySpecificIndexes(connection, industryType);
    }

    getIndustrySpecificCollections(industryType) {
        const collections = {
            'software_house': [
                'projects',
                'sprints',
                'tasks',
                'time_entries',
                'code_repositories',
                'deployments',
                'tech_stack',
                'project_methodologies'
            ],
            // Add more industry types as needed
        };

        return collections[industryType] || [];
    }

    async createIndustrySpecificIndexes(connection, industryType) {
        switch (industryType) {
            case 'software_house':
                await connection.collection('projects').createIndex({ projectCode: 1 }, { unique: true });
                await connection.collection('tasks').createIndex({ sprintId: 1 });
                await connection.collection('time_entries').createIndex({ userId: 1, projectId: 1 });
                break;
            // Add more industry-specific indexes as needed
        }
    }

    async removeTenantDatabase(tenantId) {
        try {
            const tenant = await mongoose.connection.db.admin().listDatabases();
            const dbName = tenant.databases.find(db => db.name.includes(`tws_${tenantId}`))?.name;
            
            if (dbName) {
                await mongoose.connection.db.admin().command({ dropDatabase: dbName });
                logger.info(`Successfully removed database for tenant ${tenantId}: ${dbName}`);
            }
        } catch (error) {
            logger.error(`Failed to remove database for tenant ${tenantId}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new DatabaseProvisioningService();