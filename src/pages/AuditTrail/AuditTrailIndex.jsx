import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuditTrails } from './auditTrail.api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const methodColor = (method) => {
  switch (String(method || '').toUpperCase()) {
    case 'POST':
      return 'blue';
    case 'PUT':
      return 'gold';
    case 'PATCH':
      return 'purple';
    case 'DELETE':
      return 'red';
    default:
      return 'default';
  }
};

const statusColor = (status) => {
  const code = Number(status || 0);
  if (code >= 200 && code < 300) return 'green';
  if (code >= 300 && code < 400) return 'blue';
  if (code >= 400 && code < 500) return 'orange';
  if (code >= 500) return 'red';
  return 'default';
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
          <div className="font-medium text-slate-700">{record.actor_name || record.actor_user_id || 'System'}</div>
          <div className="text-xs text-slate-500">{record.actor_role || '-'}</div>
        </div>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'http_method',
      key: 'http_method',
      width: 100,
      render: (value) => <Tag color={methodColor(value)}>{String(value || '-').toUpperCase()}</Tag>,
    },
    {
      title: 'Path',
      dataIndex: 'route_path',
      key: 'route_path',
      render: (value) => <span className="text-slate-700">{value || '-'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status_code',
      key: 'status_code',
      width: 100,
      render: (value) => <Tag color={statusColor(value)}>{value || '-'}</Tag>,
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (value) => <span className="text-xs text-slate-500">{value || '-'}</span>,
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
            scroll={{ x: 950 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default AuditTrailIndex;
