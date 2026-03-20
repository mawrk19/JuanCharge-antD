import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Card, Tag, Button, Popconfirm, Space, Tabs, message } from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { deleteKioskUser, getKioskUsers } from './patron.api';

const LEADERBOARD_REFRESH_DAYS = 14;
const LEADERBOARD_REWARD_DAYS = 21;
const LEADERBOARD_BONUS = [300, 200, 100];
const LEADERBOARD_STORAGE_KEY = 'patron-leaderboard-season-state-v1';

const LEADERBOARD_ANCHOR = new Date('2026-01-01T00:00:00');

const diffDaysFromAnchor = (date) => {
  const ms = date.getTime() - LEADERBOARD_ANCHOR.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const cycleStartFromDays = (days, step) => {
  const bucket = Math.floor(days / step) * step;
  const start = new Date(LEADERBOARD_ANCHOR);
  start.setDate(start.getDate() + bucket);
  return start;
};

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const maskLastName = (value) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  return '*'.repeat(Math.max(3, text.length));
};

const maskPhoneNumber = (value) => {
  const text = String(value || '').trim();
  if (!text) return '-';

  const digits = text.replace(/\D/g, '');
  if (!digits) return '-';

  const visible = digits.slice(-4);
  const maskedPrefix = '*'.repeat(Math.max(0, digits.length - 4));
  return `${maskedPrefix}${visible}`;
};

const maskEmail = (value) => {
  const text = String(value || '').trim();
  if (!text) return '-';

  const [localPart, domain = ''] = text.split('@');
  if (!localPart || !domain) return '***';

  const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
  return `${visibleLocal}${'*'.repeat(Math.max(3, localPart.length - visibleLocal.length))}@${domain}`;
};

const mapSeasonBaseline = (rows) => {
  const baseline = {};

  rows.forEach((item) => {
    if (!item?.id) return;
    baseline[item.id] = toNumber(item.total_recyclables_weight);
  });

  return baseline;
};

const mapSeasonRows = (rows, baseline = {}) => {
  return rows
    .filter((item) => item.status === 'active')
    .map((item) => {
      const totalRecycled = toNumber(item.total_recyclables_weight);
      const startValue = toNumber(baseline[item.id]);
      const seasonRecycled = Math.max(0, totalRecycled - startValue);

      return {
        ...item,
        season_recycled: seasonRecycled,
      };
    })
    .sort((a, b) => b.season_recycled - a.season_recycled)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      bonus_points: index < 3 ? LEADERBOARD_BONUS[index] : 0,
    }));
};

const readLeaderboardState = () => {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return { activeSeason: null, baselines: {}, archives: {} };

    const parsed = JSON.parse(raw);
    return {
      activeSeason: Number.isInteger(parsed?.activeSeason) ? parsed.activeSeason : null,
      baselines: parsed?.baselines && typeof parsed.baselines === 'object' ? parsed.baselines : {},
      archives: parsed?.archives && typeof parsed.archives === 'object' ? parsed.archives : {},
    };
  } catch {
    return { activeSeason: null, baselines: {}, archives: {} };
  }
};

const writeLeaderboardState = (nextState) => {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Ignore storage write issues and keep runtime state only.
  }
};

const parseKioskUsersPayload = (payload, fallbackPage, fallbackPerPage) => {
  if (Array.isArray(payload)) {
    return {
      rows: payload,
      meta: {
        current_page: fallbackPage,
        per_page: fallbackPerPage,
        total: payload.length,
      },
    };
  }

  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.data)
      ? payload.data.data
      : [];

  const meta = payload?.meta || payload?.data?.meta || {};

  return {
    rows,
    meta: {
      current_page: meta.current_page || fallbackPage,
      per_page: meta.per_page || fallbackPerPage,
      total: meta.total || rows.length,
    },
  };
};

const PatronIndex = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('directory');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
  });
  const queryClient = useQueryClient();

  const [seasonState, setSeasonState] = useState(() => readLeaderboardState());

  const { data, isLoading } = useQuery({
    queryKey: ['kiosk-users', pagination.current, pagination.pageSize],
    queryFn: () => getKioskUsers({ page: pagination.current, perPage: pagination.pageSize }),
    keepPreviousData: true,
  });

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ['kiosk-users-leaderboard'],
    queryFn: () => getKioskUsers({ page: 1, perPage: 1000 }),
  });

  const deleteKioskUserMutation = useMutation({
    mutationFn: deleteKioskUser,
  });

  const parsed = useMemo(() => {
    return parseKioskUsersPayload(data?.data, pagination.current, pagination.pageSize);
  }, [data, pagination.current, pagination.pageSize]);

  const leaderboardParsed = useMemo(() => {
    return parseKioskUsersPayload(leaderboardData?.data, 1, 1000);
  }, [leaderboardData]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return parsed.rows;

    return parsed.rows.filter((item) => {
      const fields = [
        item.role_id,
        item.name,
        item.first_name,
        item.last_name,
        item.email,
        item.phone_number,
        item.status,
      ];
      return fields.some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [parsed.rows, searchTerm]);

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const refreshList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['kiosk-users'] });
  };

  const handleDelete = async (id) => {
    try {
      await deleteKioskUserMutation.mutateAsync(id);
      message.success('Patron deleted successfully.');
      await refreshList();
    } catch (error) {
      console.error(error);
      message.error('Failed to delete patron.');
    }
  };

  const columns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => {
        const firstName = String(record.first_name || '').trim();
        const lastNameMasked = maskLastName(record.last_name);
        const fallbackName = String(record.name || '').trim();
        const displayName = firstName || record.last_name ? `${firstName} ${lastNameMasked}`.trim() : fallbackName || '-';
        return <span className="font-semibold text-green-700">{displayName}</span>;
      },
    },
    {
      title: 'EMAIL',
      dataIndex: 'email',
      key: 'email',
      render: (value) => maskEmail(value),
    },
    {
      title: 'PHONE',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (value) => maskPhoneNumber(value),
    },
    {
      title: 'POINTS BALANCE',
      dataIndex: 'points_balance',
      key: 'points_balance',
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: 'POINTS TOTAL',
      dataIndex: 'points_total',
      key: 'points_total',
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: 'POINTS USED',
      dataIndex: 'points_used',
      key: 'points_used',
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'} className="uppercase">
          {status || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'CREATED',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => formatDateTime(value),
    },
    {
      title: <span className="whitespace-nowrap">ACTIONS</span>,
      key: 'actions',
      fixed: 'right',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Delete Patron"
            description="Are you sure you want to delete this patron?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              icon={<DeleteOutlined className="text-red-500" />}
              loading={deleteKioskUserMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tablePagination = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: parsed.meta.total,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50', '100'],
    showTotal: (total) => `Total ${total} patrons`,
  };

  const leaderboardRows = useMemo(() => {
    const now = new Date();
    const days = diffDaysFromAnchor(now);
    const currentSeason = Math.floor(days / LEADERBOARD_REFRESH_DAYS);
    const sourceRows = leaderboardParsed.rows;
    const baseline = seasonState.baselines?.[currentSeason] || mapSeasonBaseline(sourceRows);
    return mapSeasonRows(sourceRows, baseline);
  }, [leaderboardParsed.rows, seasonState.baselines]);

  useEffect(() => {
    if (!leaderboardParsed.rows.length) return;

    const now = new Date();
    const days = diffDaysFromAnchor(now);
    const currentSeason = Math.floor(days / LEADERBOARD_REFRESH_DAYS);

    setSeasonState((prev) => {
      const next = {
        activeSeason: prev.activeSeason,
        baselines: { ...(prev.baselines || {}) },
        archives: { ...(prev.archives || {}) },
      };

      if (next.activeSeason === null) {
        next.activeSeason = currentSeason;
      }

      if (!next.baselines[currentSeason]) {
        next.baselines[currentSeason] = mapSeasonBaseline(leaderboardParsed.rows);
      }

      if (currentSeason > next.activeSeason) {
        const previousSeason = next.activeSeason;
        const previousBaseline = next.baselines[previousSeason] || {};

        if (!next.archives[previousSeason]) {
          next.archives[previousSeason] = {
            generated_at: new Date().toISOString(),
            rows: mapSeasonRows(leaderboardParsed.rows, previousBaseline).slice(0, 10),
          };
        }

        next.activeSeason = currentSeason;
        next.baselines[currentSeason] = mapSeasonBaseline(leaderboardParsed.rows);
      }

      writeLeaderboardState(next);
      return next;
    });
  }, [leaderboardParsed.rows]);

  const leaderboardMeta = useMemo(() => {
    const now = new Date();
    const days = diffDaysFromAnchor(now);

    const refreshStart = cycleStartFromDays(days, LEADERBOARD_REFRESH_DAYS);
    const refreshEnd = new Date(refreshStart);
    refreshEnd.setDate(refreshEnd.getDate() + LEADERBOARD_REFRESH_DAYS);

    const rewardStart = cycleStartFromDays(days, LEADERBOARD_REWARD_DAYS);
    const rewardEnd = new Date(rewardStart);
    rewardEnd.setDate(rewardEnd.getDate() + LEADERBOARD_REWARD_DAYS);

    const msToRefresh = refreshEnd.getTime() - now.getTime();
    const msToReward = rewardEnd.getTime() - now.getTime();

    const daysToRefresh = Math.max(0, Math.ceil(msToRefresh / (1000 * 60 * 60 * 24)));
    const daysToReward = Math.max(0, Math.ceil(msToReward / (1000 * 60 * 60 * 24)));

    return {
      refreshWindow: `${refreshStart.toLocaleDateString()} - ${refreshEnd.toLocaleDateString()}`,
      rewardWindow: `${rewardStart.toLocaleDateString()} - ${rewardEnd.toLocaleDateString()}`,
      daysToRefresh,
      daysToReward,
      activeSeason: Math.floor(days / LEADERBOARD_REFRESH_DAYS) + 1,
    };
  }, []);

  const leaderboardColumns = [
    {
      title: 'RANK',
      dataIndex: 'rank',
      key: 'rank',
      width: 90,
      render: (rank) => (
        <Tag color={rank === 1 ? 'gold' : rank === 2 ? 'geekblue' : rank === 3 ? 'purple' : 'default'}>
          #{rank}
        </Tag>
      ),
    },
    {
      title: 'PATRON',
      key: 'patron',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-700">
            {`${record.first_name || ''} ${maskLastName(record.last_name)}`.trim() || record.name || '-'}
          </div>
          <div className="text-xs text-slate-500">{maskEmail(record.email)}</div>
        </div>
      ),
    },
    {
      title: 'TOTAL RECYCLED (KG)',
      dataIndex: 'season_recycled',
      key: 'season_recycled',
      align: 'right',
      render: (value) => <span className="font-semibold text-green-700">{toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
    },
    {
      title: 'BONUS (3-WEEK)',
      dataIndex: 'bonus_points',
      key: 'bonus_points',
      align: 'right',
      render: (value) => (value > 0 ? <Tag color="green">+{value} pts</Tag> : <span className="text-slate-400">-</span>),
    },
  ];

  const tabItems = [
    {
      key: 'directory',
      label: 'Patron Directory',
      children: (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Patron Management</h1>
              <p className="text-gray-500">Check Patrons</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search patrons..."
                className="w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <Table
              columns={columns}
              dataSource={filteredData}
              loading={isLoading || deleteKioskUserMutation.isPending}
              rowKey="id"
              pagination={tablePagination}
              onChange={(nextPagination) => {
                setPagination({
                  current: nextPagination.current || 1,
                  pageSize: nextPagination.pageSize || 5,
                });
              }}
              scroll={{ x: 1320 }}
            />
          </Card>
        </>
      ),
    },
    {
      key: 'leaderboards',
      label: 'Leaderboards',
      children: (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Patron Leaderboards</h1>
            <p className="text-gray-500">Rankings are based on total recycled weight within the active season. Leaderboards refresh every 14 days, while bonus awards are processed on a 21-day cycle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-400">Current Leaderboard Season (14 Days)</div>
              <div className="text-sm font-semibold text-slate-700 mt-2">{leaderboardMeta.refreshWindow}</div>
              <div className="text-xs text-slate-500 mt-1">Season #{leaderboardMeta.activeSeason}</div>
              <div className="text-xs text-slate-500 mt-2">{leaderboardMeta.daysToRefresh} day(s) remaining until season refresh</div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-400">Bonus Award Cycle (21 Days)</div>
              <div className="text-sm font-semibold text-slate-700 mt-2">{leaderboardMeta.rewardWindow}</div>
              <div className="text-xs text-slate-500 mt-2">{leaderboardMeta.daysToReward} day(s) remaining until bonus award and cycle reset</div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-400">Top 3 Bonus Allocation</div>
              <div className="text-sm font-semibold text-green-700 mt-2">1st: +300, 2nd: +200, 3rd: +100</div>
              <div className="text-xs text-slate-500 mt-2">Bonuses are applied by backend processing at the end of each 21-day cycle.</div>
            </Card>
          </div>

          <Card>
            <Table
              columns={leaderboardColumns}
              dataSource={leaderboardRows}
              loading={isLeaderboardLoading}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 860 }}
              locale={{ emptyText: 'No leaderboard data yet.' }}
            />
          </Card>
        </>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

export default PatronIndex;