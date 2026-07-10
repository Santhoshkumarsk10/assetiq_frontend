'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardApi, auditApi } from '@/lib/api';
import { Package, Zap, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
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

          {/* Recent Activity Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
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
          </div>
        </>
      )}
    </AppLayout>
  );
}

