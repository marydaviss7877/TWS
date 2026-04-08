import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { Text } = Typography;
const { Search } = Input;

const TenantManagement = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/supra-admin/tenants?limit=100', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Tenants API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Tenants API Response:', {
        tenantsCount: data.tenants?.length || 0,
        total: data.pagination?.total || 0,
        summary: data.summary
      });
      
      setTenants(data.tenants || []);
    } catch (e) {
      console.error('Fetch tenants error:', e);
      message.error(e.message || 'Failed to fetch tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (!tenants.length) {
      setFilteredTenants([]);
      return;
    }
    let f = [...tenants];
    const q = (searchText || '').toLowerCase();
    if (q) {
      f = f.filter((t) => {
        const name = (t.name || '').toLowerCase();
        const email = (t.email || t.contactInfo?.email || '').toLowerCase();
        const slug = (t.slug || '').toLowerCase();
        return name.includes(q) || email.includes(q) || slug.includes(q);
      });
    }
    if (statusFilter !== 'all') f = f.filter((t) => t.status === statusFilter);
    if (planFilter !== 'all') {
      f = f.filter((t) => {
        const p = (t.plan || t.subscription?.plan || '').toLowerCase();
        return p === planFilter.toLowerCase();
      });
    }
    if (categoryFilter !== 'all') f = f.filter((t) => (t.erpCategory || 'software_house') === categoryFilter);
    setFilteredTenants(f);
  }, [tenants, searchText, statusFilter, planFilter, categoryFilter]);

  const handleEditTenant = async (values) => {
    if (!selectedTenant?._id) return;
    try {
      const res = await fetch(`/api/supra-admin/tenants/${selectedTenant._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, slug: values.slug, email: values.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setTenants((prev) => prev.map((t) => (t._id === selectedTenant._id ? { ...t, ...data } : t)));
      setFilteredTenants((prev) => prev.map((t) => (t._id === selectedTenant._id ? { ...t, ...data } : t)));
      setEditModalVisible(false);
      setSelectedTenant(null);
      message.success('Tenant updated');
    } catch (e) {
      message.error(e.message || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (id) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/supra-admin/tenants/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setTenants((prev) => prev.filter((t) => t._id !== id));
      setFilteredTenants((prev) => prev.filter((t) => t._id !== id));
      setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
      message.success('Tenant deleted');
    } catch (e) {
      message.error(e.message || 'Failed to delete tenant');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      setBulkDeleting(true);
      const res = await fetch('/api/supra-admin/tenants/bulk', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRowKeys }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const { deleted = [], failed = [] } = data.data || {};
      setTenants((prev) => prev.filter((t) => !deleted.includes(t._id)));
      setFilteredTenants((prev) => prev.filter((t) => !deleted.includes(t._id)));
      setSelectedRowKeys([]);
      await fetchTenants();
      if (failed.length > 0) {
        message.warning(`${deleted.length} deleted, ${failed.length} failed.`);
      } else {
        message.success(`${deleted.length} tenant(s) deleted.`);
      }
    } catch (e) {
      message.error(e.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/supra-admin/tenants/${id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setTenants((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
      setFilteredTenants((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
      message.success('Status updated');
    } catch (e) {
      message.error(e.message || 'Failed to update status');
    }
  };

  const planColors = { trial: 'orange', basic: 'blue', professional: 'green', enterprise: 'purple' };

  const columns = [
    {
      title: 'Tenant',
      dataIndex: 'name',
      key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name || 'N/A'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{r.email || r.contactInfo?.email || 'N/A'}</div>
          <div style={{ fontSize: 11, color: '#999' }}>/{r.slug || 'N/A'}</div>
        </div>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (_, r) => {
        if (r.erpCategory !== 'software_house') return <Text type="secondary">N/A</Text>;
        const p = (r.plan || r.subscription?.plan || 'Trial').toString();
        return <Tag color={planColors[p.toLowerCase()] || 'default'}>{p}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, r) => (
        <Select
          value={status}
          size="small"
          style={{ width: 110 }}
          onChange={(v) => handleStatusChange(r._id, v)}
        >
          <Option value="active">Active</Option>
          <Option value="trialing">Trial</Option>
          <Option value="suspended">Suspended</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
      ),
    },
    {
      title: 'Users',
      key: 'users',
      render: (_, r) => {
        const a = r.usage?.activeUsers ?? r.users;
        const t = r.usage?.totalUsers ?? r.users;
        if (a == null && t == null) return '—';
        return `${a ?? '—'} / ${t ?? '—'}`;
      },
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (v, r) => {
        const n = v ?? r.subscription?.revenue ?? 0;
        return <Text strong={n > 0} style={{ color: n > 0 ? '#52c41a' : '#999' }}>${Number(n).toLocaleString()}</Text>;
      },
      sorter: (a, b) => (a.revenue ?? a.subscription?.revenue ?? 0) - (b.revenue ?? b.subscription?.revenue ?? 0),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => (d ? moment(d).format('MMM DD, YYYY') : 'N/A'),
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="View">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedTenant(r); setViewModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setSelectedTenant(r); setEditModalVisible(true); }} />
          </Tooltip>
          <Popconfirm
            title="Permanently delete this tenant and all associated data? This cannot be undone."
            onConfirm={() => handleDeleteTenant(r._id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading: deletingId === r._id }}
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deletingId === r._id} disabled={!!deletingId} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const bulkExtra =
    selectedRowKeys.length > 0 ? (
      <Space>
        <Text type="secondary">{selectedRowKeys.length} selected</Text>
        <Button size="small" onClick={() => setSelectedRowKeys([])} disabled={bulkDeleting}>Clear</Button>
        <Popconfirm
          title={`Permanently delete ${selectedRowKeys.length} tenant(s) and all their data? This cannot be undone.`}
          onConfirm={handleBulkDelete}
          okText="Delete all"
          cancelText="Cancel"
          okButtonProps={{ danger: true, loading: bulkDeleting }}
        >
          <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDeleting} disabled={bulkDeleting}>Bulk delete</Button>
        </Popconfirm>
      </Space>
    ) : null;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Tenants"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTenants} loading={loading}>Refresh</Button>
            {bulkExtra}
          </Space>
        }
        styles={{ body: { paddingTop: 16 } }}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Search
            placeholder="Search name, email, slug"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}>
            <Option value="all">All status</Option>
            <Option value="active">Active</Option>
            <Option value="trialing">Trial</Option>
            <Option value="suspended">Suspended</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
          <Select value={planFilter} onChange={setPlanFilter} style={{ width: 130 }}>
            <Option value="all">All plans</Option>
            <Option value="trial">Trial</Option>
            <Option value="basic">Basic</Option>
            <Option value="professional">Professional</Option>
            <Option value="enterprise">Enterprise</Option>
          </Select>
          <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 150 }}>
            <Option value="all">All categories</Option>
            <Option value="software_house">Software house</Option>
            <Option value="business">Business</Option>
            <Option value="warehouse">Warehouse</Option>
          </Select>
          <Text type="secondary">{filteredTenants.length} of {tenants.length}</Text>
        </Space>

        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (k) => setSelectedRowKeys(k || []),
            selections: [
              { key: 'all', text: 'Select all on page', onSelect: (pk) => setSelectedRowKeys((p) => [...new Set([...p, ...(pk || [])])]) },
              { key: 'invert', text: 'Invert on page', onSelect: (pk) => setSelectedRowKeys((p) => { const s = new Set(p); (pk || []).forEach((k) => (s.has(k) ? s.delete(k) : s.add(k))); return [...s]; }) },
              { key: 'none', text: 'Clear', onSelect: () => setSelectedRowKeys([]) },
            ],
            getCheckboxProps: () => ({ disabled: !!deletingId || !!bulkDeleting }),
          }}
          columns={columns}
          dataSource={filteredTenants}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t, [a, b]) => `${a}-${b} of ${t}` }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={`Edit: ${selectedTenant?.name}`}
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setSelectedTenant(null); }}
        footer={null}
        destroyOnClose
      >
        {selectedTenant && (
          <Form
            key={selectedTenant._id}
            layout="vertical"
            initialValues={{
              name: selectedTenant.name,
              slug: selectedTenant.slug,
              email: selectedTenant.email || selectedTenant.contactInfo?.email || '',
            }}
            onFinish={handleEditTenant}
          >
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="slug" label="Slug (immutable)" rules={[{ required: true }]}>
              <Input disabled title="Slug cannot be changed after creation (FR2)" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">Save</Button>
                <Button onClick={() => { setEditModalVisible(false); setSelectedTenant(null); }}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title={`${selectedTenant?.name}`}
        open={viewModalVisible && !!selectedTenant}
        onCancel={() => { setViewModalVisible(false); setSelectedTenant(null); }}
        footer={null}
        width={420}
      >
        {selectedTenant && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Text strong>Slug:</Text> {selectedTenant.slug || '—'}</div>
            <div><Text strong>Email:</Text> {selectedTenant.email || selectedTenant.contactInfo?.email || '—'}</div>
            <div><Text strong>Category:</Text> {(selectedTenant.erpCategory || 'software_house').replace(/_/g, ' ')}</div>
            <div><Text strong>Plan:</Text> {selectedTenant.erpCategory !== 'software_house' ? <Text type="secondary">N/A (non–Software House)</Text> : <Tag color={planColors[(selectedTenant.plan || selectedTenant.subscription?.plan || '').toLowerCase()] || 'default'}>{selectedTenant.plan || selectedTenant.subscription?.plan || '—'}</Tag>}</div>
            <div><Text strong>Status:</Text> {selectedTenant.status || '—'}</div>
            <div><Text strong>Created:</Text> {selectedTenant.createdAt ? moment(selectedTenant.createdAt).format('MMM DD, YYYY') : '—'}</div>
            <div><Text strong>Users:</Text> {selectedTenant.usage?.totalUsers ?? selectedTenant.users ?? '—'}</div>
            <div><Text strong>Revenue:</Text> ${Number(selectedTenant.revenue ?? selectedTenant.subscription?.revenue ?? 0).toLocaleString()}</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TenantManagement;
