"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
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

  const filtered = logs;

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Track all system activities and changes</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors">
          <Download size={16} /> Export Logs
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 md:items-center mb-5">
          <div className="flex-1 relative w-full">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search by user or activity..."
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
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
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                    <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            className="w-full md:w-[150px]"
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
            className="w-full md:w-[150px]"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
            <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
            <ClipboardList size={48} className="mb-3 opacity-40" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          filtered.map((log) => {
            const iconInfo = getAuditIcon(log.action);
            const badgeInfo = getActionBadge(log.action);
            const Icon = iconInfo.icon;
            const ts = new Date(log.created_at || log.createdAt);
            return (
              <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-b-0" key={log.id}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconInfo.cls}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-800">
                      {log.user_id ? `User #${log.user_id}` : "System"}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${badgeInfo.cls}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {badgeInfo.label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mb-1">{log.details}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>● {log.entity_type || "System"}</span>
                    <span>{log.ip_address || "—"}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 shrink-0">
                  <div>{ts.toLocaleTimeString()}</div>
                  <div>{ts.toLocaleDateString()}</div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Showing {Math.min((page - 1) * limit + 1, total)} to{" "}
              {Math.min(page * limit, total)} of {total} entries
            </div>
            <div className="flex gap-1.5">
              <button
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer" 
                      : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
