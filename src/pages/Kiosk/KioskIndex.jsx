import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Input, Space, Card, Tag, Tabs, message, Popconfirm, Modal, Form } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getKiosks, createKiosk, updateKiosk, deleteKiosk } from './kiosk.api';
import { getLguUsers } from '../LguUsers/lguUser.api';
import { getCollectionSchedules, getLgus } from '../Lgu/lgu.api';
import {
  closeTicket,
  createFieldReport,
  createTicketFromReport,
  forceMaintenanceFromReport,
  getFieldReports,
  getKpi,
  getMissedCollectionAlerts,
  verifyFieldReport,
} from './kioskFieldReports.api';
import KioskModal from './KioskModal';
import KioskFieldReportForm from './KioskFieldReportForm';
import KioskFieldReportsAdmin from './KioskFieldReportsAdmin';
import { getStoredRole, USER_KEY } from '../../services/authStorage';

const KioskIndex = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState(null);
  const queryClient = useQueryClient();
  const currentRole = getStoredRole();
  const isLguAdmin = currentRole === 'lgu_admin';
  const isLguStaff = currentRole === 'lgu_staff';
  const isLguTechnician = currentRole === 'lgu_technician';
  const isFieldOpsRole = isLguStaff || isLguTechnician;
  const canManageKiosks = currentRole === 'super_admin' || isLguAdmin;
  const [activeTab, setActiveTab] = useState(isFieldOpsRole ? 'field-reports' : 'directory');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketCloseForm] = Form.useForm();

  const currentUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem(USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, []);

  const currentUserLguId = useMemo(() => {
    if (isLguAdmin && currentUser?.lgu_id) {
      return currentUser.lgu_id;
    }
    return null;
  }, [currentUser, isLguAdmin]);

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

  const currentUserLguName = useMemo(() => {
    if (!currentUserLguId) return null;
    return lguOptions.find((lgu) => lgu.id === currentUserLguId)?.name;
  }, [currentUserLguId, lguOptions]);

  const { data: reports = [] } = useQuery({
    queryKey: ['kiosk-field-reports'],
    queryFn: () => getFieldReports(),
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const currentMonth = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }, []);

  const { data: kpiData = null } = useQuery({
    queryKey: ['kiosk-field-reports-kpi', currentMonth],
    queryFn: () => getKpi(currentMonth),
    select: (res) => res.data?.data || res.data || null,
    enabled: !isLguStaff,
  });

  const { data: missedAlerts = [] } = useQuery({
    queryKey: ['kiosk-missed-collection-alerts'],
    queryFn: () => getMissedCollectionAlerts(),
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
    enabled: !isLguStaff,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['lgu-users-lite'],
    queryFn: getLguUsers,
    select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  const technicianOptions = useMemo(() => {
    return (users || [])
      .filter((user) => {
        const slug = String(user?.role_slug || user?.role?.slug || '').toLowerCase();
        return ['lgu_technician', 'technician'].includes(slug);
      })
      .map((user) => ({
        value: user.id,
        label: user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || `User #${user.id}`,
      }));
  }, [users]);

  const lastServicedMap = useMemo(() => {
    const map = new Map();

    (data || []).forEach((kiosk) => {
      if (kiosk?.last_serviced_at) {
        map.set(kiosk.id, kiosk.last_serviced_at);
      }
    });

    (reports || []).forEach((report) => {
      if (report.activity_type !== 'collection_completed') return;
      const existing = map.get(report.kiosk_id);
      const reportTime = new Date(report.submitted_at).getTime();

      if (!existing || reportTime > new Date(existing).getTime()) {
        map.set(report.kiosk_id, report.submitted_at);
      }
    });

    return map;
  }, [data, reports]);

  const { data: scheduleOptions = [] } = useQuery({
    queryKey: ['collection-schedules-options'],
    queryFn: getCollectionSchedules,
    select: (res) => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return rows.map((schedule) => ({
        id: schedule.id,
        name: schedule.name || schedule.schedule_name || `Schedule #${schedule.id}`,
        lgu_id: schedule.lgu_id,
      }));
    },
  });

  const missedCollectionByKiosk = useMemo(() => {
    const flagged = new Set();

    (missedAlerts || []).forEach((alert) => {
      if (alert?.kiosk_id) flagged.add(alert.kiosk_id);
    });

    return flagged;
  }, [missedAlerts]);

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

  const filteredKiosks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data;

    return data.filter((item) => {
      const fields = [
        item.kiosk_code,
        item.lgu_name,
        item.location,
        item.status,
        item.collection_schedule?.name,
        item.collection_schedule_name,
      ];

      return fields.some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [data, searchTerm]);

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
    if (!canManageKiosks) {
      message.error('You do not have permission to delete kiosks.');
      return;
    }

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
    if (!canManageKiosks) {
      message.error('You do not have permission to manage kiosks.');
      return;
    }

    try {
      const payload = {
        ...values,
        ...(isLguAdmin && currentUserLguId ? { lgu_id: currentUserLguId } : {}),
      };

      if (selectedKiosk?.id) {
        await updateKioskMutation.mutateAsync({ id: selectedKiosk.id, payload });
        message.success('Kiosk updated successfully');
      } else {
        await createKioskMutation.mutateAsync(payload);
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

  const handleSubmitFieldReport = async (payload) => {
    await createFieldReport(payload);
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports'] });

    if (payload.activity_type === 'collection_completed') {
      await queryClient.invalidateQueries({ queryKey: ['kiosks'] });
    }

    if (!isLguStaff) {
      await queryClient.invalidateQueries({ queryKey: ['kiosk-missed-collection-alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports-kpi', currentMonth] });
    }
  };

  const handleVerifyReport = async (reportId) => {
    await verifyFieldReport(reportId);
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports'] });
  };

  const handleForceMaintenance = async (reportId) => {
    await forceMaintenanceFromReport(reportId);
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports'] });
    await queryClient.invalidateQueries({ queryKey: ['kiosks'] });
    message.success('Kiosk status flagged as Under Maintenance from report discrepancy.');
  };

  const handleCreateTicket = async (reportId, ticketPayload) => {
    const normalizedPayload = {
      ...ticketPayload,
      assigned_to_user_id: ticketPayload.assigned_to_user_id || ticketPayload.assigned_to_id || null,
    };

    await createTicketFromReport(reportId, normalizedPayload);
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports'] });
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports-kpi', currentMonth] });
  };

  const handleCloseTicket = async (reportId, payload) => {
    const targetReport = reports.find((item) => item.id === reportId);
    const ticketId = targetReport?.ticket?.id;

    if (!ticketId) {
      message.error('Unable to locate ticket for this report.');
      return;
    }

    await closeTicket(ticketId, payload);
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports'] });
    await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports-kpi', currentMonth] });
  };

  const technicianTickets = useMemo(() => {
    const currentUserId = currentUser?.id;
    if (!currentUserId || !isLguTechnician) return [];

    return (reports || [])
      .filter((report) => {
        const assignedId = report?.ticket?.assigned_to_user_id || report?.ticket?.assigned_to_id;
        return Boolean(report?.ticket?.id) && Number(assignedId) === Number(currentUserId);
      })
      .map((report) => {
        const kiosk = (data || []).find((item) => item.id === report.kiosk_id);
        return {
          key: report.ticket.id,
          ticket_id: report.ticket.id,
          report_id: report.id,
          kiosk_code: report.kiosk_code || kiosk?.kiosk_code || `Kiosk #${report.kiosk_id}`,
          priority: report.ticket.priority || 'medium',
          status: report.ticket.status || 'open',
          issue_summary: report.ticket.issue_summary || report.notes || '-',
          assigned_to_name: report.ticket.assigned_to_name || 'Assigned Technician',
          created_at: report.ticket.created_at || report.submitted_at,
          closed_at: report.ticket.closed_at,
        };
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [reports, data, currentUser, isLguTechnician]);

  const openTechnicianCloseModal = (ticket) => {
    setSelectedTicket(ticket);
    ticketCloseForm.setFieldsValue({
      technician_follow_up: '',
      resolution_log: '',
    });
    setTicketModalOpen(true);
  };

  const handleCloseTechnicianTicket = async () => {
    if (!selectedTicket?.ticket_id) return;

    try {
      const values = await ticketCloseForm.validateFields();
      await closeTicket(selectedTicket.ticket_id, values);
      message.success('Ticket closed successfully.');
      setTicketModalOpen(false);
      setSelectedTicket(null);
      ticketCloseForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports'] });
      await queryClient.invalidateQueries({ queryKey: ['kiosk-field-reports-kpi', currentMonth] });
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error('Failed to close ticket.');
    }
  };

  const technicianTicketColumns = [
    {
      title: 'Ticket ID',
      dataIndex: 'ticket_id',
      key: 'ticket_id',
      render: (value) => <span className="font-semibold text-slate-700">#{value}</span>,
    },
    {
      title: 'Kiosk',
      dataIndex: 'kiosk_code',
      key: 'kiosk_code',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (value) => {
        const color = value === 'high' ? 'red' : value === 'low' ? 'blue' : 'orange';
        return <Tag color={color}>{String(value || 'medium').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => (
        <Tag color={String(value).toLowerCase() === 'closed' ? 'green' : 'gold'}>
          {String(value || 'open').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Issue Summary',
      dataIndex: 'issue_summary',
      key: 'issue_summary',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        record.status === 'closed' ? (
          <Tag color="green">Closed</Tag>
        ) : (
          <Button size="small" onClick={() => openTechnicianCloseModal(record)}>
            Close Ticket
          </Button>
        )
      ),
    },
  ];

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
      title: 'SCHEDULE',
      key: 'schedule',
      render: (_, record) => {
        const scheduleName =
          record.collection_schedule?.name ||
          record.collection_schedule_name ||
          scheduleOptions.find((s) => s.id === record.collection_schedule_id)?.name;

        return scheduleName || <span className="text-gray-400">-</span>;
      },
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
      title: 'LAST SERVICED',
      key: 'last_serviced',
      render: (_, record) => {
        const lastServiced = lastServicedMap.get(record.id);
        return lastServiced ? new Date(lastServiced).toLocaleString() : <span className="text-gray-400">No report yet</span>;
      },
    },
    {
      title: 'ALERTS',
      key: 'alerts',
      render: (_, record) => (
        missedCollectionByKiosk.has(record.id) ? <Tag color="red">Missed Collection</Tag> : <Tag color="green">On Track</Tag>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      render: (_, record) => (
        canManageKiosks ? (
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
        ) : (
          <span className="text-slate-400 text-sm">View only</span>
        )
      ),
    },
  ];

  const tabItems = [
    {
      key: 'directory',
      label: 'Kiosk Directory',
      children: (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Kiosk Management</h1>
              <p className="text-gray-500">Manage kiosks, locations, and assignments</p>
            </div>
            {canManageKiosks ? (
              <div className="flex w-full md:w-auto gap-2 flex-col sm:flex-row">
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search kiosks..."
                  className="w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button type="primary" icon={<PlusOutlined />} className="bg-green-600" onClick={handleAdd}>Add Kiosk</Button>
              </div>
            ) : null}
          </div>

          <Card>
            <Table
              columns={columns}
              dataSource={filteredKiosks}
              loading={isLoading}
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
      key: 'field-reports',
      label: 'Field Reports',
      children: (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Field Report Form</h1>
            <p className="text-gray-500">
              {isLguStaff
                ? 'Document scheduled collection and maintenance visits with photo proof.'
                : 'Review submissions, verify evidence, and manage maintenance tickets.'}
            </p>
          </div>
          {isLguStaff ? (
            <KioskFieldReportForm
              kiosks={data}
              scheduleOptions={scheduleOptions}
              currentRole={currentRole}
              currentUser={currentUser}
              onSubmitReport={handleSubmitFieldReport}
            />
          ) : isLguTechnician ? (
            <KioskFieldReportForm
              kiosks={data}
              scheduleOptions={scheduleOptions}
              currentRole={currentRole}
              currentUser={currentUser}
              onSubmitReport={handleSubmitFieldReport}
            />
          ) : (
            <KioskFieldReportsAdmin
              reports={reports}
              kiosks={data}
              scheduleOptions={scheduleOptions}
              technicianOptions={technicianOptions}
              kpiData={kpiData}
              missedAlertKioskIds={Array.from(missedCollectionByKiosk)}
              onVerify={handleVerifyReport}
              onForceMaintenance={handleForceMaintenance}
              onCreateTicket={handleCreateTicket}
              onCloseTicket={handleCloseTicket}
            />
          )}
        </>
      ),
    },
    ...(isLguTechnician
      ? [
          {
            key: 'technician-tickets',
            label: 'Assigned Tickets',
            children: (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Assigned Maintenance Tickets</h1>
                  <p className="text-gray-500">Review and close tickets assigned by admins.</p>
                </div>
                <Card>
                  <Table
                    columns={technicianTicketColumns}
                    dataSource={technicianTickets}
                    rowKey="ticket_id"
                    pagination={{ pageSize: 8, showSizeChanger: true }}
                    scroll={{ x: 980 }}
                    locale={{ emptyText: 'No tickets assigned yet.' }}
                  />
                </Card>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-4 sm:p-6">
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <KioskModal
        open={isModalOpen}
        onCancel={handleCancel}
        onSubmit={handleModalSubmit}
        loading={submitLoading}
        lguOptions={lguOptions}
        scheduleOptions={scheduleOptions}
        mode={selectedKiosk ? 'edit' : 'create'}
        initialValues={selectedKiosk}
        currentUserRole={currentRole}
        currentUserLguId={currentUserLguId}
        currentUserLguName={currentUserLguName}
      />

      <Modal
        title="Close Assigned Ticket"
        open={ticketModalOpen}
        onCancel={() => {
          setTicketModalOpen(false);
          setSelectedTicket(null);
          ticketCloseForm.resetFields();
        }}
        onOk={handleCloseTechnicianTicket}
        okText="Close Ticket"
      >
        <Form form={ticketCloseForm} layout="vertical">
          <Form.Item name="technician_follow_up" label="Technician Follow-up">
            <Input.TextArea rows={3} placeholder="Technician notes after onsite work..." />
          </Form.Item>
          <Form.Item
            name="resolution_log"
            label="Resolution Log"
            rules={[{ required: true, message: 'Please add resolution details.' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe findings, repairs, and final condition..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KioskIndex;