"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import AnimatedPageTitle from "@/components/AnimatedPageTitle";
import SearchableSelect from "@/components/SearchableSelect";
import { auditApi } from "@/lib/api";
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
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 sm:items-center mb-4 sm:mb-5">
          <div className="flex-1 relative w-full">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
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
                className="border-none bg-transparent outline-none text-xs sm:text-sm text-slate-800 w-full placeholder-slate-400"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    handleSearchInputChange('');
                  }}
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
                    onClick={() => {
                      setSearchInput(item.value);
                      setSearch(item.value);
                      setPage(1);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    <span className="text-[9px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                    <span className="text-xs sm:text-sm text-slate-700 font-medium truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 shrink-0">
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
              className="w-full sm:w-[150px]"
            />
            <SearchableSelect
              options={[
                { value: 5, label: "5 per page" },
                { value: 10, label: "10 per page" },
                { value: 20, label: "20 per page" },
                { value: 50, label: "50 per page" }
              ]}
              value={limit}
              onChange={val => setLimit(val)}
              className="w-full sm:w-[130px]"
            />
          </div>
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
          <div className="divide-y divide-slate-100">
            {filtered.map((log) => {
              const iconInfo = getAuditIcon(log.action);
              const badgeInfo = getActionBadge(log.action);
              const Icon = iconInfo.icon;
              const ts = new Date(log.created_at || log.createdAt);

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 sm:gap-4 py-3 sm:py-3.5 hover:bg-slate-50/50 transition-colors rounded-xl px-1 sm:px-2"
                >
                  {/* Action Icon */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${iconInfo.cls}`}>
                    <Icon size={16} className="sm:w-5 sm:h-5" />
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {log.user?.name || (log.user_id ? `User #${log.user_id}` : "System")}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border tracking-wide ${badgeInfo.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {badgeInfo.label}
                        </span>
                      </div>
                      {/* Mobile Timestamp */}
                      <span className="text-[11px] text-slate-400 font-mono sm:hidden shrink-0">
                        {ts.toLocaleDateString([], { month: 'short', day: 'numeric' })}, {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-1.5 break-words">
                      {log.details || "No details recorded"}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        {log.entity_type || "System"}
                      </span>
                      {log.ip_address && (
                        <span className="font-mono bg-slate-100/90 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] text-slate-500">
                          {log.ip_address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop Timestamp Column */}
                  <div className="hidden sm:flex flex-col text-right text-xs text-slate-400 shrink-0 font-mono self-start mt-0.5">
                    <span className="font-medium text-slate-650">{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="text-[11px] text-slate-400">{ts.toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop Pagination Controls */}
        {totalPages > 1 && (
          <div className="hidden md:flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
            <div className="text-xs sm:text-sm text-slate-500">
              Showing {Math.min((page - 1) * limit + 1, total)} to{" "}
              {Math.min(page * limit, total)} of {total} entries
            </div>
            <div className="flex gap-1.5">
              <button
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={
                    page === p 
                      ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer shadow-2xs" 
                      : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-all"
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-slate-500 font-medium text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
