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
  FileText,
  Search,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

const STATUS_COLORS = {
  active: "#3b82f6",
  returned: "#10b981",
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

function AllocationsReportPageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const initialized = useRef(false);

  // Lock scroll when filter drawer is opened
  useEffect(() => {
    if (showFilterSheet) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => unlockScroll();
  }, [showFilterSheet]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let filters = null;
    const stored = sessionStorage.getItem("report_filters_allocations");
    if (stored) {
      try {
        filters = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    if (filters) {
      const status = filters.status || "";
      const start = filters.startDate || filters.start || "";
      const end = filters.endDate || filters.end || "";

      if (status) setSelectedStatus(status);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    } else if (searchParams) {
      const status = searchParams.get("status") || "";
      const start = searchParams.get("startDate") || searchParams.get("start") || "";
      const end = searchParams.get("endDate") || searchParams.get("end") || "";

      if (status) setSelectedStatus(status);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    }
    initialized.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initialized.current) return;
    const filters = {
      status: selectedStatus,
      startDate,
      endDate
    };
    sessionStorage.setItem("report_filters_allocations", JSON.stringify(filters));
  }, [selectedStatus, startDate, endDate]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedStatus, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.allocations({
        page,
        limit,
        search: searchQuery,
        status: selectedStatus,
        startDate,
        endDate
      });
      setAllocationHistory(data.allocations || []);
      const totalCount = data.pagination?.total ?? data.total ?? (Array.isArray(data.allocations) ? data.allocations.length : 0);
      setTotalItems(totalCount);
    } catch (e) {
      console.error("Error loading allocations data:", e);
    }
    setLoading(false);
  }, [page, limit, searchQuery, selectedStatus, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const activeFilterCount = (selectedStatus ? 1 : 0) + (startDate || endDate ? 1 : 0);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = {
        reportType: "allocations",
        format,
        search: searchQuery,
        status: selectedStatus,
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
      const filename = `allocations_report_${new Date().toISOString().split("T")[0]}.${ext}`;
      
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
      <div className="mx-auto space-y-4 sm:space-y-6 pt-3 sm:pt-5 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Asset In/Out Reports
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Generate and track logs of assets checking in and out across locations.
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

        {/* Desktop Filter Toolbar */}
        <div className="hidden md:flex flex-col gap-3 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by asset tag, employee, allocator..."
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
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
                  { value: "active", label: "Active (Assigned)" },
                  { value: "returned", label: "Returned" }
                ]}
                value={selectedStatus}
                onChange={val => setSelectedStatus(val)}
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

            {/* Clear Filters Button */}
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
                  placeholder="Search logs..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setSearchQuery(searchInput);
                    }
                  }}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
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
              aria-label="Filter Allocations"
              title="Filter Allocations"
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
              {selectedStatus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {selectedStatus === "active" ? "Active" : "Returned"}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setSelectedStatus("")}
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
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('assetTag')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('assignedEmployee')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('allocatedBy')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('notesReason')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('allocatedDate')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('returnedDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocationHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <FileText size={20} />
                        </div>
                        <span className="font-medium">No allocation logs found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allocationHistory.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">
                        {alloc.asset?.asset_tag || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-800">{alloc.user?.name || "—"}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{alloc.user?.email || "—"}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-700 font-medium">
                        {alloc.allocator?.name || "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 font-medium max-w-[200px] truncate" title={alloc.notes}>
                        {alloc.notes || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block"
                          style={{
                            backgroundColor: `${STATUS_COLORS[alloc.status]}15`,
                            color: STATUS_COLORS[alloc.status],
                            border: `1px solid ${STATUS_COLORS[alloc.status]}30`,
                          }}
                        >
                          {alloc.status === "active" ? t("allocated") : t("returned")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-semibold">
                        {alloc.created_at ? new Date(alloc.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-semibold">
                        {alloc.returned_at ? new Date(alloc.returned_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {allocationHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <FileText size={20} />
                </div>
                <span className="font-medium">No allocation logs found.</span>
              </div>
            ) : (
              allocationHistory.map((alloc) => (
                <div key={alloc.id} className="p-3.5 sm:p-4 flex flex-col gap-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {alloc.asset?.name || "Asset"}
                      </h4>
                      <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">
                        {alloc.asset?.asset_tag || "—"}
                      </span>
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                      style={{
                        backgroundColor: `${STATUS_COLORS[alloc.status]}15`,
                        color: STATUS_COLORS[alloc.status],
                        border: `1px solid ${STATUS_COLORS[alloc.status]}30`,
                      }}
                    >
                      {alloc.status === "active" ? t("allocated") : t("returned")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignedEmployee')}</span>
                      <span className="font-semibold text-slate-700 truncate block">{alloc.user?.name || "—"}</span>
                      {alloc.user?.email && (
                        <span className="text-[10px] text-slate-400 truncate block">{alloc.user.email}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('allocatedBy')}</span>
                      <span className="font-semibold text-slate-700 truncate block">{alloc.allocator?.name || "—"}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('allocatedDate')}</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {alloc.created_at ? new Date(alloc.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('returnedDate')}</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {alloc.returned_at ? new Date(alloc.returned_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  {alloc.notes && (
                    <div className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 mt-0.5">
                      <span className="font-bold text-slate-400 text-[10px] uppercase block mb-0.5">{t('notesReason')}</span>
                      <p className="text-slate-700 font-medium break-words leading-relaxed text-[11px]">{alloc.notes}</p>
                    </div>
                  )}
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
            currentItemsCount={allocationHistory.length}
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
                <h3 className="text-base font-bold text-slate-900">Filter Allocations</h3>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Allocation Status</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Status" },
                    { value: "active", label: "Active (Assigned)" },
                    { value: "returned", label: "Returned" },
                  ]}
                  value={selectedStatus}
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

export default function AllocationsReportPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-sm text-slate-500 font-semibold bg-white rounded-2xl border border-slate-100 m-6">
        Loading asset allocations reports...
      </div>
    }>
      <AllocationsReportPageInner />
    </Suspense>
  );
}
