import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Input, Space, Card, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getKiosks, createKiosk, updateKiosk, deleteKiosk } from './kiosk.api';
import { getLgus } from '../LGU/lgu.api';
import KioskModal from './KioskModal';

const KioskIndex = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState(null);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['kiosks'],
    queryFn: getKiosks,
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const { data: lguOptions = [] } = useQuery({
    queryKey: ['lgus-options'],
    queryFn: getLgus,
    select: (res) => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return rows.map((lgu) => ({ id: lgu.id, name: lgu.name }));
    },
  });

  const createKioskMutation = useMutation({
    mutationFn: createKiosk,
  });

  const updateKioskMutation = useMutation({
    mutationFn: ({ id, payload }) => updateKiosk(id, payload),
  });

  const deleteKioskMutation = useMutation({
    mutationFn: deleteKiosk,
  });

  const submitLoading = createKioskMutation.isPending || updateKioskMutation.isPending;

  const handleAdd = () => {
    setSelectedKiosk(null);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedKiosk(null);
  };

  const handleEdit = (record) => {
    setSelectedKiosk(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteKioskMutation.mutateAsync(id);
      message.success('Kiosk deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['kiosks'] });
    } catch (err) {
      console.error(err);
      message.error('Failed to delete kiosk');
    }
  };

  const handleModalSubmit = async (values) => {
    try {
      if (selectedKiosk?.id) {
        await updateKioskMutation.mutateAsync({ id: selectedKiosk.id, payload: values });
        message.success('Kiosk updated successfully');
      } else {
        await createKioskMutation.mutateAsync(values);
        message.success('Kiosk added successfully');
      }

      setIsModalOpen(false);
      setSelectedKiosk(null);
      await queryClient.invalidateQueries({ queryKey: ['kiosks'] });
    } catch (err) {
      console.error(err);
      message.error(selectedKiosk?.id ? 'Failed to update kiosk' : 'Failed to add kiosk');
      throw err;
    }
  };

  const columns = [
    { 
      title: 'KIOSK CODE', 
      dataIndex: 'kiosk_code', 
      key: 'kiosk_code',
      render: (text) => <span className="font-semibold text-green-700">{text}</span> 
    },
    { 
      title: 'LGU', 
      dataIndex: 'lgu_name', 
      key: 'lgu_name',
      render: (lgu_name) => lgu_name || <span className="text-gray-400">-</span>
    },
    { 
      title: 'LOCATION', 
      dataIndex: 'location', 
      key: 'location' 
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
      title: 'LAST ACTIVE',
      dataIndex: 'last_active',
      key: 'last_active',
      render: (date) => date ? new Date(date).toLocaleString() : <span className="text-gray-400">Never</span>
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
            title="Delete kiosk"
            description="Are you sure you want to delete this kiosk?"
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
          <h1 className="text-2xl font-bold">Kiosk Management</h1>
          <p className="text-gray-500">Manage kiosks, locations, and assignments</p>
        </div>
        <div className="flex gap-2">
          <Input prefix={<SearchOutlined />} placeholder="Search kiosks..." className="w-64" />
          <Button type="primary" icon={<PlusOutlined />} className="bg-green-600" onClick={handleAdd}>Add Kiosk</Button>
        </div>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={data} 
          loading={isLoading} 
          rowKey="id" 
          pagination={{
            defaultPageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
          }}
        />
      </Card>

      <KioskModal
        open={isModalOpen}
        onCancel={handleCancel}
        onSubmit={handleModalSubmit}
        loading={submitLoading}
        lguOptions={lguOptions}
        mode={selectedKiosk ? 'edit' : 'create'}
        initialValues={selectedKiosk}
      />
    </div>
  );
};

export default KioskIndex;