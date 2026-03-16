import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
// import useAuthStore from '../../store/useAuthStore'; // Auth Store (Next milestone)

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Using zu-stand store later, stubbing for now
  // const login = useAuthStore((state) => state.login);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // Actual API call matching original Vuex
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password
      });

      const { token, user } = response.data;
      
      if (!token) {
        throw new Error("Authentication failed: Token not received");
      }

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_type', user.user_type);
      
      // Update global store (stubbed for now)
      // login(user, token);

      message.success('Welcome back!');

      // Role based redirection
      const userType = user.user_type ? user.user_type.toLowerCase() : null;
      if (userType === 'patron' || userType === 'kiosk_user') {
        navigate('/patron');
      } else if (userType === 'lgu' || userType === 'lgu_user') {
        navigate('/main/users');
      } else {
        navigate('/main/dashboard'); // Admin fallback
      }

    } catch (e) {
      let errorMessage = 'Login failed. Please check your credentials.';
      if (e.response?.status === 401) {
        errorMessage = e.response?.data?.message || 'Invalid credentials. Please check your email and password.';
      } else if (e.response?.data?.message) {
        errorMessage = e.response.data.message;
      }
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-slate-50">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-green-500/40 blur-[80px] rounded-full animate-pulse blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-green-700/30 blur-[80px] rounded-full animate-pulse delay-700 blur-3xl opacity-60"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-green-300/30 blur-[80px] rounded-full animate-bounce blur-3xl opacity-60"></div>
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-10"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[420px] rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)] relative z-20 bg-white/85 backdrop-blur-xl border border-white/60 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/20 rounded-3xl -z-10"></div>
        
        <div className="relative z-10 p-8 pb-10">
          {/* Logo & Header */}
          <div className="text-center pb-8">
            <div className="w-[90px] h-[90px] mx-auto flex items-center justify-center rounded-[20px] bg-gradient-to-br from-white to-green-50 shadow-[0_10px_25px_-5px_rgba(22,163,74,0.15),0_0_0_1px_rgba(22,163,74,0.1)] p-3 mb-4">
              <img src="/logo.png" alt="JuanCharge logo" className="h-full w-full object-contain" />
            </div>
            <div className="font-sans text-[28px] font-extrabold text-[#1a1a1a] tracking-tight mt-2 bg-gradient-to-br from-green-600 to-green-800 bg-clip-text text-transparent">
              JuanCharge
            </div>
            <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Powering Every Juan.
            </div>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label={<span className="text-[13px] font-semibold text-slate-700 ml-1">Email Address</span>}
              rules={[{ required: true, message: 'Please input your email!' }, { type: 'email', message: 'Invalid email' }]}
              className="mb-6"
            >
              <Input 
                prefix={<MailOutlined className="text-slate-400 mr-1" />} 
                placeholder="name@example.com" 
                size="large"
                className="h-12 rounded-xl border-slate-200 hover:border-slate-300 focus:border-green-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-medium"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-[13px] font-semibold text-slate-700 ml-1">Password</span>}
              rules={[{ required: true, message: 'Please input your password!' }]}
              className="mb-4"
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400 mr-1" />}
                placeholder="Enter your password"
                size="large"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined className="text-slate-400" />)}
                className="h-12 rounded-xl border-slate-200 hover:border-slate-300 focus:border-green-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-medium [&>span.ant-input-password-icon]:text-slate-400"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-8">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="text-slate-600 text-sm font-medium">Remember me</Checkbox>
              </Form.Item>
              <Link className="text-[13px] font-semibold text-slate-500 hover:text-green-500 transition-colors" to="/forgot-password">
                Forgot Password?
              </Link>
            </div>

            <Form.Item className="mb-0">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                className="w-full h-[52px] rounded-[14px] text-base font-bold tracking-wide bg-gradient-to-br from-green-600 to-green-800 border-none shadow-[0_4px_12px_rgba(22,163,74,0.25)] hover:shadow-[0_8px_20px_rgba(22,163,74,0.35)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-xs font-medium text-slate-400 z-10 w-full text-center">
        <span>© 2026 JuanCharge. All rights reserved.</span>
      </div>
    </div>
  );
};

export default Login;
