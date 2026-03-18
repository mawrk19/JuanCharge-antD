import React, { useMemo } from 'react';
import { Button, Card, Result, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { Text } = Typography;

const toBoolean = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'ok', 'success', 'verified'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'failed', 'error', 'invalid'].includes(normalized)) return false;
  return null;
};

const EmailVerificationResult = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const state = useMemo(() => {
    const statusValue = params.get('status') || params.get('result');
    const verifiedValue = params.get('verified') || params.get('success');
    const explicitError = params.get('error');
    const message = params.get('message') || explicitError || 'Please continue to login.';

    const fromStatus = toBoolean(statusValue);
    const fromVerified = toBoolean(verifiedValue);

    if (fromStatus === true || fromVerified === true) {
      return {
        status: 'success',
        title: 'Email Verified',
        subTitle: message,
      };
    }

    if (fromStatus === false || fromVerified === false || explicitError) {
      return {
        status: 'error',
        title: 'Verification Failed',
        subTitle: message,
      };
    }

    return {
      status: 'info',
      title: 'Verification Status Unknown',
      subTitle: message,
    };
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-sm border border-slate-200">
        <Result
          status={state.status}
          title={state.title}
          subTitle={state.subTitle}
          extra={[
            <Button key="login" type="primary" onClick={() => navigate('/login')}>
              Go to Login
            </Button>,
            <Button key="dashboard" onClick={() => navigate('/main/dashboard')}>
              Open Dashboard
            </Button>,
          ]}
        />
        <div className="text-center mt-2">
          <Text type="secondary">If this link is expired, request another email verification link from account settings.</Text>
        </div>
      </Card>
    </div>
  );
};

export default EmailVerificationResult;