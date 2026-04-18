/**
 * Project Integration Service
 * Handles cross-feature synchronization and validation
 * Ensures seamless integration between Sprints, Tasks, Milestones, Timesheets, and Gantt Chart
 */

const Task = require('../../models/Task');
const Sprint = require('../../models/Sprint');
const Milestone = require('../../models/Milestone');
const ProjectTypeSettings = require('../../models/ProjectTypeSettings');
const { TimeEntry } = require('../../models/Finance');
const TaskDependency = require('../../models/TaskDependency');
const ganttChartService = require('../ganttChartService');
const projectApi = require('../module-api/project-api.service');

class ProjectIntegrationService {
  /**
   * Get project type settings
   */
  async getProjectTypeSettings(orgId, projectId) {
    const mongoose = require('mongoose');
    const oid = (id) => (id && mongoose.Types.ObjectId.isValid(id)) ? new mongoose.Types.ObjectId(id) : id;
    const orgIdObj = oid(orgId);
    const projectIdObj = oid(projectId);
    let settings = await ProjectTypeSettings.findOne({ orgId: orgIdObj, projectId: projectIdObj });

    if (!settings) {
      const project = await projectApi.getProjectById(orgIdObj || orgId, projectIdObj || projectId);
      const projectType = project?.projectType || 'general';
      try {
        settings = await this.createDefaultSettings(orgIdObj || orgId, projectIdObj || projectId, projectType);
      } catch (e) {
        if (e.code === 11000) {
          settings = await ProjectTypeSettings.findOne({ orgId: orgIdObj, projectId: projectIdObj });
        }
        if (!settings) throw e;
      }
    }

    return settings;
  }

  /**
   * Create default settings based on project type
   */
  async createDefaultSettings(orgId, projectId, projectType) {
    const defaults = {
      app_development: {
        requiresSprint: true,
        requiresMilestone: true,
        requiresTimesheet: true,
        requiresGantt: true,
        sprintDurationDays: 14,
        sprintCapacityHours: 320,
        taskDependenciesEnforced: true,
        milestoneAutoCalculateProgress: true,
        ganttShowCriticalPath: true,
        resourceAllocationTracking: true
      },
      ai_tool_development: {
        requiresSprint: false,
        requiresMilestone: true,
        requiresTimesheet: true,
        requiresGantt: true,
        sprintDurationDays: 14,
        taskDependenciesEnforced: false,
        milestoneAutoCalculateProgress: true,
        ganttShowCriticalPath: true
      },
      low_ticket_client: {
        requiresSprint: false,
        requiresMilestone: false,
        requiresTimesheet: true,
        requiresGantt: false,
        timesheetRequiredForTaskCompletion: false,
        taskDependenciesEnforced: false
      },
      high_ticket_client: {
        requiresSprint: true,
        requiresMilestone: true,
        requiresTimesheet: true,
        requiresGantt: true,
        billingEnabled: true,
        billableHoursRequired: true,
        timesheetApprovalRequired: true,
        timesheetRequiredForTaskCompletion: true,
        milestoneSignOffRequired: true,
        taskCompletionRequiresApproval: true,
        taskDependenciesEnforced: true,
        preventResourceOverallocation: true
      },
      media_buying: {
        requiresSprint: false,
        requiresMilestone: true,
        requiresTimesheet: true,
        requiresGantt: true,
        milestoneAutoCalculateProgress: true
      },
      ghl_project: {
        requiresSprint: false,
        requiresMilestone: true,
        requiresTimesheet: true,
        requiresGantt: true,
        taskDependenciesEnforced: true,
        milestoneAutoCalculateProgress: true
      },
      general: {
        requiresSprint: false,
        requiresMilestone: false,
        requiresTimesheet: true,
        requiresGantt: false
      }
    };

    const typeDefaults = defaults[projectType] || defaults.general;
    
    return await ProjectTypeSettings.create({
      orgId,
      projectId,
      projectType,
      ...typeDefaults
    });
  }

  /**
   * Validate task creation based on project type settings
   */
  async validateTaskCreation(orgId, projectId, taskData) {
    const settings = await this.getProjectTypeSettings(orgId, projectId);
    const errors = [];

    // Check sprint requirement
    if (settings.requiresSprint && !taskData.sprintId) {
      errors.push('Sprint is required for this project type');
    }

    // Check milestone requirement
    if (settings.requiresMilestone && !taskData.milestoneId) {
      errors.push('Milestone is required for this project type');
    }

    // Estimated hours: only require when project type enforces it (e.g. billable); allow null for quick-add
    if (settings.billableHoursRequired && (!taskData.estimatedHours || taskData.estimatedHours <= 0)) {
      errors.push('Estimated hours must be greater than 0 for this project type');
    }

    // Validate sprint assignment
    if (taskData.sprintId) {
      const sprint = await Sprint.findById(taskData.sprintId);
      if (!sprint || sprint.projectId.toString() !== projectId.toString()) {
        errors.push('Sprint does not belong to this project');
      }
      if (sprint.status === 'completed' || sprint.status === 'cancelled') {
        errors.push('Cannot assign task to completed or cancelled sprint');
      }
    }

    // Validate milestone assignment
    if (taskData.milestoneId) {
      const milestone = await Milestone.findById(taskData.milestoneId);
      if (!milestone || milestone.projectId?.toString() !== projectId.toString()) {
        errors.push('Milestone does not belong to this project');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Update task and sync with related features
   */
  async updateTaskWithSync(orgId, taskId, updates) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const settings = await this.getProjectTypeSettings(orgId, task.projectId);

    // Update task
    Object.assign(task, updates);
    await task.save();

    // Sync with timesheet (update actual hours)
    if (updates.status === 'completed' || updates.actualHours !== undefined) {
      await this.syncTaskTimesheet(task);
    }

    // Sync with milestone (update progress)
    if (task.milestoneId) {
      await this.syncMilestoneProgress(orgId, task.milestoneId);
    }

    // Sync with sprint (update velocity)
    if (task.sprintId) {
      await this.syncSprintMetrics(orgId, task.sprintId);
    }

    // Mark Gantt chart as stale if dates changed
    if (updates.startDate || updates.endDate || updates.dueDate) {
      // Gantt will recalculate on next fetch
    }

    return task;
  }

  /**
   * Sync task actual hours from timesheet entries
   */
  async syncTaskTimesheet(task) {
    const Finance = require('../../models/Finance');
    const TimeEntry = Finance.TimeEntry;
    
    const timeEntries = await TimeEntry.find({
      taskId: task._id,
      status: { $in: ['approved', 'billed', 'invoiced'] }
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    task.actualHours = totalHours;

    // Calculate progress based on actual vs estimated
    if (task.estimatedHours && task.estimatedHours > 0) {
      task.progress = Math.min(Math.round((totalHours / task.estimatedHours) * 100), 100);
    }

    await task.save();
    return task;
  }

  /**
   * Sync milestone progress from child tasks
   */
  async syncMilestoneProgress(orgId, milestoneId) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return;

    const tasks = await Task.find({
      orgId,
      milestoneId: milestone._id
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    milestone.tasks.total = totalTasks;
    milestone.tasks.completed = completedTasks;
    milestone.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update milestone status
    if (completedTasks === totalTasks && totalTasks > 0) {
      milestone.status = 'completed';
      milestone.completedDate = new Date();
    } else if (milestone.dueDate && new Date() > milestone.dueDate && milestone.status !== 'completed') {
      milestone.status = 'delayed';
    } else if (milestone.progress > 0 && milestone.status === 'pending') {
      milestone.status = 'in_progress';
    }

    await milestone.save();
    return milestone;
  }

  /**
   * Sync sprint metrics from tasks and timesheets (story points + hours).
   */
  async syncSprintMetrics(orgId, sprintId) {
    const mongoose = require('mongoose');
    const oid = (id) => (id && mongoose.Types.ObjectId.isValid(id)) ? new mongoose.Types.ObjectId(id) : id;
    const sprint = await Sprint.findById(oid(sprintId));
    if (!sprint) return;

    const tasks = await Task.find({
      orgId: oid(orgId),
      sprintId: sprint._id
    }).lean();

    const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'done');
    const totalStoryPoints = tasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const completedStoryPoints = completedTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const prevCommitted = sprint.capacity?.committedStoryPoints;
    const committedStoryPoints =
      prevCommitted != null && prevCommitted > 0 ? prevCommitted : totalStoryPoints;

    const Finance = require('../../models/Finance');
    const TimeEntry = Finance.TimeEntry;

    const timeEntries = await TimeEntry.find({
      orgId: oid(orgId),
      sprintId: sprint._id,
      status: { $in: ['approved', 'billed', 'invoiced'] }
    }).lean();

    const sprintActualHours = timeEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);

    sprint.capacity = {
      ...(sprint.capacity || {}),
      totalStoryPoints,
      committedStoryPoints,
      completedStoryPoints,
      actualHours: sprintActualHours
    };

    if (sprint.status === 'completed') {
      sprint.metrics = sprint.metrics || {};
      sprint.metrics.velocity = completedStoryPoints;
    }

    await sprint.save();
    return sprint;
  }

  /**
   * Create timesheet entry with auto-sync
   */
  async createTimesheetEntryWithSync(orgId, timeEntryData) {
    const { taskId, sprintId, milestoneId, projectId } = timeEntryData;

    // Auto-populate sprint and milestone from task if not provided
    if (taskId && (!sprintId || !milestoneId)) {
      const task = await Task.findById(taskId);
      if (task) {
        if (!sprintId && task.sprintId) {
          timeEntryData.sprintId = task.sprintId;
        }
        if (!milestoneId && task.milestoneId) {
          timeEntryData.milestoneId = task.milestoneId;
        }
        if (!projectId && task.projectId) {
          timeEntryData.projectId = task.projectId;
        }
      }
    }

    // Create timesheet entry
    const Finance = require('../../models/Finance');
    const TimeEntry = Finance.TimeEntry;
    const timeEntry = new TimeEntry({
      orgId,
      ...timeEntryData
    });
    await timeEntry.save();

    // Sync task actual hours
    if (taskId) {
      const task = await Task.findById(taskId);
      if (task) {
        await this.syncTaskTimesheet(task);
      }
    }

    // Sync sprint metrics
    if (sprintId) {
      await this.syncSprintMetrics(orgId, sprintId);
    }

    // Sync milestone progress
    if (milestoneId) {
      await this.syncMilestoneProgress(orgId, milestoneId);
    }

    return timeEntry;
  }

  /**
   * Validate task completion
   */
  async validateTaskCompletion(orgId, taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const settings = await this.getProjectTypeSettings(orgId, task.projectId);
    const errors = [];

    // Check timesheet requirement
    if (settings.timesheetRequiredForTaskCompletion) {
      const Finance = require('../../models/Finance');
      const TimeEntry = Finance.TimeEntry;
      
      const timeEntries = await TimeEntry.find({ taskId: task._id, status: 'approved' });
      if (timeEntries.length === 0) {
        errors.push('Timesheet entry required before task completion');
      }
    }

    // Check dependencies
    if (settings.taskDependenciesEnforced) {
      const dependencies = await TaskDependency.find({
        orgId,
        projectId: task.projectId,
        targetTaskId: task._id
      });

      for (const dep of dependencies) {
        const predecessor = await Task.findById(dep.sourceTaskId);
        if (predecessor && predecessor.status !== 'completed') {
          errors.push(`Task "${predecessor.title}" must be completed first`);
        }
      }
    }

    // Check approval requirement
    if (settings.taskCompletionRequiresApproval && task.status !== 'under_review') {
      errors.push('Task must be reviewed before completion');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get integrated project dashboard data
   */
  async getProjectDashboard(orgId, projectId) {
    const mongoose = require('mongoose');
    const oid = (id) => (id && mongoose.Types.ObjectId.isValid(id)) ? new mongoose.Types.ObjectId(id) : id;
    const orgIdObj = oid(orgId);
    const projectIdObj = oid(projectId);

    const project = await projectApi.getProjectById(orgIdObj || orgId, projectIdObj || projectId);

    let settings;
    try {
      settings = await this.getProjectTypeSettings(orgIdObj || orgId, projectIdObj || projectId);
    } catch (settingsErr) {
      console.warn('getProjectDashboard: getProjectTypeSettings failed, using defaults', settingsErr?.message);
      settings = { requiresSprint: false, requiresMilestone: false, requiresTimesheet: true, requiresGantt: false };
    }

    const Finance = require('../../models/Finance');
    const TimeEntry = Finance.TimeEntry;
    const query = { orgId: orgIdObj || orgId, projectId: projectIdObj || projectId };

    let tasks = [];
    let sprints = [];
    let milestones = [];
    let timeEntries = [];
    try {
      [tasks, sprints, milestones, timeEntries] = await Promise.all([
        Task.find(query).populate('assignee', 'name email fullName'),
        Sprint.find(query),
        Milestone.find(query),
        TimeEntry.find(query)
      ]);
    } catch (queryErr) {
      console.warn('getProjectDashboard: query failed', queryErr?.message);
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualHours = timeEntries
      .filter(te => te.status === 'approved')
      .reduce((sum, te) => sum + te.hours, 0);
    const activeSprints = sprints.filter(s => s.status === 'active');
    const completedMilestones = milestones.filter(m => m.status === 'completed');

    return {
      project,
      settings,
      metrics: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalEstimatedHours,
        totalActualHours,
        hoursVariance: totalActualHours - totalEstimatedHours,
        totalSprints: sprints.length,
        activeSprints: activeSprints.length,
        completedMilestones: completedMilestones.length,
        totalMilestones: milestones.length
      },
      tasks,
      sprints,
      milestones,
      timeEntries: timeEntries.slice(0, 50)
    };
  }

  /**
   * Get tasks with full context (sprint, milestone, timesheet, gantt data)
   */
  async getTasksWithContext(orgId, projectId, filters = {}) {
    const query = { orgId, projectId };
    
    if (filters.sprintId) query.sprintId = filters.sprintId;
    if (filters.milestoneId) query.milestoneId = filters.milestoneId;
    if (filters.status) query.status = filters.status;
    if (filters.assignee) query.assignee = filters.assignee;

    const tasks = await Task.find(query)
      .populate('sprintId', 'name startDate endDate status')
      .populate('milestoneId', 'title dueDate status progress')
      .populate('assignee', 'name email avatar')
      .lean();

    // Enrich with timesheet data
    const taskIds = tasks.map(t => t._id);
    const timeEntries = await TimeEntry.find({
      orgId,
      taskId: { $in: taskIds },
      status: { $in: ['approved', 'billed', 'invoiced'] }
    });

    const timeEntriesByTask = {};
    timeEntries.forEach(te => {
      if (!timeEntriesByTask[te.taskId]) {
        timeEntriesByTask[te.taskId] = [];
      }
      timeEntriesByTask[te.taskId].push(te);
    });

    // Calculate actual hours from timesheet
    tasks.forEach(task => {
      const entries = timeEntriesByTask[task._id] || [];
      task.actualHoursFromTimesheet = entries.reduce((sum, e) => sum + e.hours, 0);
      task.timesheetEntries = entries.length;
    });

    return tasks;
  }

  /**
   * Check integration health
   */
  async checkIntegrationHealth(orgId, projectId) {
    const issues = [];

    // Check for orphaned tasks (no sprint or milestone when required)
    const settings = await this.getProjectTypeSettings(orgId, projectId);
    const tasks = await Task.find({ orgId, projectId });

    if (settings.requiresSprint) {
      const orphanedTasks = tasks.filter(t => !t.sprintId);
      if (orphanedTasks.length > 0) {
        issues.push({
          type: 'orphaned_tasks',
          severity: 'high',
          message: `${orphanedTasks.length} tasks without sprint assignment`,
          count: orphanedTasks.length
        });
      }
    }

    if (settings.requiresMilestone) {
      const orphanedTasks = tasks.filter(t => !t.milestoneId);
      if (orphanedTasks.length > 0) {
        issues.push({
          type: 'orphaned_tasks',
          severity: 'high',
          message: `${orphanedTasks.length} tasks without milestone assignment`,
          count: orphanedTasks.length
        });
      }
    }

    // Check for tasks with timesheet but no actual hours updated
    const Finance = require('../../models/Finance');
    const TimeEntry = Finance.TimeEntry;
    
    const tasksWithTimesheet = await Task.find({
      orgId,
      projectId,
      actualHours: 0
    });

    for (const task of tasksWithTimesheet) {
      const entries = await TimeEntry.find({ taskId: task._id, status: 'approved' });
      if (entries.length > 0) {
        issues.push({
          type: 'timesheet_sync',
          severity: 'medium',
          message: `Task "${task.title}" has timesheet entries but actualHours not updated`,
          taskId: task._id
        });
      }
    }

    // Check for milestone progress mismatch
    const milestones = await Milestone.find({ orgId, projectId });
    for (const milestone of milestones) {
      const milestoneTasks = await Task.find({ orgId, projectId, milestoneId: milestone._id });
      const completed = milestoneTasks.filter(t => t.status === 'completed').length;
      const calculatedProgress = milestoneTasks.length > 0 
        ? Math.round((completed / milestoneTasks.length) * 100) 
        : 0;
      
      if (Math.abs(milestone.progress - calculatedProgress) > 5) {
        issues.push({
          type: 'milestone_progress',
          severity: 'medium',
          message: `Milestone "${milestone.title}" progress mismatch (${milestone.progress}% vs ${calculatedProgress}%)`,
          milestoneId: milestone._id
        });
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      timestamp: new Date()
    };
  }
}

module.exports = new ProjectIntegrationService();
