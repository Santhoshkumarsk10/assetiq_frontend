"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import ExportDropdown from "@/components/ExportDropdown";
import DateRangePicker from "@/components/DateRangePicker";
import { useLanguage } from "@/context/LanguageContext";
import { reportApi } from "@/lib/api";
import {
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  X,
} from "lucide-react";

function TablePagination({ currentPage, totalItems, limit, onPageChange, onLimitChange }) {
  const totalPages = Math.ceil(totalItems / limit);
  if (totalPages <= 1) return null;

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

  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-5 p-4 border-t border-slate-100 gap-4">
      <div className="text-xs text-slate-500 font-medium">
        Showing {Math.min((currentPage - 1) * limit + 1, totalItems)} to {Math.min(currentPage * limit, totalItems)} of {totalItems} entries
      </div>
      <div className="flex items-center gap-3">
        <SearchableSelect
          options={[
            { value: 5, label: "5 per page" },
            { value: 10, label: "10 per page" },
            { value: 25, label: "25 per page" },
            { value: 50, label: "50 per page" }
          ]}
          value={limit}
          onChange={val => onLimitChange(Number(val))}
          className="w-[130px]"
        />
        <div className="flex gap-1">
          <button 
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))} 
            disabled={currentPage === 1}
          >
            Prev
          </button>
          {visiblePages.map(p => (
            <button 
              key={p} 
              className={currentPage === p 
                ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer" 
                : "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
              } 
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
          <button 
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))} 
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditReportPage() {
  const { t } = useLanguage();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [totalItems, setTotalItems] = useState(0);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedAction, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.auditLogs({
        page,
        limit,
        search: searchQuery,
        action: selectedAction,
        startDate,
        endDate
      });
      setAuditLogs(data.logs || []);
      setTotalItems(data.pagination?.total || data.total || 0);
    } catch (e) {
      console.error("Error loading audit data:", e);
    }
    setLoading(false);
  }, [page, limit, searchQuery, selectedAction, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = {
        reportType: "audit-logs",
        format,
        search: searchQuery,
        action: selectedAction,
        startDate,
        endDate,
      };

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

      const res = await fetch(`${API_BASE}/reports/export`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const ext = format === "excel" ? "xlsx" : "pdf";
      const filename = `audit_logs_report_${new Date().toISOString().split("T")[0]}.${ext}`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Error: ", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto space-y-6 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              System Audit Trail Reports
            </h1>
            <p className="text-slate-455 text-sm mt-1">
              View and generate formal logs of all system operations, settings adjustments, and asset lifecycle actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-655 hover:bg-slate-55 transition-colors cursor-pointer bg-white"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <ExportDropdown onExport={handleExport} disabled={loading} />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-xs items-center">
          <div className="lg:col-span-6 relative h-10 flex items-center">
            <Search 
              size={16} 
              className="absolute left-3 text-slate-400 cursor-pointer hover:text-emerald-600 transition-colors" 
              onClick={() => setSearchQuery(searchInput)}
              title="Click to search"
            />
            <input
              type="text"
              placeholder="Search audit trail logs by action description, details, or operator name (Press Enter)..."
              className="w-full h-full pl-9 pr-9 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearchQuery(searchInput);
                }
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <SearchableSelect
              options={[
                { value: "", label: "All Action Categories" },
                { value: "CREATE", label: "Create Action" },
                { value: "UPDATE", label: "Update Action" },
                { value: "DELETE", label: "Delete Action" },
                { value: "ALLOCATE", label: "Allocate Action" },
                { value: "RETURN", label: "Return Action" }
              ]}
              value={selectedAction}
              onChange={val => setSelectedAction(val)}
            />
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('timestamp')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('performedBy')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">Action Type</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('logDetails')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">No matching system audit logs found.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-650 font-bold">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-800">{log.user?.name || "System"}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{log.user?.email || "internal_process"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action?.includes("CREATE") ? "bg-emerald-50 text-emerald-600 border border-emerald-250" :
                          log.action?.includes("UPDATE") ? "bg-blue-50 text-blue-600 border border-blue-250" :
                          log.action?.includes("DELETE") ? "bg-rose-50 text-rose-600 border border-rose-250" :
                          "bg-slate-50 text-slate-500 border border-slate-250"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-700 font-medium max-w-[350px] truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No matching system audit logs found.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{log.action}</h4>
                      <span className="text-xs text-slate-400 font-bold mt-0.5 block">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 border-t border-slate-50 pt-2">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('performedBy')}</span>
                    <span className="font-semibold text-slate-700">{log.user?.name || "System"}</span>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mt-2">{t('logDetails')}</span>
                    <span className="font-semibold text-slate-750 block mt-0.5">{log.details}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <TablePagination
            currentPage={page}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      </div>
    </AppLayout>
  );
}
