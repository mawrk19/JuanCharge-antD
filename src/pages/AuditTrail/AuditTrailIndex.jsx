import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Input, Select, Space, Table, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuditTrails } from './auditTrail.api';
import { USER_KEY } from '../../services/authStorage';



const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const getCurrentUserName = () => {
  try{
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user.name || user.username || null;
  }catch {
    return null;
  }
  };

const getActorDisplayName = (record) => {
  const directName = record.actor_name || record.actor?.name || record.user?.name || 'System';
  if (directName && directName !== 'System') return directName;

  const isSuccessfulLogin =
    String(record.http_method || '').toUpperCase() === 'POST' &&
    String(record.route_path || '').toLowerCase().includes('/auth/login');
    Number(record.status_code) >= 200 &&
    Number(record.response_code) < 300;

  if (isSuccessfulLogin) {
    return getCurrentUserName() || 'Unknown User';
  }
  return 'System';
};

const getResourceLabel = (routePath = '') => {
  const path = String(routePath).toLowerCase();

  if (path.includes('/kiosk')) return 'Kiosk';
  if (path.includes('/lgu-users')) return 'lgu user';
  if (path.includes('/lgu')) return 'lgu';
  if (path.includes('/patron') || path.includes('/petron')) return 'patron';
  if (path.includes('/auth/login')) return 'login';
  if (path.includes('auth')) return 'account';

  return 'record';
};

const getActionVerb = (method = '', routePath = '') => {
  const m = String(method).toUpperCase();
  const path = String(routePath).toLowerCase();
  
  if (path.includes('/auth/login')) return 'logged in';

  if (m === 'POST') return 'added';
  if (m === 'PUT' || m === 'PATCH') return 'updated';
  if (m === 'DELETE') return 'deleted';
  
  return 'changed';
};
const buildActivityText = (record) => {
  const actor = getActorDisplayName(record);
  const verb = getActionVerb(record.http_method, record.route_path);
  const resource = getResourceLabel(record.route_path);

  if (verb === 'logged in') return actor + ' logged in';
  return actor + ' ' + verb + ' an ' + resource;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const AuditTrailIndex = () => {
  const [filters, setFilters] = useState({
    actor_user_id: undefined,
    http_method: undefined,
    route_path: '',
    date_from: undefined,
    date_to: undefined,
    per_page: 20,
    page: 1,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['audit-trails', filters],
    queryFn: () => getAuditTrails(filters),
    select: (res) => res.data?.data || res.data || {},
  });

  const rows = useMemo(() => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }, [response]);

  const paginationMeta = useMemo(() => {
    if (response?.meta) return response.meta;
    return {
      current_page: filters.page,
      per_page: filters.per_page,
      total: rows.length,
    };
  }, [response, filters, rows.length]);


  const columns = [
    {
      title: 'When',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (value) => <span className="text-xs text-slate-600">{formatDate(value)}</span>,
    },
    {
      title: 'Actor',
      key: 'actor',
      render: (_, record) => (
        <div>
          <div className="font-medium text-slate-700">{getActorDisplayName(record)}</div>
          <div className="text-xs text-slate-500">{record.actor_role || '-'}</div>
        </div>
      ),
    },
    {
      title: 'Activity',
      key: 'activity',
      render: (_, record) => <span className="text-slate-700">{buildActivityText(record)}</span>,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <Title level={3} className="!mb-1 text-slate-800">Audit Trail</Title>
        <Text className="text-slate-500">Track all write actions (POST, PUT, PATCH, DELETE) across the API.</Text>
      </div>

      <Card>
        <Space direction="vertical" size={12} className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Filter route path"
              value={filters.route_path}
              onChange={(e) => setFilters((prev) => ({ ...prev, route_path: e.target.value, page: 1 }))}
            />

            <Select
              allowClear
              placeholder="Method"
              value={filters.http_method}
              onChange={(value) => setFilters((prev) => ({ ...prev, http_method: value, page: 1 }))}
              options={[
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'PATCH', label: 'PATCH' },
                { value: 'DELETE', label: 'DELETE' },
              ]}
            />

            <Input
              placeholder="Actor User ID"
              value={filters.actor_user_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, actor_user_id: e.target.value || undefined, page: 1 }))}
            />

            <RangePicker
              className="w-full"
              value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
              onChange={(value) => {
                setFilters((prev) => ({
                  ...prev,
                  date_from: value?.[0] ? value[0].format('YYYY-MM-DD') : undefined,
                  date_to: value?.[1] ? value[1].format('YYYY-MM-DD') : undefined,
                  page: 1,
                }));
              }}
            />
          </div>

          <Table
            rowKey={(record) => record.id || `${record.created_at}-${record.route_path}-${record.actor_user_id}`}
            columns={columns}
            dataSource={rows}
            loading={isLoading}
            pagination={{
              current: paginationMeta.current_page || filters.page,
              pageSize: paginationMeta.per_page || filters.per_page,
              total: paginationMeta.total || rows.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, pageSize) => {
                setFilters((prev) => ({ ...prev, page, per_page: pageSize }));
              },
            }}
            scroll={{ x: 700 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default AuditTrailIndex;
