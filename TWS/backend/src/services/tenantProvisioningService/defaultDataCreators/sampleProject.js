const Project = require('../../../models/project-delivery/Project');
const Task = require('../../../models/project-delivery/Task');
const User = require('../../../models/users-auth/User');

/**
 * Create sample project
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 * @returns {Object} Created project
 */
async function createSampleProject(tenant, organization, session) {
  try {
    const sampleProject = new Project({
      orgId: organization._id,
      tenantId: tenant.tenantId,
      name: 'Welcome Project',
      slug: 'welcome-project',
      description: 'This is a sample project to help you get started with the system.',
      status: 'planning',
      priority: 'medium',
      budget: {
        total: 10000,
        currency: tenant.settings.currency,
        spent: 0,
        remaining: 10000
      },
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        estimatedHours: 80,
        actualHours: 0
      },
      settings: {
        allowClientAccess: true,
        clientCanComment: true,
        clientCanApprove: false,
        requireApproval: false
      },
      tags: ['sample', 'welcome', 'getting-started'],
      isSample: true
    });

    await sampleProject.save({ session });
    return sampleProject;
    
  } catch (error) {
    console.error('Error creating sample project:', error);
    throw error;
  }
}

/**
 * Create sample tasks for a project
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} project - Project record
 * @param {Object} session - MongoDB session
 */
async function createSampleTasks(tenant, organization, project, session) {
  try {
    // Get admin user for task assignment
    const adminUser = await User.findOne({ 
      orgId: organization._id, 
      role: 'owner' 
    }).session(session);

    if (!adminUser) {
      console.warn('Admin user not found, skipping task creation');
      return;
    }

    const tasks = [
      {
        orgId: organization._id,
        projectId: project._id,
        title: 'Project Setup',
        description: 'Set up project infrastructure and initial configuration',
        status: 'in_progress',
        priority: 'high',
        reporter: adminUser._id,
        assignee: adminUser._id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        estimatedHours: 8,
        actualHours: 4,
        tags: ['setup', 'infrastructure']
      },
      {
        orgId: organization._id,
        projectId: project._id,
        title: 'Design Review',
        description: 'Review and approve initial design mockups',
        status: 'todo',
        priority: 'medium',
        reporter: adminUser._id,
        assignee: adminUser._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        estimatedHours: 4,
        actualHours: 0,
        tags: ['design', 'review']
      },
      {
        orgId: organization._id,
        projectId: project._id,
        title: 'Development Phase 1',
        description: 'Implement core features and functionality',
        status: 'todo',
        priority: 'high',
        reporter: adminUser._id,
        assignee: adminUser._id,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        estimatedHours: 40,
        actualHours: 0,
        tags: ['development', 'core-features']
      },
      {
        orgId: organization._id,
        projectId: project._id,
        title: 'Testing & QA',
        description: 'Perform quality assurance testing',
        status: 'todo',
        priority: 'medium',
        reporter: adminUser._id,
        assignee: adminUser._id,
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        estimatedHours: 16,
        actualHours: 0,
        tags: ['testing', 'qa']
      },
      {
        orgId: organization._id,
        projectId: project._id,
        title: 'Documentation',
        description: 'Create project documentation and user guides',
        status: 'completed',
        priority: 'low',
        reporter: adminUser._id,
        assignee: adminUser._id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        estimatedHours: 8,
        actualHours: 8,
        completedDate: new Date(),
        tags: ['documentation']
      }
    ];

    for (const taskData of tasks) {
      const task = new Task(taskData);
      await task.save({ session });
    }

    console.log(`Created ${tasks.length} sample tasks for project: ${project.name}`);
    
  } catch (error) {
    console.error('Error creating sample tasks:', error);
    // Don't throw error - tasks are optional
  }
}

module.exports = {
  createSampleProject,
  createSampleTasks
};

