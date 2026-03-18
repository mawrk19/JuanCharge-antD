import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Card, Tag, Button, Popconfirm, Space, Modal, Form, Select, message } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { deleteKioskUser, getKioskUsers, updateKioskUser } from './patron.api';

const roleLabelById = {
  1: 'Super Admin',
  2: 'LGU Admin',
  3: 'LGU Staff',
  4: 'Kiosk User',
};

const PatronIndex = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatron, setSelectedPatron] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
  });
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['kiosk-users', pagination.current, pagination.pageSize],
    queryFn: () => getKioskUsers({ page: pagination.current, perPage: pagination.pageSize }),
    keepPreviousData: true,
  });

  const updateKioskUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateKioskUser(id, payload),
  });

  const deleteKioskUserMutation = useMutation({
    mutationFn: deleteKioskUser,
  });

  const parsed = useMemo(() => {
    const payload = data?.data;

    if (Array.isArray(payload)) {
      return {
        rows: payload,
        meta: {
          current_page: pagination.current,
          per_page: pagination.pageSize,
          total: payload.length,
        },
      };
    }

    const rows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : [];

    const meta = payload?.meta || payload?.data?.meta || {};

    return {
      rows,
      meta: {
        current_page: meta.current_page || pagination.current,
        per_page: meta.per_page || pagination.pageSize,
        total: meta.total || rows.length,
      },
    };
  }, [data, pagination.current, pagination.pageSize]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return parsed.rows;

    return parsed.rows.filter((item) => {
      const fields = [
        item.role_id,
        item.name,
        item.first_name,
        item.last_name,
        item.email,
        item.phone_number,
        item.status,
      ];
      return fields.some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [parsed.rows, searchTerm]);

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const refreshList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['kiosk-users'] });
  };

  const handleEdit = (record) => {
    setSelectedPatron(record);
    form.setFieldsValue({
      first_name: record.first_name || '',
      last_name: record.last_name || '',
      email: record.email || '',
      phone_number: record.phone_number || '',
      status: record.status || 'active',
      role_id: record.role_id,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteKioskUserMutation.mutateAsync(id);
      message.success('Patron deleted successfully.');
      await refreshList();
    } catch (error) {
      console.error(error);
      message.error('Failed to delete patron.');
    }
  };

  const handleEditSave = async () => {
    if (!selectedPatron?.id) {
      return;
    }

    try {
      const values = await form.validateFields();
      await updateKioskUserMutation.mutateAsync({ id: selectedPatron.id, payload: values });
      message.success('Patron updated successfully.');
      setIsEditModalOpen(false);
      setSelectedPatron(null);
      form.resetFields();
      await refreshList();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(error);
      message.error('Failed to update patron.');
    }
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setSelectedPatron(null);
    form.resetFields();
  };

  const columns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-semibold text-green-700">{name || '-'}</span>,
    },
    {
      title: 'EMAIL',
      dataIndex: 'email',
      key: 'email',
      render: (value) => value || <span className="text-gray-400">-</span>,
    },
    {
      title: 'PHONE',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (value) => value || <span className="text-gray-400">-</span>,
    },
    {
      title: 'ROLE',
      dataIndex: 'role_id',
      key: 'role_id',
      align: 'center',
      render: (roleId) => roleLabelById[roleId] || `Role #${roleId}`,
    },
    {
      title: 'POINTS BALANCE',
      dataIndex: 'points_balance',
      key: 'points_balance',
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: 'POINTS TOTAL',
      dataIndex: 'points_total',
      key: 'points_total',
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: 'POINTS USED',
      dataIndex: 'points_used',
      key: 'points_used',
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'} className="uppercase">
          {status || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'CREATED',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => formatDateTime(value),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined className="text-blue-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Patron"
            description="Are you sure you want to delete this patron?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              icon={<DeleteOutlined className="text-red-500" />}
              loading={deleteKioskUserMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tablePagination = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: parsed.meta.total,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50', '100'],
    showTotal: (total) => `Total ${total} patrons`,
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Patron Management</h1>
          <p className="text-gray-500">Data source: GET /api/kiosk-users?per_page=5</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search patrons..."
            className="w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={isLoading || deleteKioskUserMutation.isPending}
          rowKey="id"
          pagination={tablePagination}
          onChange={(nextPagination) => {
            setPagination({
              current: nextPagination.current || 1,
              pageSize: nextPagination.pageSize || 5,
            });
          }}
          scroll={{ x: 1320 }}
        />
      </Card>

      <Modal
        title="Edit Patron"
        open={isEditModalOpen}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        confirmLoading={updateKioskUserMutation.isPending}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Please input first name.' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Please input last name.' }]}
            >
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input email.' },
              { type: 'email', message: 'Please enter a valid email.' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="phone_number" label="Phone Number">
            <Input />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="role_id" label="Role" rules={[{ required: true, message: 'Please select role.' }]}>
              <Select
                options={[
                  { value: 1, label: 'Super Admin' },
                  { value: 2, label: 'LGU Admin' },
                  { value: 3, label: 'LGU Staff' },
                  { value: 4, label: 'Kiosk User' },
                ]}
              />
            </Form.Item>

            <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select status.' }]}>
              <Select
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PatronIndex;