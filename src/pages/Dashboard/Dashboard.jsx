import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Typography, Tag, Table } from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  RetweetOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const getDashboardOverview = () => api.get('/dashboard/overview');
const getRecentRecycling = () => api.get('/dashboard/recycling?limit=5');

const Dashboard = () => {
  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    select: (res) => res.data?.data || {},
  });

  const { data: recentRecycling = [], isLoading: recentRecyclingLoading } = useQuery({
    queryKey: ['dashboard-recent-recycling', 5],
    queryFn: getRecentRecycling,
    select: (res) => (Array.isArray(res.data?.data) ? res.data.data : []),
  });

  const totalUsers = overview?.total_users ?? 0;
  const activeKiosks = overview?.kiosks?.active ?? 0;
  const totalKiosks = overview?.kiosks?.total ?? 0;
  const totalEnergy = overview?.charging?.total_energy_kwh ?? 0;
  const recyclingWeight = overview?.recycling?.total_weight_kg ?? 0;
  const recyclingDrops = overview?.recycling?.total_deposits ?? 0;

  const pointsInCirculation = Number(overview?.points_in_circulation ?? 0);
  const co2Saved = Number(overview?.co2_saved_kg ?? 0);

  const materialBreakdown = useMemo(() => {
    const map = new Map();

    recentRecycling.forEach((item) => {
      const key = item.item_type || 'unknown';
      const weight = Number(item.weight_kg || 0);
      map.set(key, (map.get(key) || 0) + weight);
    });

    const rows = Array.from(map.entries()).map(([type, weight]) => ({
      type,
      weight,
    }));

    const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
    return rows
      .sort((a, b) => b.weight - a.weight)
      .map((row) => ({
        ...row,
        percent: totalWeight > 0 ? (row.weight / totalWeight) * 100 : 0,
      }));
  }, [recentRecycling]);

  const pointsTrend = useMemo(() => {
    const rows = [...recentRecycling].reverse();
    const maxPoints = rows.reduce((max, row) => Math.max(max, Number(row.points_earned || 0)), 0);

    return rows.map((row) => ({
      id: row.id,
      label: new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      points: Number(row.points_earned || 0),
      height: maxPoints > 0 ? Math.max(12, (Number(row.points_earned || 0) / maxPoints) * 120) : 12,
    }));
  }, [recentRecycling]);

  const materialChartData = useMemo(() => {
    const colors = ['#22c55e', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

    if (materialBreakdown.length === 0) {
      return {
        conic: 'conic-gradient(#e2e8f0 0% 100%)',
        rows: [],
      };
    }

    let start = 0;
    const rows = materialBreakdown.map((row, index) => {
      const color = colors[index % colors.length];
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

  const transactionColumns = [
    {
      title: 'USER',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text) => <span className="font-medium text-slate-700">{text || '-'}</span>,
    },
    {
      title: 'KIOSK',
      dataIndex: 'kiosk',
      key: 'kiosk',
      render: (text) => text || 'N/A',
    },
    {
      title: 'ITEM',
      dataIndex: 'item_type',
      key: 'item_type',
      render: (text) => <Tag className="uppercase">{text || 'unknown'}</Tag>,
    },
    {
      title: 'WEIGHT',
      dataIndex: 'weight_kg',
      key: 'weight_kg',
      align: 'right',
      render: (value) => `${Number(value || 0).toFixed(2)} kg`,
    },
    {
      title: 'POINTS',
      dataIndex: 'points_earned',
      key: 'points_earned',
      align: 'right',
      render: (value) => <span className="text-green-600 font-semibold">+{Number(value || 0)} pts</span>,
    },
    {
      title: 'DATE',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  const statCardProps = {
    className: "rounded-xl border border-slate-100 shadow-sm",
    styles: { body: { padding: '20px 24px' } }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <Title level={3} className="!mb-1 text-slate-800">Dashboard Overview</Title>
        <Text className="text-slate-500">View your key metrics and activity for today</Text>
      </div>

      {/* Stats Cards Section */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card {...statCardProps}>
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
              <span className="text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded text-[10px] ml-auto">+14%</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card {...statCardProps}>
            <div className="flex justify-between items-start mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Energy</Text>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <ThunderboltOutlined />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-slate-800">{Number(totalEnergy).toFixed(2)}</span>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1 text-slate-500">
              <span>Total Consumed</span>
              <span className="text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded text-[10px] ml-auto">+13%</span>
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
              <span className="text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded text-[10px] ml-auto">+4.68%</span>
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
              <span className="text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded text-[10px] ml-auto">{recyclingDrops} drops</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8} className="flex">
          <Card
            className="rounded-xl border border-slate-100 shadow-sm h-full w-full"
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
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

        <Col xs={24} lg={8} className="flex">
          <Card
            className="rounded-xl border border-slate-100 shadow-sm h-full w-full"
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-800 tracking-wide">RECYCLING BY MATERIAL</span>
              <Tag className="bg-slate-50 border-slate-200 text-slate-600">Last 5</Tag>
            </div>

            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="relative w-44 h-44 rounded-full" style={{ background: materialChartData.conic }}>
                <div className="absolute inset-6 rounded-full bg-white flex flex-col items-center justify-center border border-slate-100">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">Total</div>
                  <div className="text-2xl font-semibold text-slate-800">{Number(recyclingWeight).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">kg</div>
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
                        <span className="uppercase font-semibold">{row.type}</span>
                      </div>
                      <span className="text-slate-500">{row.weight.toFixed(2)} kg</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8} className="flex">
          <Card
            className="rounded-xl border border-slate-100 shadow-sm h-full w-full"
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-800 tracking-wide">POINTS TREND</span>
              <Tag className="bg-green-50 border-green-200 text-green-700">Recent</Tag>
            </div>

            <div className="h-44 flex items-end justify-between gap-3 border-b border-slate-100 pb-3 mt-auto">
              {pointsTrend.length === 0 ? (
                <div className="text-sm text-slate-400">No points trend data yet.</div>
              ) : (
                pointsTrend.map((row) => (
                  <div key={row.id} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div className="text-[11px] text-slate-500">{row.points}</div>
                    <div
                      className="w-full max-w-10 rounded-t-md bg-green-500/80"
                      style={{ height: `${row.height}px` }}
                    />
                    <div className="text-[10px] text-slate-400">{row.label}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="rounded-xl border border-slate-100 shadow-sm" styles={{ body: { padding: '24px' } }}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg text-slate-800 tracking-wide">RECENT RECYCLING TRANSACTIONS</span>
          <Tag className="bg-slate-50 border-slate-200 text-slate-600">Limit 5</Tag>
        </div>

        <Table
          rowKey="id"
          columns={transactionColumns}
          dataSource={recentRecycling}
          loading={recentRecyclingLoading}
          pagination={false}
          scroll={{ x: 940 }}
          locale={{ emptyText: 'No recent recycling transactions' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;