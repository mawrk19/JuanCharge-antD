import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/forgot-password', {
        email: values.email,
      });

      message.success(response?.data?.message || 'If the email exists, a reset link was sent.');
    } catch (error) {
      if (error.response?.status === 422) {
        message.error(error.response?.data?.message || 'Please enter a valid email address.');
        return;
      }

      message.error(error.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your email address and we will send a password reset link.
        </p>

        <Form layout="vertical" onFinish={onFinish} className="mt-6" requiredMark={false}>
          <Form.Item
            name="email"
            label={<span className="text-sm font-medium text-slate-700">Email Address</span>}
            rules={[
              { required: true, message: 'Please enter your email address.' },
              { type: 'email', message: 'Please enter a valid email address.' },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined className="text-slate-400" />}
              placeholder="name@example.com"
              className="h-11 rounded-lg"
            />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button type="primary" htmlType="submit" loading={loading} className="h-11 w-full rounded-lg">
              Send Reset Link
            </Button>
          </Form.Item>
        </Form>

        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeftOutlined />
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
