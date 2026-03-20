import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Typography, Tag, Table } from 'antd';
import {
  UserOutlined,
  DatabaseOutlined,
  RetweetOutlined,
  TrophyOutlined,
  FireOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
const { Title, Text } = Typography;
const getDashboardOverview = () => api.get('/dashboard/overview');
const getRecyclingAnalytics = (days = 7) => api.get('/admin/analytics/recycling', { params: { days } });
const normalizeMaterialKey = (value) => {
  const raw = String(value || 'unknown').toLowerCase().replace(/[_\s]+/g, '');

  if (raw.includes('plastic') || raw.includes('pet')) return 'plastic';
  if (raw.includes('aluminum') || raw.includes('aluminium')) return 'aluminum_cans';
  if (raw.includes('tin')) return 'tin_cans';
  if (raw.includes('glass')) return 'glass';
  if (raw.includes('mixed')) return 'mixed';
  return 'other';
};

const MATERIAL_LABELS = {
  plastic: 'PET/Plastic Bottles',
  tin_cans: 'Tin/Cans',
  aluminum_cans: 'Aluminum/Cans',
  glass: 'Glass',
  mixed: 'Mixed',
  other: 'Other',
};

const MATERIAL_COLORS = {
  plastic: '#22c55e',
  tin_cans: '#06b6d4',
  aluminum_cans: '#f59e0b',
  glass: '#8b5cf6',
  mixed: '#ef4444',
  other: '#64748b',
};

const Dashboard = () => {
  const dateWindow = 7;

  const { data: overview = {}, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    select: (res) => res.data?.data || {},
  });

  const { data: recyclingAnalytics = {}, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-recycling-analytics', dateWindow],
    queryFn: () => getRecyclingAnalytics(dateWindow),
    select: (res) => res.data?.data || {},
  });

  const totalUsers = overview?.total_users ?? 0;
  const activeKiosks = overview?.kiosks?.active ?? 0;
  const totalKiosks = overview?.kiosks?.total ?? 0;
  const recyclingWeight = overview?.recycling?.total_weight_kg ?? 0;

  const pointsInCirculation = Number(overview?.recycling?.accumulated_points ?? 0);
  const co2Saved = Number(overview?.co2_saved_kg ?? 0);
  const breakdown = useMemo(
    () => (Array.isArray(recyclingAnalytics?.breakdown) ? recyclingAnalytics.breakdown : []),
    [recyclingAnalytics],
  );
  const trends = useMemo(
    () => (Array.isArray(recyclingAnalytics?.trends) ? recyclingAnalytics.trends : []),
    [recyclingAnalytics],
  );

  const materialBreakdown = useMemo(() => {
    const map = new Map();

    breakdown.forEach((item) => {
      const key = normalizeMaterialKey(item.item_type);
      const count = Number(item.total_count || 0);
      map.set(key, (map.get(key) || 0) + count);
    });
   
    const rows = Array.from(map.entries()).map(([type, count]) => ({
      type,
      label: MATERIAL_LABELS[type] || 'Other',
      count,
    }));

    const totalCount = rows.reduce((sum, row) => sum + row.count, 0);

    return rows
      .sort((a, b) => b.count - a.count)
      .map((row) => ({
        ...row,
        color: MATERIAL_COLORS[row.type] || MATERIAL_COLORS.other,
        percent: totalCount > 0 ? (row.count / totalCount) * 100 : 0,
      }));
  }, [breakdown]);

  const totalMaterialItems = useMemo(() => {
    const fromBreakdown = Number(recyclingAnalytics?.breakdown_total_items || 0);
    if (fromBreakdown > 0) return fromBreakdown;
    const fromTotalItems = Number(recyclingAnalytics?.total_items || 0);
    if (fromTotalItems > 0) return fromTotalItems;
    return materialBreakdown.reduce((sum, row) => sum + Number(row.count || 0), 0);
  }, [recyclingAnalytics, materialBreakdown]);

  const topItem = useMemo(() => {
    if (!materialBreakdown.length) return { label: 'No data', count: 0 };
    const top = materialBreakdown[0];
    return { label: String(top.label || 'Unknown'), count: Number(top.count || 0) };
  }, [materialBreakdown]);

  const recyclingVelocity = useMemo(() => {
    if (!trends.length) return 0;

    const totalFromTrends = trends.reduce((sum, row) => {
      const value = row.count ?? row.total_count ?? row.total_items;
      return sum + Number(value || 0);
    }, 0);

    return trends.length > 0 ? totalFromTrends / trends.length : 0;
  }, [trends]);

  const materialChartData = useMemo(() => {
    if (materialBreakdown.length === 0) {
      return {
        conic: 'conic-gradient(#e2e8f0 0% 100%)',
        rows: [],
      };
    }

    let start = 0;
    const rows = materialBreakdown.map((row) => {
      const color = row.color;
      const end = start + row.percent;
      const segment = `${color} ${start}% ${end}%`;
      start = end;
      return { ...row, color, segment };
    });

    return {
      conic: `conic-gradient(${rows.map((row) => row.segment).join(', ')})`,
      rows,
    };
  }, [materialBreakdown]);

  // const transactionColumns = [
  //   {
  //     title: 'USER',
  //     dataIndex: 'user_name',
  //     key: 'user_name',
  //     render: (text) => <span className="font-medium text-slate-700">{text || '-'}</span>,
  //   },
  //   {
  //     title: 'KIOSK',
  //     dataIndex: 'kiosk',
  //     key: 'kiosk',
  //     render: (text) => text || 'N/A',
  //   },
  //   {
  //     title: 'ITEM',
  //     dataIndex: 'item_type',
  //     key: 'item_type',
  //     render: (text) => <Tag className="uppercase">{text || 'unknown'}</Tag>,
  //   },
  //   {
  //     title: 'WEIGHT',
  //     dataIndex: 'weight_kg',
  //     key: 'weight_kg',
  //     align: 'right',
  //     render: (value) => `${Number(value || 0).toFixed(2)} kg`,
  //   },
  //   {
  //     title: 'POINTS',
  //     dataIndex: 'points_earned',
  //     key: 'points_earned',
  //     align: 'right',
  //     render: (value) => <span className="text-green-600 font-semibold">+{Number(value || 0)} pts</span>,
  //   },
  //   {
  //     title: 'DATE',
  //     dataIndex: 'created_at',
  //     key: 'created_at',
  //     render: (value) => new Date(value).toLocaleString(),
  //   },
  // ];

  const statCardProps = {
    className: 'rounded-xl border border-slate-100 shadow-sm',
    styles: { body: { padding: '20px 24px' } },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Title level={3} className="!mb-1 text-slate-800">Super Admin Dashboard</Title>
        <Text className="text-slate-500">Overview and recycling analytics in one place.</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={overviewLoading} {...statCardProps}>
            <div className="flex justify-between items-start mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Users</Text>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <UserOutlined />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-slate-800">{totalUsers}</span>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1 text-slate-500">
              <span>Registered</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card {...statCardProps}>
            <div className="flex justify-between items-start mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Kiosks</Text>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <DatabaseOutlined />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-slate-800">{activeKiosks}/{totalKiosks}</span>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1 text-slate-500">
              <span>Network Status</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card {...statCardProps}>
            <div className="flex justify-between items-start mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Recycling</Text>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <RetweetOutlined />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-slate-800">{Number(recyclingWeight).toFixed(2)} <span className="text-2xl font-normal">kg</span></span>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1 text-slate-500">
              <span>Total Deposited</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={analyticsLoading} {...statCardProps}>
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
        <Col xs={24} lg={8}>
          <Card loading={analyticsLoading} {...statCardProps}>
            <div className="flex items-center justify-between mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Top Recycled Item</Text>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrophyOutlined />
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 via-yellow-50 to-white px-3 py-3">
              <div className="text-sm font-semibold text-slate-800 tracking-wide">{topItem.label}</div>
              <div className="text-xs text-slate-500 mt-1">Most collected material in the selected window</div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 leading-none">{topItem.count.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">total items</div>
              </div>
              <Tag className="bg-amber-50 border-amber-200 text-amber-700">Rank #1</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16} className="flex">
          <Card
            className="rounded-xl border border-slate-100 shadow-sm h-full w-full"
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
            loading={overviewLoading}
          >
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Impact</Text>
                <Tag className="bg-white border-emerald-200 text-emerald-700">Overview</Tag>
              </div>

              <div className="text-4xl font-bold text-slate-800 leading-none mb-2">
                {pointsInCirculation.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Points in circulation</div>

              <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                <div className="rounded-xl bg-white/90 border border-slate-100 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">CO2 Saved</div>
                  <div className="text-base font-semibold text-slate-700 mt-1">{co2Saved.toFixed(2)} kg</div>
                </div>
                <div className="rounded-xl bg-white/90 border border-slate-100 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Recycling</div>
                  <div className="text-base font-semibold text-slate-700 mt-1">{Number(recyclingWeight).toFixed(2)} kg</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10} className="flex">
          <Card
            className="rounded-xl border border-slate-100 shadow-sm h-full w-full"
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
            loading={analyticsLoading}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-800 tracking-wide">RECYCLING BY MATERIAL</span>
              <Tag className="bg-slate-50 border-slate-200 text-slate-600">Last {dateWindow} Days</Tag>
            </div>

            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="relative w-52 h-52 rounded-full" style={{ background: materialChartData.conic }}>
                <div className="absolute inset-6 rounded-full bg-white flex flex-col items-center justify-center border border-slate-100">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">Total</div>
                  <div className="text-2xl font-semibold text-slate-800">{Number(totalMaterialItems).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">items</div>
                </div>
              </div>

              <div className="w-full space-y-2">
                {materialChartData.rows.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center">No recycling data yet.</div>
                ) : (
                  materialChartData.rows.map((row) => (
                    <div key={row.type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="uppercase font-semibold">{row.label}</span>
                      </div>
                      <span className="text-slate-500">{Number(row.count || 0).toLocaleString()} items</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card loading={analyticsLoading} className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '24px' } }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-800 tracking-wide">ITEMIZED BREAKDOWN</span>
              <Tag className="bg-green-50 border-green-200 text-green-700">Collected</Tag>
            </div>

            <Table
              rowKey="type"
              columns={[
                {
                  title: 'Material Type',
                  dataIndex: 'label',
                  key: 'label',
                  render: (value) => <span className="font-semibold text-slate-700">{value}</span>,
                },
                {
                  title: 'Total Count',
                  dataIndex: 'count',
                  key: 'count',
                  align: 'right',
                  render: (value) => Number(value || 0).toLocaleString(),
                },
                {
                  title: '% of Total',
                  dataIndex: 'percent',
                  key: 'percent',
                  align: 'right',
                  render: (value) => `${Number(value || 0).toFixed(1)}%`,
                },
              ]}
              dataSource={materialBreakdown}
              pagination={false}
              scroll={{ x: 760 }}
              locale={{ emptyText: 'No item breakdown available' }}
            />
          </Card>
        </Col>
      </Row>

      {/* <Card className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '24px' } }}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg text-slate-800 tracking-wide">RECENT RECYCLING TRANSACTIONS</span>
          <Tag className="bg-slate-50 border-slate-200 text-slate-600">Limit 5</Tag>
        </div>

        <Table
          rowKey="id"
          columns={transactionColumns}
          dataSource={recentRecycling}
          pagination={false}
          scroll={{ x: 940 }}
          locale={{ emptyText: 'No recent recycling transactions' }}
        />
      </Card> */}
    </div>
  );
};

export default Dashboard;