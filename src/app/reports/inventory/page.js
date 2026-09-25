"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import ExportDropdown from "@/components/ExportDropdown";
import DateRangePicker from "@/components/DateRangePicker";
import { useAuth } from "@/context/AuthContext";
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
  Package,
  CheckCircle,
  Zap,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Layers,
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
  allocated: "#3b82f6",
  maintenance: "#f59e0b",
  retired: "#ef4444",
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

function InventoryReportPageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Mobile Filter Sheet Modal State
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const initialized = useRef(false);

  // Background Scroll Locking when Mobile Filter Sheet is Open
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
      setSearchQuery(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let filters = null;
    const storedInventory = sessionStorage.getItem("report_filters_inventory");
    const storedMaintenance = sessionStorage.getItem("report_filters_maintenance");

    if (storedInventory) {
      try {
        filters = JSON.parse(storedInventory);
      } catch (e) {
        console.error(e);
      }
    } else if (storedMaintenance) {
      try {
        filters = JSON.parse(storedMaintenance);
      } catch (e) {
        console.error(e);
      }
    }

    if (filters) {
      const location = filters.location_id || filters.location || "";
      const type = filters.type || "";
      const status = filters.status || "";
      const start = filters.startDate || filters.start || "";
      const end = filters.endDate || filters.end || "";

      if (location) setSelectedLocation(location);
      if (type) setSelectedType(type);
      if (status) setSelectedStatus(status);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    } else if (searchParams) {
      const location = searchParams.get("location_id") || searchParams.get("location") || "";
      const type = searchParams.get("type") || "";
      const status = searchParams.get("status") || "";
      const start = searchParams.get("startDate") || searchParams.get("start") || "";
      const end = searchParams.get("endDate") || searchParams.get("end") || "";

      if (location) setSelectedLocation(location);
      if (type) setSelectedType(type);
      if (status) setSelectedStatus(status);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    }
    initialized.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initialized.current) return;
    const filters = {
      location_id: selectedLocation,
      type: selectedType,
      status: selectedStatus,
      startDate,
      endDate
    };
    sessionStorage.setItem("report_filters_inventory", JSON.stringify(filters));
  }, [selectedLocation, selectedType, selectedStatus, startDate, endDate]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState(null);

  // Reset page to 1 when filters change
  useEffect(() => {
    setTimeout(() => {
      setPage(1);
    }, 0);
  }, [searchQuery, selectedLocation, selectedType, selectedStatus, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsData = await reportApi.inventory({
        page,
        limit,
        search: searchQuery,
        location_id: selectedLocation,
        type: selectedType,
        status: selectedStatus,
        startDate,
        endDate
      });
      setAssets(assetsData.assets || []);
      setLocations(assetsData.locations || []);
      const totalCount = assetsData.pagination?.total ?? assetsData.total ?? (Array.isArray(assetsData.assets) ? assetsData.assets.length : 0);
      setTotalItems(totalCount);
      setSummary(assetsData.summary || null);
    } catch (e) {
      console.error("Error loading inventory data:", e);
    }
    setLoading(false);
  }, [page, limit, searchQuery, selectedLocation, selectedType, selectedStatus, startDate, endDate]);

  useEffect(() => {
    setTimeout(() => {
      loadData();
    }, 0);
  }, [loadData]);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = {
        reportType: "inventory",
        format,
        search: searchQuery,
        location_id: selectedLocation,
        type: selectedType,
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
      const filename = `inventory_report_${new Date().toISOString().split("T")[0]}.${ext}`;
      
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

  const activeFilterCount =
    (selectedLocation ? 1 : 0) +
    (selectedType ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  const resetFilters = () => {
    setSelectedLocation("");
    setSelectedType("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
  };

  // Metrics (prefer server-side summary, fallback to active state)
  const totalAssetsCount = summary?.totalAssetsCount ?? totalItems;
  const availableAssetsCount = summary?.availableAssetsCount ?? assets.filter((a) => a.status === "available").length;
  const allocatedAssetsCount = summary?.allocatedAssetsCount ?? assets.filter((a) => a.status === "allocated").length;
  const maintenanceAssetsCount = summary?.maintenanceAssetsCount ?? assets.filter((a) => a.status === "maintenance").length;

  const typeBreakdownData = summary?.typeBreakdownData || [];

  const statusBreakdownData = [
    { name: "Available", value: availableAssetsCount },
    { name: "Allocated", value: allocatedAssetsCount },
    { name: "Maintenance", value: maintenanceAssetsCount },
  ].filter((item) => item.value > 0);

  return (
    <AppLayout>
      <div className="mx-auto space-y-4 sm:space-y-6 mb-6 pt-3 sm:pt-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Asset Inventory Summary
            </h1>
            <p className="text-slate-450 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Generate and analyze dynamic hardware and software inventory reports.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={loadData}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={`sm:w-[18px] sm:h-[18px] ${loading ? "animate-spin" : ""}`} />
            </button>
            <ExportDropdown onExport={handleExport} disabled={loading} />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
              <Package size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 truncate font-mono">{totalAssetsCount}</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Total Active Assets</div>
            </div>
          </div>

          <div className="p-3 sm:p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-2xl font-bold text-emerald-700 truncate font-mono">{availableAssetsCount}</div>
              <div className="text-[10px] sm:text-xs text-emerald-600 font-medium truncate">Available Assets</div>
            </div>
          </div>

          <div className="p-3 sm:p-5 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-2xl font-bold text-blue-700 truncate font-mono">{allocatedAssetsCount}</div>
              <div className="text-[10px] sm:text-xs text-blue-600 font-medium truncate">Allocated Assets</div>
            </div>
          </div>

          <div className="p-3 sm:p-5 border border-amber-100 bg-amber-50/30 rounded-2xl flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-2xl font-bold text-amber-700 truncate font-mono">{maintenanceAssetsCount}</div>
              <div className="text-[10px] sm:text-xs text-amber-600 font-medium truncate">Under Maintenance</div>
            </div>
          </div>
        </div>

        {/* Charts: Full, Robust, Uninterrupted Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Chart 1: Bar Chart */}
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
              <Layers size={16} /> Asset Type Distribution
            </h3>
            <div className="h-64 sm:h-72 w-full">
              {typeBreakdownData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" interval={0} angle={-25} textAnchor="end" />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {typeBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Donut Chart */}
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
              <Filter size={16} /> Allocation & Status Share
            </h3>
            <div className="h-64 sm:h-72 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
              {statusBreakdownData.length === 0 ? (
                <div className="text-xs text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="w-full h-44 sm:h-full sm:flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusBreakdownData.map((entry, index) => (
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
                  <div className="flex flex-wrap sm:flex-col justify-center gap-2.5 shrink-0 self-center">
                    {statusBreakdownData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3.5 h-3.5 rounded-md shrink-0"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase()] || COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="font-semibold text-slate-650">{entry.name}:</span>
                        <span className="font-extrabold text-slate-800 font-mono">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Filter Row */}
        <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl shadow-xs">
          <div className="flex-1 relative h-10 flex items-center">
            <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by tag, name, brand, serial..."
              className="w-full h-full pl-9 pr-9 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all text-slate-800 placeholder-slate-400"
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
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <SearchableSelect
              options={[
                { value: "", label: "All Locations" },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
              value={selectedLocation}
              onChange={(val) => setSelectedLocation(val)}
              className="w-[150px]"
            />
            <SearchableSelect
              options={[
                { value: "", label: "All Types" },
                { value: "Laptop", label: "Laptop" },
                { value: "Desktop", label: "Desktop" },
                { value: "Mobile", label: "Mobile" },
                { value: "Monitor", label: "Monitor" },
                { value: "Accessories", label: "Accessories" },
                { value: "Other", label: "Other" },
              ]}
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              className="w-[130px]"
            />
            <SearchableSelect
              options={[
                { value: "", label: "All Status" },
                { value: "available", label: "Available" },
                { value: "allocated", label: "Allocated" },
                { value: "maintenance", label: "Maintenance" },
                { value: "retired", label: "Retired" },
              ]}
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              className="w-[130px]"
            />
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
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

        {/* Mobile Filter & Search Bar */}
        <div className="block md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 shadow-2xs transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search assets..."
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
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
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
              aria-label="Filter Inventory"
              title="Filter Inventory"
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
              {selectedLocation && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {locations.find((l) => String(l.id) === String(selectedLocation))?.name || "Location"}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setSelectedLocation("")}
                  />
                </span>
              )}
              {selectedType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {selectedType}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setSelectedType("")}
                  />
                </span>
              )}
              {selectedStatus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {selectedStatus}
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

        {/* Data Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">{t('assetTag')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('assetDetails')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('location')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('allocatedTo')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">No assets found.</td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">{asset.asset_tag}</td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-800">{asset.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {t(asset.type) || asset.type} • {asset.brand || "—"} • SN: {asset.serial_number || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-medium">{asset.location?.name || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                          style={{
                            backgroundColor: `${STATUS_COLORS[asset.status]}15`,
                            color: STATUS_COLORS[asset.status],
                            border: `1px solid ${STATUS_COLORS[asset.status]}30`,
                          }}
                        >
                          {t(asset.status) || asset.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-650 font-bold">{asset.allocated_user_name || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-2.5 p-3 sm:p-4">
            {assets.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No assets found.</div>
            ) : (
              assets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3.5 py-3 shadow-2xs flex flex-col transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13.5px] font-bold text-slate-900 leading-snug tracking-tight truncate">{asset.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md font-bold font-mono tracking-tight">
                          {asset.asset_tag}
                        </span>
                        {asset.brand && (
                          <span className="text-[11px] text-slate-400 font-medium truncate">• {asset.brand}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                      style={{
                        backgroundColor: `${STATUS_COLORS[asset.status]}15`,
                        color: STATUS_COLORS[asset.status],
                        border: `1px solid ${STATUS_COLORS[asset.status]}30`,
                      }}
                    >
                      {t(asset.status) || asset.status}
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100/90 grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{t('category')}</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight">{t(asset.type) || asset.type}</span>
                    </div>
                    <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{t('location')}</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight">{asset.location?.name || "—"}</span>
                    </div>
                    <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{t('allocatedTo')}</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight">{asset.allocated_user_name || "—"}</span>
                    </div>
                    <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">SN</span>
                      <span className="font-mono text-slate-700 text-[11px] truncate block leading-tight">{asset.serial_number || "—"}</span>
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
            currentItemsCount={assets.length}
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
                <h3 className="text-base font-bold text-slate-900">Filter Inventory</h3>
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
              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Locations" },
                    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
                  ]}
                  value={selectedLocation}
                  onChange={(val) => setSelectedLocation(val)}
                  className="w-full"
                />
              </div>

              {/* Asset Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Asset Type</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Types" },
                    { value: "Laptop", label: "Laptop" },
                    { value: "Desktop", label: "Desktop" },
                    { value: "Mobile", label: "Mobile" },
                    { value: "Monitor", label: "Monitor" },
                    { value: "Accessories", label: "Accessories" },
                    { value: "Other", label: "Other" },
                  ]}
                  value={selectedType}
                  onChange={(val) => setSelectedType(val)}
                  className="w-full"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Asset Status</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Status" },
                    { value: "available", label: "Available" },
                    { value: "allocated", label: "Allocated" },
                    { value: "maintenance", label: "Maintenance" },
                    { value: "retired", label: "Retired" },
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

export default function InventoryReportPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-sm text-slate-500 font-semibold bg-white rounded-2xl border border-slate-100 m-6">
        Loading inventory reports...
      </div>
    }>
      <InventoryReportPageInner />
    </Suspense>
  );
}
