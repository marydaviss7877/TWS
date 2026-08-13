const toolRegistry = require('../agentToolRegistry');
const Project = require('../../../models/project-delivery/Project');
const Task = require('../../../models/project-delivery/Task');

const context = (role) => ({
  orgId: '64b000000000000000000001',
  tenantId: '64b000000000000000000002',
  tenantSlug: 'demo',
  user: { _id: '64b000000000000000000003', role }
});

describe('agent tool registry authorization and approvals', () => {
  test('an owner receives administrative read and write tools', () => {
    const names = toolRegistry.declarations(context('owner')).map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining([
      'workspace_overview', 'search_workspace', 'list_projects', 'list_tasks',
      'list_clients', 'list_employees', 'create_project', 'create_task', 'create_tasks', 'create_client'
    ]));
  });

  test('a client receives no internal or mutation tools', () => {
    const names = toolRegistry.declarations(context('client')).map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['workspace_overview', 'search_workspace', 'list_projects', 'list_tasks']));
    expect(names).not.toEqual(expect.arrayContaining(['list_departments', 'list_employees', 'list_clients', 'create_project', 'create_task', 'create_tasks', 'create_client']));
  });

  test('a write call becomes a proposal until explicitly approved', async () => {
    const result = await toolRegistry.run('create_project', {
      name: 'Customer Portal',
      description: 'Build a secure customer portal with project status and document access.'
    }, context('owner'));

    expect(result.approvalRequired).toBe(true);
    expect(result.toolName).toBe('create_project');
    expect(result.summary).toContain('Customer Portal');
  });

  test('unavailable tools cannot be invoked by changing the model output', async () => {
    await expect(toolRegistry.run('create_client', { name: 'Hidden Client' }, context('employee')))
      .rejects.toThrow('Tool is unavailable for this user');
  });

  test('multiple tasks become one bounded approval proposal', async () => {
    const tasks = [
      { title: 'Define sitemap', priority: 'high' },
      { title: 'Draft content outline', estimatedHours: 10 }
    ];
    const result = await toolRegistry.run('create_tasks', {
      project: 'Website Redesign Service',
      tasks
    }, context('owner'));

    expect(result.approvalRequired).toBe(true);
    expect(result.toolName).toBe('create_tasks');
    expect(result.arguments.tasks).toEqual(tasks);
    expect(result.summary).toContain('Create 2 tasks');
  });

  test('bulk task proposals reject batches outside the 2 to 15 task boundary', async () => {
    await expect(toolRegistry.run('create_tasks', {
      project: 'Website Redesign Service',
      tasks: [{ title: 'Only one task' }]
    }, context('owner'))).rejects.toThrow('Tool arguments are incomplete or invalid');

    await expect(toolRegistry.run('create_tasks', {
      project: 'Website Redesign Service',
      tasks: Array.from({ length: 16 }, (_, index) => ({ title: `Task ${index + 1}` }))
    }, context('owner'))).rejects.toThrow('Tool arguments are incomplete or invalid');
  });

  test('one approved bulk action creates the full task batch', async () => {
    const projectId = '64b000000000000000000010';
    jest.spyOn(Project, 'findOne').mockResolvedValue({ _id: projectId, name: 'Website Redesign Service', slug: 'website-redesign-service' });
    const insertMany = jest.spyOn(Task, 'insertMany').mockImplementation((documents) => Promise.resolve(documents.map((document, index) => ({
      ...document,
      _id: `64b00000000000000000001${index}`
    }))));

    const executionContext = { ...context('owner'), tenantId: null };
    const result = await toolRegistry.run('create_tasks', {
      project: 'Website Redesign Service',
      tasks: [{ title: 'Define sitemap' }, { title: 'Draft content outline' }]
    }, executionContext, { approved: true });

    expect(result.approvalRequired).toBe(false);
    expect(insertMany).toHaveBeenCalledTimes(1);
    expect(insertMany.mock.calls[0][0]).toHaveLength(2);
    expect(result.data.createdCount).toBe(2);
    expect(result.data.tasks.map((task) => task.title)).toEqual(['Define sitemap', 'Draft content outline']);
  });
});
