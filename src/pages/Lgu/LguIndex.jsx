import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Input, Space, Card, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getLgus, createLgu, updateLgu, deleteLgu } from './lgu.api';
import LguModal from './LguModal';

const LguIndex = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLgu, setSelectedLgu] = useState(null);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['lgus'],
    queryFn: getLgus,
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const createLguMutation = useMutation({ mutationFn: createLgu });
  const updateLguMutation = useMutation({ mutationFn: ({ id, payload }) => updateLgu(id, payload) });
  const deleteLguMutation = useMutation({ mutationFn: deleteLgu });
  const submitLoading = createLguMutation.isPending || updateLguMutation.isPending;

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data;

    return data.filter((item) => {
      const fields = [
        item.name,
        item.region,
        item.province,
        item.city_municipality,
        item.barangay,
        item.contact_person,
        item.contact_email,
      ];
      return fields.some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [data, searchTerm]);

  const handleAdd = () => {
    setSelectedLgu(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setSelectedLgu(record);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedLgu(null);
  };

  const handleDelete = async (id) => {
    try {
      await deleteLguMutation.mutateAsync(id);
      message.success('LGU deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['lgus'] });
    } catch (err) {
      console.error(err);
      message.error('Failed to delete LGU');
    }
  };

  const handleModalSubmit = async (values) => {
    try {
      if (selectedLgu?.id) {
        await updateLguMutation.mutateAsync({ id: selectedLgu.id, payload: values });
        message.success('LGU updated successfully');
      } else {
        await createLguMutation.mutateAsync(values);
        message.success('LGU created successfully');
      }

      setIsModalOpen(false);
      setSelectedLgu(null);
      await queryClient.invalidateQueries({ queryKey: ['lgus'] });
    } catch (err) {
      console.error(err);
      message.error(selectedLgu?.id ? 'Failed to update LGU' : 'Failed to create LGU');
      throw err;
    }
  };

  const columns = [
    {
      title: 'LGU NAME',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-semibold text-green-700">{name || '-'}</span>,
    },
    {
      title: 'LOCATION',
      key: 'location',
      render: (_, record) => {
        const location = [record.barangay, record.city_municipality, record.province].filter(Boolean).join(', ');
        return location || <span className="text-gray-400">-</span>;
      },
    },
    {
      title: 'CONTACT',
      key: 'contact',
      render: (_, record) => {
        if (!record.contact_person && !record.contact_email) {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <div>
            <div>{record.contact_person || '-'}</div>
            <div className="text-xs text-gray-500">{record.contact_email || '-'}</div>
          </div>
        );
      },
    },
    {
      title: 'USERS',
      dataIndex: 'users_count',
      key: 'users_count',
      align: 'center',
      render: (count) => count ?? 0,
    },
    {
      title: 'KIOSKS',
      dataIndex: 'kiosks_count',
      key: 'kiosks_count',
      align: 'center',
      render: (count) => count ?? 0,
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
            title="Delete LGU"
            description="Are you sure you want to delete this LGU?"
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">LGU Management</h1>
          <p className="text-gray-500">Manage LGU profiles and contacts</p>
        </div>
        <div className="flex gap-2">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search LGUs..."
            className="w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} className="bg-green-600" onClick={handleAdd}>
            Add LGU
          </Button>
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={isLoading || deleteLguMutation.isPending}
          rowKey="id"
          pagination={{
            defaultPageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
          }}
        />
      </Card>

      <LguModal
        open={isModalOpen}
        onCancel={handleCancel}
        onSubmit={handleModalSubmit}
        loading={submitLoading}
        mode={selectedLgu ? 'edit' : 'create'}
        initialValues={selectedLgu}
      />
    </div>
  );
};

export default LguIndex;