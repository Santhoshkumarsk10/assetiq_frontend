'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { dashboardApi, auditApi } from '@/lib/api';
import {
  Package, Zap, CheckCircle, AlertTriangle, Clock, Ticket, FileText, Key,
  RefreshCw, MoreVertical, ArrowUpRight, ArrowDownRight, Layers, MessageSquare,
  ChevronDown
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PIE_COLORS = ['#4f46e5', '#0d9488', '#d97706', '#e11d48', '#8b5cf6'];

const formatDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

/* Count-Up Animation Component */
function AnimatedCounter({ value, duration = 600 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(value);
      return;
    }

    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();
    let animationFrameId;

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeOut * end);
      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}


/* 3D Parcel Box Empty State Illustration */
function EmptyBoxIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <svg width="84" height="64" viewBox="0 0 84 64" fill="none">
        {/* Sparkles */}
        <path d="M 42 2 L 43 6 L 47 7 L 43 8 L 42 12 L 41 8 L 37 7 L 41 6 Z" fill="#fbbf24" />
        <path d="M 68 14 L 69 17 L 72 18 L 69 19 L 68 22 L 67 19 L 64 18 L 67 17 Z" fill="#f59e0b" />
        <path d="M 16 18 L 17 21 L 20 22 L 17 23 L 16 26 L 15 23 L 12 22 L 15 21 Z" fill="#a855f7" />
        {/* 3D Box in Pastel Purple */}
        <g transform="translate(12, 14)">
          <polygon points="12,22 30,34 48,22 30,12" fill="#c084fc" opacity="0.6" />
          <polygon points="12,22 30,34 30,46 12,34" fill="#a855f7" />
          <polygon points="30,34 48,22 48,34 30,46" fill="#7e22ce" />
          {/* Box Flaps */}
          <polygon points="12,22 30,12 22,4 4,14" fill="#e9d5ff" />
          <polygon points="48,22 30,12 38,4 56,14" fill="#d8b4fe" />
          <polygon points="12,22 30,34 22,42 4,28" fill="#9333ea" opacity="0.75" />
          <polygon points="48,22 30,34 38,42 56,28" fill="#7e22ce" opacity="0.75" />
        </g>
      </svg>
      <p className="text-xs font-semibold text-slate-400 mt-2">No recent renewal requests</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isAuxinzio } = useTheme();

  const [metrics, setMetrics] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentAssetRequests, setRecentAssetRequests] = useState([]);
  const [recentLicenses, setRecentLicenses] = useState([]);
  const [recentRenewals, setRecentRenewals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, auditData] = await Promise.all([
          dashboardApi.stats(),
          auditApi.list().catch(() => ({ logs: [] })),
        ]);
        setMetrics(statsData.metrics);
        setDetailedStats(statsData.detailedStats || null);
        setRecentTickets(statsData.recentTickets || []);
        setRecentAssetRequests(statsData.recentAssetRequests || []);
        setRecentLicenses(statsData.recentLicenses || []);
        setRecentRenewals(statsData.recentRenewals || []);
        setLogs(auditData.logs?.slice(0, 5) || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalAssets = metrics?.totalAssets || 0;
  const availableAssets = metrics?.availableAssets || 0;
  const allocatedAssets = metrics?.allocatedAssets || 0;
  const maintenanceAssets = metrics?.maintenanceAssets || 0;
  const retiredAssets = metrics?.retiredAssets || 0;

  const statCards = metrics
    ? [
      { labelKey: 'totalAssets', value: metrics.totalAssets, icon: Package, colorClass: 'bg-teal-600 text-white' },
      { labelKey: 'activeAssets', value: metrics.availableAssets, icon: Zap, colorClass: 'bg-emerald-600 text-white' },
      { labelKey: 'assigned', value: metrics.allocatedAssets, icon: CheckCircle, colorClass: 'bg-indigo-600 text-white' },
      { labelKey: 'needAttention', value: metrics.maintenanceAssets, icon: AlertTriangle, colorClass: 'bg-rose-600 text-white' },
    ]
    : [];

  const pieData = [
    { name: 'Assigned', value: allocatedAssets, color: '#4f46e5' },
    { name: 'Active', value: availableAssets, color: '#0d9488' },
    { name: 'Under Maintenance', value: maintenanceAssets, color: '#d97706' },
    { name: 'Retired', value: retiredAssets, color: '#e11d48' },
  ];

  const pieDataFiltered = pieData.filter((d) => d.value > 0);
  const pieDataRender = pieDataFiltered.length > 0 ? pieDataFiltered : [{ name: 'None', value: 1, color: '#e2e8f0' }];

  const barData = [
    { name: 'Active Users', value: metrics?.activeUsers || 0 },
    { name: 'Pending', value: metrics?.pendingOnboardings || 0 },
  ];

  const lineChartData = detailedStats
    ? [
      {
        name: 'Tickets',
        Total: detailedStats.tickets.total,
        Closed: detailedStats.tickets.closed,
        Pending: detailedStats.tickets.pending,
      },
      {
        name: 'Asset Requests',
        Total: detailedStats.assetRequests.total,
        Closed: detailedStats.assetRequests.closed,
        Pending: detailedStats.assetRequests.pending,
      },
      {
        name: 'Licenses',
        Total: detailedStats.licenseRequests.total,
        Closed: detailedStats.licenseRequests.closed,
        Pending: detailedStats.licenseRequests.pending,
      },
      {
        name: 'Renewals',
        Total: detailedStats.renewalRequests.total,
        Closed: detailedStats.renewalRequests.closed,
        Pending: detailedStats.renewalRequests.pending,
      },
    ]
    : [];

  return (
    <AppLayout>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3 text-sm">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
          <span>{t('loadingAnalytics')}</span>
        </div>
      ) : isAuxinzio ? (
        /* ========================================================
           AUXINZIO THEME DASHBOARD
           ======================================================== */
        <div className="space-y-5 animate-fadeIn">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Welcome back, <span className="font-extrabold text-slate-900">{user?.name || 'Chennai Admin'}</span>
                <span className="text-xl">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Here&apos;s what&apos;s happening with your assets today.
              </p>
            </div>
          </div>

          {/* Top Row: 4 KPI Stat Cards (2x2 on Mobile, 4-col on Desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {/* Card 1: Total Assets */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs flex items-center justify-between">
              <div className="absolute -right-6 -bottom-6 text-teal-600/5 pointer-events-none">
                <Package size={96} />
              </div>
              <div className="min-w-0 pr-1">
                <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Total Assets</span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  <AnimatedCounter value={totalAssets} />
                </h2>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Package size={18} className="sm:hidden" />
                <Package size={22} className="hidden sm:block" />
              </div>
            </div>

            {/* Card 2: Active Assets */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs flex items-center justify-between">
              <div className="absolute -right-6 -bottom-6 text-emerald-600/5 pointer-events-none">
                <CheckCircle size={96} />
              </div>
              <div className="min-w-0 pr-1">
                <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Active Assets</span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  <AnimatedCounter value={availableAssets} />
                </h2>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <CheckCircle size={18} className="sm:hidden" />
                <CheckCircle size={22} className="hidden sm:block" />
              </div>
            </div>

            {/* Card 3: Assigned */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs flex items-center justify-between">
              <div className="absolute -right-6 -bottom-6 text-indigo-600/5 pointer-events-none">
                <Layers size={96} />
              </div>
              <div className="min-w-0 pr-1">
                <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Assigned</span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  <AnimatedCounter value={allocatedAssets} />
                </h2>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Layers size={18} className="sm:hidden" />
                <Layers size={22} className="hidden sm:block" />
              </div>
            </div>

            {/* Card 4: Need Attention */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs flex items-center justify-between">
              <div className="absolute -right-6 -bottom-6 text-rose-600/5 pointer-events-none">
                <AlertTriangle size={96} />
              </div>
              <div className="min-w-0 pr-1">
                <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Need Attention</span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  <AnimatedCounter value={maintenanceAssets} />
                </h2>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <AlertTriangle size={18} className="sm:hidden" />
                <AlertTriangle size={22} className="hidden sm:block" />
              </div>
            </div>
          </div>

          {/* Second Row: 3 Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Panel 1: Assets by Status */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Assets by Status
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-0.5">
                {/* Donut Chart with Centered Total */}
                <div className="relative w-[130px] h-[130px] shrink-0 flex items-center justify-center [&_.recharts-surface]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-pie-sector]:outline-none [&_path]:outline-none [&_svg]:outline-none [&_*:focus]:outline-none select-none">
                  <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                    <PieChart style={{ outline: 'none' }} tabIndex={-1}>
                      <Pie
                        data={pieDataRender}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        style={{ outline: 'none' }}
                        tabIndex={-1}
                      >
                        {pieDataRender.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                            style={{ outline: 'none' }}
                            tabIndex={-1}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centered Total */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-extrabold text-slate-900 leading-tight">{totalAssets}</span>
                    <span className="text-[10px] font-medium text-slate-500">Total</span>
                  </div>
                </div>

                {/* Status Breakdown Legend */}
                <div className="flex-1 space-y-2 w-full pl-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                      <span className="font-medium text-slate-700">Assigned</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {allocatedAssets} <span className="text-slate-400 font-normal">({totalAssets > 0 ? Math.round((allocatedAssets / totalAssets) * 100) : 0}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                      <span className="font-medium text-slate-700">Active</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {availableAssets} <span className="text-slate-400 font-normal">({totalAssets > 0 ? Math.round((availableAssets / totalAssets) * 100) : 0}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                      <span className="font-medium text-slate-700">Under Maintenance</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {maintenanceAssets} <span className="text-slate-400 font-normal">({totalAssets > 0 ? Math.round((maintenanceAssets / totalAssets) * 100) : 0}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                      <span className="font-medium text-slate-700">Retired</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {retiredAssets} <span className="text-slate-400 font-normal">({totalAssets > 0 ? Math.round((retiredAssets / totalAssets) * 100) : 0}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Users & Onboarding */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Users &amp; Onboarding
                </h3>
              </div>

              <div className="h-[155px] w-full [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_*:focus]:outline-none select-none">
                <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                  <BarChart data={barData} margin={{ top: 14, right: 10, left: -25, bottom: 0 }} style={{ outline: 'none' }} tabIndex={-1}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 'dataMax + 4']} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#0d9488"
                      radius={[6, 6, 0, 0]}
                      barSize={38}
                      activeBar={false}
                      label={{ position: 'top', fill: '#0f172a', fontSize: 12, fontWeight: 700 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panel 3: Asset Snapshot */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Asset Snapshot
                </h3>
              </div>

              <div className="space-y-2.5 pt-0.5">
                {/* Total Assets */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Layers size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-0.5">Total Assets</div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{totalAssets}</span>
                </div>

                {/* Active Assets */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Zap size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-0.5">Active Assets</div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (availableAssets / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{availableAssets}</span>
                </div>

                {/* Assigned */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CheckCircle size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-0.5">Assigned</div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (allocatedAssets / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{allocatedAssets}</span>
                </div>

                {/* Need Attention */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-0.5">Need Attention</div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (maintenanceAssets / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{maintenanceAssets}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row: Request & Lifecycle Statistics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Request &amp; Lifecycle Statistics
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 4 Stat Cards (2x2 on left) */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tickets Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Support Tickets
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Ticket size={15} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-2.5">
                      {detailedStats?.tickets.total || 0}
                    </div>
                    {/* Segmented Two-Tone Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-2.5">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{
                          width: `${detailedStats?.tickets.total > 0 ? (detailedStats.tickets.closed / detailedStats.tickets.total) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{
                          width: `${detailedStats?.tickets.total > 0 ? (detailedStats.tickets.pending / detailedStats.tickets.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Closed: {detailedStats?.tickets.closed || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Pending: {detailedStats?.tickets.pending || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Asset Requests Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Asset Requests
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <FileText size={15} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-2.5">
                      {detailedStats?.assetRequests.total || 0}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-2.5">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{
                          width: `${detailedStats?.assetRequests.total > 0 ? (detailedStats.assetRequests.closed / detailedStats.assetRequests.total) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{
                          width: `${detailedStats?.assetRequests.total > 0 ? (detailedStats.assetRequests.pending / detailedStats.assetRequests.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Completed: {detailedStats?.assetRequests.closed || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Pending: {detailedStats?.assetRequests.pending || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Software Licenses Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Software Licenses
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Key size={15} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-2.5">
                      {detailedStats?.licenseRequests.total || 0}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-2.5">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{
                          width: `${detailedStats?.licenseRequests.total > 0 ? (detailedStats.licenseRequests.closed / detailedStats.licenseRequests.total) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{
                          width: `${detailedStats?.licenseRequests.total > 0 ? (detailedStats.licenseRequests.pending / detailedStats.licenseRequests.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Active: {detailedStats?.licenseRequests.closed || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Need Action: {detailedStats?.licenseRequests.pending || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Renewal Requests Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Renewal Requests
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <RefreshCw size={15} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-2.5">
                      {detailedStats?.renewalRequests.total || 0}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-2.5">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{
                          width: `${detailedStats?.renewalRequests.total > 0 ? (detailedStats.renewalRequests.closed / detailedStats.renewalRequests.total) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{
                          width: `${detailedStats?.renewalRequests.total > 0 ? (detailedStats.renewalRequests.pending / detailedStats.renewalRequests.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Decided: {detailedStats?.renewalRequests.closed || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Pending: {detailedStats?.renewalRequests.pending || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparative Trends Multi-Line Chart */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-bold text-slate-900">
                    Comparative Trends
                  </h4>
                </div>

                <div className="h-[175px] w-full [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_*:focus]:outline-none select-none">
                  <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                    <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} style={{ outline: 'none' }} tabIndex={-1}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                      <Line type="monotone" dataKey="Total" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3.5, fill: '#0d9488', stroke: '#fff', strokeWidth: 1.5 }} />
                      <Line type="monotone" dataKey="Closed" stroke="#059669" strokeWidth={2.5} dot={{ r: 3.5, fill: '#059669', stroke: '#fff', strokeWidth: 1.5 }} />
                      <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3.5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-center gap-4 pt-1 text-[11px] font-medium">
                  <div className="flex items-center gap-1.5 text-teal-600">
                    <span className="w-2 h-2 rounded-full bg-teal-600" /> Total
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Closed
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fourth Row: 4 Recent Activity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Recent Support Tickets */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Ticket size={13} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Recent Support Tickets
                    </span>
                  </div>
                  <Link href="/tickets" className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentTickets.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No recent tickets</div>
                  ) : (
                    recentTickets.slice(0, 3).map((ticket) => (
                      <div key={ticket.id} className="py-2 flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-500">
                            {ticket.ticket_no}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${ticket.status === 'resolved' || ticket.status === 'closed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : ticket.status === 'pending' || ticket.status === 'in_progress' || ticket.status === 'open'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">{ticket.subject}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(ticket.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Recent Asset Requests */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <FileText size={13} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Recent Asset Requests
                    </span>
                  </div>
                  <Link href="/assets" className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentAssetRequests.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No recent asset requests</div>
                  ) : (
                    recentAssetRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="py-2 flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">{req.asset_type || 'Hardware Asset'}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${req.status === 'completed' || req.status === 'purchased' || req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : req.status === 'rejected' || req.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {req.notes || `Quantity: ${req.quantity || 1}`}
                        </div>
                        <div className="text-[10px] text-slate-400">{formatDate(req.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Recent Software Licenses */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Key size={13} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Recent Software Licenses
                    </span>
                  </div>
                  <Link href="/license" className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentLicenses.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No recent licenses</div>
                  ) : (
                    recentLicenses.slice(0, 2).map((lic) => (
                      <div key={lic.id} className="py-2 flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">
                            {lic.software_name || lic.license_key}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${lic.status === 'active' || lic.status === 'assigned'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : lic.status === 'expired' || lic.status === 'inactive' || lic.status === 'revoked'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                          >
                            {lic.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          User: {lic.assigned_to_user?.name || user?.name || 'Assigned'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Expires: {formatDate(lic.expiry_date || lic.expiration_date)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Card 4: Recent Renewal Requests */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <RefreshCw size={13} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Recent Renewal Requests
                    </span>
                  </div>
                  <Link href="/license" className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                    View All
                  </Link>
                </div>

                {recentRenewals.length === 0 ? (
                  <EmptyBoxIllustration />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentRenewals.slice(0, 3).map((ren) => (
                      <div key={ren.id} className="py-2 flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">
                            {ren.license?.software_name || 'Software License'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${ren.status === 'approved' || ren.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : ren.status === 'rejected' || ren.status === 'denied'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                          >
                            {ren.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ren.user?.name || 'Requested User'}
                        </div>
                        <div className="text-[10px] text-slate-400">{formatDate(ren.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Row */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            {/* <div>© 2025 Fillers. All rights reserved.</div>
            <div className="flex items-center gap-6 font-medium">
              <span className="hover:text-blue-600 cursor-pointer">About Us</span>
              <span className="hover:text-blue-600 cursor-pointer">Help</span>
              <span className="hover:text-blue-600 cursor-pointer">Contact Us</span> */}
            {/* </div> */}
          </div>
        </div>
      ) : (
        /* ========================================================
           MINIMAL THEME DASHBOARD (Original Exact Implementation)
           ======================================================== */
        <>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-5 border-b border-slate-100">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('dashboard')}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {t('welcomeBack')}, <span className="font-semibold text-slate-800">{user?.name || 'User'}</span>. {t('systemOverview')}.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-xs font-semibold shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('liveOverview')}
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group" key={card.labelKey}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">{t(card.labelKey)}</span>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${card.colorClass}`}><Icon size={16} className="sm:hidden" /><Icon size={20} className="hidden sm:block" /></div>
                  </div>
                  <div className="text-xl sm:text-3xl font-extrabold mt-2 sm:mt-4 tracking-tight text-slate-900">{card.value?.toLocaleString() || 0}</div>
                </div>
              );
            })}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('assetsStatus')}</h3>
              </div>
              {pieDataFiltered.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieDataFiltered} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieDataFiltered.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-slate-400">
                  <Package size={36} className="opacity-30 mb-2" />
                  <p className="text-sm">{t('noAssetData')}</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('usersOnboarding')}</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Request & Lifecycle Statistics */}
          {detailedStats && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                <Zap size={16} className="text-emerald-500" />
                Request &amp; Lifecycle Statistics
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Tickets Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Support Tickets</span>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2">{detailedStats.tickets.total}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                        <Ticket size={20} />
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-4">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${detailedStats.tickets.total > 0 ? (detailedStats.tickets.closed / detailedStats.tickets.total) * 100 : 0}%` }}
                        title={`Closed: ${detailedStats.tickets.closed}`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        style={{ width: `${detailedStats.tickets.total > 0 ? (detailedStats.tickets.pending / detailedStats.tickets.total) * 100 : 0}%` }}
                        title={`Pending: ${detailedStats.tickets.pending}`}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Closed: {detailedStats.tickets.closed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Pending: {detailedStats.tickets.pending}</span>
                      </div>
                    </div>
                  </div>

                  {/* Asset Requests Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Asset Requests</span>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2">{detailedStats.assetRequests.total}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                        <FileText size={20} />
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-4">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${detailedStats.assetRequests.total > 0 ? (detailedStats.assetRequests.closed / detailedStats.assetRequests.total) * 100 : 0}%` }}
                        title={`Completed: ${detailedStats.assetRequests.closed}`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        style={{ width: `${detailedStats.assetRequests.total > 0 ? (detailedStats.assetRequests.pending / detailedStats.assetRequests.total) * 100 : 0}%` }}
                        title={`Pending: ${detailedStats.assetRequests.pending}`}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Completed: {detailedStats.assetRequests.closed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Pending: {detailedStats.assetRequests.pending}</span>
                      </div>
                    </div>
                  </div>

                  {/* License Requests Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">License Requests</span>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2">{detailedStats.licenseRequests.total}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                        <Key size={20} />
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-4">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${detailedStats.licenseRequests.total > 0 ? (detailedStats.licenseRequests.closed / detailedStats.licenseRequests.total) * 100 : 0}%` }}
                        title={`Active: ${detailedStats.licenseRequests.closed}`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        style={{ width: `${detailedStats.licenseRequests.total > 0 ? (detailedStats.licenseRequests.pending / detailedStats.licenseRequests.total) * 100 : 0}%` }}
                        title={`Available/Expired: ${detailedStats.licenseRequests.pending}`}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Active: {detailedStats.licenseRequests.closed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Need Action: {detailedStats.licenseRequests.pending}</span>
                      </div>
                    </div>
                  </div>

                  {/* Renewal Requests Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Renewal Requests</span>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2">{detailedStats.renewalRequests.total}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
                        <RefreshCw size={20} />
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-4">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${detailedStats.renewalRequests.total > 0 ? (detailedStats.renewalRequests.closed / detailedStats.renewalRequests.total) * 100 : 0}%` }}
                        title={`Decided: ${detailedStats.renewalRequests.closed}`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        style={{ width: `${detailedStats.renewalRequests.total > 0 ? (detailedStats.renewalRequests.pending / detailedStats.renewalRequests.total) * 100 : 0}%` }}
                        title={`Pending: ${detailedStats.renewalRequests.pending}`}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Decided: {detailedStats.renewalRequests.closed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Pending: {detailedStats.renewalRequests.pending}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparative Trends Line Chart Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Comparative Trends</span>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} style={{ outline: "none" }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Total
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Closed/Approved
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Requests & Actions Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Recent Support Tickets */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Ticket size={16} className="text-slate-400" />
                  Recent Support Tickets
                </h3>
                <Link href="/tickets" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  {t('viewAll')}
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentTickets.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No tickets found</div>
                ) : (
                  recentTickets.map((ticket) => (
                    <div key={ticket.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ticket.ticket_no}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ticket.status === 'resolved' || ticket.status === 'closed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : ticket.status === 'pending' || ticket.status === 'in_progress' || ticket.status === 'open'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{ticket.subject}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span>{ticket.user?.name || 'User'}</span>
                        <span>•</span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Asset Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  Recent Asset Requests
                </h3>
                <Link href="/assets" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  {t('viewAll')}
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentAssetRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No asset requests found</div>
                ) : (
                  recentAssetRequests.map((req) => (
                    <div key={req.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">{req.asset_type}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.status === 'completed' || req.status === 'purchased' || req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : req.status === 'rejected' || req.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-800">{req.notes || 'Hardware Allocation Request'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span>Qty: {req.quantity}</span>
                        <span>•</span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Software Licenses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Key size={16} className="text-slate-400" />
                  Recent Licenses
                </h3>
                <Link href="/license" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  {t('viewAll')}
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentLicenses.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No licenses found</div>
                ) : (
                  recentLicenses.map((lic) => (
                    <div key={lic.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{lic.license_key}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${lic.status === 'active' || lic.status === 'assigned'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : lic.status === 'expired' || lic.status === 'inactive' || lic.status === 'revoked'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                          {lic.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{lic.software_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span>{lic.assigned_to_user?.name || 'Unassigned'}</span>
                        <span>•</span>
                        <span>Expires: {formatDate(lic.expiry_date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Renewal Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw size={16} className="text-slate-400" />
                  Recent Renewal Requests
                </h3>
                <Link href="/license" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  {t('viewAll')}
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentRenewals.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No renewals found</div>
                ) : (
                  recentRenewals.map((ren) => (
                    <div key={ren.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600 line-clamp-1">{ren.license?.software_name || 'Software License'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ren.status === 'approved' || ren.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : ren.status === 'rejected' || ren.status === 'denied'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                          {ren.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-800">{ren.reason || 'Annual subscription renewal'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span>{ren.user?.name || 'User'}</span>
                        <span>•</span>
                        <span>{formatDate(ren.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Audit Logs Row */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                {t('recentAuditTrail')}
              </h3>
              <Link href="/audit-logs" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                {t('viewAll')}
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">{t('noAuditLogs')}</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {log.user_name || log.user?.name || 'System'}:{' '}
                        <span className="text-slate-600 font-normal">{log.action}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{log.details || '—'}</div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-4">{formatDate(log.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
