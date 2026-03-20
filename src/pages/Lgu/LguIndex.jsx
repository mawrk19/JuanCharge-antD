import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  Tag,
  message,
  Popconfirm,
  Tabs,
  Form,
  InputNumber,
  Select,
  Modal,
  Switch,
  List,
  TimePicker,
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createCollectionSchedule,
  createLgu,
  deleteCollectionSchedule,
  deleteLgu,
  getCollectionNotifications,
  getCollectionSchedules,
  getLguSystemConfig,
  getLgus,
  markCollectionNotificationRead,
  notifyCollectionSchedule,
  updateCollectionSchedule,
  updateLgu,
  upsertLguSystemConfig,
} from './lgu.api';
import { getStoredRole, USER_KEY } from '../../services/authStorage';
import LguModal from './LguModal';

const DAY_OPTIONS = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

const DAY_LABEL_MAP = DAY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const toApiDay = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return DAY_LABEL_MAP[normalized] ? normalized : null;
};

const LguIndex = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLgu, setSelectedLgu] = useState(null);
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedConfigLguId, setSelectedConfigLguId] = useState(undefined);
  const [configDraft, setConfigDraft] = useState({
    points_per_bottle: 0,
    points_per_tin_can: 0,
    points_per_aluminum_can: 0,
  });
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleForm] = Form.useForm();
  const queryClient = useQueryClient();
  const currentRole = getStoredRole();
  const isSuperAdmin = currentRole === 'super_admin';

  const currentUserLguId = useMemo(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const user = raw ? JSON.parse(raw) : null;
      return user?.lgu_id || null;
    } catch {
      return null;
    }
  }, []);

  const { data = [], isLoading } = useQuery({
    queryKey: ['lgus'],
    queryFn: getLgus,
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const resolvedConfigLguId = useMemo(() => {
    if (selectedConfigLguId) return selectedConfigLguId;
    if (currentUserLguId) return currentUserLguId;
    if (isSuperAdmin && data.length > 0) return data[0]?.id || null;
    return null;
  }, [selectedConfigLguId, currentUserLguId, isSuperAdmin, data]);

  const resolvedConfigLguName = useMemo(() => {
    if (!resolvedConfigLguId) return 'No LGU Selected';
    const scopedLgu = data.find((item) => item.id === resolvedConfigLguId);
    return scopedLgu?.name || 'Selected LGU';
  }, [data, resolvedConfigLguId]);

  const scopedParams = resolvedConfigLguId ? { lgu_id: resolvedConfigLguId } : {};

  useEffect(() => {
    if (!selectedConfigLguId && resolvedConfigLguId) {
      setSelectedConfigLguId(resolvedConfigLguId);
    }
  }, [selectedConfigLguId, resolvedConfigLguId]);

  const createLguMutation = useMutation({ mutationFn: createLgu });
  const updateLguMutation = useMutation({ mutationFn: ({ id, payload }) => updateLgu(id, payload) });
  const deleteLguMutation = useMutation({ mutationFn: deleteLgu });
  const submitLoading = createLguMutation.isPending || updateLguMutation.isPending;

  const { data: systemConfig, isLoading: configLoading } = useQuery({
    queryKey: ['lgu-system-config', selectedConfigLguId || 'self'],
    queryFn: () => getLguSystemConfig(scopedParams),
    select: (res) => res.data?.data || res.data || {},
  });

  useEffect(() => {
    if (!systemConfig) {
      return;
    }

    setConfigDraft({
      points_per_bottle: Number(systemConfig?.points_per_bottle ?? systemConfig?.minutes_per_bottle ?? 0),
      points_per_tin_can: Number(systemConfig?.points_per_tin_can ?? systemConfig?.minutes_per_kg ?? 0),
      points_per_aluminum_can: Number(systemConfig?.points_per_aluminum_can ?? systemConfig?.points_per_kg ?? 0),
    });
  }, [systemConfig]);

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['collection-schedules', selectedConfigLguId || 'self'],
    queryFn: () => getCollectionSchedules(scopedParams),
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['collection-notifications', selectedConfigLguId || 'self'],
    queryFn: () => getCollectionNotifications(scopedParams),
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const saveSystemConfigMutation = useMutation({
    mutationFn: (payload) => upsertLguSystemConfig(payload, scopedParams),
  });

  const createScheduleMutation = useMutation({
    mutationFn: createCollectionSchedule,
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCollectionSchedule(id, payload),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteCollectionSchedule,
  });

  const notifyScheduleMutation = useMutation({
    mutationFn: notifyCollectionSchedule,
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: markCollectionNotificationRead,
  });

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

  const handleSaveSystemConfig = async () => {
    if (!resolvedConfigLguId) {
      message.error('No LGU selected. Please select an LGU first.');
      return;
    }

    try {
      await saveSystemConfigMutation.mutateAsync({
        ...configDraft,
        // Backward-compatible keys in case backend still reads legacy config fields.
        minutes_per_bottle: configDraft.points_per_bottle,
        minutes_per_kg: configDraft.points_per_tin_can,
        points_per_kg: configDraft.points_per_aluminum_can,
        lgu_id: resolvedConfigLguId,
      });
      message.success('LGU system configuration saved successfully.');
      await queryClient.invalidateQueries({ queryKey: ['lgu-system-config'] });
    } catch (error) {
      console.error(error);
      message.error('Failed to save system configuration.');
    }
  };

  const handleOpenScheduleModal = (schedule = null) => {
    setSelectedSchedule(schedule);
    const rawDays = Array.isArray(schedule?.collection_days)
      ? schedule.collection_days
      : typeof schedule?.collection_days === 'string'
        ? schedule.collection_days.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

    const normalizedDays = rawDays
      .map((item) => toApiDay(item))
      .filter(Boolean);

    const normalizedNotifyTime = schedule?.notify_time
      ? dayjs(schedule.notify_time, 'HH:mm')
      : null;

    scheduleForm.setFieldsValue(
      schedule
        ? {
            ...schedule,
            collection_days: normalizedDays,
            notify_time: normalizedNotifyTime,
            active: typeof schedule.active === 'boolean' ? schedule.active : schedule.status === 'active',
          }
        : {
            active: true,
            collection_days: [],
            notify_time: null,
          }
    );
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const values = await scheduleForm.validateFields();
      const normalizedDays = (Array.isArray(values.collection_days)
        ? values.collection_days
        : [])
        .map((item) => toApiDay(item))
        .filter(Boolean);

      const normalizedNotifyTime = values.notify_time
        ? values.notify_time.format('HH:mm')
        : null;

      const payload = {
        ...values,
        collection_days: normalizedDays,
        notify_time: normalizedNotifyTime,
        ...(selectedConfigLguId ? { lgu_id: selectedConfigLguId } : {}),
      };

      if (selectedSchedule?.id) {
        await updateScheduleMutation.mutateAsync({ id: selectedSchedule.id, payload });
        message.success('Collection schedule updated successfully.');
      } else {
        await createScheduleMutation.mutateAsync(payload);
        message.success('Collection schedule created successfully.');
      }

      setScheduleModalOpen(false);
      setSelectedSchedule(null);
      scheduleForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['collection-schedules'] });
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(error);
      message.error('Failed to save collection schedule.');
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await deleteScheduleMutation.mutateAsync(id);
      message.success('Collection schedule deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['collection-schedules'] });
    } catch (error) {
      console.error(error);
      message.error('Failed to delete collection schedule.');
    }
  };

  const handleNotifySchedule = async (id) => {
    try {
      await notifyScheduleMutation.mutateAsync(id);
      message.success('Collection notifications sent successfully.');
      await queryClient.invalidateQueries({ queryKey: ['collection-notifications'] });
    } catch (error) {
      console.error(error);
      message.error('Failed to notify collection schedule.');
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await markNotificationReadMutation.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ['collection-notifications'] });
    } catch (error) {
      console.error(error);
      message.error('Failed to mark notification as read.');
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

  const scheduleColumns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      render: (value, record) => value || record.schedule_name || '-',
    },
    {
      title: 'COLLECTION DAYS',
      dataIndex: 'collection_days',
      key: 'collection_days',
      render: (value) => {
        if (!Array.isArray(value)) {
          return value || '-';
        }

        return value
          .map((item) => DAY_LABEL_MAP[String(item).toLowerCase()] || item)
          .join(', ');
      },
    },
    {
      title: 'NOTIFY TIME',
      dataIndex: 'notify_time',
      key: 'notify_time',
      render: (value) => value || '-',
    },
    {
      title: 'STATUS',
      key: 'active',
      render: (_, record) => (
        <Tag color={record.active || record.status === 'active' ? 'green' : 'red'}>
          {record.active || record.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" onClick={() => handleOpenScheduleModal(record)}>Edit</Button>
          <Button type="text" onClick={() => handleNotifySchedule(record.id)}>Notify</Button>
          <Popconfirm
            title="Delete schedule"
            description="Are you sure you want to delete this schedule?"
            onConfirm={() => handleDeleteSchedule(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const tabItems = [
    {
      key: 'directory',
      label: 'LGU Directory',
      children: (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">LGU Management</h1>
              <p className="text-gray-500">Manage LGU profiles and contacts</p>
            </div>
            <div className="flex w-full md:w-auto gap-2 flex-col sm:flex-row">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search LGUs..."
                className="w-full sm:w-64"
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
              scroll={{ x: 980 }}
            />
          </Card>
        </>
      ),
    },
    {
      key: 'config',
      label: 'System Config',
      children: (
        <Card loading={configLoading}>
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
              <h2 className="text-xl font-semibold text-slate-800">Points Configuration</h2>
              <p className="mt-1 text-sm text-slate-600">Configure item-based point conversion for kiosk transactions.</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">LGU Scope</div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">{resolvedConfigLguName}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Last Updated</div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {systemConfig?.updated_at ? new Date(systemConfig.updated_at).toLocaleString() : 'No updates yet'}
                  </div>
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="max-w-sm">
                <div className="text-sm font-medium text-slate-700 mb-2">Select LGU Scope</div>
                <Select
                  allowClear
                  placeholder="Select LGU"
                  value={selectedConfigLguId}
                  onChange={(value) => setSelectedConfigLguId(value)}
                  options={data.map((lgu) => ({ label: lgu.name, value: lgu.id }))}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 text-sm font-medium text-slate-700">Points per Bottle</div>
                <InputNumber
                  className="w-full"
                  min={0}
                  size="large"
                  step={0.1}
                  addonAfter="pts"
                  value={configDraft.points_per_bottle}
                  onChange={(value) => setConfigDraft((prev) => ({ ...prev, points_per_bottle: Number(value || 0) }))}
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 text-sm font-medium text-slate-700">Points per Tin Can</div>
                <InputNumber
                  className="w-full"
                  min={0}
                  size="large"
                  step={0.1}
                  addonAfter="pts"
                  value={configDraft.points_per_tin_can}
                  onChange={(value) => setConfigDraft((prev) => ({ ...prev, points_per_tin_can: Number(value || 0) }))}
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 text-sm font-medium text-slate-700">Points per Aluminum Can</div>
                <InputNumber
                  className="w-full"
                  min={0}
                  size="large"
                  step={0.1}
                  addonAfter="pts"
                  value={configDraft.points_per_aluminum_can}
                  onChange={(value) => setConfigDraft((prev) => ({ ...prev, points_per_aluminum_can: Number(value || 0) }))}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">Changes apply to kiosk point conversion rules for the selected LGU.</p>
              <Button
                type="primary"
                size="large"
                className="bg-green-600"
                onClick={handleSaveSystemConfig}
                loading={saveSystemConfigMutation.isPending}
              >
                Save Configuration
              </Button>
            </div>
          </div>
        </Card>
      ),
    },
    {
      key: 'schedules',
      label: 'Collection Schedules',
      children: (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Collection Schedules</h2>
              <p className="text-gray-500">Manage collection schedules and notify LGU users.</p>
            </div>
            <Button type="primary" className="bg-green-600" onClick={() => handleOpenScheduleModal()}>
              Add Schedule
            </Button>
          </div>

          {isSuperAdmin && (
            <div className="max-w-sm mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">LGU Scope</div>
              <Select
                allowClear
                placeholder="Select LGU"
                value={selectedConfigLguId}
                onChange={(value) => setSelectedConfigLguId(value)}
                options={data.map((lgu) => ({ label: lgu.name, value: lgu.id }))}
              />
            </div>
          )}

          <Table
            rowKey="id"
            loading={schedulesLoading}
            dataSource={schedules}
            columns={scheduleColumns}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 980 }}
          />
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: `Notifications (${unreadCount})`,
      children: (
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Collection Notifications</h2>
            <p className="text-gray-500">LGU admins and staff receive schedule notifications here.</p>
          </div>

          {isSuperAdmin && (
            <div className="max-w-sm mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">LGU Scope</div>
              <Select
                allowClear
                placeholder="Select LGU"
                value={selectedConfigLguId}
                onChange={(value) => setSelectedConfigLguId(value)}
                options={data.map((lgu) => ({ label: lgu.name, value: lgu.id }))}
              />
            </div>
          )}

          <List
            loading={notificationsLoading}
            dataSource={notifications}
            locale={{ emptyText: 'No collection notifications found.' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.read_at ? (
                    <Tag key="read" color="green">Read</Tag>
                  ) : (
                    <Button
                      key="mark-read"
                      type="link"
                      onClick={() => handleMarkNotificationRead(item.id)}
                      loading={markNotificationReadMutation.isPending}
                    >
                      Mark as read
                    </Button>
                  ),
                ]}
              >
                <List.Item.Meta
                  title={item.title || item.subject || 'Collection Notification'}
                  description={
                    <div>
                      <div>{item.message || item.body || 'No message provided.'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <LguModal
        open={isModalOpen}
        onCancel={handleCancel}
        onSubmit={handleModalSubmit}
        loading={submitLoading}
        mode={selectedLgu ? 'edit' : 'create'}
        initialValues={selectedLgu}
      />

      <Modal
        title={selectedSchedule ? 'Edit Collection Schedule' : 'Add Collection Schedule'}
        open={scheduleModalOpen}
        onCancel={() => {
          setScheduleModalOpen(false);
          setSelectedSchedule(null);
          scheduleForm.resetFields();
        }}
        onOk={handleSaveSchedule}
        confirmLoading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
      >
        <Form form={scheduleForm} layout="vertical" className="pt-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-1">Schedule Details</p>
            <p className="text-xs text-slate-500 mb-0">Define when collection happens and when to notify assigned users.</p>
          </div>

          <Form.Item
            name="name"
            label="Schedule Name"
            rules={[{ required: true, message: 'Please provide schedule name.' }]}
          >
            <Input size="large" placeholder="e.g. Monday Morning Collection" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="collection_days"
              label="Collection Days"
              rules={[{ required: true, message: 'Please select collection days.' }]}
            >
              <Select
                mode="multiple"
                size="large"
                placeholder="Select one or more days"
                options={DAY_OPTIONS}
              />
            </Form.Item>

            <Form.Item
              name="notify_time"
              label="Notify Time"
              rules={[{ required: true, message: 'Please select notify time.' }]}
            >
              <TimePicker
                use12Hours
                format="h:mm A"
                minuteStep={5}
                size="large"
                className="w-full"
                placeholder="Select notify time"
              />
            </Form.Item>
          </div>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LguIndex;