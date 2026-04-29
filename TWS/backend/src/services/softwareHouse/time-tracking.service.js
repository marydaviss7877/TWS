const { TimeEntry } = require('../../models/finance/Finance');
const Project = require('../../models/project-delivery/Project');
const Task = require('../../models/project-delivery/Task');

class TimeTrackingService {
  /**
   * Start time tracking timer
   */
  async startTimer(orgId, employeeId, projectId, taskId, description) {
    // Check for active timer
    const activeTimer = await TimeEntry.findOne({
      orgId,
      employeeId,
      'timer.isRunning': true
    });

    if (activeTimer) {
      throw new Error('Active timer already running. Please stop it first.');
    }

    // Get project details for hourly rate
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      throw new Error('Project not found');
    }

    const hourlyRate = project.profitability?.hourlyRate || 0;

    // Get task title if taskId provided
    let taskTitle = description;
    if (taskId) {
      const task = await Task.findById(taskId);
      if (task) {
        taskTitle = task.title || description;
      }
    }

    // Create time entry with timer
    const timeEntry = new TimeEntry({
      orgId,
      employeeId,
      projectId,
      taskId,
      clientId: project.clientId,
      date: new Date(),
      hours: 0,
      description,
      task: taskTitle,
      hourlyRate,
      billable: true,
      status: 'draft',
      timer: {
        startedAt: new Date(),
        isRunning: true
      }
    });

    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Stop time tracking timer
   */
  async stopTimer(orgId, employeeId, timeEntryId) {
    const timeEntry = await TimeEntry.findOne({
      _id: timeEntryId,
      orgId,
      employeeId,
      'timer.isRunning': true
    });

    if (!timeEntry) {
      throw new Error('Active timer not found');
    }

    const stoppedAt = new Date();
    const hours = (stoppedAt - timeEntry.timer.startedAt) / (1000 * 60 * 60); // Convert to hours

    timeEntry.hours = Math.round(hours * 100) / 100; // Round to 2 decimals
    timeEntry.timer.stoppedAt = stoppedAt;
    timeEntry.timer.isRunning = false;
    timeEntry.calculateBillableHours();

    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Create manual time entry
   */
  async createTimeEntry(orgId, employeeId, timeEntryData) {
    const { projectId, taskId, date, hours, description, task, billable, hourlyRate } = timeEntryData;

    // Get project for default values
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      throw new Error('Project not found');
    }

    const finalHourlyRate = hourlyRate || project.profitability?.hourlyRate || 0;
    const finalBillable = billable !== undefined ? billable : true;

    // Get task title if taskId provided
    let taskTitle = task || description;
    if (taskId && !task) {
      const taskDoc = await Task.findById(taskId);
      if (taskDoc) {
        taskTitle = taskDoc.title || description;
      }
    }

    const timeEntry = new TimeEntry({
      orgId,
      employeeId,
      projectId,
      taskId,
      clientId: project.clientId,
      date: new Date(date),
      hours: parseFloat(hours),
      description,
      task: taskTitle,
      hourlyRate: finalHourlyRate,
      billable: finalBillable,
      status: 'submitted',
      tags: taskId ? [`task:${taskId}`] : []
    });

    timeEntry.calculateBillableHours();
    await timeEntry.save();

    // Update project profitability if billable
    if (finalBillable) {
      project.profitability = project.profitability || {};
      project.profitability.billableHours = (project.profitability.billableHours || 0) + timeEntry.hours;
      project.profitability.actualCost = (project.profitability.actualCost || 0) + (timeEntry.hours * finalHourlyRate);
      await project.save();
    }

    return timeEntry;
  }

  /**
   * Get time entries with filters
   */
  async getTimeEntries(orgId, filters = {}) {
    const {
      employeeId,
      projectId,
      clientId,
      taskId,
      startDate,
      endDate,
      status,
      billable,
      page = 1,
      limit = 50
    } = filters;

    const query = { orgId };

    if (employeeId) query.employeeId = employeeId;
    if (projectId) query.projectId = projectId;
    if (clientId) query.clientId = clientId;
    if (taskId) query.tags = { $in: [`task:${taskId}`] };
    if (status) query.status = status;
    if (billable !== undefined) query.billable = billable;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [timeEntries, total] = await Promise.all([
      TimeEntry.find(query)
        .populate('employeeId', 'fullName email')
        .populate('projectId', 'name')
        .populate('clientId', 'name')
        .populate('taskId', 'title')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TimeEntry.countDocuments(query)
    ]);

    return {
      timeEntries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get time entry statistics
   */
  async getTimeEntryStats(orgId, filters = {}) {
    const { employeeId, projectId, startDate, endDate } = filters;

    const query = { orgId, status: { $in: ['approved', 'billed', 'invoiced'] } };
    if (employeeId) query.employeeId = employeeId;
    if (projectId) query.projectId = projectId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const stats = await TimeEntry.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hours' },
          billableHours: { $sum: '$billableHours' },
          totalAmount: { $sum: { $multiply: ['$hours', '$hourlyRate'] } },
          billableAmount: { $sum: { $multiply: ['$billableHours', '$hourlyRate'] } },
          entryCount: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || {
      totalHours: 0,
      billableHours: 0,
      totalAmount: 0,
      billableAmount: 0,
      entryCount: 0
    };
  }

  /**
   * Approve time entry
   */
  async approveTimeEntry(orgId, timeEntryId, approvedBy) {
    const timeEntry = await TimeEntry.findOne({ _id: timeEntryId, orgId });
    if (!timeEntry) {
      throw new Error('Time entry not found');
    }

    if (timeEntry.status !== 'submitted') {
      throw new Error('Time entry must be submitted for approval');
    }

    timeEntry.status = 'approved';
    timeEntry.approvedBy = approvedBy;
    timeEntry.approvedAt = new Date();

    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Reject time entry
   */
  async rejectTimeEntry(orgId, timeEntryId, rejectedBy, rejectionReason) {
    const timeEntry = await TimeEntry.findOne({ _id: timeEntryId, orgId });
    if (!timeEntry) {
      throw new Error('Time entry not found');
    }

    timeEntry.status = 'rejected';
    timeEntry.rejectedBy = rejectedBy;
    timeEntry.rejectedAt = new Date();
    timeEntry.rejectionReason = rejectionReason;

    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(orgId, timeEntryId, updates) {
    const timeEntry = await TimeEntry.findOne({ _id: timeEntryId, orgId });
    if (!timeEntry) {
      throw new Error('Time entry not found');
    }

    // Only allow updates to draft/submitted entries
    if (!['draft', 'submitted'].includes(timeEntry.status)) {
      throw new Error('Cannot update time entry that is approved or billed');
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (['hours', 'description', 'task', 'billable', 'hourlyRate', 'date'].includes(key)) {
        timeEntry[key] = updates[key];
      }
    });

    timeEntry.calculateBillableHours();
    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(orgId, timeEntryId) {
    const timeEntry = await TimeEntry.findOne({ _id: timeEntryId, orgId });
    if (!timeEntry) {
      throw new Error('Time entry not found');
    }

    // Only allow deletion of draft entries
    if (timeEntry.status !== 'draft') {
      throw new Error('Can only delete draft time entries');
    }

    await TimeEntry.deleteOne({ _id: timeEntryId });
    return true;
  }
}

module.exports = new TimeTrackingService();