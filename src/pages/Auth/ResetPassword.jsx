import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasTriggeredRef = useRef(false);
  const [status, setStatus] = useState('processing');
  const [statusMessage, setStatusMessage] = useState('Please wait while we reset your password securely.');

  const emailFromQuery = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const tokenFromQuery = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const hasRequiredParams = Boolean(emailFromQuery && tokenFromQuery);

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const redirectTimer = setTimeout(() => {
      navigate('/login');
    }, 3000);

    const runReset = async () => {
      if (!hasRequiredParams) {
        setStatus('error');
        setStatusMessage('Reset link is invalid. Please request a new one from Forgot Password.');
        return;
      }

      try {
        const response = await api.post('/auth/reset-password', {
          email: emailFromQuery,
          token: tokenFromQuery,
        });

        const msg = response?.data?.message || 'Password reset complete. Please check your email for your new password.';
        setStatus('success');
        setStatusMessage(msg);
        message.success(msg);
      } catch (error) {
        const errMsg = error.response?.data?.message || 'Failed to reset password.';
        setStatus('error');
        setStatusMessage(errMsg);
        message.error(errMsg);
      }
    };

    runReset();

    return () => clearTimeout(redirectTimer);
  }, [emailFromQuery, hasRequiredParams, navigate, tokenFromQuery]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Resetting your password. You will be redirected to login in 3 seconds.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          {status === 'processing' && (
            <>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#16a34a' }} spin />} />
              <div className="mt-4 text-base font-semibold text-slate-800">Resetting password...</div>
              <div className="mt-1 text-sm text-slate-500">{statusMessage}</div>
            </>
          )}

          {status !== 'processing' && (
            <Alert
              type={status === 'success' ? 'success' : 'error'}
              showIcon
              message={status === 'success' ? 'Password reset successful' : 'Password reset failed'}
              description={statusMessage}
            />
          )}

          <div className="mt-4 text-xs font-medium text-slate-500">Redirecting to login...</div>
        </div>

        {status === 'success' && (
          <Alert
            className="mt-6"
            type="success"
            showIcon
            message="Next step"
            description="Use the new password sent to your email to sign in."
          />
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
