import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Select, Table, Tag, Typography } from 'antd';
import { DatabaseOutlined, FireOutlined, TrophyOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const getRecyclingAnalytics = (days) => api.get('/admin/analytics/recycling', { params: { days } });

const parseCount = (value) => Number(value || 0);

const normalizeMaterialKey = (value) => {
  const raw = String(value || 'unknown').toLowerCase().replace(/[_\s]+/g, '');

  if (raw.includes('plastic') || raw.includes('pet')) return 'plastic';
  if (raw.includes('aluminum') || raw.includes('aluminium')) return 'aluminum_cans';
  if (raw.includes('tin')) return 'tin_cans';
  if (raw.includes('glass')) return 'glass';
  if (raw.includes('mixed')) return 'mixed';
  return 'other';
};

const MATERIAL_META = {
  plastic: { material: 'Plastic Bottles', color: '#22c55e' },
  aluminum_cans: { material: 'Aluminum Cans', color: '#06b6d4' },
  tin_cans: { material: 'Tin Cans', color: '#f59e0b' },
  glass: { material: 'Glass', color: '#8b5cf6' },
  mixed: { material: 'Mixed', color: '#64748b' },
  other: { material: 'Other', color: '#ef4444' },
};

const RecyclingAnalytics = () => {
  const [dateWindow, setDateWindow] = useState(7);

  const { data: analytics = {}, isLoading } = useQuery({
    queryKey: ['recycling-analytics', dateWindow],
    queryFn: () => getRecyclingAnalytics(dateWindow),
    select: (res) => res.data?.data || {},
  });

  const totalItems = parseCount(analytics.total_items);
  const breakdown = Array.isArray(analytics.breakdown) ? analytics.breakdown : [];
  const trends = Array.isArray(analytics.trends) ? analytics.trends : [];

  const topItem = useMemo(() => {
    if (!breakdown.length) return { label: 'No data', count: 0 };

    const top = [...breakdown].sort((a, b) => parseCount(b.total_count) - parseCount(a.total_count))[0];
    return {
      label: String(top.item_type || 'Unknown').toUpperCase(),
      count: parseCount(top.total_count),
    };
  }, [breakdown]);

  const recyclingVelocity = useMemo(() => {
    if (!trends.length) return 0;

    const totalFromTrends = trends.reduce((sum, row) => {
      const value = row.count ?? row.total_count ?? row.total_items;
      return sum + parseCount(value);
    }, 0);

    return trends.length > 0 ? totalFromTrends / trends.length : 0;
  }, [trends]);

  const storageRows = useMemo(() => {
    const map = new Map();
    breakdown.forEach((row) => {
      const key = normalizeMaterialKey(row.item_type);
      map.set(key, (map.get(key) || 0) + parseCount(row.total_count));
    });

    const orderedKeys = ['plastic', 'aluminum_cans', 'tin_cans', 'glass', 'mixed', 'other'];

    return orderedKeys
      .map((key) => ({
        key,
        material: MATERIAL_META[key].material,
        color: MATERIAL_META[key].color,
        count: map.get(key) || 0,
      }))
      .filter((row) => row.count > 0);
  }, [breakdown]);

  const storageTotal = Number(analytics.breakdown_total_items || storageRows.reduce((sum, row) => sum + row.count, 0));

  const storageWithPercent = storageRows.map((row) => ({
    ...row,
    percent: storageTotal > 0 ? (row.count / storageTotal) * 100 : 0,
  }));

  const storageConic = useMemo(() => {
    if (!storageWithPercent.some((row) => row.count > 0)) {
      return 'conic-gradient(#e2e8f0 0% 100%)';
    }

    let start = 0;
    const parts = storageWithPercent.map((row) => {
      const end = start + row.percent;
      const part = `${row.color} ${start}% ${end}%`;
      start = end;
      return part;
    });

    return `conic-gradient(${parts.join(', ')})`;
  }, [storageWithPercent]);

  const tableData = storageWithPercent.map((row) => ({
    key: row.key,
    material: row.material,
    totalCount: row.count,
    percent: row.percent,
    status: 'Collected',
  }));

  const columns = [
    {
      title: 'Material Type',
      dataIndex: 'material',
      key: 'material',
      render: (value) => <span className="font-semibold text-slate-700">{value}</span>,
    },
    {
      title: 'Total Count',
      dataIndex: 'totalCount',
      key: 'totalCount',
      align: 'right',
    },
    {
      title: '% of Total',
      dataIndex: 'percent',
      key: 'percent',
      align: 'right',
      render: (value) => `${value.toFixed(1)}%`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (value) => <Tag color="green">{value}</Tag>,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Title level={3} className="!mb-1 text-slate-800">Recycling Analytics</Title>
        <Text className="text-slate-500">Track material recovery performance and collection composition.</Text>
        <div className="mt-3">
          <Select
            value={dateWindow}
            onChange={setDateWindow}
            options={[
              { value: 7, label: 'Last 7 Days' },
              { value: 30, label: 'Last 30 Days' },
            ]}
            className="w-40"
          />
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card loading={isLoading} className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '20px 24px' } }}>
            <div className="flex justify-between items-center mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Items Recycled</Text>
              <DatabaseOutlined className="text-slate-400" />
            </div>
            <div className="text-4xl font-semibold text-slate-800">{totalItems.toLocaleString()}</div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card loading={isLoading} className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '20px 24px' } }}>
            <div className="flex justify-between items-center mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Top Recycled Item</Text>
              <TrophyOutlined className="text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-800">{topItem.label}</div>
            <div className="text-sm text-slate-500 mt-2">{topItem.count.toLocaleString()} total items</div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card loading={isLoading} className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '20px 24px' } }}>
            <div className="flex justify-between items-center mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Recycling Velocity / Day</Text>
              <FireOutlined className="text-slate-400" />
            </div>
            <div className="text-4xl font-semibold text-slate-800">{recyclingVelocity.toFixed(1)}</div>
            <div className="text-sm text-slate-500 mt-2">Average items collected per day</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <Card loading={isLoading} className="rounded-xl border border-slate-100 shadow-sm h-full" styles={{ body: { padding: '24px' } }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-800 tracking-wide">Storage Distribution</span>
              <Tag className="bg-slate-50 border-slate-200 text-slate-600">{dateWindow} days</Tag>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative w-52 h-52 rounded-full" style={{ background: storageConic }}>
                <div className="absolute inset-7 rounded-full bg-white border border-slate-100 flex flex-col items-center justify-center">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                  <div className="text-3xl font-semibold text-slate-800">{storageTotal}</div>
                  <div className="text-xs text-slate-500">items</div>
                </div>
              </div>

              <div className="w-full space-y-2">
                {storageWithPercent.map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span>{row.material}</span>
                    </div>
                    <span className="text-slate-500">{row.count} ({row.percent.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card loading={isLoading} className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '24px' } }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-800 tracking-wide">Itemized Breakdown</span>
              <Tag className="bg-green-50 border-green-200 text-green-700">Collected</Tag>
            </div>

            <Table
              rowKey="key"
              columns={columns}
              dataSource={tableData}
              pagination={false}
              scroll={{ x: 760 }}
              locale={{ emptyText: 'No item breakdown available' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RecyclingAnalytics;
