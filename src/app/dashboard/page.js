'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardApi, auditApi } from '@/lib/api';
import { Package, Zap, CheckCircle, AlertTriangle, Clock, Ticket, FileText, Key, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const statCards = metrics ? [
    { labelKey: 'totalAssets', value: metrics.totalAssets, icon: Package, colorClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300' },
    { labelKey: 'activeAssets', value: metrics.availableAssets, icon: Zap, colorClass: 'bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300' },
    { labelKey: 'assigned', value: metrics.allocatedAssets, icon: CheckCircle, colorClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300' },
    { labelKey: 'needAttention', value: metrics.maintenanceAssets, icon: AlertTriangle, colorClass: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300' },
  ] : [];

  const pieData = metrics ? [
    { name: t('activeAssets'), value: metrics.availableAssets || 0 },
    { name: t('assigned'), value: metrics.allocatedAssets || 0 },
    { name: t('needAttention'), value: metrics.maintenanceAssets || 0 },
  ].filter(d => d.value > 0) : [];

  const barData = [
    { name: t('activeUsers'), value: metrics?.activeUsers || 0 },
    { name: t('pending'), value: metrics?.pendingOnboardings || 0 },
  ];

  const lineChartData = detailedStats ? [
    {
      name: 'Tickets',
      Total: detailedStats.tickets.total,
      Closed: detailedStats.tickets.closed,
      Pending: detailedStats.tickets.pending
    },
    {
      name: 'Asset Requests',
      Total: detailedStats.assetRequests.total,
      Closed: detailedStats.assetRequests.closed,
      Pending: detailedStats.assetRequests.pending
    },
    {
      name: 'Licenses',
      Total: detailedStats.licenseRequests.total,
      Closed: detailedStats.licenseRequests.closed,
      Pending: detailedStats.licenseRequests.pending
    },
    {
      name: 'Renewals',
      Total: detailedStats.renewalRequests.total,
      Closed: detailedStats.renewalRequests.closed,
      Pending: detailedStats.renewalRequests.pending
    }
  ] : [];

  return (
    <AppLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-5 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('dashboard')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('welcomeBack')}, <span className="font-semibold text-slate-800">{user?.name || 'User'}</span>. {t('systemOverview')}.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-xs font-semibold shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {t('liveOverview')}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 text-sm">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> 
          <span>{t('loadingAnalytics')}</span>
        </div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group" key={card.labelKey}>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t(card.labelKey)}</span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${card.colorClass}`}><Icon size={20} /></div>
                  </div>
                  <div className="text-3xl font-extrabold mt-4 tracking-tight text-slate-900">{card.value?.toLocaleString() || 0}</div>
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
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Support Tickets</span>
                        <h4 className="text-3xl font-extrabold mt-1 tracking-tight text-slate-900">{detailedStats.tickets.total}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                        <Ticket size={20} />
                      </div>
                    </div>
                    
                    {/* Stacked Progress Bar */}
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Asset Requests</span>
                        <h4 className="text-3xl font-extrabold mt-1 tracking-tight text-slate-900">{detailedStats.assetRequests.total}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
                        <FileText size={20} />
                      </div>
                    </div>
                    
                    {/* Stacked Progress Bar */}
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

                  {/* Software Licenses Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Software Licenses</span>
                        <h4 className="text-3xl font-extrabold mt-1 tracking-tight text-slate-900">{detailedStats.licenseRequests.total}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                        <Key size={20} />
                      </div>
                    </div>
                    
                    {/* Stacked Progress Bar */}
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Renewal Requests</span>
                        <h4 className="text-3xl font-extrabold mt-1 tracking-tight text-slate-900">{detailedStats.renewalRequests.total}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm">
                        <RefreshCw size={20} />
                      </div>
                    </div>
                    
                    {/* Stacked Progress Bar */}
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

                {/* Right side: Line Chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div className="mb-4">
                    <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Comparative Trends</h4>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} style={{outline:"none"}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
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
                  <Ticket size={16} className="text-blue-500" />
                  Recent Support Tickets
                </h3>
                <Link href="/tickets" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All
                </Link>
              </div>
              {recentTickets.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ticket.ticket_no}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ticket.status === 'resolved' || ticket.status === 'closed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : ticket.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{ticket.title}</h4>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>By: <span className="font-semibold text-slate-700">{ticket.user?.name || 'Unknown'}</span></span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">No recent tickets</div>
              )}
            </div>

            {/* Recent Asset Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-purple-500" />
                  Recent Asset Requests
                </h3>
                <Link href="/assets" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All
                </Link>
              </div>
              {recentAssetRequests.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {recentAssetRequests.map((req) => (
                    <div key={req.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">{req.asset_type}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'completed' || req.status === 'purchased'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{req.asset_name} (Qty: {req.quantity})</h4>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>By: <span className="font-semibold text-slate-700">{req.requester?.name || 'Unknown'}</span></span>
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">No recent asset requests</div>
              )}
            </div>

            {/* Recent Software Licenses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Key size={16} className="text-rose-500" />
                  Recent Software Licenses
                </h3>
                <Link href="/license" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All
                </Link>
              </div>
              {recentLicenses.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {recentLicenses.map((lic) => (
                    <div key={lic.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{lic.license_key}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lic.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : lic.status === 'expired'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {lic.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{lic.software_name}</h4>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>User: <span className="font-semibold text-slate-700">{lic.user?.name || 'Unassigned'}</span></span>
                        <span>Expires: {lic.valid_until ? new Date(lic.valid_until).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">No recent software licenses</div>
              )}
            </div>

            {/* Recent Renewal Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw size={16} className="text-emerald-500" />
                  Recent Renewal Requests
                </h3>
                <Link href="/license" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All
                </Link>
              </div>
              {recentRenewals.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {recentRenewals.map((ren) => (
                    <div key={ren.id} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600 line-clamp-1">{ren.license?.software_name || 'Software License'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ren.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : ren.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {ren.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">Proposed Extension: {ren.proposed_valid_until ? new Date(ren.proposed_valid_until).toLocaleDateString() : 'N/A'}</h4>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>By: <span className="font-semibold text-slate-700">{ren.requester?.name || 'Unknown'}</span></span>
                        <span>{new Date(ren.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">No recent renewal requests</div>
              )}
            </div>

          </div>

          {/* Recent Activity Section */}
          {/* <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('recentActivity')}</h3>
            </div>
            {logs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 py-4 hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition-all duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Clock size={14} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 uppercase tracking-wider border border-slate-200">
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(log.created_at || log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Clock size={36} className="opacity-30 mb-2" />
                <p className="text-sm">{t('noActivityLogs')}</p>
              </div>
            )}
          </div> */}
        </>
      )}
    </AppLayout>
  );
}

