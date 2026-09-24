"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import ExportDropdown from "@/components/ExportDropdown";
import DateRangePicker from "@/components/DateRangePicker";
import { useLanguage } from "@/context/LanguageContext";
import { reportApi } from "@/lib/api";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
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
  RefreshCw,
  Layers,
  Zap,
  CheckCircle,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ChevronDown,
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

function PageSizeSelect({ value, onChange }) {
  return (
    <div className="relative inline-flex items-center shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Rows per page"
        className="appearance-none bg-slate-50 hover:bg-slate-100/90 text-slate-700 text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors shadow-2xs"
      >
        <option value={5}>5 / page</option>
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function TablePagination({ currentPage, totalItems, limit, onPageChange, onLimitChange, currentItemsCount = 0 }) {
  const effectiveTotal = Math.max(Number(totalItems) || 0, Number(currentItemsCount) || 0);
  if (effectiveTotal === 0) return null;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / limit));

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
    <div className="border-t border-slate-100 p-3 sm:p-4 bg-white">
      {/* Desktop Pagination */}
      <div className="hidden sm:flex justify-between items-center gap-4">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * limit + 1, effectiveTotal)}</span> to{" "}
          <span className="font-semibold text-slate-700">{Math.min(currentPage * limit, effectiveTotal)}</span> of{" "}
          <span className="font-semibold text-slate-700">{effectiveTotal}</span> entries
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelect
            value={limit}
            onChange={(newLimit) => {
              onLimitChange(newLimit);
              onPageChange(1);
            }}
          />
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors" 
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))} 
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {visiblePages.map(p => (
                <button 
                  key={p} 
                  type="button"
                  className={currentPage === p 
                    ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer shadow-2xs" 
                    : "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                  } 
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              ))}
              <button 
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors" 
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Pagination */}
      <div className="flex sm:hidden flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            {Math.min((currentPage - 1) * limit + 1, effectiveTotal)}-{Math.min(currentPage * limit, effectiveTotal)} of {effectiveTotal}
          </span>
          <PageSizeSelect
            value={limit}
            onChange={(newLimit) => {
              onLimitChange(newLimit);
              onPageChange(1);
            }}
          />
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button 
              type="button"
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center" 
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))} 
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="text-xs font-semibold text-slate-600 px-2 whitespace-nowrap">
              {currentPage} / {totalPages}
            </span>
            <button 
              type="button"
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center" 
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))} 
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LicensesReportPageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [licenseSearch, setLicenseSearch] = useState("");
  const [licenseStatus, setLicenseStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const initialized = useRef(false);

  // Lock scroll when filter drawer is open
  useEffect(() => {
    if (showFilterSheet) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => unlockScroll();
  }, [showFilterSheet]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setLicenseSearch(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let filters = null;
    const stored = sessionStorage.getItem("report_filters_licenses");
    if (stored) {
      try {
        filters = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    if (filters) {
      const status = filters.status || "";
      const search = filters.search || filters.software || "";
      const start = filters.startDate || filters.start || "";
      const end = filters.endDate || filters.end || "";

      if (status) setLicenseStatus(status);
      if (search) {
        setSearchInput(search);
        setLicenseSearch(search);
      }
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    } else if (searchParams) {
      const status = searchParams.get("status") || "";
      const search = searchParams.get("search") || searchParams.get("software") || "";
      const start = searchParams.get("startDate") || searchParams.get("start") || "";
      const end = searchParams.get("endDate") || searchParams.get("end") || "";

      if (status) setLicenseStatus(status);
      if (search) {
        setSearchInput(search);
        setLicenseSearch(search);
      }
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    }
    initialized.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initialized.current) return;
    const filters = {
      status: licenseStatus,
      search: licenseSearch,
      startDate,
      endDate
    };
    sessionStorage.setItem("report_filters_licenses", JSON.stringify(filters));
  }, [licenseStatus, licenseSearch, startDate, endDate]);

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
      const totalCount = data.pagination?.total ?? data.total ?? (Array.isArray(data.licenses) ? data.licenses.length : 0);
      setTotalItems(totalCount);
      setSummary(data.summary || null);
    } catch (e) {
      console.error("Error loading licenses data:", e);
    }
    setLoading(false);
  }, [page, limit, licenseSearch, licenseStatus, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setLicenseStatus("");
    setStartDate("");
    setEndDate("");
    setSearchInput("");
    setLicenseSearch("");
    setPage(1);
  };

  const activeFilterCount = (licenseStatus ? 1 : 0) + (startDate || endDate ? 1 : 0);

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
      const ext = format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
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
      <div className="mx-auto space-y-4 sm:space-y-6 pt-3 sm:pt-5 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Software License Reports
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Generate audits for corporate software seat licenses, keys, and expirations.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
            <button
              onClick={loadData}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer bg-white shadow-2xs shrink-0"
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <ExportDropdown onExport={handleExport} disabled={loading} />
          </div>
        </div>

        {/* Statistics Overview: Single Container */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-2.5 sm:p-4">
          <div className="grid grid-cols-4 divide-x divide-slate-100">
            {/* Stat 1: Total Seats */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <KeyRound size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Total Seats</span>
                <div className="text-xs sm:text-xl font-bold text-slate-900 tracking-tight leading-tight mt-0.5 font-mono">
                  {totalLicensesCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 2: Available */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Available</span>
                <div className="text-xs sm:text-xl font-bold text-emerald-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {availableLicensesCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 3: Assigned */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Assigned</span>
                <div className="text-xs sm:text-xl font-bold text-blue-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {activeLicensesCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 4: Expired */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Expired</span>
                <div className="text-xs sm:text-xl font-bold text-rose-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {expiredLicensesCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Software License Allocations Bar Chart */}
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-3 sm:space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" /> Software License Allocations
            </h3>
            <div className="h-64 sm:h-72">
              {licenseSoftwareBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={licenseSoftwareBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {licenseSoftwareBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* License Status Distribution Pie Chart */}
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-3 sm:space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter size={16} className="text-emerald-600" /> License Status Distribution
            </h3>
            <div className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              {licenseStatusBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="flex-1 h-44 sm:h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={licenseStatusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
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
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-2.5 shrink-0 justify-center">
                    {licenseStatusBreakdown.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3 h-3 rounded-md shrink-0"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase()] || COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="font-semibold text-slate-600">{entry.name}:</span>
                        <span className="font-extrabold text-slate-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Filter Toolbar */}
        <div className="hidden md:flex flex-col gap-3 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search license by key, software name, employee..."
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
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
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Status Select */}
            <div className="w-[180px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Status" },
                  { value: "available", label: "Available" },
                  { value: "active", label: "Active (Assigned)" },
                  { value: "expired", label: "Expired" }
                ]}
                value={licenseStatus}
                onChange={val => setLicenseStatus(val)}
                className="w-full"
              />
            </div>

            {/* Date Range Picker */}
            <div className="w-[230px] shrink-0">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                className="w-full"
              />
            </div>

            {/* Clear Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
                title="Reset all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search & Filter Bar */}
        <div className="block md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 shadow-2xs transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search licenses..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setLicenseSearch(searchInput);
                    }
                  }}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setLicenseSearch("");
                    }}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Single Filter Button Trigger */}
            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 text-xs font-semibold ${
                activeFilterCount > 0
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
              aria-label="Filter Licenses"
              title="Filter Licenses"
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Badges on Mobile */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 text-xs custom-scrollbar">
              {licenseStatus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {licenseStatus}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setLicenseStatus("")}
                  />
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {startDate} {endDate ? `→ ${endDate}` : ""}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                  />
                </span>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-transparent border-none cursor-pointer underline shrink-0 px-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Data Table & Mobile Cards */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('software')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('licenseKey')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('assignedEmployee')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('purchasedDate')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('validUntil')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <KeyRound size={20} />
                        </div>
                        <span className="font-medium">No matching software license logs found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-800 font-bold">{license.software_name}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-600 font-mono">{license.license_key}</td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-800">{license.user?.name || "—"}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{license.user?.email || "—"}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-semibold">
                        {license.created_at ? new Date(license.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-semibold">
                        {license.valid_until ? new Date(license.valid_until).toLocaleDateString() : "Perpetual"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block"
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

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {licenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <KeyRound size={20} />
                </div>
                <span className="font-medium">No matching software license logs found.</span>
              </div>
            ) : (
              licenses.map((license) => (
                <div key={license.id} className="p-3.5 sm:p-4 flex flex-col gap-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{license.software_name}</h4>
                      <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block truncate">
                        {license.license_key}
                      </span>
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                      style={{
                        backgroundColor: `${STATUS_COLORS[license.status]}15`,
                        color: STATUS_COLORS[license.status],
                        border: `1px solid ${STATUS_COLORS[license.status]}30`,
                      }}
                    >
                      {t(license.status) || license.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <div className="min-w-0 col-span-2 sm:col-span-1">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignedEmployee')}</span>
                      <span className="font-semibold text-slate-700 truncate block">{license.user?.name || "—"}</span>
                      {license.user?.email && (
                        <span className="text-[10px] text-slate-400 truncate block">{license.user.email}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('purchasedDate')}</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {license.created_at ? new Date(license.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('validUntil')}</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {license.valid_until ? new Date(license.valid_until).toLocaleDateString() : "Perpetual"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Persistent, Responsive Pagination */}
          <TablePagination
            currentPage={page}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            currentItemsCount={licenses.length}
          />
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet Drawer */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-[500] md:hidden" onClick={() => setShowFilterSheet(false)}>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-sheet-fade-in" />

          {/* Bottom Sheet Drawer */}
          <div
            className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-[501] flex flex-col animate-sheet-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Filter Licenses</h3>
                {activeFilterCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Status</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Status" },
                    { value: "available", label: "Available" },
                    { value: "active", label: "Active (Assigned)" },
                    { value: "expired", label: "Expired" }
                  ]}
                  value={licenseStatus}
                  onChange={(val) => setSelectedStatus(val)}
                  className="w-full"
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date Range</label>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  className="w-full"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl bg-white cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer border-none"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function LicensesReportPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-sm text-slate-500 font-semibold bg-white rounded-2xl border border-slate-100 m-6">
        Loading software licenses reports...
      </div>
    }>
      <LicensesReportPageInner />
    </Suspense>
  );
}
