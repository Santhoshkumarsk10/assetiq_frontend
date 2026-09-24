"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import AnimatedPageTitle from "@/components/AnimatedPageTitle";
import SearchableSelect from "@/components/SearchableSelect";
import { auditApi } from "@/lib/api";
import Modal from "@/components/Modal";
import {
  Search,
  Download,
  ClipboardList,
  Settings,
  UserPlus,
  Trash2,
  LogIn,
  Shield,
  X,
  RefreshCw,
  Clock,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";

function getAuditIcon(action) {
  if (!action) return { icon: ClipboardList, cls: "bg-indigo-50 text-indigo-600" };
  const a = action.toUpperCase();
  if (a.includes("CREATE") || a.includes("STEP1"))
    return { icon: UserPlus, cls: "bg-emerald-50 text-emerald-600" };
  if (
    a.includes("UPDATE") ||
    a.includes("STEP") ||
    a.includes("APPROVE") ||
    a.includes("EMAIL")
  )
    return { icon: Settings, cls: "bg-blue-50 text-blue-600" };
  if (a.includes("DELETE")) return { icon: Trash2, cls: "bg-rose-50 text-rose-600" };
  if (a.includes("LOGIN") || a.includes("LOGOUT"))
    return { icon: LogIn, cls: "bg-indigo-50 text-indigo-600" };
  return { icon: Shield, cls: "bg-blue-50 text-blue-600" };
}

function getActionBadge(action) {
  if (!action) return { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Unknown" };
  const a = action.toUpperCase();
  if (a.includes("CREATE") || a.includes("STEP1"))
    return { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Created" };
  if (a.includes("UPDATE") || a.includes("APPROVE") || a.includes("STEP"))
    return { cls: "bg-blue-100 text-blue-700 border-blue-200", label: "Updated" };
  if (a.includes("DELETE")) return { cls: "bg-rose-100 text-rose-700 border-rose-200", label: "Deleted" };
  if (a.includes("LOGIN")) return { cls: "bg-amber-100 text-amber-800 border-amber-200", label: "Login" };
  if (a.includes("LOGOUT")) return { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Logout" };
  return { cls: "bg-slate-100 text-slate-600 border-slate-200", label: action };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditApi.list({
        page,
        limit,
        search,
        action: actionFilter,
      });
      setLogs(data.logs || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, limit, search, actionFilter]);

  // Fetch suggestions based on searchInput
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await auditApi.list({ 
          page: 1, 
          limit: 10, 
          search: searchInput,
          action: actionFilter || undefined 
        });
        const results = [];
        const seen = new Set();
        (data.logs || []).forEach(log => {
          if (log.user && log.user.name && log.user.name.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`user:${log.user.name}`)) {
            seen.add(`user:${log.user.name}`);
            results.push({ type: 'user', value: log.user.name, label: log.user.name });
          }
          if (log.action && log.action.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`action:${log.action}`)) {
            seen.add(`action:${log.action}`);
            results.push({ type: 'action', value: log.action, label: log.action });
          }
          if (log.details && log.details.toLowerCase().includes(searchInput.toLowerCase())) {
            const shortDetail = log.details.length > 40 ? log.details.substring(0, 37) + '...' : log.details;
            if (!seen.has(`detail:${shortDetail}`)) {
              seen.add(`detail:${shortDetail}`);
              results.push({ type: 'detail', value: log.details, label: shortDetail });
            }
          }
        });
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchInput, actionFilter]);

  const handleSearchInputChange = (val) => {
    setSearchInput(val);
    if (val === '') {
      setSearch('');
      setPage(1);
    }
  };

  // Load logs when page, limit, search, or actionFilter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  const handleExport = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "User", "Action", "Details", "Entity Type", "IP Address", "Timestamp"];
    const rows = logs.map(l => [
      l.id,
      `"${(l.user?.name || (l.user_id ? `User #${l.user_id}` : "System")).replace(/"/g, '""')}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${(l.entity_type || "System").replace(/"/g, '""')}"`,
      `"${(l.ip_address || "—").replace(/"/g, '""')}"`,
      `"${new Date(l.created_at || l.createdAt).toLocaleString().replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = logs;

  const getVisiblePages = (current, total) => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }
    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  return (
    <AppLayout>
      {/* Top Header & Actions */}
      <div className="flex justify-between items-center gap-2 sm:gap-4 mb-4 sm:mb-6 pt-3 sm:pt-5">
        <div className="min-w-0 flex-1">
          <AnimatedPageTitle title="Audit Logs" className="!text-lg sm:!text-2xl md:!text-3xl whitespace-nowrap" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 whitespace-nowrap shadow-2xs"
            onClick={loadLogs}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors shrink-0 whitespace-nowrap shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Logs"
          >
            <Download size={16} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Export Logs</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 md:p-6 shadow-xs">
        {/* Desktop Filters Row */}
        <div className="hidden md:flex items-center gap-4 mb-5">
          <div className="flex-1 relative w-full">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search by user or activity..."
                value={searchInput}
                maxLength={100}
                onChange={(e) => handleSearchInputChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(searchInput);
                    setPage(1);
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="border-none bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => handleSearchInputChange('')}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchInput(item.value);
                      setSearch(item.value);
                      setPage(1);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    <span className="text-[9px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                    <span className="text-sm text-slate-700 font-medium truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SearchableSelect
              options={[
                { value: "", label: "All Actions" },
                { value: "CREATE", label: "Created" },
                { value: "UPDATE", label: "Updated" },
                { value: "DELETE", label: "Deleted" },
                { value: "LOGIN", label: "Login" }
              ]}
              value={actionFilter}
              onChange={val => { setActionFilter(val); setPage(1); }}
              className="w-[150px]"
            />
            <SearchableSelect
              options={[
                { value: 5, label: "5 per page" },
                { value: 10, label: "10 per page" },
                { value: 20, label: "20 per page" },
                { value: 50, label: "50 per page" }
              ]}
              value={limit}
              onChange={val => { setLimit(val); setPage(1); }}
              className="w-[130px]"
            />
          </div>
        </div>

        {/* Mobile Search & Filter Bar */}
        <div className="block md:hidden mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search logs..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => handleSearchInputChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(searchInput);
                      setPage(1);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => handleSearchInputChange('')}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent p-0.5 rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Mobile Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto py-1 divide-y divide-slate-50">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchInput(item.value);
                        setSearch(item.value);
                        setPage(1);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                    >
                      <span className="text-[9px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                      <span className="text-xs text-slate-700 font-medium truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Single Filter Button Trigger */}
            <button
              type="button"
              onClick={() => setShowMobileFilterSheet(true)}
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 text-xs font-semibold ${Boolean(actionFilter) || limit !== 10 || Boolean(search)
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
              aria-label="Filter Audit Logs"
              title="Filter Audit Logs"
            >
              <SlidersHorizontal size={15} />
              <span>Filter</span>
              {(Boolean(actionFilter) || limit !== 10 || Boolean(search)) && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {(actionFilter ? 1 : 0) + (limit !== 10 ? 1 : 0) + (search ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Badges on Mobile */}
          {(Boolean(actionFilter) || limit !== 10 || Boolean(search)) && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Filters:</span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  &quot;{search}&quot;
                  <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} />
                </span>
              )}
              {actionFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  Action: {actionFilter}
                  <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => { setActionFilter(''); setPage(1); }} />
                </span>
              )}
              {limit !== 10 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {limit} per page
                  <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => { setLimit(10); setPage(1); }} />
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setActionFilter('');
                  setLimit(10);
                  setPage(1);
                }}
                className="text-[11px] text-slate-400 hover:text-rose-600 underline ml-1 cursor-pointer shrink-0 border-none bg-transparent"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Audit Logs List */}
        {loading ? (
          <div className="flex items-center justify-center p-12 sm:p-16 text-slate-400 gap-2.5 text-sm">
            <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4 text-slate-400 flex flex-col items-center justify-center">
            <ClipboardList size={42} className="mb-2.5 opacity-40" />
            <p className="text-xs sm:text-sm font-medium">No audit logs found</p>
          </div>
        ) : (
          <>
            {/* Desktop Audit Logs List */}
            <div className="hidden md:block divide-y divide-slate-100">
              {filtered.map((log) => {
                const iconInfo = getAuditIcon(log.action);
                const badgeInfo = getActionBadge(log.action);
                const Icon = iconInfo.icon;
                const ts = new Date(log.created_at || log.createdAt);

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 py-3.5 hover:bg-slate-50/50 transition-colors rounded-xl px-2"
                  >
                    {/* Action Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${iconInfo.cls}`}>
                      <Icon size={18} />
                    </div>

                    {/* Main Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {log.user?.name || (log.user_id ? `User #${log.user_id}` : "System")}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border tracking-wide ${badgeInfo.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {badgeInfo.label}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600 leading-relaxed mb-1.5 break-words">
                        {log.details || "No details recorded"}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          {log.entity_type || "System"}
                        </span>
                        {log.ip_address && (
                          <span className="font-mono bg-slate-100/90 px-1.5 py-0.5 rounded text-[11px] text-slate-500">
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desktop Timestamp Column */}
                    <div className="flex flex-col text-right text-xs text-slate-400 shrink-0 font-mono self-start mt-0.5">
                      <span className="font-medium text-slate-600">{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className="text-[11px] text-slate-400">{ts.toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Audit Logs Cards View */}
            <div className="block md:hidden space-y-2.5">
              {filtered.map((log) => {
                const iconInfo = getAuditIcon(log.action);
                const badgeInfo = getActionBadge(log.action);
                const Icon = iconInfo.icon;
                const ts = new Date(log.created_at || log.createdAt);

                return (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3 py-2.5 shadow-2xs flex flex-col transition-all"
                  >
                    {/* 1. Top Header Row: Icon + Actor Name + Action Badge */}
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${iconInfo.cls}`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="text-[13px] font-bold text-slate-900 leading-snug tracking-tight truncate">
                            {log.user?.name || (log.user_id ? `User #${log.user_id}` : "System")}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide shrink-0 ${badgeInfo.cls}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {badgeInfo.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-slate-400 font-mono">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>
                            {ts.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Log Activity Details */}
                    {log.details && (
                      <div className="mt-2 text-[12px] text-slate-700 leading-relaxed bg-slate-50/60 border border-slate-100/90 rounded-lg px-2.5 py-1.5 break-words">
                        {log.details}
                      </div>
                    )}

                    {/* 3. Metadata Info Block: 2-column Structured Grid */}
                    <div className="mt-2 pt-2 border-t border-slate-100/90 grid grid-cols-2 gap-2">
                      <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                          Entity Type
                        </span>
                        <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight">
                          {log.entity_type || 'System'}
                        </span>
                      </div>
                      <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                          IP Address
                        </span>
                        <span className="font-mono text-slate-700 text-[11px] truncate block leading-tight">
                          {log.ip_address || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Desktop Pagination Controls */}
        {totalPages > 1 && (
          <div className="hidden md:flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
            <div className="text-xs sm:text-sm text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{Math.min((page - 1) * limit + 1, total)}</span> to{" "}
              <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-semibold text-slate-700">{total}</span> entries
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              {getVisiblePages(page, totalPages).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={
                    page === p 
                      ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer shadow-xs" 
                      : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Mobile Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex md:hidden justify-between items-center mt-3 pt-3 border-t border-slate-200 text-xs">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-slate-500 font-medium text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilterSheet && (
        <Modal
          isOpen={showMobileFilterSheet}
          onClose={() => setShowMobileFilterSheet(false)}
          title="Filter Audit Logs"
          footer={
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setActionFilter('');
                  setLimit(10);
                  setPage(1);
                  setShowMobileFilterSheet(false);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch(searchInput);
                  setPage(1);
                  setShowMobileFilterSheet(false);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-none bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Search User or Activity</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => handleSearchInputChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                  className="w-full text-xs text-slate-800 outline-none bg-transparent"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => handleSearchInputChange('')}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Action</label>
              <SearchableSelect
                options={[
                  { value: "", label: "All Actions" },
                  { value: "CREATE", label: "Created" },
                  { value: "UPDATE", label: "Updated" },
                  { value: "DELETE", label: "Deleted" },
                  { value: "LOGIN", label: "Login" }
                ]}
                value={actionFilter}
                onChange={val => {
                  setActionFilter(val);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Entries Per Page</label>
              <SearchableSelect
                options={[
                  { value: 5, label: "5 per page" },
                  { value: 10, label: "10 per page" },
                  { value: 20, label: "20 per page" },
                  { value: 50, label: "50 per page" }
                ]}
                value={limit}
                onChange={val => {
                  setLimit(val);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
