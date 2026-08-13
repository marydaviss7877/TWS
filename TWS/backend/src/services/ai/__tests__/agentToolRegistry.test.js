const toolRegistry = require('../agentToolRegistry');

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
      'list_clients', 'list_employees', 'create_project', 'create_task', 'create_client'
    ]));
  });

  test('a client receives no internal or mutation tools', () => {
    const names = toolRegistry.declarations(context('client')).map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['workspace_overview', 'search_workspace', 'list_projects', 'list_tasks']));
    expect(names).not.toEqual(expect.arrayContaining(['list_departments', 'list_employees', 'list_clients', 'create_project', 'create_task', 'create_client']));
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
});
