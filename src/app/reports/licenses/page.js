"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import ExportDropdown from "@/components/ExportDropdown";
import DateRangePicker from "@/components/DateRangePicker";
import { useLanguage } from "@/context/LanguageContext";
import { reportApi } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  KeyRound,
  Search,
  Filter,
  Download,
  RefreshCw,
  Layers,
  Zap,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
];

const STATUS_COLORS = {
  available: "#10b981",
  active: "#3b82f6",
  expired: "#ef4444",
};

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

export default function LicensesReportPage() {
  const { t } = useLanguage();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [licenseSearch, setLicenseSearch] = useState("");
  const [licenseStatus, setLicenseStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState(null);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [licenseSearch, licenseStatus, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.licenses({
        page,
        limit,
        search: licenseSearch,
        status: licenseStatus,
        startDate,
        endDate
      });
      setLicenses(data.licenses || []);
      setTotalItems(data.pagination?.total || data.total || 0);
      setSummary(data.summary || null);
    } catch (e) {
      console.error("Error loading licenses data:", e);
    }
    setLoading(false);
  }, [page, limit, licenseSearch, licenseStatus, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = {
        reportType: "licenses",
        format,
        search: licenseSearch,
        status: licenseStatus,
        startDate,
        endDate,
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('assetiq_token') : null;
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

      const res = await fetch(`${API_BASE}/reports/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const ext = format === "excel" ? "xlsx" : "pdf";
      const filename = `licenses_report_${new Date().toISOString().split("T")[0]}.${ext}`;
      
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

  // Metrics
  const totalLicensesCount = summary?.totalLicensesCount ?? totalItems;
  const activeLicensesCount = summary?.activeLicensesCount ?? licenses.filter(l => l.status === "active").length;
  const availableLicensesCount = summary?.availableLicensesCount ?? licenses.filter(l => l.status === "available").length;
  const expiredLicensesCount = summary?.expiredLicensesCount ?? licenses.filter(l => l.status === "expired").length;

  const rawSoftwareMap = summary?.licenseSoftwareMap || {};
  const licenseSoftwareBreakdown = Object.keys(rawSoftwareMap).map((key) => ({
    name: key,
    value: rawSoftwareMap[key],
  }));

  const licenseStatusBreakdown = [
    { name: "Available", value: availableLicensesCount },
    { name: "Active", value: activeLicensesCount },
    { name: "Expired", value: expiredLicensesCount },
  ].filter((item) => item.value > 0);

  return (
    <AppLayout>
      <div className="mx-auto space-y-6 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Software License Reports
            </h1>
            <p className="text-slate-455 text-sm mt-1">
              Generate audits for corporate software seat licenses, keys, and expirations.
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-600">
              <KeyRound size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{totalLicensesCount}</div>
              <div className="text-xs text-slate-455 font-medium">Total Registered Seats</div>
            </div>
          </div>

          <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Zap size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{availableLicensesCount}</div>
              <div className="text-xs text-emerald-500 font-medium">Available Seats</div>
            </div>
          </div>

          <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">{activeLicensesCount}</div>
              <div className="text-xs text-blue-500 font-medium">Assigned Seats</div>
            </div>
          </div>

          <div className="p-5 border border-rose-100 bg-rose-50/30 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-700">{expiredLicensesCount}</div>
              <div className="text-xs text-rose-500 font-medium">Expired Licenses</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Layers size={16} /> Software License Allocations
            </h3>
            <div className="h-64">
              {licenseSoftwareBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={licenseSoftwareBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {licenseSoftwareBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Filter size={16} /> License Status Distribution
            </h3>
            <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
              {licenseStatusBreakdown.length === 0 ? (
                <div className="text-xs text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="flex-1 h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={licenseStatusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {licenseStatusBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2.5 shrink-0 self-center">
                    {licenseStatusBreakdown.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3.5 h-3.5 rounded-md"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase()] || COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="font-semibold text-slate-655">{entry.name}:</span>
                        <span className="font-extrabold text-slate-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-xs items-center">
          <div className="lg:col-span-6 relative h-10 flex items-center">
            <Search 
              size={16} 
              className="absolute left-3 text-slate-400 cursor-pointer hover:text-emerald-600 transition-colors" 
              onClick={() => setLicenseSearch(searchInput)}
              title="Click to search"
            />
            <input
              type="text"
              placeholder="Search license by key, software name, employee (Press Enter)..."
              className="w-full h-full pl-9 pr-9 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLicenseSearch(searchInput);
                }
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setLicenseSearch("");
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
                { value: "", label: "All Statuses" },
                { value: "available", label: "Available" },
                { value: "active", label: "Active (Assigned)" },
                { value: "expired", label: "Expired" }
              ]}
              value={licenseStatus}
              onChange={val => setLicenseStatus(val)}
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
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('software')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('licenseKey')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('assignedEmployee')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('purchasedDate')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('validUntil')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">No matching software license logs found.</td>
                  </tr>
                ) : (
                  licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-800 font-bold">{license.software_name}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 font-mono">{license.license_key}</td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-800">{license.user?.name || "—"}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{license.user?.email || "—"}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-650 font-bold">
                        {license.created_at ? new Date(license.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-650 font-bold">
                        {license.valid_until ? new Date(license.valid_until).toLocaleDateString() : "Perpetual"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                          style={{
                            backgroundColor: `${STATUS_COLORS[license.status]}15`,
                            color: STATUS_COLORS[license.status],
                            border: `1px solid ${STATUS_COLORS[license.status]}30`,
                          }}
                        >
                          {t(license.status) || license.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden divide-y divide-slate-100">
            {licenses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No matching software license logs found.</div>
            ) : (
              licenses.map((license) => (
                <div key={license.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{license.software_name}</h4>
                      <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">{license.license_key}</span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                      style={{
                        backgroundColor: `${STATUS_COLORS[license.status]}15`,
                        color: STATUS_COLORS[license.status],
                        border: `1px solid ${STATUS_COLORS[license.status]}30`,
                      }}
                    >
                      {t(license.status) || license.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignedEmployee')}</span>
                      <span className="font-semibold text-slate-700">{license.user?.name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('purchasedDate')}</span>
                      <span className="font-semibold text-slate-700">{license.created_at ? new Date(license.created_at).toLocaleDateString() : "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('validUntil')}</span>
                      <span className="font-semibold text-slate-750">{license.valid_until ? new Date(license.valid_until).toLocaleDateString() : "Perpetual"}</span>
                    </div>
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
