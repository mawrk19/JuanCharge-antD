import React, { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Tag, Upload, message } from 'antd';
import { CameraOutlined, FileDoneOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toDayList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

const formatScheduleLabel = (schedule) => {
  if (!schedule) return 'No fixed schedule assigned';

  const days = toDayList(schedule.collection_days);
  const prettyDays = days.length > 0 ? days.map((day) => day.charAt(0).toUpperCase() + day.slice(1)).join(', ') : 'No day set';
  const notify = schedule.notify_time || 'No time set';

  return `${schedule.name || 'Schedule'} (${prettyDays} at ${notify})`;
};

const KioskFieldReportForm = ({
  kiosks = [],
  scheduleOptions = [],
  currentRole = 'lgu_staff',
  currentUser = null,
  onSubmitReport,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);

  const kioskOptions = useMemo(
    () =>
      (kiosks || []).map((kiosk) => ({
        label: `${kiosk.kiosk_code || `Kiosk #${kiosk.id}`} ${kiosk.lgu_name ? `- ${kiosk.lgu_name}` : ''}`,
        value: kiosk.id,
      })),
    [kiosks]
  );

  const selectedKioskId = Form.useWatch('kiosk_id', form);

  const selectedKiosk = useMemo(
    () => (kiosks || []).find((kiosk) => kiosk.id === selectedKioskId) || null,
    [kiosks, selectedKioskId]
  );

  const selectedSchedule = useMemo(() => {
    if (!selectedKiosk) return null;

    return (
      (scheduleOptions || []).find((schedule) => schedule.id === selectedKiosk.collection_schedule_id) ||
      selectedKiosk.collection_schedule ||
      null
    );
  }, [scheduleOptions, selectedKiosk]);

  const isAlignedWithSchedule = useMemo(() => {
    if (!selectedSchedule) return true;

    const scheduleDays = toDayList(selectedSchedule.collection_days);
    if (scheduleDays.length === 0) return true;

    const today = DAY_NAMES[new Date().getDay()];
    return scheduleDays.includes(today);
  }, [selectedSchedule]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const submittedAt = new Date();
      const payload = {
        ...values,
        photo_proof: (values.photo_proof || [])
          .map((file) => file?.originFileObj || null)
          .filter(Boolean),
        submitted_at: submittedAt.toISOString(),
        submitted_by_role: currentRole,
        submitted_by_id: currentUser?.id || null,
        submitted_by_name:
          currentUser?.name ||
          [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ') ||
          'LGU Staff',
        kiosk_code: selectedKiosk?.kiosk_code || null,
        schedule_name: selectedSchedule?.name || null,
        schedule_days: toDayList(selectedSchedule?.collection_days),
        schedule_alignment: isAlignedWithSchedule ? 'aligned' : 'out_of_schedule',
      };

      if (typeof onSubmitReport === 'function') {
        await onSubmitReport(payload);
      }

      setLastSubmittedAt(submittedAt.toLocaleString());
      form.resetFields();
      message.success('Field report submitted with timestamp verification.');

      if (!isAlignedWithSchedule) {
        message.warning('Report submitted outside the kiosk schedule day. Please double-check this visit.');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to submit field report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-xl border border-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3 flex-col sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">LGU Field Report</h3>
          <p className="text-sm text-slate-500 m-0">
            Document collection or maintenance visits with photo evidence and automatic timestamp.
          </p>
        </div>
        {lastSubmittedAt ? <Tag color="green">Last Submitted: {lastSubmittedAt}</Tag> : null}
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Kiosk ID"
            name="kiosk_id"
            rules={[{ required: true, message: 'Please select a kiosk.' }]}
          >
            <Select
              showSearch
              placeholder="Search kiosk code"
              optionFilterProp="label"
              options={kioskOptions}
            />
          </Form.Item>

          <Form.Item
            label="Type of Activity"
            name="activity_type"
            rules={[{ required: true, message: 'Please select activity type.' }]}
          >
            <Select
              placeholder="Select activity"
              options={[
                { value: 'collection_completed', label: 'Collection Completed' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'repair', label: 'Repair' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Condition Assessment"
            name="condition_assessment"
            rules={[{ required: true, message: 'Please select condition.' }]}
          >
            <Select
              placeholder="Select condition"
              options={[
                { value: 'good', label: 'Good' },
                { value: 'damaged', label: 'Damaged' },
                { value: 'needs_attention', label: 'Needs Attention' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Detected Schedule">
            <div className="min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {formatScheduleLabel(selectedSchedule)}
            </div>
            {selectedSchedule && !isAlignedWithSchedule ? (
              <div className="text-xs text-amber-600 mt-1">
                This report is outside the kiosk's fixed collection day.
              </div>
            ) : null}
          </Form.Item>
        </div>

        <Form.Item
          label="Notes / Observations"
          name="notes"
          rules={[{ required: true, message: 'Please add your observations.' }]}
        >
          <TextArea
            rows={4}
            placeholder="Describe site condition, actions taken, and any issues observed."
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="Photo Upload (Proof of Clearance)"
          name="photo_proof"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList || [])}
          rules={[{ required: true, message: 'Please upload at least one photo.' }]}
        >
          <Upload
            listType="picture-card"
            beforeUpload={() => false}
            multiple
            maxCount={4}
            accept="image/*"
          >
            <div>
              <CameraOutlined />
              <div className="mt-2">Upload</div>
            </div>
          </Upload>
        </Form.Item>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4 text-sm text-slate-600">
          Timestamp is captured automatically at submit time to verify schedule compliance.
        </div>

        <Button
          type="primary"
          htmlType="submit"
          icon={<FileDoneOutlined />}
          className="bg-green-600"
          loading={submitting}
        >
          Submit Field Report
        </Button>
      </Form>
    </Card>
  );
};

export default KioskFieldReportForm;
