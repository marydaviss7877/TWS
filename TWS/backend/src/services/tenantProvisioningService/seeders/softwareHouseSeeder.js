const SoftwareHouseRole = require('../../../models/admin-platform/SoftwareHouseRole');
const Client = require('../../../models/industry/Client');
const Project = require('../../../models/project-delivery/Project');
const Sprint = require('../../../models/project-delivery/Sprint');
const DevelopmentMetrics = require('../../../models/analytics/DevelopmentMetrics');
const Workspace = require('../../../models/org/Workspace');
const User = require('../../../models/users-auth/User');

/**
 * Seed software house-specific data
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function seedSoftwareHouseData(tenant, organization, session) {
  try {
    console.log(`Starting software house-specific seeding for tenant: ${tenant.tenantId}`);
    
    // Get admin user (first user in organization)
    const adminUser = await User.findOne({ orgId: organization._id })
      .sort({ createdAt: 1 })
      .session(session);
    
    if (!adminUser) {
      console.warn('No admin user found for software house seeding, skipping role assignments');
    }
    
    // 1. Create default Software House Roles
    const rolesData = [
      {
        name: 'Senior Developer',
        description: 'Experienced developer with expertise in multiple technologies',
        level: 'senior',
        roleType: 'developer',
        hourlyRate: 75,
        techStackAccess: {
          frontend: ['React', 'Vue.js', 'Angular'],
          backend: ['Node.js', 'Python', 'Java'],
          database: ['MongoDB', 'PostgreSQL', 'MySQL'],
          cloud: ['AWS', 'Azure'],
          tools: ['Git', 'Docker', 'Kubernetes']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: true,
          system_integration: true,
          maintenance_support: true,
          consulting: false
        }
      },
      {
        name: 'Junior Developer',
        description: 'Entry-level developer learning and contributing to projects',
        level: 'junior',
        roleType: 'developer',
        hourlyRate: 45,
        techStackAccess: {
          frontend: ['React', 'HTML', 'CSS'],
          backend: ['Node.js', 'JavaScript'],
          database: ['MongoDB'],
          cloud: [],
          tools: ['Git']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: false,
          api_development: true,
          system_integration: false,
          maintenance_support: true,
          consulting: false
        }
      },
      {
        name: 'Tech Lead',
        description: 'Technical leader responsible for architecture and code quality',
        level: 'lead',
        roleType: 'tech_lead',
        hourlyRate: 95,
        techStackAccess: {
          frontend: ['React', 'Vue.js', 'Angular', 'TypeScript'],
          backend: ['Node.js', 'Python', 'Java', 'Go'],
          database: ['MongoDB', 'PostgreSQL', 'Redis'],
          cloud: ['AWS', 'Azure', 'GCP'],
          tools: ['Git', 'Docker', 'Kubernetes', 'CI/CD']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: true,
          system_integration: true,
          maintenance_support: true,
          consulting: true
        }
      },
      {
        name: 'Project Manager',
        description: 'Manages project lifecycle, timeline, and client communication',
        level: 'manager',
        roleType: 'project_manager',
        hourlyRate: 85,
        techStackAccess: {
          frontend: [],
          backend: [],
          database: [],
          cloud: [],
          tools: ['Jira', 'Trello']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: true,
          system_integration: true,
          maintenance_support: true,
          consulting: true
        }
      },
      {
        name: 'QA Engineer',
        description: 'Ensures quality through testing and quality assurance processes',
        level: 'mid',
        roleType: 'qa_engineer',
        hourlyRate: 60,
        techStackAccess: {
          frontend: ['Selenium', 'Cypress'],
          backend: ['Postman', 'Jest'],
          database: [],
          cloud: [],
          tools: ['TestRail', 'Bugzilla', 'Jira']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: true,
          system_integration: true,
          maintenance_support: true,
          consulting: false
        }
      },
      {
        name: 'DevOps Engineer',
        description: 'Manages infrastructure, deployment, and CI/CD pipelines',
        level: 'senior',
        roleType: 'devops_engineer',
        hourlyRate: 90,
        techStackAccess: {
          frontend: [],
          backend: ['Docker', 'Kubernetes'],
          database: [],
          cloud: ['AWS', 'Azure', 'GCP'],
          tools: ['Jenkins', 'GitHub Actions', 'Terraform', 'Ansible']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: true,
          system_integration: true,
          maintenance_support: true,
          consulting: true
        }
      },
      {
        name: 'UI/UX Designer',
        description: 'Creates user interfaces and user experience designs',
        level: 'mid',
        roleType: 'ui_ux_designer',
        hourlyRate: 65,
        techStackAccess: {
          frontend: ['Figma', 'Adobe XD', 'Sketch'],
          backend: [],
          database: [],
          cloud: [],
          tools: ['Figma', 'InVision', 'Zeplin']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: false,
          system_integration: false,
          maintenance_support: false,
          consulting: true
        }
      },
      {
        name: 'Business Analyst',
        description: 'Analyzes business requirements and bridges gap between clients and development',
        level: 'mid',
        roleType: 'business_analyst',
        hourlyRate: 70,
        techStackAccess: {
          frontend: [],
          backend: [],
          database: [],
          cloud: [],
          tools: ['Jira', 'Confluence', 'MS Office']
        },
        projectTypeAccess: {
          web_application: true,
          mobile_app: true,
          api_development: true,
          system_integration: true,
          maintenance_support: false,
          consulting: true
        }
      }
    ];

    const roleDocs = [];
    for (const roleData of rolesData) {
      const roleDoc = new SoftwareHouseRole({
        orgId: organization._id,
        tenantId: tenant._id,
        ...roleData,
        createdBy: adminUser ? adminUser._id : organization._id,
        isActive: true
      });
      await roleDoc.save({ session });
      roleDocs.push(roleDoc);
    }

    console.log(`✅ Created ${roleDocs.length} software house roles`);

    // 2. Create sample clients
    const clientsData = [
      {
        name: 'TechCorp Solutions',
        slug: 'techcorp-solutions',
        type: 'company',
        contact: {
          primary: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@techcorp.com',
            phone: '+1-555-1001',
            title: 'CTO'
          },
          billing: {
            name: 'Mike Davis',
            email: 'mike.davis@techcorp.com',
            phone: '+1-555-1002'
          },
          technical: {
            name: 'Alex Chen',
            email: 'alex.chen@techcorp.com',
            phone: '+1-555-1003'
          }
        },
        company: {
          name: 'TechCorp Solutions',
          website: 'https://techcorp.com',
          industry: 'Technology',
          size: '201-500',
          description: 'Leading technology solutions provider'
        },
        address: {
          street: '123 Tech Boulevard',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'US'
        },
        billing: {
          currency: 'USD',
          paymentTerms: 'net_30',
          taxRate: 8.5
        },
        status: 'active'
      },
      {
        name: 'StartupXYZ',
        slug: 'startupxyz',
        type: 'company',
        contact: {
          primary: {
            name: 'Emily Rodriguez',
            email: 'emily@startupxyz.com',
            phone: '+1-555-2001',
            title: 'Founder'
          },
          billing: {
            name: 'Emily Rodriguez',
            email: 'emily@startupxyz.com',
            phone: '+1-555-2001'
          }
        },
        company: {
          name: 'StartupXYZ',
          website: 'https://startupxyz.com',
          industry: 'SaaS',
          size: '11-50',
          description: 'Fast-growing SaaS startup'
        },
        address: {
          street: '456 Innovation Drive',
          city: 'Palo Alto',
          state: 'CA',
          zipCode: '94301',
          country: 'US'
        },
        billing: {
          currency: 'USD',
          paymentTerms: 'net_15',
          taxRate: 8.5
        },
        status: 'active'
      },
      {
        name: 'FinanceHub Inc',
        slug: 'financehub-inc',
        type: 'company',
        contact: {
          primary: {
            name: 'Robert Kim',
            email: 'robert.kim@financehub.com',
            phone: '+1-555-3001',
            title: 'VP of Engineering'
          },
          billing: {
            name: 'Jennifer Lee',
            email: 'jennifer.lee@financehub.com',
            phone: '+1-555-3002'
          }
        },
        company: {
          name: 'FinanceHub Inc',
          website: 'https://financehub.com',
          industry: 'Finance',
          size: '51-200',
          description: 'Financial technology platform'
        },
        address: {
          street: '789 Wall Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10005',
          country: 'US'
        },
        billing: {
          currency: 'USD',
          paymentTerms: 'net_30',
          taxRate: 8.875
        },
        status: 'active'
      }
    ];

    const clientDocs = [];
    for (const clientData of clientsData) {
      const clientDoc = new Client({
        orgId: organization._id,
        ...clientData
      });
      await clientDoc.save({ session });
      clientDocs.push(clientDoc);
    }

    console.log(`✅ Created ${clientDocs.length} clients`);

    // 3. Create default workspace for projects
    const workspace = new Workspace({
      name: 'Default Workspace',
      slug: `${tenant.slug}-default-workspace`,
      description: 'Default workspace for software house projects',
      orgId: organization._id,
      ownerId: adminUser ? adminUser._id : organization._id,
      type: 'internal',
      methodology: 'agile',
      status: 'active',
      members: adminUser ? [{
        userId: adminUser._id,
        role: 'owner',
        status: 'active'
      }] : []
    });
    await workspace.save({ session });
    console.log('✅ Created default workspace');

    // 4. Create sample projects
    const projectsData = [
      {
        name: 'E-Commerce Platform',
        slug: 'ecommerce-platform',
        description: 'Modern e-commerce platform with payment integration and inventory management',
        projectType: 'web_application',
        methodology: 'scrum',
        techStack: {
          frontend: ['React', 'TypeScript', 'Tailwind CSS'],
          backend: ['Node.js', 'Express.js'],
          database: ['MongoDB', 'Redis'],
          cloud: ['AWS'],
          tools: ['Git', 'Docker', 'Jest']
        },
        status: 'active',
        priority: 'high',
        budget: {
          total: 150000,
          currency: 'USD',
          spent: 45000,
          remaining: 105000
        },
        timeline: {
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-06-30'),
          estimatedHours: 2000,
          actualHours: 600
        },
        settings: {
          allowClientAccess: true,
          clientVisibilityLevel: 'detailed'
        }
      },
      {
        name: 'Mobile Banking App',
        slug: 'mobile-banking-app',
        description: 'Secure mobile banking application with biometric authentication',
        projectType: 'mobile_app',
        methodology: 'agile',
        techStack: {
          frontend: ['React Native', 'TypeScript'],
          backend: ['Node.js', 'Express.js'],
          database: ['PostgreSQL', 'Redis'],
          cloud: ['AWS'],
          tools: ['Git', 'Docker', 'Fastlane']
        },
        status: 'active',
        priority: 'high',
        budget: {
          total: 200000,
          currency: 'USD',
          spent: 75000,
          remaining: 125000
        },
        timeline: {
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-07-15'),
          estimatedHours: 2500,
          actualHours: 1000
        },
        settings: {
          allowClientAccess: true,
          clientVisibilityLevel: 'basic'
        }
      },
      {
        name: 'REST API Development',
        slug: 'rest-api-development',
        description: 'RESTful API for third-party integrations',
        projectType: 'api_development',
        methodology: 'agile',
        techStack: {
          frontend: [],
          backend: ['Node.js', 'Express.js', 'TypeScript'],
          database: ['MongoDB'],
          cloud: ['AWS'],
          tools: ['Git', 'Docker', 'Postman']
        },
        status: 'active',
        priority: 'medium',
        budget: {
          total: 80000,
          currency: 'USD',
          spent: 35000,
          remaining: 45000
        },
        timeline: {
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-05-31'),
          estimatedHours: 1000,
          actualHours: 500
        },
        settings: {
          allowClientAccess: true,
          clientVisibilityLevel: 'detailed'
        }
      }
    ];

    const projectDocs = [];
    for (let i = 0; i < projectsData.length; i++) {
      const projectData = projectsData[i];
      const projectDoc = new Project({
        orgId: organization._id,
        workspaceId: workspace._id,
        clientId: clientDocs[i]._id,
        ...projectData
      });
      await projectDoc.save({ session });
      projectDocs.push(projectDoc);
    }

    console.log(`✅ Created ${projectDocs.length} projects`);

    // 5. Create sample sprints
    for (const project of projectDocs) {
      const sprint1 = new Sprint({
        projectId: project._id,
        workspaceId: workspace._id,
        orgId: organization._id,
        name: `Sprint 1 - ${project.name}`,
        description: 'Initial sprint for project setup and core features',
        sprintNumber: 1,
        startDate: new Date(project.timeline.startDate),
        endDate: new Date(new Date(project.timeline.startDate).getTime() + 14 * 24 * 60 * 60 * 1000),
        duration: 14,
        status: 'completed',
        goal: 'Complete project setup and initial feature development',
        objectives: ['Setup project structure', 'Implement core features', 'Setup CI/CD'],
        capacity: {
          totalStoryPoints: 40,
          committedStoryPoints: 35,
          completedStoryPoints: 32,
          teamCapacity: 160,
          actualHours: 150
        },
        metrics: {
          velocity: 32,
          burndown: [],
          burnup: []
        },
        createdBy: adminUser ? adminUser._id : organization._id
      });
      await sprint1.save({ session });

      const sprint2 = new Sprint({
        projectId: project._id,
        workspaceId: workspace._id,
        orgId: organization._id,
        name: `Sprint 2 - ${project.name}`,
        description: 'Continued feature development',
        sprintNumber: 2,
        startDate: new Date(sprint1.endDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(new Date(sprint1.endDate).getTime() + 15 * 24 * 60 * 60 * 1000),
        duration: 14,
        status: 'active',
        goal: 'Continue feature development and bug fixes',
        objectives: ['Implement remaining features', 'Fix bugs', 'Code review'],
        capacity: {
          totalStoryPoints: 40,
          committedStoryPoints: 38,
          completedStoryPoints: 0,
          teamCapacity: 160,
          actualHours: 0
        },
        metrics: {
          velocity: 0,
          burndown: [],
          burnup: []
        },
        createdBy: adminUser ? adminUser._id : organization._id
      });
      await sprint2.save({ session });
    }

    console.log(`✅ Created sprints for ${projectDocs.length} projects`);

    // 6. Create sample development metrics
    for (const project of projectDocs) {
      const metrics = new DevelopmentMetrics({
        projectId: project._id,
        orgId: organization._id,
        tenantId: tenant._id,
        period: 'weekly',
        startDate: new Date(project.timeline.startDate),
        endDate: new Date(new Date(project.timeline.startDate).getTime() + 7 * 24 * 60 * 60 * 1000),
        velocity: {
          storyPointsCompleted: 32,
          storyPointsCommitted: 35,
          velocityTrend: 5,
          averageVelocity: 32
        },
        burndown: {
          totalStoryPoints: 40,
          remainingStoryPoints: 8,
          idealBurndown: 8,
          actualBurndown: 8,
          burndownEfficiency: 100
        },
        codeQuality: {
          linesOfCode: 15000,
          codeCoverage: 85,
          technicalDebt: 15,
          codeReviewTime: 8,
          bugDensity: 0.5,
          testCoverage: 82
        },
        teamPerformance: {
          totalHours: 150,
          billableHours: 135,
          nonBillableHours: 15,
          utilizationRate: 85,
          overtimeHours: 0,
          averageTaskCompletionTime: 4.5,
          taskAccuracy: 95
        },
        clientSatisfaction: {
          overallRating: 4.5,
          communicationRating: 4.7,
          qualityRating: 4.6,
          timelinessRating: 4.4,
          feedbackCount: 3,
          complaintsCount: 0
        },
        projectHealth: {
          onTimeDelivery: 90,
          budgetVariance: -5,
          scopeCreep: 2,
          riskLevel: 'low',
          milestoneCompletion: 75
        },
        efficiency: {
          cycleTime: 3,
          leadTime: 5,
          throughput: 8,
          workInProgress: 12,
          blockedTasks: 1
        },
        resourceUtilization: {
          developerUtilization: 85,
          designerUtilization: 80,
          qaUtilization: 75,
          pmUtilization: 90,
          totalCapacity: 160,
          actualCapacity: 140
        },
        bugs: {
          totalBugs: 8,
          criticalBugs: 0,
          highBugs: 2,
          mediumBugs: 4,
          lowBugs: 2,
          bugsFixed: 6,
          bugResolutionTime: 2.5,
          bugReopenRate: 5
        },
        features: {
          featuresDelivered: 5,
          featuresInProgress: 3,
          featuresPlanned: 8,
          featureCompletionRate: 62,
          averageFeatureTime: 3.5
        }
      });
      await metrics.save({ session });
    }

    console.log(`✅ Created development metrics for ${projectDocs.length} projects`);

    console.log(`✅ Software house-specific seeding completed for tenant: ${tenant.tenantId}`);
    
  } catch (error) {
    console.error('Error seeding software house data:', error);
    throw error;
  }
}

module.exports = {
  seedSoftwareHouseData
};

