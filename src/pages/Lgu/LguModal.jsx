import React, { useEffect } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';

const LguModal = ({ open, onCancel, onSubmit, loading, mode = 'create', initialValues = null }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ status: 'active', ...initialValues });
  }, [open, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch (err) {
      console.error(err);
      if (err?.errorFields) return;
      message.error('Failed to save LGU. Please try again.');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={mode === 'edit' ? 'Edit LGU' : 'Add LGU'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      centered
      okText={mode === 'edit' ? 'Update LGU' : 'Save LGU'}
      cancelText="Cancel"
      okButtonProps={{ className: 'bg-green-600' }}
      width={680}
      styles={{ body: { minHeight: '320px' } }}
    >
      <Form form={form} layout="vertical" name="lguForm">
        <Form.Item
          name="name"
          label="LGU Name"
          rules={[{ required: true, message: 'Please input LGU name' }]}
        >
          <Input size="large" placeholder="Enter LGU name" />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="region" label="Region">
            <Input size="large" placeholder="Enter region" />
          </Form.Item>
          <Form.Item name="province" label="Province">
            <Input size="large" placeholder="Enter province" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="city_municipality" label="City / Municipality">
            <Input size="large" placeholder="Enter city or municipality" />
          </Form.Item>
          <Form.Item name="barangay" label="Barangay">
            <Input size="large" placeholder="Enter barangay" />
          </Form.Item>
        </div>

        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} placeholder="Enter full address" />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="contact_person" label="Contact Person">
            <Input size="large" placeholder="Enter contact person" />
          </Form.Item>
          <Form.Item
            name="contact_email"
            label="Contact Email"
            rules={[{ type: 'email', message: 'Please enter a valid email address' }]}
          >
            <Input size="large" placeholder="name@example.com" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="contact_number" label="Contact Number">
            <Input size="large" placeholder="Enter contact number" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select status' }]}>
            <Select
              size="large"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default LguModal;
