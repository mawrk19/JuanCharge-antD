import React, { useState } from 'react';
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
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState([]); 
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

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Stubbing Auth values
  const userType = localStorage.getItem('user_type') || 'admin';
  const userName = cachedUser?.name || [cachedUser?.first_name, cachedUser?.last_name].filter(Boolean).join(' ') || 'Admin User';
  const userEmail = cachedUser?.email || '';
  const isAdmin = userType === 'admin';
  const isLguUser = userType === 'lgu' || userType === 'lgu_user';

  const getRoleLabel = () => {
    if (isAdmin) return "Administrator";
    if (isLguUser) return "LGU User";
    if (userType === 'patron') return "Patron";
    return "User";
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_type');
    window.location.href = '/login';
  };

  // Build menu items based on roles matching Vue Logic
  const getMenuItems = () => {
    const items = [];

    if (userType && !isLguUser) {
      items.push({ key: '/main/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' });
    }

    items.push(
      { key: '/main/recycling-analytics', icon: <RetweetOutlined />, label: 'Recycling Analytics' },
      { key: '/main/map', icon: <EnvironmentOutlined />, label: 'Map' },
      { key: '/main/users', icon: <TeamOutlined />, label: 'LGU Users' },
      { key: '/main/kiosks', icon: <ThunderboltOutlined />, label: 'Kiosks' },
      { key: '/main/lgus', icon: <BankOutlined />, label: 'LGUs' }
    );

    if (isAdmin) {
      items.push(
        { key: '/main/kiosks-users', icon: <UserOutlined />, label: 'Patrons' }
      );
    }

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
          <div className="text-xs text-slate-500">{userEmail || getRoleLabel()}</div>
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

  const onUserMenuClick = ({ key }) => {
    if (key === 'settings') {
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

  const handleSaveSettings = () => {
    if (passwordSettings.currentPassword || passwordSettings.newPassword || passwordSettings.confirmPassword) {
      if (!passwordSettings.currentPassword || !passwordSettings.newPassword || !passwordSettings.confirmPassword) {
        message.error('Please complete all password fields.');
        return;
      }

      if (passwordSettings.newPassword.length < 8) {
        message.error('New password must be at least 8 characters.');
        return;
      }

      if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
        message.error('New password and confirm password do not match.');
        return;
      }
    }

    const updatedUser = {
      ...(cachedUser || {}),
      first_name: profileSettings.firstName,
      last_name: profileSettings.lastName,
      email: profileSettings.email,
      phone_number: profileSettings.phone,
      name: [profileSettings.firstName, profileSettings.lastName].filter(Boolean).join(' ').trim(),
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('app_settings', JSON.stringify(appSettings));
    setPasswordSettings({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setSettingsVisible(false);
    message.success('Settings saved successfully.');
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
              <div className="mb-2 text-sm font-medium text-slate-700">Email Address</div>
              <Input
                placeholder="name@example.com"
                value={profileSettings.email}
                onChange={(e) => setProfileSettings((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Phone Number</div>
              <Input
                placeholder="Enter phone number"
                value={profileSettings.phone}
                onChange={(e) => setProfileSettings((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
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
          <Button type="link" size="small" className="text-green-600 font-semibold p-0 h-auto">
            Mark all read
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-slate-400">
          <BellOutlined className="text-3xl mb-2 block" />
          <div>No notifications</div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {/* Notifications Map would go here */}
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
          width={920}
          okText="Save Changes"
          styles={{ body: { padding: 0, minHeight: 460 } }}
        >
          <div className="flex h-full min-h-[460px]">
            <div className="w-[250px] border-r border-slate-200 bg-slate-50/70 p-3">
              <div className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preferences</div>
              <Menu
                mode="inline"
                selectedKeys={[activeSettingsSection]}
                items={settingsSections}
                onClick={({ key }) => setActiveSettingsSection(key)}
                style={{ background: 'transparent', borderInlineEnd: 0 }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {renderSettingsPanel()}
            </div>
          </div>
        </Modal>

        {/* Header (Standard Dark Blue like standard enterprise apps, or clean white) */}
            <Header 
              className="px-4 flex items-center justify-between shadow-sm z-10 sticky top-0" 
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
                className="hover:bg-slate-100 w-16 h-16 rounded-none text-lg"
                style={{ color: '#1e293b' }}
              />
            </div>
            
            <div className="md:hidden block">
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerVisible(true)}
                className="hover:bg-slate-100 w-16 h-16 rounded-none text-lg"
                style={{ color: '#1e293b' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pr-6">
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
          style={{
            margin: '24px 16px',
            padding: 24,
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
