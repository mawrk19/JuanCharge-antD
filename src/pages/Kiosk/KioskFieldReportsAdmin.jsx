import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  ToolOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toDayList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return [];
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const getLatestScheduledDate = (scheduleDays) => {
  const today = startOfDay(new Date());

  for (let i = 0; i < 8; i += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() - i);
    const dayName = dayNames[candidate.getDay()];
    if (scheduleDays.includes(dayName)) {
      return candidate;
    }
  }

  return null;
};

const KioskFieldReportsAdmin = ({
  reports = [],
  kiosks = [],
  scheduleOptions = [],
  technicianOptions = [],
  kpiData = null,
  missedAlertKioskIds = [],
  onVerify,
  onForceMaintenance,
  onCreateTicket,
  onCloseTicket,
}) => {
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [ticketForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  const openDetails = (report) => {
    setSelectedReport(report);
    setDetailsModalOpen(true);
  };

  const closeDetails = () => {
    setDetailsModalOpen(false);
    setSelectedReport(null);
  };

  const scheduleById = useMemo(() => {
    const map = new Map();
    (scheduleOptions || []).forEach((schedule) => map.set(schedule.id, schedule));
    return map;
  }, [scheduleOptions]);

  const reportsWithContext = useMemo(() => {
    return (reports || []).map((report) => {
      const kiosk = (kiosks || []).find((item) => item.id === report.kiosk_id) || null;
      const schedule = kiosk?.collection_schedule_id
        ? scheduleById.get(kiosk.collection_schedule_id)
        : null;

      const normalizedStaffName =
        report.submitted_by_name ||
        report.submitter?.name ||
        report.submitter?.email ||
        'Unknown Staff';

      return {
        ...report,
        kiosk_code: report.kiosk_code || kiosk?.kiosk_code || `Kiosk #${report.kiosk_id}`,
        submitted_by_name: normalizedStaffName,
        submitted_by_user_id: report.submitted_by_user_id || report.submitter?.id || null,
        kiosk_status: kiosk?.status || 'unknown',
        kiosk_schedule: schedule,
      };
    });
  }, [reports, kiosks, scheduleById]);

  const missedCollectionIds = useMemo(() => {
    if (Array.isArray(missedAlertKioskIds) && missedAlertKioskIds.length > 0) {
      return new Set(missedAlertKioskIds);
    }

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(8, 0, 0, 0);

    const flagged = new Set();

    (kiosks || []).forEach((kiosk) => {
      const schedule = kiosk?.collection_schedule_id ? scheduleById.get(kiosk.collection_schedule_id) : null;
      if (!schedule) return;

      const scheduleDays = toDayList(schedule.collection_days);
      if (scheduleDays.length === 0) return;

      const latestScheduledDate = getLatestScheduledDate(scheduleDays);
      if (!latestScheduledDate) return;

      const nextDayEight = new Date(latestScheduledDate);
      nextDayEight.setDate(nextDayEight.getDate() + 1);
      nextDayEight.setHours(8, 0, 0, 0);

      if (now < nextDayEight || now < cutoff) return;

      const hasReport = reportsWithContext.some((report) => {
        if (report.kiosk_id !== kiosk.id) return false;
        const submitted = new Date(report.submitted_at);
        return submitted >= latestScheduledDate && submitted <= nextDayEight;
      });

      if (!hasReport) flagged.add(kiosk.id);
    });

    return flagged;
  }, [kiosks, reportsWithContext, scheduleById, missedAlertKioskIds]);

  const serviceReliability = useMemo(() => {
    if (kpiData?.service_reliability_percent !== undefined && kpiData?.service_reliability_percent !== null) {
      return Number(kpiData.service_reliability_percent);
    }

    if (!kiosks.length) return 0;
    const scheduledCount = kiosks.filter((kiosk) => kiosk.collection_schedule_id).length;
    if (!scheduledCount) return 0;

    const missed = missedCollectionIds.size;
    return Math.max(0, ((scheduledCount - missed) / scheduledCount) * 100);
  }, [kiosks, missedCollectionIds, kpiData]);

  const averageRepairDays = useMemo(() => {
    if (kpiData?.average_repair_days !== undefined && kpiData?.average_repair_days !== null) {
      return Number(kpiData.average_repair_days);
    }

    const closedTickets = reportsWithContext
      .map((report) => report.ticket)
      .filter((ticket) => ticket?.status === 'closed' && ticket.created_at && ticket.closed_at);

    if (!closedTickets.length) return 0;

    const totalDays = closedTickets.reduce((sum, ticket) => {
      const start = new Date(ticket.created_at).getTime();
      const end = new Date(ticket.closed_at).getTime();
      const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);

    return totalDays / closedTickets.length;
  }, [reportsWithContext, kpiData]);

  const staffPerformanceRows = useMemo(() => {
    const derivedMap = new Map();

    reportsWithContext.forEach((report) => {
      const name = report.submitted_by_name || report.submitter?.name || report.submitter?.email || 'Unknown Staff';
      if (!derivedMap.has(name)) {
        derivedMap.set(name, {
          key: name,
          staff: name,
          total_reports: 0,
          late_reports: 0,
          verified_reports: 0,
        });
      }

      const row = derivedMap.get(name);
      row.total_reports += 1;
      if (report.schedule_alignment === 'out_of_schedule') row.late_reports += 1;
      if (report.verification_status === 'verified') row.verified_reports += 1;
    });

    if (Array.isArray(kpiData?.staff_performance) && kpiData.staff_performance.length > 0) {
      const merged = new Map(derivedMap);

      kpiData.staff_performance.forEach((row, index) => {
        const label =
          row.staff ||
          row.staff_name ||
          row.user_name ||
          row.submitter_name ||
          row.email ||
          null;

        // Skip anonymous KPI rows so we don't render misleading "Unknown Staff" entries.
        if (!label) return;

        const totalReports = Number(row.total_reports ?? row.reports_filed ?? row.report_count ?? 0);
        const lateReports = Number(row.late_reports ?? row.out_of_schedule ?? row.late_count ?? 0);
        const verifiedReports = Number(row.verified_reports ?? row.verified_count ?? 0);

        const existing = merged.get(label) || {
          key: label || `staff-${index}`,
          staff: label,
          total_reports: 0,
          late_reports: 0,
          verified_reports: 0,
        };

        merged.set(label, {
          ...existing,
          total_reports: Math.max(existing.total_reports, totalReports, verifiedReports, lateReports),
          late_reports: Math.max(existing.late_reports, lateReports),
          verified_reports: Math.max(existing.verified_reports, verifiedReports),
        });
      });

      return Array.from(merged.values()).sort((a, b) => b.total_reports - a.total_reports);
    }

    return Array.from(derivedMap.values()).sort((a, b) => b.total_reports - a.total_reports);
  }, [reportsWithContext, kpiData]);

  const kioskLastServicedMap = useMemo(() => {
    const map = new Map();

    reportsWithContext.forEach((report) => {
      if (report.activity_type !== 'collection_completed') return;
      const existing = map.get(report.kiosk_id);
      const reportTime = new Date(report.submitted_at).getTime();

      if (!existing || reportTime > new Date(existing).getTime()) {
        map.set(report.kiosk_id, report.submitted_at);
      }
    });

    return map;
  }, [reportsWithContext]);

  const openCreateTicket = (report) => {
    setSelectedReport(report);
    ticketForm.setFieldsValue({
      assigned_to_id: undefined,
      priority: 'medium',
      issue_summary: report.notes || '',
    });
    setTicketModalOpen(true);
  };

  const openCloseTicket = (report) => {
    setSelectedReport(report);
    closeForm.setFieldsValue({
      technician_follow_up: '',
      resolution_log: '',
    });
    setCloseModalOpen(true);
  };

  const handleCreateTicket = async () => {
    const values = await ticketForm.validateFields();
    const assigned = technicianOptions.find((item) => item.value === values.assigned_to_id);

    await onCreateTicket(selectedReport.id, {
      ...values,
      assigned_to_name: assigned?.label || 'Unassigned',
    });

    setTicketModalOpen(false);
    setSelectedReport(null);
    ticketForm.resetFields();
    message.success('Maintenance ticket created.');
  };

  const handleCloseTicket = async () => {
    const values = await closeForm.validateFields();
    await onCloseTicket(selectedReport.id, values);

    setCloseModalOpen(false);
    setSelectedReport(null);
    closeForm.resetFields();
    message.success('Ticket closed with resolution log.');
  };

  const reportColumns = [
    {
      title: 'Kiosk',
      key: 'kiosk',
      render: (_, record) => (
        <div>
          <Button type="link" className="p-0 h-auto font-semibold" onClick={() => openDetails(record)}>
            {record.kiosk_code}
          </Button>
          {missedCollectionIds.has(record.kiosk_id) ? (
            <Tag color="red" className="mt-1">Missed Collection Alert</Tag>
          ) : null}
          <div className="text-xs text-slate-500 mt-1">
            Last serviced: {formatDate(kioskLastServicedMap.get(record.kiosk_id))}
          </div>
        </div>
      ),
    },
    {
      title: 'Staff',
      dataIndex: 'submitted_by_name',
      key: 'submitted_by_name',
      render: (value, record) => (
        <Button type="link" className="p-0 h-auto" onClick={() => openDetails(record)}>
          {value || '-'}
        </Button>
      ),
    },
    {
      title: 'Activity',
      dataIndex: 'activity_type',
      key: 'activity_type',
      render: (value) => {
        const label = value === 'collection_completed' ? 'Collection Completed' : value === 'cleaning' ? 'Cleaning' : 'Repair';
        return <Tag>{label}</Tag>;
      },
    },
    {
      title: 'Condition',
      dataIndex: 'condition_assessment',
      key: 'condition_assessment',
      render: (value) => (
        <Tag color={value === 'good' ? 'green' : value === 'damaged' ? 'red' : 'orange'}>
          {String(value || '').replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Photo',
      dataIndex: 'photo_proof',
      key: 'photo_proof',
      render: (_, record) => {
        const count = Array.isArray(record?.photos)
          ? record.photos.length
          : Array.isArray(record?.photo_proof)
            ? record.photo_proof.length
            : 0;
        return count > 0 ? <Tag color="blue">{count} photo(s)</Tag> : <Tag>No photo</Tag>;
      },
    },
    {
      title: 'Submitted',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (value) => formatDate(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const mismatch = record.condition_assessment === 'damaged' && record.kiosk_status === 'active';
        const hasTicket = Boolean(record.ticket);

        return (
          <Space wrap>
            <Tooltip title="Review uploaded proof and confirm report validity">
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => onVerify(record.id)}
                disabled={record.verification_status === 'verified'}
              >
                {record.verification_status === 'verified' ? 'Verified' : 'Mark as Verified'}
              </Button>
            </Tooltip>

            {mismatch ? (
              <Tooltip title="Report says damaged but kiosk is still operational">
                <Button
                  size="small"
                  danger
                  icon={<AlertOutlined />}
                  onClick={() => onForceMaintenance(record.id)}
                >
                  Force Under Maintenance
                </Button>
              </Tooltip>
            ) : null}

            {!hasTicket ? (
              <Button size="small" icon={<ToolOutlined />} onClick={() => openCreateTicket(record)}>
                Create Ticket
              </Button>
            ) : (
              <>
                <Tag color={record.ticket.status === 'closed' ? 'green' : 'orange'}>
                  {record.ticket.status === 'closed' ? 'Ticket Closed' : `Ticket ${record.ticket.priority || 'medium'}`}
                </Tag>
                {record.ticket.status !== 'closed' ? (
                  <Button size="small" icon={<FileProtectOutlined />} onClick={() => openCloseTicket(record)}>
                    Close Ticket
                  </Button>
                ) : null}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Text type="secondary">Service Reliability</Text>
          <div className="text-2xl font-semibold text-green-700">{serviceReliability.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">Scheduled collections completed on time</div>
        </Card>
        <Card>
          <Text type="secondary">Hardware Health</Text>
          <div className="text-2xl font-semibold text-blue-700">{averageRepairDays.toFixed(1)} days</div>
          <div className="text-xs text-slate-500">Average time to repair damaged kiosk</div>
        </Card>
        <Card>
          <Text type="secondary">Missed Collections</Text>
          <div className="text-2xl font-semibold text-red-600">{missedCollectionIds.size}</div>
          <div className="text-xs text-slate-500">Kiosks with no report by Tuesday 8:00 AM cutoff</div>
        </Card>
      </div>

      <Card title="Field Reports Review">
        <Table
          rowKey="id"
          columns={reportColumns}
          dataSource={reportsWithContext}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: 'No field reports submitted yet.' }}
        />
      </Card>

      <Card title="Staff Accountability Summary">
        <Table
          rowKey="key"
          dataSource={staffPerformanceRows}
          pagination={false}
          columns={[
            { title: 'Staff', dataIndex: 'staff', key: 'staff' },
            { title: 'Reports Filed', dataIndex: 'total_reports', key: 'total_reports' },
            { title: 'Late / Out-of-schedule', dataIndex: 'late_reports', key: 'late_reports' },
            { title: 'Verified Reports', dataIndex: 'verified_reports', key: 'verified_reports' },
          ]}
          locale={{ emptyText: 'No staff activity yet.' }}
        />
      </Card>

      <Modal
        title="Create Maintenance Ticket"
        open={ticketModalOpen}
        onCancel={() => {
          setTicketModalOpen(false);
          setSelectedReport(null);
          ticketForm.resetFields();
        }}
        onOk={handleCreateTicket}
      >
        <Form form={ticketForm} layout="vertical">
          <Form.Item name="assigned_to_id" label="Assign Technician" rules={[{ required: true, message: 'Please assign a technician.' }]}> 
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select technician"
              options={technicianOptions}
            />
          </Form.Item>
          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}> 
            <Select
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </Form.Item>
          <Form.Item name="issue_summary" label="Issue Summary" rules={[{ required: true, message: 'Please add issue details.' }]}> 
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Close Maintenance Ticket"
        open={closeModalOpen}
        onCancel={() => {
          setCloseModalOpen(false);
          setSelectedReport(null);
          closeForm.resetFields();
        }}
        onOk={handleCloseTicket}
        okText="Close Ticket"
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item name="technician_follow_up" label="Technician Follow-up"> 
            <Input.TextArea rows={3} placeholder="Technician notes after fix..." />
          </Form.Item>
          <Form.Item name="resolution_log" label="Resolution Log" rules={[{ required: true, message: 'Please add a resolution log.' }]}> 
            <Input.TextArea rows={4} placeholder="Describe what was fixed and final condition..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Field Report Details"
        open={detailsModalOpen}
        onCancel={closeDetails}
        footer={null}
        width="min(900px, calc(100vw - 24px))"
      >
        {selectedReport ? (
          <div className="space-y-4">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Kiosk">{selectedReport.kiosk_code || `Kiosk #${selectedReport.kiosk_id}`}</Descriptions.Item>
              <Descriptions.Item label="Staff">{selectedReport.submitted_by_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Activity">
                {selectedReport.activity_type === 'collection_completed'
                  ? 'Collection Completed'
                  : selectedReport.activity_type === 'cleaning'
                    ? 'Cleaning'
                    : 'Repair'}
              </Descriptions.Item>
              <Descriptions.Item label="Condition">
                {String(selectedReport.condition_assessment || '').replace('_', ' ').toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="Verification Status">
                {selectedReport.verification_status || 'pending'}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted At">{formatDate(selectedReport.submitted_at)}</Descriptions.Item>
              <Descriptions.Item label="Schedule Alignment">{selectedReport.schedule_alignment || '-'}</Descriptions.Item>
              <Descriptions.Item label="Notes">{selectedReport.notes || '-'}</Descriptions.Item>
            </Descriptions>

            {selectedReport.ticket ? (
              <Descriptions bordered size="small" column={1} title="Maintenance Ticket">
                <Descriptions.Item label="Status">{selectedReport.ticket.status || '-'}</Descriptions.Item>
                <Descriptions.Item label="Priority">{selectedReport.ticket.priority || '-'}</Descriptions.Item>
                <Descriptions.Item label="Assigned To">
                  {selectedReport.ticket.assigned_to_name || selectedReport.ticket.assigned_to_user_id || 'Unassigned'}
                </Descriptions.Item>
                <Descriptions.Item label="Issue Summary">{selectedReport.ticket.issue_summary || '-'}</Descriptions.Item>
                <Descriptions.Item label="Resolution Log">{selectedReport.ticket.resolution_log || '-'}</Descriptions.Item>
                <Descriptions.Item label="Technician Follow-up">{selectedReport.ticket.technician_follow_up || '-'}</Descriptions.Item>
              </Descriptions>
            ) : null}

            <div>
              <div className="text-sm font-semibold text-slate-700 mb-2">Uploaded Photos</div>
              <div className="flex flex-wrap gap-3">
                {(Array.isArray(selectedReport.photos) ? selectedReport.photos : Array.isArray(selectedReport.photo_proof) ? selectedReport.photo_proof : []).length === 0 ? (
                  <span className="text-slate-500 text-sm">No photos uploaded.</span>
                ) : (
                  (Array.isArray(selectedReport.photos) ? selectedReport.photos : selectedReport.photo_proof).map((photo, index) => {
                    const photoUrl = photo?.file_url || photo?.url || photo?.path || null;
                    const photoName = photo?.name || photo?.file_name || `Photo ${index + 1}`;

                    if (!photoUrl) {
                      return (
                        <Tag key={`photo-${index}`} color="blue">{photoName}</Tag>
                      );
                    }

                    return (
                      <Image
                        key={`photo-${index}`}
                        src={photoUrl}
                        alt={photoName}
                        width={120}
                        height={120}
                        className="rounded-lg object-cover border border-slate-200"
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default KioskFieldReportsAdmin;
