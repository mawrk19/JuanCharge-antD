import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { CheckCircleFilled, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const PHASES = { VERIFYING: 'verifying', VERIFIED: 'verified', FORM: 'form' };

const SetupPassword = () => {
  const [phase, setPhase] = useState(PHASES.VERIFYING);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';

  // Drive the animation sequence on mount
  useEffect(() => {
    const verifiedTimer = setTimeout(() => setPhase(PHASES.VERIFIED), 1800);
    const formTimer = setTimeout(() => setPhase(PHASES.FORM), 3200);
    return () => {
      clearTimeout(verifiedTimer);
      clearTimeout(formTimer);
    };
  }, []);

  const onFinish = async ({ password, password_confirmation }) => {
    try {
      setLoading(true);
      await api.post('/auth/setup-password', { email, password, password_confirmation });
      message.success('Password set! You can now log in.');
      navigate('/login');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to set password. Please try again.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-slate-50">
      {/* Animated background — matches Login page */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-green-500/40 blur-3xl rounded-full animate-pulse opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-green-700/30 blur-3xl rounded-full animate-pulse delay-700 opacity-60" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-green-300/30 blur-3xl rounded-full animate-bounce opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="w-full max-w-[420px] rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)] relative z-20 bg-white/85 backdrop-blur-xl border border-white/60">
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/20 rounded-3xl -z-10" />

        <div className="relative z-10 p-8 pb-10">

          {/* ── Phase: Verifying ── */}
          {phase === PHASES.VERIFYING && (
            <div className="flex flex-col items-center justify-center py-10 gap-6 animate-in fade-in duration-500">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-green-200" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 animate-spin" />
                <LoadingOutlined className="text-green-500 text-2xl" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-700">Verifying your email…</p>
                <p className="text-sm text-slate-400 mt-1">Please wait a moment</p>
              </div>
            </div>
          )}

          {/* ── Phase: Verified checkmark ── */}
          {phase === PHASES.VERIFIED && (
            <div className="flex flex-col items-center justify-center py-10 gap-6 animate-in fade-in zoom-in-75 duration-500">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40" />
                <CheckCircleFilled className="text-green-500 text-6xl relative z-10" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-800">Email Verified!</p>
                <p className="text-sm text-slate-400 mt-1">Setting up your account…</p>
              </div>
            </div>
          )}

          {/* ── Phase: Password setup form ── */}
          {phase === PHASES.FORM && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-100 mb-4">
                  <CheckCircleFilled className="text-green-500 text-2xl" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Set Your Password</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Your email <span className="font-medium text-slate-700">{email}</span> has been verified.
                  <br />Choose a password to activate your account.
                </p>
              </div>

              <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
                <Form.Item
                  name="password"
                  label={<span className="text-slate-600 font-medium text-sm">New Password</span>}
                  rules={[
                    { required: true, message: 'Please enter your password' },
                    { min: 8, message: 'Password must be at least 8 characters' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-slate-400" />}
                    placeholder="Minimum 8 characters"
                    size="large"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                    className="rounded-xl"
                  />
                </Form.Item>

                <Form.Item
                  name="password_confirmation"
                  label={<span className="text-slate-600 font-medium text-sm">Confirm Password</span>}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm your password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-slate-400" />}
                    placeholder="Re-enter your password"
                    size="large"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                    className="rounded-xl"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 border-none font-semibold text-base mt-2"
                >
                  Activate Account
                </Button>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
