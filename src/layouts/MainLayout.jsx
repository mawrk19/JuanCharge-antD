import React, { useEffect, useState } from 'react';
import { Layout, Menu, Badge, Dropdown, Button, Avatar, Drawer, Modal, Switch, Select, Input, message, theme } from 'antd';
import { 
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BellOutlined, 
  UserOutlined,
  DashboardOutlined,
  RetweetOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  BankOutlined,
  FileSearchOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import {
  clearAuthSession,
  getStoredRole,
  isManagementRole,
  isSuperAdminRole,
} from '../services/authStorage';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState([]); 
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState('appearance');
  const [appSettings, setAppSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('app_settings');
      if (!raw) {
        return {
          compactSidebar: false,
          notificationsEnabled: true,
          emailNotifications: true,
          defaultPage: '/main/dashboard',
          mapAutoLocate: true,
          kioskRefreshInterval: '30',
        };
      }
      return JSON.parse(raw);
    } catch {
      return {
        compactSidebar: false,
        notificationsEnabled: true,
        emailNotifications: true,
        defaultPage: '/main/dashboard',
        mapAutoLocate: true,
        kioskRefreshInterval: '30',
      };
    }
  });
  const navigate = useNavigate();
  const location = useLocation();

  const getCachedUser = () => {
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return null;
      return JSON.parse(rawUser);
    } catch (err) {
      console.error('Failed to parse cached user:', err);
      return null;
    }
  };

  const cachedUser = getCachedUser();
  const [profileSettings, setProfileSettings] = useState(() => ({
    firstName: cachedUser?.first_name || '',
    lastName: cachedUser?.last_name || '',
    email: cachedUser?.email || '',
    phone: cachedUser?.phone_number || cachedUser?.phone || '',
  }));
  const [passwordSettings, setPasswordSettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [verificationSettings, setVerificationSettings] = useState(() => ({
    newEmail: '',
    emailCurrentPassword: '',
    phoneNumber: cachedUser?.phone_number || cachedUser?.phone || '',
    phoneOtp: '',
  }));
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);
  const [sendPhoneOtpLoading, setSendPhoneOtpLoading] = useState(false);
  const [verifyPhoneOtpLoading, setVerifyPhoneOtpLoading] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const userType = getStoredRole() || 'super_admin';
  const userName = cachedUser?.name || [cachedUser?.first_name, cachedUser?.last_name].filter(Boolean).join(' ') || 'Admin User';
  const userEmail = cachedUser?.email || '';
  const isAdmin = isSuperAdminRole(userType);
  const isLguAdmin = userType === 'lgu_admin';
  const isLguStaff = userType === 'lgu_staff';
  const isLguTechnician = userType === 'lgu_technician';

  const normalizeNotificationsPayload = (payload) => {
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
          ? payload.data.data
          : [];

    return rows.map((item) => ({
      id: item.id,
      title: item.title || item.subject || 'Collection Notification',
      message: item.message || item.body || 'No details provided.',
      read: Boolean(item.read_at),
      created_at: item.created_at,
    }));
  };

  const fetchNotifications = async ({ silent = false } = {}) => {
    if (!isManagementRole(userType) || !appSettings.notificationsEnabled) {
      setNotifications([]);
      return;
    }

    if (!silent) {
      setNotificationsLoading(true);
    }

    try {
      const response = await api.get('/collection-notifications');
      const normalized = normalizeNotificationsPayload(response?.data);
      setNotifications(normalized);
    } catch (error) {
      console.error('Failed to fetch topbar notifications:', error);
    } finally {
      if (!silent) {
        setNotificationsLoading(false);
      }
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await api.post(`/collection-notifications/${id}/read`);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch (error) {
      await showErrorAlert(error, 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    try {
      await Promise.all(unreadIds.map((id) => api.post(`/collection-notifications/${id}/read`)));
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      message.success('All notifications marked as read.');
    } catch (error) {
      await showErrorAlert(error, 'Failed to mark all notifications as read.');
    }
  };

  useEffect(() => {
    if (!isManagementRole(userType) || !appSettings.notificationsEnabled) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    const pollId = window.setInterval(() => {
      fetchNotifications({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [userType, appSettings.notificationsEnabled]);

  const getRoleLabel = () => {
    if (isAdmin) return "Administrator";
    if (userType === 'lgu_admin') return "LGU Admin";
    if (userType === 'lgu_staff') return "LGU Staff";
    if (userType === 'lgu_technician') return "LGU Technician";
    if (userType === 'kiosk_user') return "Kiosk User";
    return "User";
  };

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  // Build menu items based on roles matching Vue Logic
  const getMenuItems = () => {
    if (!isManagementRole(userType)) {
      return [];
    }

    if (isLguStaff || isLguTechnician) {
      return [
        { key: '/main/recycling-analytics', icon: <RetweetOutlined />, label: 'Recycling Analytics' },
        { key: '/main/map', icon: <EnvironmentOutlined />, label: 'Map' },
        { key: '/main/kiosks', icon: <ThunderboltOutlined />, label: 'Kiosks' },
      ];
    }

    if (isLguAdmin) {
      return [
        { key: '/main/recycling-analytics', icon: <RetweetOutlined />, label: 'Recycling Analytics' },
        { key: '/main/map', icon: <EnvironmentOutlined />, label: 'Map' },
        { key: '/main/users', icon: <TeamOutlined />, label: 'LGU Users' },
        { key: '/main/kiosks', icon: <ThunderboltOutlined />, label: 'Kiosks' },
      ];
    }

    const items = [
      { key: '/main/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/main/map', icon: <EnvironmentOutlined />, label: 'Map' },
      { key: '/main/lgus', icon: <BankOutlined />, label: 'Local Government Unit' }, //Lgu
      { key: '/main/users', icon: <TeamOutlined />, label: 'LGU Admin' },//LguUsers
      // { key: '/main/kiosks', icon: <ThunderboltOutlined />, label: 'Kiosks' }, hides the kiosk menu for super admin
      { key: '/main/kiosks-users', icon: <UserOutlined />, label: 'Patrons' },
      { key: '/main/audit-trails', icon: <FileSearchOutlined />, label: 'Audit Trail' },
    ];

    return items;
  };

  const menuItems = getMenuItems();

  const onMenuClick = ({ key }) => {
    navigate(key);
    setMobileDrawerVisible(false);
  };

  const userMenuItems = [
    {
      key: 'profile-meta',
      disabled: true,
      label: (
        <div className="px-1 py-1">
          <div className="font-bold text-slate-800">{userName}</div>
          <div className="text-xs text-slate-500">{getRoleLabel()}</div>
          {userEmail ? <div className="text-xs text-slate-400">{userEmail}</div> : null}
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span className="text-red-600">Logout</span>,
    },
  ];

  const onUserMenuClick = async ({ key }) => {
    if (key === 'settings') {
      try {
        await refreshCurrentUserFromApi();
      } catch (error) {
        // Keep settings accessible even if refresh fails.
        await showErrorAlert(error, 'Could not refresh your latest account details.');
      }
      setSettingsVisible(true);
      return;
    }
    if (key === 'logout') {
      handleLogout();
    }
  };

  const settingsSections = [
    {
      type: 'group',
      label: 'Account',
      children: [
        { key: 'account', label: 'User Settings' },
        { key: 'security', label: 'Update Password' },
      ],
    },
    {
      type: 'group',
      label: 'Application',
      children: [
        { key: 'appearance', label: 'Appearance' },
        { key: 'notifications', label: 'Notifications' },
        { key: 'defaults', label: 'Defaults' },
        { key: 'map', label: 'Map' },
      ],
    },
  ];

  const updateAppSetting = (key, value) => {
    setAppSettings((prev) => ({ ...prev, [key]: value }));
  };

  const getErrorMessages = (error, fallbackMessage) => {
    const lines = [];
    const responseData = error?.response?.data;

    if (responseData?.message) {
      lines.push(responseData.message);
    }

    if (responseData?.errors && typeof responseData.errors === 'object') {
      Object.values(responseData.errors).forEach((entry) => {
        if (Array.isArray(entry)) {
          entry.forEach((item) => item && lines.push(String(item)));
          return;
        }

        if (entry) {
          lines.push(String(entry));
        }
      });
    }

    const uniqueLines = [...new Set(lines.filter(Boolean))];
    return uniqueLines.length > 0 ? uniqueLines : [fallbackMessage];
  };

  const showErrorAlert = async (error, fallbackMessage) => {
    const messages = getErrorMessages(error, fallbackMessage);
    await Swal.fire({
      icon: 'error',
      title: 'Request Failed',
      html: `<div style="text-align:left"><ul style="padding-left:20px;margin:0">${messages
        .map((line) => `<li>${line}</li>`)
        .join('')}</ul></div>`,
    });
  };

  const showValidationAlert = async (text) => {
    await Swal.fire({
      icon: 'error',
      title: 'Validation Error',
      text,
    });
  };

  const mergeUserToCache = (userFromApi) => {
    if (!userFromApi || typeof userFromApi !== 'object') {
      return;
    }

    const mergedUser = {
      ...(cachedUser || {}),
      ...userFromApi,
    };

    localStorage.setItem('user', JSON.stringify(mergedUser));

    setProfileSettings((prev) => ({
      ...prev,
      firstName: mergedUser.first_name || prev.firstName,
      lastName: mergedUser.last_name || prev.lastName,
      email: mergedUser.email || prev.email,
      phone: mergedUser.phone_number || mergedUser.phone || prev.phone,
    }));

    setVerificationSettings((prev) => ({
      ...prev,
      phoneNumber: mergedUser.phone_number || mergedUser.phone || prev.phoneNumber,
    }));
  };

  const refreshCurrentUserFromApi = async () => {
    const candidateEndpoints = ['/auth/validate', '/auth/validpate', '/auth/profile'];
    let lastError = null;

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await api.get(endpoint);
        const payload = response?.data;
        const userFromApi = payload?.data?.user || payload?.user || payload?.data;

        if (userFromApi && typeof userFromApi === 'object') {
          mergeUserToCache(userFromApi);
          return userFromApi;
        }
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;

        // Try fallback endpoints for route mismatch across environments.
        if (status === 404 || status === 405) {
          continue;
        }

        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    return null;
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);

    try {
      if (activeSettingsSection === 'account') {
        const firstName = profileSettings.firstName.trim();
        const lastName = profileSettings.lastName.trim();

        if (!firstName || !lastName) {
          await showValidationAlert('First name and last name are required.');
          return;
        }

        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        const response = await api.put('/auth/profile', {
          first_name: firstName,
          last_name: lastName,
          name: fullName,
        });

        const apiUser = response?.data?.data || response?.data?.user;
        mergeUserToCache(apiUser || {
          first_name: firstName,
          last_name: lastName,
          name: fullName,
        });

        localStorage.setItem('app_settings', JSON.stringify(appSettings));
        setSettingsVisible(false);
        message.success('Profile updated successfully.');
        return;
      }

      if (activeSettingsSection === 'security') {
        if (!passwordSettings.currentPassword || !passwordSettings.newPassword || !passwordSettings.confirmPassword) {
          await showValidationAlert('Please complete all password fields.');
          return;
        }

        if (passwordSettings.newPassword.length < 8) {
          await showValidationAlert('New password must be at least 8 characters.');
          return;
        }

        if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
          await showValidationAlert('New password and confirm password do not match.');
          return;
        }

        await api.post('/auth/change-password', {
          current_password: passwordSettings.currentPassword,
          new_password: passwordSettings.newPassword,
          new_password_confirmation: passwordSettings.confirmPassword,
        });

        setPasswordSettings({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSettingsVisible(false);
        message.success('Password changed successfully. Please log in again.');
        handleLogout();
        return;
      }

      localStorage.setItem('app_settings', JSON.stringify(appSettings));
      setSettingsVisible(false);
      message.success('Settings saved successfully.');
    } catch (error) {
      await showErrorAlert(error, 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleEmailChangeRequest = async () => {
    if (!verificationSettings.newEmail.trim()) {
      await showValidationAlert('Please enter your new email address.');
      return;
    }

    if (!verificationSettings.emailCurrentPassword) {
      await showValidationAlert('Please enter your current password to change email.');
      return;
    }

    setEmailVerificationLoading(true);

    try {
      await api.post('/auth/email/change-request', {
        new_email: verificationSettings.newEmail.trim(),
        current_password: verificationSettings.emailCurrentPassword,
      });

      setVerificationSettings((prev) => ({
        ...prev,
        emailCurrentPassword: '',
      }));

      message.success('Verification link sent to your new email address.');
    } catch (error) {
      await showErrorAlert(error, 'Failed to request email change.');
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!verificationSettings.phoneNumber.trim()) {
      await showValidationAlert('Please enter a phone number.');
      return;
    }

    setSendPhoneOtpLoading(true);

    try {
      await api.post('/auth/phone/verification/send-otp', {
        phone_number: verificationSettings.phoneNumber.trim(),
      });

      message.success('OTP sent successfully.');
    } catch (error) {
      await showErrorAlert(error, 'Failed to send OTP.');
    } finally {
      setSendPhoneOtpLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!verificationSettings.phoneNumber.trim() || !verificationSettings.phoneOtp.trim()) {
      await showValidationAlert('Please provide phone number and OTP code.');
      return;
    }

    setVerifyPhoneOtpLoading(true);

    try {
      const response = await api.post('/auth/phone/verification/verify-otp', {
        phone_number: verificationSettings.phoneNumber.trim(),
        otp: verificationSettings.phoneOtp.trim(),
      });

      const apiUser = response?.data?.data || response?.data?.user;
      mergeUserToCache(apiUser || {
        phone_number: verificationSettings.phoneNumber.trim(),
      });

      setProfileSettings((prev) => ({
        ...prev,
        phone: verificationSettings.phoneNumber.trim(),
      }));

      setVerificationSettings((prev) => ({
        ...prev,
        phoneOtp: '',
      }));

      message.success('Phone number verified successfully.');
    } catch (error) {
      await showErrorAlert(error, 'Failed to verify OTP.');
    } finally {
      setVerifyPhoneOtpLoading(false);
    }
  };

  const renderSettingsPanel = () => {
    if (activeSettingsSection === 'account') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-800">User Settings</h3>
            <p className="text-sm text-slate-500">Manage your personal account details.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">First Name</div>
              <Input
                placeholder="Enter first name"
                value={profileSettings.firstName}
                onChange={(e) => setProfileSettings((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Last Name</div>
              <Input
                placeholder="Enter last name"
                value={profileSettings.lastName}
                onChange={(e) => setProfileSettings((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Current Email Address</div>
              <Input
                placeholder="name@example.com"
                value={profileSettings.email}
                disabled
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Current Phone Number</div>
              <Input
                placeholder="Enter phone number"
                value={profileSettings.phone}
                disabled
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div>
              <div className="font-medium text-slate-800">Change Email (Verification Link)</div>
              <div className="text-sm text-slate-500">We will send a verification link to your new email address.</div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                placeholder="New email address"
                value={verificationSettings.newEmail}
                onChange={(e) => setVerificationSettings((prev) => ({ ...prev, newEmail: e.target.value }))}
              />
              <Input.Password
                placeholder="Current password"
                value={verificationSettings.emailCurrentPassword}
                onChange={(e) => setVerificationSettings((prev) => ({ ...prev, emailCurrentPassword: e.target.value }))}
              />
            </div>
            <Button type="primary" onClick={handleEmailChangeRequest} loading={emailVerificationLoading}>
              Send Verification Link
            </Button>
          </div>
        </div>
      );
    }

    if (activeSettingsSection === 'security') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Update Password</h3>
            <p className="text-sm text-slate-500">Enter your current password and choose a new one.</p>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Current Password</div>
            <Input.Password
              placeholder="Enter current password"
              value={passwordSettings.currentPassword}
              onChange={(e) => setPasswordSettings((prev) => ({ ...prev, currentPassword: e.target.value }))}
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">New Password</div>
            <Input.Password
              placeholder="Enter new password"
              value={passwordSettings.newPassword}
              onChange={(e) => setPasswordSettings((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Confirm New Password</div>
            <Input.Password
              placeholder="Confirm new password"
              value={passwordSettings.confirmPassword}
              onChange={(e) => setPasswordSettings((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
        </div>
      );
    }

    if (activeSettingsSection === 'appearance') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Appearance</h3>
            <p className="text-sm text-slate-500">Adjust how the admin workspace feels and behaves.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <div className="font-medium text-slate-800">Compact Sidebar</div>
              <div className="text-sm text-slate-500">Keep navigation in a tighter layout by default.</div>
            </div>
            <Switch
              checked={appSettings.compactSidebar}
              onChange={(checked) => updateAppSetting('compactSidebar', checked)}
            />
          </div>
        </div>
      );
    }

    if (activeSettingsSection === 'notifications') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Notifications</h3>
            <p className="text-sm text-slate-500">Control in-app and email alerts.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <div className="font-medium text-slate-800">In-app Notifications</div>
              <div className="text-sm text-slate-500">Show alerts in the topbar bell icon.</div>
            </div>
            <Switch
              checked={appSettings.notificationsEnabled}
              onChange={(checked) => updateAppSetting('notificationsEnabled', checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <div className="font-medium text-slate-800">Email Notifications</div>
              <div className="text-sm text-slate-500">Receive daily summary emails.</div>
            </div>
            <Switch
              checked={appSettings.emailNotifications}
              onChange={(checked) => updateAppSetting('emailNotifications', checked)}
            />
          </div>
        </div>
      );
    }

    if (activeSettingsSection === 'defaults') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Defaults</h3>
            <p className="text-sm text-slate-500">Choose startup and refresh preferences.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 font-medium text-slate-800">Default Landing Page</div>
            <Select
              className="w-full"
              value={appSettings.defaultPage}
              options={menuItems.map((item) => ({ label: item.label, value: item.key }))}
              onChange={(value) => updateAppSetting('defaultPage', value)}
            />
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 font-medium text-slate-800">Kiosk Data Refresh Interval</div>
            <Select
              className="w-full"
              value={appSettings.kioskRefreshInterval}
              options={[
                { label: '15 seconds', value: '15' },
                { label: '30 seconds', value: '30' },
                { label: '60 seconds', value: '60' },
              ]}
              onChange={(value) => updateAppSetting('kioskRefreshInterval', value)}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Map</h3>
          <p className="text-sm text-slate-500">Set map behavior defaults.</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <div className="font-medium text-slate-800">Auto-detect Current Location</div>
            <div className="text-sm text-slate-500">Use geolocation when opening map and directions.</div>
          </div>
          <Switch
            checked={appSettings.mapAutoLocate}
            onChange={(checked) => updateAppSetting('mapAutoLocate', checked)}
          />
        </div>
      </div>
    );
  };

  const notifMenu = (
    <div className="w-[350px] max-h-[400px] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 p-0">
      <div className="flex justify-between items-center p-4 border-b border-slate-100">
        <span className="font-bold text-slate-800">Notifications</span>
        {notifications.filter(n => !n.read).length > 0 && (
          <Button
            type="link"
            size="small"
            className="text-green-600 font-semibold p-0 h-auto"
            onClick={handleMarkAllNotificationsRead}
          >
            Mark all read
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-slate-400">
          <BellOutlined className="text-3xl mb-2 block" />
          <div>{notificationsLoading ? 'Loading notifications...' : 'No notifications'}</div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((item) => (
            <div key={item.id} className={`p-3 ${item.read ? 'bg-white' : 'bg-emerald-50/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{item.message}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                  </div>
                </div>
                {!item.read && (
                  <Button type="link" size="small" className="p-0 h-auto" onClick={() => handleMarkNotificationRead(item.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const sidebarContent = (
    <>
      <div className="h-16 m-4 flex items-center justify-center font-bold text-white text-xl uppercase tracking-wider overflow-hidden">
        <img src="/logo.png" alt="JuanCharge logo" className="h-9 w-9 object-contain mr-2" />
        {!collapsed && <span>JuanCharge</span>}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={onMenuClick}
        style={{ 
          backgroundColor: 'transparent',
        }}
      />
    </>
  );

  return (
    <Layout className="min-h-screen">
      {/* Desktop Sidebar */}
      <Sider 
        width={250}
        trigger={null} // Keeps the default toggle hidden
        collapsible 
        collapsed={collapsed} // Controlled by your React state
        onCollapse={(value) => setCollapsed(value)} // Updates state if triggered externally
        className="hidden md:block shadow-lg z-20"
        style={{
          backgroundColor: '#1E3E34',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        {sidebarContent}
      </Sider>

      {/* Mobile Drawer Sidebar */}
      <Drawer
        placement="left"
        closable={false}
        size="default"
        onClose={() => setMobileDrawerVisible(false)}
        open={mobileDrawerVisible}
        styles={{
          wrapper: { width: 250 },
          body: { padding: 0, backgroundColor: '#1E3E34' },
        }}
        className="md:hidden"
      >
        <div className="flex items-center justify-center font-bold text-white text-xl uppercase tracking-wider overflow-hidden py-6 mt-2">
          <img src="/logo.png" alt="JuanCharge logo" className="h-9 w-9 object-contain mr-2" />
          <span>JuanCharge</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={onMenuClick}
          style={{ backgroundColor: 'transparent' }}
        />
      </Drawer>

      <Layout>
        <Modal
          title="Settings"
          open={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          onOk={handleSaveSettings}
          confirmLoading={settingsSaving}
          width="min(920px, calc(100vw - 24px))"
          okText="Save Changes"
          styles={{ body: { padding: 0, minHeight: 460 } }}
        >
          <div className="flex h-full min-h-[460px] flex-col md:flex-row">
            <div className="w-full md:w-[250px] border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 p-3">
              <div className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preferences</div>
              <Menu
                mode="inline"
                selectedKeys={[activeSettingsSection]}
                items={settingsSections}
                onClick={({ key }) => setActiveSettingsSection(key)}
                style={{ background: 'transparent', borderInlineEnd: 0 }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {renderSettingsPanel()}
            </div>
          </div>
        </Modal>

        {/* Header (Standard Dark Blue like standard enterprise apps, or clean white) */}
            <Header 
              className="px-3 sm:px-4 flex items-center justify-between shadow-sm z-10 sticky top-0" 
              style={{ 
                padding: 0, 
                background: colorBgContainer, // This uses the white from your theme tokens
                display: 'flex',
                alignItems: 'center'
              }}>
              <div className="flex items-center text-slate-800">
            <div className="hidden md:block">
              <Button
                type="text"
                // Swaps the "Fold" and "Unfold" icons visually
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="hover:bg-slate-100 w-14 h-14 md:w-16 md:h-16 rounded-none text-lg"
                style={{ color: '#1e293b' }}
              />
            </div>
            
            <div className="md:hidden block">
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerVisible(true)}
                className="hover:bg-slate-100 w-14 h-14 rounded-none text-lg"
                style={{ color: '#1e293b' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pr-3 sm:pr-6">
            <Dropdown popupRender={() => notifMenu} trigger={['click']} placement="bottomRight">
              <Badge count={notifications.filter(n => !n.read).length} size="small" offset={[-4, 4]}>
                <span className="text-slate-600 hover:text-slate-900 cursor-pointer text-xl p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <BellOutlined />
                </span>
              </Badge>
            </Dropdown>

            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{ items: userMenuItems, onClick: onUserMenuClick }}
            >
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-3 py-1 rounded-full transition-colors">
                <Avatar 
                  size={32} 
                  icon={<UserOutlined />} 
                  className="bg-green-600 border border-green-700/20 shadow-sm"
                />
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Dynamic Page Content */}
        <Content
          className="m-3 p-3 sm:m-4 sm:p-4 lg:m-6 lg:p-6"
          style={{
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
            <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
