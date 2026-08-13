const mongoose = require('mongoose');
const Project = require('../../models/project-delivery/Project');
const Task = require('../../models/project-delivery/Task');
const Client = require('../../models/industry/Client');
const Department = require('../../models/org/Department');
const Employee = require('../../models/hr-payroll/Employee');
const User = require('../../models/users-auth/User');
const OrgDocument = require('../../models/documents/OrgDocument');
const OrgSheet = require('../../models/sheets/OrgSheet');
const PortfolioItem = require('../../models/portfolio/PortfolioItem');
const ProjectMember = require('../../models/project-delivery/ProjectMember');
const Tenant = require('../../models/tenant/Tenant');
const SubscriptionPlan = require('../../models/finance/SubscriptionPlan');
const usageTrackerService = require('../usageTrackerService');
const { getEffectiveUsageLimit } = require('../../middleware/common/featureGate');
const { getUserDepartmentIds, shouldFilterByDepartment } = require('../tenant/userDepartmentsService');

const PROJECT_WRITE_ROLES = new Set(['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner', 'project_manager', 'pmo']);
const HR_READ_ROLES = new Set(['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner', 'hr', 'ceo']);
const CLIENT_ROLES = new Set(['client', 'customer']);

const text = (value, max = 500) => String(value || '')
  .replace(/[\u0000-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);

const regexEscape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeRegex = (value) => new RegExp(regexEscape(text(value, 100)), 'i');
const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const role = (context) => String(context.user?.role || '').toLowerCase();
const canReadCrossModule = (context) => PROJECT_WRITE_ROLES.has(role(context));

async function uniqueSlug(Model, orgId, rawName) {
  const base = text(rawName, 100).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  let slug = base;
  let counter = 2;
  while (await Model.exists({ orgId, slug })) slug = `${base}-${counter++}`;
  return slug;
}

async function clientScope(context) {
  if (!CLIENT_ROLES.has(role(context))) return {};
  const client = await Client.findOne({ orgId: context.orgId, userId: context.user._id }).select('_id').lean();
  return client ? { clientId: client._id } : { _id: null };
}

async function projectScope(context) {
  if (CLIENT_ROLES.has(role(context))) return clientScope(context);
  if (role(context) === 'owner' || !context.tenantId || !context.user?._id) return {};

  const scope = {};
  if (await shouldFilterByDepartment(context.tenantId, context.user._id)) {
    const departmentIds = await getUserDepartmentIds(context.tenantId, context.user._id);
    if (departmentIds.length) {
      scope.$or = [
        { primaryDepartmentId: { $in: departmentIds } },
        { departments: { $in: departmentIds } }
      ];
    }
  }
  if (role(context) !== 'admin') {
    const projectIds = await ProjectMember.find({ userId: context.user._id, status: 'active' }).distinct('projectId');
    scope._id = { $in: projectIds };
  }
  return scope;
}

async function assertWriteAllowed(context, metric) {
  if (!context.tenantId) return;
  const tenant = await Tenant.findById(context.tenantId).select('erpCategory subscription').lean();
  if (!tenant || tenant.erpCategory !== 'software_house') return;
  if (tenant.subscription?.readOnlyMode) {
    const error = new Error('Account is in read-only mode due to billing');
    error.code = 'READ_ONLY_BILLING';
    throw error;
  }
  if (!metric) return;
  const plan = await SubscriptionPlan.findOne({ slug: tenant.subscription?.plan });
  if (!plan) return;
  const current = await usageTrackerService.getCurrentUsage(context.tenantId, metric);
  const limit = getEffectiveUsageLimit(tenant, plan, metric);
  if (limit !== -1 && current + 1 > limit) {
    const error = new Error(`Usage limit exceeded for ${metric}`);
    error.code = 'USAGE_LIMIT_EXCEEDED';
    throw error;
  }
}

const definitions = [
  {
    name: 'workspace_overview',
    description: 'Get current organization counts and status summaries across projects, tasks, clients, departments, documents, sheets, and portfolio.',
    risk: 'read',
    parameters: { type: 'object', properties: {} },
    execute: async (_args, context) => {
      const projectFilter = { orgId: context.orgId, ...(await projectScope(context)) };
      const projectIds = await Project.find(projectFilter).distinct('_id');
      const taskFilter = { orgId: context.orgId, projectId: { $in: projectIds } };
      const [projects, activeProjects, tasks, openTasks, clients, departments, documents, sheets, portfolio] = await Promise.all([
        Project.countDocuments(projectFilter),
        Project.countDocuments({ ...projectFilter, status: 'active' }),
        Task.countDocuments(taskFilter),
        Task.countDocuments({ ...taskFilter, status: { $nin: ['completed', 'cancelled'] } }),
        CLIENT_ROLES.has(role(context)) ? Promise.resolve(1) : Client.countDocuments({ orgId: context.orgId }),
        CLIENT_ROLES.has(role(context)) ? Promise.resolve(0) : Department.countDocuments({ orgId: context.orgId }),
        canReadCrossModule(context) ? OrgDocument.countDocuments({ orgId: context.orgId }) : Promise.resolve(0),
        canReadCrossModule(context) ? OrgSheet.countDocuments({ orgId: context.orgId }) : Promise.resolve(0),
        canReadCrossModule(context) ? PortfolioItem.countDocuments({ orgId: context.orgId, deletedAt: null }) : Promise.resolve(0)
      ]);
      return { projects, activeProjects, tasks, openTasks, clients, departments, documents, sheets, portfolio };
    }
  },
  {
    name: 'search_workspace',
    description: 'Search by text across projects, tasks, clients, departments, documents, sheets, and portfolio items in the current organization.',
    risk: 'read',
    parameters: {
      type: 'object', properties: { query: { type: 'string', description: 'Text to search for' } }, required: ['query']
    },
    validate: (args) => text(args.query, 100).length >= 2,
    execute: async (args, context) => {
      const pattern = safeRegex(args.query);
      const scopedProjects = { orgId: context.orgId, ...(await projectScope(context)) };
      const projects = await Project.find({ ...scopedProjects, $or: [{ name: pattern }, { description: pattern }, { tags: pattern }] })
        .select('_id name slug status priority projectType').limit(8).lean();
      const scopedProjectIds = await Project.find(scopedProjects).distinct('_id');
      const [tasks, clients, departments, documents, sheets, portfolio] = await Promise.all([
        Task.find({ orgId: context.orgId, projectId: { $in: scopedProjectIds }, $or: [{ title: pattern }, { description: pattern }, { tags: pattern }] })
          .select('_id title status priority projectId dueDate').limit(8).lean(),
        PROJECT_WRITE_ROLES.has(role(context)) ? Client.find({ orgId: context.orgId, $or: [{ name: pattern }, { notes: pattern }, { tags: pattern }] }).select('_id name status').limit(8).lean() : [],
        CLIENT_ROLES.has(role(context)) ? [] : Department.find({ orgId: context.orgId, $or: [{ name: pattern }, { code: pattern }, { description: pattern }] }).select('_id name code').limit(8).lean(),
        canReadCrossModule(context) ? OrgDocument.find({ orgId: context.orgId, $or: [{ title: pattern }, { fileName: pattern }] }).select('_id title fileName status').limit(5).lean() : [],
        canReadCrossModule(context) ? OrgSheet.find({ orgId: context.orgId, $or: [{ title: pattern }, { fileName: pattern }] }).select('_id title fileName').limit(5).lean() : [],
        canReadCrossModule(context) ? PortfolioItem.find({ orgId: context.orgId, deletedAt: null, $or: [{ title: pattern }, { description: pattern }, { tags: pattern }] }).select('_id title status type').limit(5).lean() : []
      ]);
      return { projects, tasks, clients, departments, documents, sheets, portfolio };
    }
  },
  {
    name: 'list_projects',
    description: 'List projects with optional status and name filters.',
    risk: 'read',
    parameters: { type: 'object', properties: { status: { type: 'string' }, search: { type: 'string' }, limit: { type: 'integer' } } },
    execute: async (args, context) => Project.find({
      orgId: context.orgId,
      ...(await projectScope(context)),
      ...(args.status ? { status: args.status } : {}),
      ...(args.search ? { name: safeRegex(args.search) } : {})
    }).select('_id name slug description status priority projectType timeline budget clientId').sort({ updatedAt: -1 }).limit(Math.min(25, Math.max(1, Number(args.limit) || 10))).lean()
  },
  {
    name: 'list_tasks',
    description: 'List tasks, optionally filtered by project, status, assignee, or search text.',
    risk: 'read',
    parameters: { type: 'object', properties: { project: { type: 'string' }, status: { type: 'string' }, search: { type: 'string' }, limit: { type: 'integer' } } },
    execute: async (args, context) => {
      let projectFilter = {};
      if (args.project) {
        const project = await Project.findOne({ ...(await projectScope(context)), orgId: context.orgId, ...(isId(args.project) ? { _id: args.project } : { $or: [{ slug: text(args.project, 150).toLowerCase() }, { name: safeRegex(args.project) }] }) });
        if (!project) return [];
        projectFilter = { projectId: project._id };
      } else {
        const projects = await Project.find({ orgId: context.orgId, ...(await projectScope(context)) }).distinct('_id');
        projectFilter = { projectId: { $in: projects } };
      }
      return Task.find({ orgId: context.orgId, ...projectFilter, ...(args.status ? { status: args.status } : {}), ...(args.search ? { title: safeRegex(args.search) } : {}) })
        .select('_id title description status priority projectId assignee dueDate estimatedHours').sort({ updatedAt: -1 }).limit(Math.min(30, Math.max(1, Number(args.limit) || 10))).lean();
    }
  },
  {
    name: 'list_clients',
    description: 'List organization clients by status or search term.',
    risk: 'read',
    roles: PROJECT_WRITE_ROLES,
    parameters: { type: 'object', properties: { status: { type: 'string' }, search: { type: 'string' }, limit: { type: 'integer' } } },
    execute: async (args, context) => Client.find({ orgId: context.orgId, ...(args.status ? { status: args.status } : {}), ...(args.search ? { name: safeRegex(args.search) } : {}) })
      .select('_id name type status company contact.primary tags').sort({ updatedAt: -1 }).limit(Math.min(25, Math.max(1, Number(args.limit) || 10))).lean()
  },
  {
    name: 'list_departments',
    description: 'List organization departments and their codes.',
    risk: 'read',
    denyRoles: CLIENT_ROLES,
    parameters: { type: 'object', properties: {} },
    execute: async (_args, context) => Department.find({ orgId: context.orgId }).select('_id name code description departmentHead').sort({ name: 1 }).limit(100).lean()
  },
  {
    name: 'list_employees',
    description: 'List employees with job title, department, status, skills, and user identity. Salary and private fields are never exposed.',
    risk: 'read',
    roles: HR_READ_ROLES,
    parameters: { type: 'object', properties: { department: { type: 'string' }, status: { type: 'string' }, search: { type: 'string' }, limit: { type: 'integer' } } },
    execute: async (args, context) => {
      const employees = await Employee.find({
        $or: [{ orgId: context.orgId }, { organizationId: context.orgId }],
        ...(args.department ? { department: safeRegex(args.department) } : {}),
        ...(args.status ? { status: args.status } : {})
      }).select('_id userId employeeId jobTitle department hireDate contractType status skills').populate('userId', 'fullName email role').limit(Math.min(30, Math.max(1, Number(args.limit) || 10))).lean();
      if (!args.search) return employees;
      const needle = text(args.search, 100).toLowerCase();
      return employees.filter((employee) => JSON.stringify(employee).toLowerCase().includes(needle));
    }
  },
  {
    name: 'create_project',
    description: 'Prepare creation of a new project. This always requires user approval before execution.',
    risk: 'write',
    roles: PROJECT_WRITE_ROLES,
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' }, description: { type: 'string' },
        projectType: { type: 'string', enum: ['web_application', 'mobile_app', 'api_development', 'system_integration', 'maintenance_support', 'consulting', 'general'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }, status: { type: 'string', enum: ['planning', 'active', 'on_hold'] },
        client: { type: 'string' }, primaryDepartment: { type: 'string' }, budgetTotal: { type: 'number' }, budgetCurrency: { type: 'string' },
        startDate: { type: 'string' }, endDate: { type: 'string' }, estimatedHours: { type: 'integer' }, tags: { type: 'array', items: { type: 'string' } }
      }, required: ['name', 'description']
    },
    validate: (args) => text(args.name, 100).length >= 3 && text(args.description, 5000).length >= 20,
    summarize: (args) => `Create project “${text(args.name, 100)}” as ${args.projectType || 'general'} with ${args.priority || 'medium'} priority.`,
    execute: async (args, context) => {
      await assertWriteAllowed(context, 'projects');
      const name = text(args.name, 100).replace(/[^a-zA-Z0-9\s\-_.]/g, '');
      const [client, department] = await Promise.all([
        args.client ? Client.findOne({ orgId: context.orgId, name: safeRegex(args.client) }).select('_id') : null,
        args.primaryDepartment ? Department.findOne({ orgId: context.orgId, name: safeRegex(args.primaryDepartment) }).select('_id') : null
      ]);
      const project = await Project.create({
        orgId: context.orgId, name, slug: await uniqueSlug(Project, context.orgId, name), description: text(args.description, 5000),
        projectType: args.projectType || 'general', priority: args.priority || 'medium', status: args.status || 'planning',
        clientId: client?._id, primaryDepartmentId: department?._id, departments: department ? [department._id] : [],
        budget: { total: Math.max(0, Number(args.budgetTotal) || 0), currency: text(args.budgetCurrency, 3) || 'USD', spent: 0, remaining: Math.max(0, Number(args.budgetTotal) || 0) },
        timeline: { startDate: args.startDate || undefined, endDate: args.endDate || undefined, estimatedHours: Math.max(0, Number(args.estimatedHours) || 0) || undefined },
        tags: (args.tags || []).map((tag) => text(tag, 50)).filter(Boolean).slice(0, 20), createdBy: context.user._id
      });
      return { _id: project._id, name: project.name, slug: project.slug, status: project.status, url: `/${context.tenantSlug}/org/projects/${project.slug}` };
    }
  },
  {
    name: 'update_project',
    description: 'Prepare an update to an existing project status, priority, description, dates, hours, or budget. Requires approval.',
    risk: 'write', roles: PROJECT_WRITE_ROLES,
    parameters: { type: 'object', properties: { project: { type: 'string' }, status: { type: 'string', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'] }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }, description: { type: 'string' }, endDate: { type: 'string' }, estimatedHours: { type: 'integer' }, budgetTotal: { type: 'number' } }, required: ['project'] },
    summarize: (args) => `Update project “${text(args.project, 150)}” with the supplied fields.`,
    execute: async (args, context) => {
      await assertWriteAllowed(context);
      const reference = args.project;
      const project = await Project.findOne({ orgId: context.orgId, ...(await projectScope(context)), ...(isId(reference) ? { _id: reference } : { $or: [{ slug: text(reference, 150).toLowerCase() }, { name: safeRegex(reference) }] }) });
      if (!project) throw new Error('Project not found');
      ['status', 'priority'].forEach((field) => { if (args[field] !== undefined) project[field] = args[field]; });
      if (args.description !== undefined) project.description = text(args.description, 5000);
      if (args.endDate !== undefined) project.timeline.endDate = args.endDate || undefined;
      if (args.estimatedHours !== undefined) project.timeline.estimatedHours = Math.max(0, Number(args.estimatedHours) || 0);
      if (args.budgetTotal !== undefined) { project.budget.total = Math.max(0, Number(args.budgetTotal) || 0); project.budget.remaining = Math.max(0, project.budget.total - (project.budget.spent || 0)); }
      await project.save();
      return { _id: project._id, name: project.name, status: project.status, priority: project.priority, url: `/${context.tenantSlug}/org/projects/${project.slug}` };
    }
  },
  {
    name: 'create_task',
    description: 'Prepare creation of a task inside a project. Requires user approval.',
    risk: 'write', roles: PROJECT_WRITE_ROLES,
    parameters: { type: 'object', properties: { project: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, status: { type: 'string', enum: ['todo', 'in_progress', 'under_review'] }, dueDate: { type: 'string' }, estimatedHours: { type: 'number' }, assigneeEmail: { type: 'string' }, checklistItems: { type: 'array', items: { type: 'string' }, description: 'Action items extracted from the conversation' } }, required: ['project', 'title'] },
    validate: (args) => text(args.title, 255).length >= 2,
    summarize: (args) => `Create task “${text(args.title, 255)}” in project “${text(args.project, 150)}”.`,
    execute: async (args, context) => {
      await assertWriteAllowed(context);
      const reference = args.project;
      const project = await Project.findOne({ orgId: context.orgId, ...(await projectScope(context)), ...(isId(reference) ? { _id: reference } : { $or: [{ slug: text(reference, 150).toLowerCase() }, { name: safeRegex(reference) }] }) });
      if (!project) throw new Error('Project not found');
      const assignee = args.assigneeEmail ? await User.findOne({ orgId: context.orgId, email: text(args.assigneeEmail, 254).toLowerCase() }).select('_id') : null;
      const task = await Task.create({ orgId: context.orgId, tenantId: context.tenantId, projectId: project._id, title: text(args.title, 255), description: text(args.description, 5000), priority: args.priority || 'medium', status: args.status || 'todo', dueDate: args.dueDate || undefined, estimatedHours: Math.max(0, Number(args.estimatedHours) || 0) || undefined, assignee: assignee?._id, reporter: context.user._id, subtasks: (args.checklistItems || []).map((item) => ({ title: text(item, 255), completed: false })).filter((item) => item.title).slice(0, 20) });
      return { _id: task._id, title: task.title, project: project.name, status: task.status, checklistItems: task.subtasks.length, url: `/${context.tenantSlug}/org/projects/${project.slug}/board` };
    }
  },
  {
    name: 'create_tasks',
    description: 'Prepare creation of 2 to 15 tasks inside one project as a single batch. Use this instead of repeated create_task calls when the user requests multiple tasks. The complete batch requires one user approval before execution.',
    risk: 'write', roles: PROJECT_WRITE_ROLES,
    parameters: {
      type: 'object',
      properties: {
        project: { type: 'string' },
        tasks: {
          type: 'array', minItems: 2, maxItems: 15,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              status: { type: 'string', enum: ['todo', 'in_progress', 'under_review'] },
              dueDate: { type: 'string' },
              estimatedHours: { type: 'number' },
              assigneeEmail: { type: 'string' },
              checklistItems: { type: 'array', items: { type: 'string' }, description: 'Action items extracted from the conversation' }
            },
            required: ['title']
          }
        }
      },
      required: ['project', 'tasks']
    },
    validate: (args) => {
      if (!text(args.project, 150) || !Array.isArray(args.tasks) || args.tasks.length < 2 || args.tasks.length > 15) return false;
      return args.tasks.every((task) => task && text(task.title, 255).length >= 2);
    },
    summarize: (args) => `Create ${args.tasks.length} tasks in project “${text(args.project, 150)}” as one batch.`,
    execute: async (args, context) => {
      await assertWriteAllowed(context);
      const reference = args.project;
      const project = await Project.findOne({ orgId: context.orgId, ...(await projectScope(context)), ...(isId(reference) ? { _id: reference } : { $or: [{ slug: text(reference, 150).toLowerCase() }, { name: safeRegex(reference) }] }) });
      if (!project) throw new Error('Project not found');

      const requestedEmails = [...new Set(args.tasks.map((task) => text(task.assigneeEmail, 254).toLowerCase()).filter(Boolean))];
      const assignees = requestedEmails.length
        ? await User.find({ orgId: context.orgId, email: { $in: requestedEmails } }).select('_id email').lean()
        : [];
      const assigneeByEmail = new Map(assignees.map((assignee) => [String(assignee.email).toLowerCase(), assignee._id]));
      const missingEmails = requestedEmails.filter((email) => !assigneeByEmail.has(email));
      if (missingEmails.length) throw new Error(`Assignee not found: ${missingEmails.join(', ')}`);

      const taskDocuments = args.tasks.map((task) => {
        const assigneeEmail = text(task.assigneeEmail, 254).toLowerCase();
        return {
          orgId: context.orgId,
          tenantId: context.tenantId,
          projectId: project._id,
          title: text(task.title, 255),
          description: text(task.description, 5000),
          priority: task.priority || 'medium',
          status: task.status || 'todo',
          dueDate: task.dueDate || undefined,
          estimatedHours: Math.max(0, Number(task.estimatedHours) || 0) || undefined,
          assignee: assigneeEmail ? assigneeByEmail.get(assigneeEmail) : undefined,
          reporter: context.user._id,
          subtasks: (task.checklistItems || []).map((item) => ({ title: text(item, 255), completed: false })).filter((item) => item.title).slice(0, 20)
        };
      });
      const tasks = await Task.insertMany(taskDocuments);
      return {
        createdCount: tasks.length,
        project: project.name,
        tasks: tasks.map((task) => ({ _id: task._id, title: task.title, status: task.status })),
        url: `/${context.tenantSlug}/org/projects/${project.slug}/board`
      };
    }
  },
  {
    name: 'update_task',
    description: 'Prepare an update to a task status, priority, due date, estimate, description, or assignee. Requires approval.',
    risk: 'write', roles: PROJECT_WRITE_ROLES,
    parameters: { type: 'object', properties: { taskId: { type: 'string' }, status: { type: 'string', enum: ['todo', 'in_progress', 'under_review', 'completed', 'cancelled'] }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, description: { type: 'string' }, dueDate: { type: 'string' }, estimatedHours: { type: 'number' }, assigneeEmail: { type: 'string' } }, required: ['taskId'] },
    summarize: (args) => `Update task ${text(args.taskId, 100)} with the supplied fields.`,
    execute: async (args, context) => {
      await assertWriteAllowed(context);
      if (!isId(args.taskId)) throw new Error('A valid task ID is required');
      const task = await Task.findOne({ _id: args.taskId, orgId: context.orgId });
      if (!task) throw new Error('Task not found');
      const accessibleProject = await Project.exists({ _id: task.projectId, orgId: context.orgId, ...(await projectScope(context)) });
      if (!accessibleProject) throw new Error('Task not found');
      ['status', 'priority'].forEach((field) => { if (args[field] !== undefined) task[field] = args[field]; });
      if (args.description !== undefined) task.description = text(args.description, 5000);
      if (args.dueDate !== undefined) task.dueDate = args.dueDate || undefined;
      if (args.estimatedHours !== undefined) task.estimatedHours = Math.max(0, Number(args.estimatedHours) || 0);
      if (args.assigneeEmail !== undefined) {
        const assignee = await User.findOne({ orgId: context.orgId, email: text(args.assigneeEmail, 254).toLowerCase() }).select('_id');
        if (!assignee) throw new Error('Assignee not found');
        task.assignee = assignee._id;
      }
      if (args.status === 'completed') task.completedDate = new Date();
      await task.save();
      return { _id: task._id, title: task.title, status: task.status, priority: task.priority };
    }
  }
  ,
  {
    name: 'create_client',
    description: 'Prepare creation of a client record with optional contact information. Requires approval.',
    risk: 'write', roles: PROJECT_WRITE_ROLES,
    parameters: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string', enum: ['company', 'individual'] }, status: { type: 'string', enum: ['active', 'inactive', 'prospect'] }, contactName: { type: 'string' }, contactEmail: { type: 'string' }, contactPhone: { type: 'string' }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['name'] },
    validate: (args) => text(args.name, 100).length >= 2,
    summarize: (args) => `Create client “${text(args.name, 100)}”.`,
    execute: async (args, context) => {
      await assertWriteAllowed(context, 'clientAccounts');
      const name = text(args.name, 100);
      const client = await Client.create({
        orgId: context.orgId, name, slug: await uniqueSlug(Client, context.orgId, name),
        type: args.type || 'company', status: args.status || 'active', notes: text(args.notes, 5000),
        contact: { primary: { name: text(args.contactName, 100), email: text(args.contactEmail, 254).toLowerCase(), phone: text(args.contactPhone, 50) } },
        tags: (args.tags || []).map((tag) => text(tag, 50)).filter(Boolean).slice(0, 20)
      });
      return { _id: client._id, name: client.name, status: client.status, url: `/${context.tenantSlug}/org/clients` };
    }
  }
];

class AgentToolRegistry {
  toolsFor(context) {
    const currentRole = role(context);
    return definitions.filter((tool) => (!tool.roles || tool.roles.has(currentRole)) && (!tool.denyRoles || !tool.denyRoles.has(currentRole)));
  }

  declarations(context) {
    return this.toolsFor(context).map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.parameters }));
  }

  get(name, context) {
    return this.toolsFor(context).find((tool) => tool.name === name);
  }

  async run(name, args, context, { approved = false } = {}) {
    const tool = this.get(name, context);
    if (!tool) throw new Error('Tool is unavailable for this user');
    if (tool.validate && !tool.validate(args || {})) throw new Error('Tool arguments are incomplete or invalid');
    if (tool.risk === 'write' && !approved) {
      return { approvalRequired: true, summary: tool.summarize ? tool.summarize(args || {}) : `Run ${name}`, toolName: name, arguments: args || {} };
    }
    return { approvalRequired: false, data: await tool.execute(args || {}, context) };
  }
}

module.exports = new AgentToolRegistry();
module.exports.AgentToolRegistry = AgentToolRegistry;
