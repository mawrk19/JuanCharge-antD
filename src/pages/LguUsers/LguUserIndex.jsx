import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Input, Space, Card, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getLguUsers, createLguUser, updateLguUser, deleteLguUser } from './lguUser.api';
import LguUserModal from './LguUserModal';
import { getStoredRole, USER_KEY } from '../../services/authStorage';

const LguUserIndex = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const currentRole = getStoredRole();
  const isLguAdmin = currentRole === 'lgu_admin';
  const isSuperAdmin = currentRole === 'super_admin';

  const currentUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem(USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, []);

  const { data: lguList = [] } = useQuery({
    queryKey: ['lgus-for-modal'],
    queryFn: async () => {
      const res = await getLguUsers();
      return res.data?.data || res.data || [];
    },
    select: (data) => {
      const allUsers = Array.isArray(data) ? data : data?.data || [];
      const map = new Map();
      allUsers.forEach((user) => {
        if (user?.lgu?.id && user?.lgu?.name) {
          map.set(user.lgu.id, user.lgu);
        }
      });
      return Array.from(map.values());
    },
  });

  const currentUserLguId = useMemo(() => {
    if (isLguAdmin && currentUser?.lgu_id) {
      return currentUser.lgu_id;
    }
    return null;
  }, [currentUser, isLguAdmin]);

  const currentUserLguName = useMemo(() => {
    if (!currentUserLguId) return null;
    return lguList.find((lgu) => lgu.id === currentUserLguId)?.name;
  }, [currentUserLguId, lguList]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['lgu-users'],
    queryFn: getLguUsers,
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const createUserMutation = useMutation({
    mutationFn: createLguUser,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateLguUser(id, payload),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteLguUser,
  });

  const submitLoading = createUserMutation.isPending || updateUserMutation.isPending;

  const handleAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setSelectedUser(record);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleDelete = async (id) => {
    try {
      await deleteUserMutation.mutateAsync(id);
      message.success('LGU user deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['lgu-users'] });
    } catch (err) {
      console.error(err);
      message.error('Failed to delete LGU user');
    }
  };

  const handleModalSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        ...(isLguAdmin && currentUserLguId ? { lgu_id: currentUserLguId } : {}),
      };

      if (selectedUser?.id) {
        await updateUserMutation.mutateAsync({ id: selectedUser.id, payload });
        message.success('LGU user updated successfully');
      } else {
        await createUserMutation.mutateAsync(payload);
        message.success('LGU user created successfully');
      }

      setIsModalOpen(false);
      setSelectedUser(null);
      await queryClient.invalidateQueries({ queryKey: ['lgu-users'] });
    } catch (err) {
      console.error(err);
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        // Show each validation message (e.g. "email: The email has already been taken.")
        Object.values(apiErrors).flat().forEach((msg) => message.error(msg));
      } else {
        const fallback = err.response?.data?.message;
        message.error(fallback || (selectedUser?.id ? 'Failed to update LGU user' : 'Failed to create LGU user'));
      }
      throw err;
    }
  };

  const columns = [
    { 
      title: 'NAME', 
      dataIndex: 'name', 
      key: 'name',
      render: (text, record) => <span className="font-semibold text-green-700">{text || `${record.first_name} ${record.last_name}`}</span> 
    },
    { title: 'EMAIL ADDRESS', dataIndex: 'email', key: 'email' },
    {
      title: 'LGU',
      dataIndex: 'lgu',
      key: 'lgu',
      render: (lgu) => lgu && lgu.name ? lgu.name : <span className="text-gray-400">None</span>
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'active') color = 'green';
        if (status === 'inactive') color = 'red';
        
        return (
          <Tag color={color} className="uppercase">
            {status || 'UNKNOWN'}
          </Tag>
        );
      }
    },
    {
      title: 'JOINED DATE',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined className="text-blue-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete LGU user"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined className="text-red-500" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">LGU User Management</h1>
          <p className="text-gray-500">Manage LGU users, roles, and permissions</p>
        </div>
        <div className="flex w-full md:w-auto gap-2 flex-col sm:flex-row">
          <Input prefix={<SearchOutlined />} placeholder="Search users..." className="w-full sm:w-64" />
          <Button type="primary" icon={<PlusOutlined />} className="bg-green-600" onClick={handleAdd}>Add User</Button>
        </div>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={data} 
          loading={isLoading || deleteUserMutation.isPending} 
          rowKey="id" 
          pagination={{
            defaultPageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
          }}
          scroll={{ x: 960 }}
        />
      </Card>

      <LguUserModal
        open={isModalOpen}
        onCancel={handleCancel}
        onSubmit={handleModalSubmit}
        loading={submitLoading}
        mode={selectedUser ? 'edit' : 'create'}
        initialValues={selectedUser}
        currentUserRole={currentRole}
        currentUserLguId={currentUserLguId}
        currentUserLguName={currentUserLguName}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};

export default LguUserIndex;