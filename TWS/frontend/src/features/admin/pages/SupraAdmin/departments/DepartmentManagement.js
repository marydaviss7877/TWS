import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Tooltip,
  Badge,
  Avatar,
  Dropdown,
  Menu,
  Tabs,
  Tree,
  Switch,
  InputNumber,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  ApartmentOutlined,
  LockOutlined,
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { get, post, put, del } from '../../../../../shared/utils/apiClient';
import '../styles/DepartmentManagement.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeTab, setActiveTab] = useState('departments');
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [users, setUsers] = useState([]);

  const [permissions] = useState([
    { value: 'read', label: 'Read Only', color: 'blue' },
    { value: 'write', label: 'Read & Write', color: 'orange' },
    { value: 'admin', label: 'Full Admin', color: 'red' }
  ]);

  const [statusOptions] = useState([
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'red' },
    { value: 'pending', label: 'Pending', color: 'orange' }
  ]);

  // Fetch departments from API
  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await get('/api/supra-admin/departments');
      if (response.success && response.data) {
        // Transform API data to match component structure
        const transformedDepartments = response.data.map(dept => ({
          id: dept._id || dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description || '',
          parentId: dept.parentId || dept.parentDepartment || null,
          level: dept.level || 0,
          manager: dept.departmentHead ? {
            id: dept.departmentHead._id || dept.departmentHead.id,
            name: dept.departmentHead.fullName || dept.departmentHead.name,
            email: dept.departmentHead.email,
            role: dept.departmentHead.role
          } : null,
          budget: dept.budget || dept.metadata?.budget || 0,
          employees: dept.employees || dept.employeeCount || dept.stats?.totalUsers || 0,
          status: dept.status || 'active',
          createdDate: dept.createdAt || dept.createdDate,
          lastModified: dept.updatedAt || dept.lastModified,
          permissions: Array.isArray(dept.permissions) ? dept.permissions : (Array.isArray(dept.defaultPermissions) ? dept.defaultPermissions : ['read']),
          location: dept.location || dept.metadata?.location || '',
          contact: dept.contact || dept.metadata?.contact || '',
          color: dept.color || '#1890ff',
          children: Array.isArray(dept.children) ? dept.children : []
        }));
        setDepartments(transformedDepartments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      message.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await get('/api/supra-admin/users');
      if (response.success && response.data) {
        const transformedUsers = (response.data.users || response.data || []).map(user => ({
          id: user._id || user.id,
          name: user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          role: user.role || 'User'
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show error for users, just use empty array
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'red';
      case 'pending': return 'orange';
      default: return 'default';
    }
  };

  const getPermissionColor = (permission) => {
    const perm = permissions.find(p => p.value === permission);
    return perm ? perm.color : 'default';
  };

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditDepartment = (record) => {
    setEditingDepartment(record);
    form.setFieldsValue({
      ...record,
      managerId: record.manager?.id,
      parentId: record.parentId || undefined
    });
    setModalVisible(true);
  };

  const handleDeleteDepartment = async (id) => {
    try {
      setLoading(true);
      await del(`/api/supra-admin/departments/${id}`);
      message.success('Department deleted successfully!');
      await fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      message.error('Failed to delete department');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await Promise.all(selectedRowKeys.map(id => del(`/api/supra-admin/departments/${id}`)));
      message.success(`${selectedRowKeys.length} departments deleted successfully!`);
      setSelectedRowKeys([]);
      await fetchDepartments();
    } catch (error) {
      console.error('Error deleting departments:', error);
      message.error('Failed to delete departments');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const departmentData = {
        name: values.name,
        code: values.code,
        description: values.description,
        managerId: values.managerId,
        parentId: values.parentId || null,
        budget: values.budget || 0,
        location: values.location || '',
        contact: values.contact || '',
        status: values.status || 'active',
        permissions: values.permissions || ['read'],
        color: values.color || '#1890ff'
      };

      if (editingDepartment) {
        // Update existing department
        await put(`/api/supra-admin/departments/${editingDepartment.id}`, departmentData);
        message.success('Department updated successfully!');
      } else {
        // Add new department
        await post('/api/supra-admin/departments', departmentData);
        message.success('Department created successfully!');
      }

      setModalVisible(false);
      await fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      message.error(error.message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDepartments = () => {
    let filtered = departments;

    if (searchText) {
      filtered = filtered.filter(dept =>
        dept.name.toLowerCase().includes(searchText.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchText.toLowerCase()) ||
        dept.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(dept => dept.status === filterStatus);
    }

    return filtered;
  };

  const getTotalStats = () => {
    const totalDepartments = departments.length;
    const totalEmployees = departments.reduce((sum, dept) => sum + dept.employees, 0);
    const totalBudget = departments.reduce((sum, dept) => sum + dept.budget, 0);
    const activeDepartments = departments.filter(dept => dept.status === 'active').length;

    return { totalDepartments, totalEmployees, totalBudget, activeDepartments };
  };

  const handleExportDepartments = () => {
    try {
      const rows = getFilteredDepartments();
      const headers = ['Name', 'Code', 'Manager', 'Employees', 'Budget', 'Status', 'Location'];
      const csvRows = rows.map(dept => [
        dept.name || 'N/A',
        dept.code || 'N/A',
        dept.manager?.name || dept.manager?.fullName || 'Not assigned',
        dept.employees || 0,
        (dept.budget || 0).toFixed(2),
        dept.status || 'N/A',
        dept.location || 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `departments-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Departments exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting departments:', error);
      message.error('Failed to export departments');
    }
  };

  const departmentMenu = (record) => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View Details'
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEditDepartment(record)
      },
      {
        key: 'permissions',
        icon: <LockOutlined />,
        label: 'Manage Permissions'
      },
      {
        key: 'employees',
        icon: <TeamOutlined />,
        label: 'View Employees'
      },
      {
        type: 'divider'
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: () => handleDeleteDepartment(record.id)
      }
    ]
  });

  const columns = [
    {
      title: 'Department',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <Avatar 
            size="small" 
            style={{ backgroundColor: record.color }}
            icon={<SettingOutlined />}
          />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.code}
            </Text>
          </div>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Manager',
      dataIndex: 'manager',
      key: 'manager',
      width: 150,
      render: (manager) => {
        if (!manager) {
          return <Text type="secondary">Not assigned</Text>;
        }
        return (
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            <div>
              <Text>{manager?.name || manager?.fullName || 'Unknown'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {manager?.email || ''}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Employees',
      dataIndex: 'employees',
      key: 'employees',
      width: 100,
      render: (count) => (
        <Badge count={count || 0} showZero color="#1890ff" />
      ),
      sorter: (a, b) => (a.employees || 0) - (b.employees || 0),
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      render: (amount) => (
        <Text>${(amount || 0).toLocaleString()}</Text>
      ),
      sorter: (a, b) => (a.budget || 0) - (b.budget || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: statusOptions.filter(opt => opt.value !== 'all').map(opt => ({
        text: opt.label,
        value: opt.value,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 150,
      render: (perms) => {
        const permissions = Array.isArray(perms) ? perms : ['read'];
        return (
          <Space wrap>
            {permissions.map(perm => (
              <Tag key={perm} color={getPermissionColor(perm)} size="small">
                {perm}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEditDepartment(record)}
            />
          </Tooltip>
          <Dropdown menu={departmentMenu(record)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  const stats = getTotalStats();
  const filteredDepartments = getFilteredDepartments();

  return (
    <div className="department-management">
      <div className="page-header">
        <Title level={2} className="page-title">
          <ApartmentOutlined /> Department Management
        </Title>
        <div className="header-actions">
          <Space>
            <Tooltip title="Bulk import isn't available yet">
              <Button icon={<ImportOutlined />} disabled>
                Import
              </Button>
            </Tooltip>
            <Button icon={<ExportOutlined />} onClick={handleExportDepartments}>
              Export
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddDepartment}
            >
              Add Department
            </Button>
          </Space>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Departments"
              value={stats.totalDepartments}
              prefix={<ApartmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={stats.totalEmployees}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Budget"
              value={stats.totalBudget}
              prefix={<DollarOutlined />}
              formatter={(value) => `$${value.toLocaleString()}`}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Departments"
              value={stats.activeDepartments}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'departments',
              label: 'Departments',
              children: (
                <>
                  {/* Filters and Search */}
                  <div className="table-filters">
                    <Row gutter={[16, 16]} align="middle">
                      <Col xs={24} sm={12} md={8}>
                        <Input
                          placeholder="Search departments..."
                          prefix={<SearchOutlined />}
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          allowClear
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4}>
                        <Select
                          value={filterStatus}
                          onChange={setFilterStatus}
                          style={{ width: '100%' }}
                        >
                          {statusOptions.map(option => (
                            <Option key={option.value} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col xs={24} sm={12} md={4}>
                        <Button icon={<ReloadOutlined />} onClick={fetchDepartments} loading={loading}>
                          Refresh
                        </Button>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Space>
                          {selectedRowKeys.length > 0 && (
                            <Popconfirm
                              title={`Are you sure you want to delete ${selectedRowKeys.length} departments?`}
                              onConfirm={handleBulkDelete}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button danger icon={<DeleteOutlined />}>
                                Delete Selected ({selectedRowKeys.length})
                              </Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  <Divider />

                  {/* Department Table */}
                  <Table
                    columns={columns}
                    dataSource={filteredDepartments}
                    rowKey="id"
                    loading={loading}
                    rowSelection={rowSelection}
                    pagination={{
                      total: filteredDepartments.length,
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `${range[0]}-${range[1]} of ${total} departments`,
                    }}
                    expandable={{
                      expandedRowKeys,
                      onExpandedRowsChange: setExpandedRowKeys,
                      childrenColumnName: 'children',
                      defaultExpandAllRows: false,
                    }}
                    scroll={{ x: 1200 }}
                  />
                </>
              )
            },
            {
              key: 'hierarchy',
              label: 'Hierarchy',
              children: (
                <div className="hierarchy-view">
                  <Tree
                    showLine
                    showIcon
                    defaultExpandAll
                    treeData={departments.map(dept => ({
                      title: (
                        <Space>
                          <Avatar size="small" style={{ backgroundColor: dept.color }}>
                            <SettingOutlined />
                          </Avatar>
                          <Text strong>{dept.name}</Text>
                          <Tag color={getStatusColor(dept.status)} size="small">
                            {dept.status}
                          </Tag>
                          <Badge count={dept.employees} showZero />
                        </Space>
                      ),
                      key: dept.id,
                      children: dept.children?.map(child => ({
                        title: (
                          <Space>
                            <Avatar size="small" style={{ backgroundColor: child.color }}>
                              <SettingOutlined />
                            </Avatar>
                            <Text>{child.name}</Text>
                            <Tag color={getStatusColor(child.status)} size="small">
                              {child.status}
                            </Tag>
                            <Badge count={child.employees} showZero />
                          </Space>
                        ),
                        key: child.id,
                      })),
                    }))}
                  />
                </div>
              )
            },
            {
              key: 'analytics',
              label: 'Analytics',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="Department Budget Distribution">
                      <div className="budget-chart">
                        {departments.map(dept => (
                          <div key={dept.id} className="budget-item">
                            <div className="budget-header">
                              <Text strong>{dept.name}</Text>
                              <Text>${dept.budget.toLocaleString()}</Text>
                            </div>
                            <Progress
                              percent={(dept.budget / stats.totalBudget) * 100}
                              strokeColor={dept.color}
                              showInfo={false}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="Employee Distribution">
                      <div className="employee-chart">
                        {departments.map(dept => (
                          <div key={dept.id} className="employee-item">
                            <div className="employee-header">
                              <Text strong>{dept.name}</Text>
                              <Badge count={dept.employees} showZero />
                            </div>
                            <Progress
                              percent={(dept.employees / stats.totalEmployees) * 100}
                              strokeColor={dept.color}
                              showInfo={false}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
              )
            }
          ]}
        />
      </Card>

      {/* Add/Edit Department Modal */}
      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add New Department'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
            permissions: ['read']
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Department Name"
                rules={[{ required: true, message: 'Please enter department name!' }]}
              >
                <Input placeholder="Enter department name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Department Code"
                rules={[{ required: true, message: 'Please enter department code!' }]}
              >
                <Input placeholder="Enter department code" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description!' }]}
          >
            <TextArea rows={3} placeholder="Enter department description" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="managerId"
                label="Manager"
                rules={[{ required: true, message: 'Please select manager!' }]}
              >
                <Select
                  placeholder="Select manager"
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {users.map(user => (
                    <Option key={user.id} value={user.id}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        {user.name} ({user.role})
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="parentId"
                label="Parent Department"
              >
                <Select
                  placeholder="Select parent department (optional)"
                  allowClear
                >
                  {departments.filter(dept => !dept.parentId).map(dept => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="budget"
                label="Budget"
                rules={[{ required: true, message: 'Please enter budget!' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter budget"
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: 'Please enter location!' }]}
              >
                <Input placeholder="Enter location" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="Contact"
                rules={[{ required: true, message: 'Please enter contact!' }]}
              >
                <Input placeholder="Enter contact information" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status!' }]}
              >
                <Select>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="pending">Pending</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="permissions"
            label="Permissions"
            rules={[{ required: true, message: 'Please select permissions!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select permissions"
            >
              {permissions.map(perm => (
                <Option key={perm.value} value={perm.value}>
                  <Tag color={perm.color}>{perm.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="color"
            label="Department Color"
            initialValue="#1890ff"
          >
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentManagement;
