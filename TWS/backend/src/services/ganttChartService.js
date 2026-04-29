/**
 * Gantt Chart Service - Nucleus Project OS Enhanced
 * Business logic for Gantt chart operations including:
 * - Task dependency management
 * - Critical path calculation
 * - Timeline calculations
 * - Circular dependency detection
 * - Redis caching for performance (Nucleus requirement)
 */

const Task = require('../models/project-delivery/Task');
const TaskDependency = require('../models/project-delivery/TaskDependency');
const ProjectTimeline = require('../models/project-delivery/ProjectTimeline');
const GanttSettings = require('../models/project-delivery/GanttSettings');
const Project = require('../models/project-delivery/Project');
const Deliverable = require('../models/project-delivery/Deliverable');
const Milestone = require('../models/project-delivery/Milestone');

// In-memory cache replacing Redis (60s TTL per Nucleus spec)
const _ganttCache = new Map();
const redisClient = {
  get:   async (key) => { const e = _ganttCache.get(key); if (!e || Date.now() > e.expiresAt) { _ganttCache.delete(key); return null; } return e.data; },
  setEx: async (key, ttl, data) => { _ganttCache.set(key, { data, expiresAt: Date.now() + ttl * 1000 }); },
  del:   async (key) => { _ganttCache.delete(key); }
};

/**
 * Generate Gantt data for a project (with Redis caching)
 * Nucleus Project OS specification: Cache for 60 seconds
 */
async function generateGanttData(projectId, orgId, isClientView = false) {
  const cacheKey = `gantt:project:${projectId}:${isClientView ? 'client' : 'internal'}`;
  
  // Check cache first
  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read error:', error.message);
    }
  }
  
  // Generate from database
  let ganttData;
  
  if (isClientView) {
    // Client view: Show deliverables only (not tasks)
    const deliverables = await Deliverable.find({ project_id: projectId, orgId })
      .populate('tasks')
      .lean();
    
    // Fallback to Milestones if no Deliverables
    let items = deliverables;
    if (deliverables.length === 0) {
      const milestones = await Milestone.find({ projectId, orgId })
        .populate('tasks')
        .lean();
      items = milestones;
    }
    
    ganttData = {
      tasks: items.map(d => ({
        id: d._id.toString(),
        name: d.name || d.title,
        start: (d.start_date || d.dueDate) ? new Date(d.start_date || d.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        end: (d.target_date || d.dueDate) ? new Date(d.target_date || d.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        progress: d.progress_percentage || d.progress || 0,
        dependencies: (d.dependencies || []).map(dep => dep.toString()),
        type: 'deliverable',
        status: d.status,
        blocking_criteria_met: d.blocking_criteria_met || false
      })),
      links: []
    };
  } else {
    // Internal view: Show tasks with dependencies
    const tasks = await getTasksWithDependencies(orgId, projectId);
    
    ganttData = {
      tasks: tasks.map(t => ({
        id: t._id.toString(),
        name: t.title,
        start: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        end: (t.endDate || t.dueDate) ? new Date(t.endDate || t.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        progress: t.progress || 0,
        dependencies: (t.dependencies?.predecessors || []).map(dep => dep.taskId?.toString()).filter(Boolean),
        type: 'task',
        status: t.status
      })),
      links: tasks
        .filter(t => t.dependencies?.predecessors && t.dependencies.predecessors.length > 0)
        .map(t => t.dependencies.predecessors.map(dep => ({
          source: dep.taskId?.toString(),
          target: t._id.toString(),
          type: dep.dependencyType || 'FF'
        })))
        .flat()
    };
  }
  
  // Cache for 60 seconds (Nucleus specification)
  if (redisClient) {
    try {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(ganttData));
    } catch (error) {
      console.warn('Redis cache write error:', error.message);
    }
  }
  
  return ganttData;
}

/**
 * Invalidate Gantt cache for a project
 */
async function invalidateGanttCache(projectId) {
  if (!redisClient) return;
  
  try {
    const keys = [
      `gantt:project:${projectId}:client`,
      `gantt:project:${projectId}:internal`
    ];
    
    await Promise.all(keys.map(key => redisClient.del(key)));
  } catch (error) {
    console.warn('Redis cache invalidation error:', error.message);
  }
}

/**
 * Get tasks with dependencies for a project
 */
async function getTasksWithDependencies(orgId, projectId, options = {}) {
  try {
    const tasks = await Task.find({ orgId, projectId })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .lean();

    // Get all dependencies for these tasks
    const taskIds = tasks.map(t => t._id);
    const dependencies = await TaskDependency.find({
      orgId,
      projectId,
      $or: [
        { sourceTaskId: { $in: taskIds } },
        { targetTaskId: { $in: taskIds } }
      ]
    })
      .populate('sourceTaskId', 'title startDate endDate')
      .populate('targetTaskId', 'title startDate endDate')
      .lean();

    // Enhance tasks with dependency information
    const tasksWithDeps = tasks.map(task => {
      const taskDeps = {
        predecessors: dependencies
          .filter(dep => dep.targetTaskId?._id?.toString() === task._id.toString())
          .map(dep => ({
            id: dep._id,
            taskId: dep.sourceTaskId?._id,
            taskTitle: dep.sourceTaskId?.title,
            dependencyType: dep.dependencyType,
            lagTime: dep.lagTime
          })),
        successors: dependencies
          .filter(dep => dep.sourceTaskId?._id?.toString() === task._id.toString())
          .map(dep => ({
            id: dep._id,
            taskId: dep.targetTaskId?._id,
            taskTitle: dep.targetTaskId?.title,
            dependencyType: dep.dependencyType,
            lagTime: dep.lagTime
          }))
      };

      return {
        ...task,
        dependencies: taskDeps,
        dependencyCount: taskDeps.predecessors.length + taskDeps.successors.length
      };
    });

    return tasksWithDeps;
  } catch (error) {
    console.error('Error getting tasks with dependencies:', error);
    throw error;
  }
}

/**
 * Calculate critical path for a project
 * Uses topological sort and longest path algorithm
 */
async function calculateCriticalPath(orgId, projectId) {
  try {
    const tasks = await getTasksWithDependencies(orgId, projectId);
    const dependencies = await TaskDependency.find({ orgId, projectId }).lean();

    // Build dependency graph
    const graph = new Map();
    const inDegree = new Map();
    const earliestStart = new Map();
    const latestStart = new Map();

    // Initialize
    tasks.forEach(task => {
      graph.set(task._id.toString(), []);
      inDegree.set(task._id.toString(), 0);
      const startDate = task.startDate ? new Date(task.startDate) : null;
      const endDate = task.endDate || task.dueDate ? new Date(task.endDate || task.dueDate) : null;
      earliestStart.set(task._id.toString(), startDate);
    });

    // Build graph and calculate in-degrees
    dependencies.forEach(dep => {
      const sourceId = dep.sourceTaskId?.toString();
      const targetId = dep.targetTaskId?.toString();
      
      if (sourceId && targetId && graph.has(sourceId) && graph.has(targetId)) {
        graph.get(sourceId).push({
          targetId,
          lagTime: dep.lagTime || 0,
          type: dep.dependencyType
        });
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      }
    });

    // Calculate earliest start times (forward pass)
    const queue = [];
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentTask = tasks.find(t => t._id.toString() === currentId);
      
      if (!currentTask) continue;

      const currentStart = earliestStart.get(currentId);
      const duration = calculateTaskDuration(currentTask);
      const currentEnd = currentStart ? new Date(currentStart.getTime() + duration * 24 * 60 * 60 * 1000) : null;

      graph.get(currentId).forEach(edge => {
        const targetStart = earliestStart.get(edge.targetId);
        let newStart = null;

        if (currentEnd) {
          if (edge.type === 'finish-to-start') {
            newStart = new Date(currentEnd.getTime() + edge.lagTime * 24 * 60 * 60 * 1000);
          } else if (edge.type === 'start-to-start') {
            newStart = new Date(currentStart.getTime() + edge.lagTime * 24 * 60 * 60 * 1000);
          } else if (edge.type === 'finish-to-finish') {
            const targetTask = tasks.find(t => t._id.toString() === edge.targetId);
            const targetDuration = calculateTaskDuration(targetTask);
            newStart = new Date(currentEnd.getTime() - targetDuration * 24 * 60 * 60 * 1000 + edge.lagTime * 24 * 60 * 60 * 1000);
          }

          if (!targetStart || (newStart && newStart > targetStart)) {
            earliestStart.set(edge.targetId, newStart);
          }
        }

        inDegree.set(edge.targetId, inDegree.get(edge.targetId) - 1);
        if (inDegree.get(edge.targetId) === 0) {
          queue.push(edge.targetId);
        }
      });
    }

    // Calculate latest start times (backward pass)
    const reverseGraph = new Map();
    const outDegree = new Map();
    
    tasks.forEach(task => {
      reverseGraph.set(task._id.toString(), []);
      outDegree.set(task._id.toString(), 0);
    });

    dependencies.forEach(dep => {
      const sourceId = dep.sourceTaskId?.toString();
      const targetId = dep.targetTaskId?.toString();
      
      if (sourceId && targetId && reverseGraph.has(targetId) && reverseGraph.has(sourceId)) {
        reverseGraph.get(targetId).push({
          sourceId,
          lagTime: dep.lagTime || 0,
          type: dep.dependencyType
        });
        outDegree.set(sourceId, (outDegree.get(sourceId) || 0) + 1);
      }
    });

    // Find project end date (max of all task end dates)
    let projectEndDate = null;
    tasks.forEach(task => {
      const start = earliestStart.get(task._id.toString());
      if (start) {
        const duration = calculateTaskDuration(task);
        const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
        if (!projectEndDate || end > projectEndDate) {
          projectEndDate = end;
        }
      }
    });

    // Initialize latest start with project end date
    tasks.forEach(task => {
      const start = earliestStart.get(task._id.toString());
      if (start) {
        const duration = calculateTaskDuration(task);
        latestStart.set(task._id.toString(), new Date(projectEndDate.getTime() - duration * 24 * 60 * 60 * 1000));
      }
    });

    // Backward pass
    const reverseQueue = [];
    outDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        reverseQueue.push(taskId);
      }
    });

    while (reverseQueue.length > 0) {
      const currentId = reverseQueue.shift();
      const currentTask = tasks.find(t => t._id.toString() === currentId);
      
      if (!currentTask) continue;

      const currentLatestStart = latestStart.get(currentId);
      const duration = calculateTaskDuration(currentTask);
      const currentLatestEnd = currentLatestStart ? new Date(currentLatestStart.getTime() + duration * 24 * 60 * 60 * 1000) : null;

      reverseGraph.get(currentId).forEach(edge => {
        const sourceLatestStart = latestStart.get(edge.sourceId);
        let newLatestStart = null;

        if (currentLatestStart && currentLatestEnd) {
          if (edge.type === 'finish-to-start') {
            newLatestStart = new Date(currentLatestStart.getTime() - edge.lagTime * 24 * 60 * 60 * 1000);
            const sourceTask = tasks.find(t => t._id.toString() === edge.sourceId);
            const sourceDuration = calculateTaskDuration(sourceTask);
            newLatestStart = new Date(newLatestStart.getTime() - sourceDuration * 24 * 60 * 60 * 1000);
          } else if (edge.type === 'start-to-start') {
            newLatestStart = new Date(currentLatestStart.getTime() - edge.lagTime * 24 * 60 * 60 * 1000);
          }

          if (!sourceLatestStart || (newLatestStart && newLatestStart < sourceLatestStart)) {
            latestStart.set(edge.sourceId, newLatestStart);
          }
        }

        outDegree.set(edge.sourceId, outDegree.get(edge.sourceId) - 1);
        if (outDegree.get(edge.sourceId) === 0) {
          reverseQueue.push(edge.sourceId);
        }
      });
    }

    // Identify critical path (tasks where earliest start = latest start)
    const criticalPath = [];
    tasks.forEach(task => {
      const taskId = task._id.toString();
      const earliest = earliestStart.get(taskId);
      const latest = latestStart.get(taskId);
      
      if (earliest && latest && Math.abs(earliest.getTime() - latest.getTime()) < 1000) {
        criticalPath.push(taskId);
      }
    });

    return {
      criticalPath,
      earliestStart: Object.fromEntries(earliestStart),
      latestStart: Object.fromEntries(latestStart),
      projectEndDate
    };
  } catch (error) {
    console.error('Error calculating critical path:', error);
    throw error;
  }
}

/**
 * Calculate task duration in days
 */
function calculateTaskDuration(task) {
  if (task.startDate && (task.endDate || task.dueDate)) {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate || task.dueDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Fallback to estimated hours if available
  if (task.estimatedHours) {
    return Math.ceil(task.estimatedHours / 8); // Assuming 8 hours per day
  }
  
  return 1; // Default 1 day
}

/**
 * Check for circular dependencies
 */
async function detectCircularDependency(orgId, projectId, sourceTaskId, targetTaskId) {
  try {
    // Build dependency graph
    const dependencies = await TaskDependency.find({ orgId, projectId }).lean();
    const graph = new Map();

    // Build graph
    dependencies.forEach(dep => {
      const sourceId = dep.sourceTaskId?.toString();
      const targetId = dep.targetTaskId?.toString();
      
      if (sourceId && targetId) {
        if (!graph.has(sourceId)) {
          graph.set(sourceId, []);
        }
        graph.get(sourceId).push(targetId);
      }
    });

    // Add the new dependency temporarily
    const sourceId = sourceTaskId.toString();
    const targetId = targetTaskId.toString();
    
    if (!graph.has(sourceId)) {
      graph.set(sourceId, []);
    }
    graph.get(sourceId).push(targetId);

    // DFS to detect cycle
    const visited = new Set();
    const recStack = new Set();

    function hasCycle(node) {
      if (recStack.has(node)) {
        return true; // Cycle detected
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    }

    return hasCycle(sourceId);
  } catch (error) {
    console.error('Error detecting circular dependency:', error);
    throw error;
  }
}

/**
 * Reschedule task and update dependent tasks
 */
async function rescheduleTask(orgId, projectId, taskId, newStartDate, newEndDate, options = {}) {
  try {
    const { autoAdjustDependents = false } = options;
    
    // Update task dates
    const task = await Task.findOneAndUpdate(
      { _id: taskId, orgId, projectId },
      {
        startDate: newStartDate,
        endDate: newEndDate || newStartDate,
        dueDate: newEndDate || newStartDate
      },
      { new: true }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    // If auto-adjust is enabled, update dependent tasks
    if (autoAdjustDependents) {
      const dependencies = await TaskDependency.find({
        orgId,
        projectId,
        sourceTaskId: taskId
      }).lean();

      for (const dep of dependencies) {
        const dependentTask = await Task.findById(dep.targetTaskId);
        if (!dependentTask) continue;

        let newDependentStart = null;
        const taskEndDate = newEndDate || newStartDate;
        const taskStartDate = newStartDate;

        if (dep.dependencyType === 'finish-to-start') {
          newDependentStart = new Date(taskEndDate);
          newDependentStart.setDate(newDependentStart.getDate() + (dep.lagTime || 0));
        } else if (dep.dependencyType === 'start-to-start') {
          newDependentStart = new Date(taskStartDate);
          newDependentStart.setDate(newDependentStart.getDate() + (dep.lagTime || 0));
        }

        if (newDependentStart) {
          const duration = calculateTaskDuration(dependentTask);
          const newDependentEnd = new Date(newDependentStart);
          newDependentEnd.setDate(newDependentEnd.getDate() + duration);

          await Task.findByIdAndUpdate(dep.targetTaskId, {
            startDate: newDependentStart,
            endDate: newDependentEnd,
            dueDate: newDependentEnd
          });
        }
      }
    }

    return task;
  } catch (error) {
    console.error('Error rescheduling task:', error);
    throw error;
  }
}

module.exports = {
  getTasksWithDependencies,
  calculateCriticalPath,
  detectCircularDependency,
  rescheduleTask,
  calculateTaskDuration,
  generateGanttData,
  invalidateGanttCache
};
