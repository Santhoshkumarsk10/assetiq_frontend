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
  FileText,
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
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  resolved: "#10b981",
  closed: "#64748b",
  cancelled: "#ef4444",
};

const CATEGORY_LABELS = {
  hardware_malfunction: "Hardware Malfunction",
  software_issue: "Software Issue",
  lost_stolen: "Lost / Stolen",
  physical_damage: "Physical Damage",
  general_it: "General IT",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case "critical":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "low":
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
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

function TicketsReportPageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPriority, setTicketPriority] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  const [ticketLocation, setTicketLocation] = useState("");
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
      setTicketSearch(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let filters = null;
    const stored = sessionStorage.getItem("report_filters_tickets");
    if (stored) {
      try {
        filters = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    if (filters) {
      const category = filters.category || "";
      const priority = filters.priority || "";
      const status = filters.status || "";
      const location = filters.location_id || filters.location || "";
      const start = filters.startDate || filters.start || "";
      const end = filters.endDate || filters.end || "";

      if (category) setTicketCategory(category);
      if (priority) setTicketPriority(priority);
      if (status) setTicketStatus(status);
      if (location) setTicketLocation(location);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    } else if (searchParams) {
      const category = searchParams.get("category") || "";
      const priority = searchParams.get("priority") || "";
      const status = searchParams.get("status") || "";
      const location = searchParams.get("location_id") || searchParams.get("location") || "";
      const start = searchParams.get("startDate") || searchParams.get("start") || "";
      const end = searchParams.get("endDate") || searchParams.get("end") || "";

      if (category) setTicketCategory(category);
      if (priority) setTicketPriority(priority);
      if (status) setTicketStatus(status);
      if (location) setTicketLocation(location);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    }
    initialized.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initialized.current) return;
    const filters = {
      category: ticketCategory,
      priority: ticketPriority,
      status: ticketStatus,
      location_id: ticketLocation,
      startDate,
      endDate
    };
    sessionStorage.setItem("report_filters_tickets", JSON.stringify(filters));
  }, [ticketCategory, ticketPriority, ticketStatus, ticketLocation, startDate, endDate]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState(null);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [ticketSearch, ticketCategory, ticketPriority, ticketStatus, ticketLocation, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.tickets({
        page,
        limit,
        search: ticketSearch,
        category: ticketCategory,
        priority: ticketPriority,
        status: ticketStatus,
        location_id: ticketLocation,
        startDate,
        endDate
      });
      setTickets(data.tickets || []);
      setLocations(data.locations || []);
      const totalCount = data.pagination?.total ?? data.total ?? (Array.isArray(data.tickets) ? data.tickets.length : 0);
      setTotalItems(totalCount);
      setSummary(data.summary || null);
    } catch (e) {
      console.error("Error loading tickets data:", e);
    }
    setLoading(false);
  }, [page, limit, ticketSearch, ticketCategory, ticketPriority, ticketStatus, ticketLocation, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setTicketCategory("");
    setTicketPriority("");
    setTicketStatus("");
    setTicketLocation("");
    setStartDate("");
    setEndDate("");
    setSearchInput("");
    setTicketSearch("");
    setPage(1);
  };

  const activeFilterCount =
    (ticketCategory ? 1 : 0) +
    (ticketPriority ? 1 : 0) +
    (ticketStatus ? 1 : 0) +
    (ticketLocation ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = {
        reportType: "tickets",
        format,
        search: ticketSearch,
        category: ticketCategory,
        priority: ticketPriority,
        status: ticketStatus,
        location_id: ticketLocation,
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
      const filename = `tickets_report_${new Date().toISOString().split("T")[0]}.${ext}`;
      
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
  const totalTicketsCount = summary?.totalTicketsCount ?? totalItems;
  const pendingTicketsCount = summary?.pendingTicketsCount ?? tickets.filter(t => t.status === "pending").length;
  const progressTicketsCount = summary?.progressTicketsCount ?? tickets.filter(t => t.status === "in_progress").length;
  const resolvedTicketsCount = summary?.resolvedTicketsCount ?? tickets.filter(t => t.status === "resolved").length;
  const closedTicketsCount = summary?.closedTicketsCount ?? tickets.filter(t => t.status === "closed").length;

  const priorityRawMap = summary?.ticketPriorityMap || {};
  const ticketPriorityBreakdown = Object.keys(priorityRawMap).map((key) => ({
    name: PRIORITY_LABELS[key] || key?.toUpperCase() || "MEDIUM",
    value: priorityRawMap[key],
  }));

  const ticketStatusBreakdown = [
    { name: "Pending", value: pendingTicketsCount },
    { name: "In Progress", value: progressTicketsCount },
    { name: "Resolved", value: resolvedTicketsCount },
    { name: "Closed", value: closedTicketsCount },
    { name: "Cancelled", value: summary?.cancelledTicketsCount || 0 }
  ].filter(item => item.value > 0);

  return (
    <AppLayout>
      <div className="mx-auto space-y-4 sm:space-y-6 pt-3 sm:pt-5 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Tickets Support Reports
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Analyze support ticket priority logs, categories, and resolution timelines.
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
          <div className="grid grid-cols-5 divide-x divide-slate-100">
            {/* Stat 1: Total Tickets */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Total</span>
                <div className="text-xs sm:text-xl font-bold text-slate-900 tracking-tight leading-tight mt-0.5 font-mono">
                  {totalTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 2: Pending */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Pending</span>
                <div className="text-xs sm:text-xl font-bold text-amber-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {pendingTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 3: In Progress */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">In Progress</span>
                <div className="text-xs sm:text-xl font-bold text-blue-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {progressTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 4: Resolved */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Resolved</span>
                <div className="text-xs sm:text-xl font-bold text-emerald-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {resolvedTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 5: Closed */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-0.5 sm:py-1 text-center sm:text-left min-w-0">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-500 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Closed</span>
                <div className="text-xs sm:text-xl font-bold text-slate-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {closedTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Priority Breakdown Bar Chart */}
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-3 sm:space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" /> Tickets Priority Breakdown
            </h3>
            <div className="h-64 sm:h-72">
              {ticketPriorityBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketPriorityBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {ticketPriorityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Ticket Status Pie Chart */}
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-3 sm:space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter size={16} className="text-emerald-600" /> Ticket Status Share
            </h3>
            <div className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              {ticketStatusBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="flex-1 h-44 sm:h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketStatusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {ticketStatusBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-2.5 shrink-0 justify-center">
                    {ticketStatusBreakdown.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3 h-3 rounded-md shrink-0"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] || COLORS[idx % COLORS.length],
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
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px] relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by ticket no, title, reporter, assignee..."
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setTicketSearch(searchInput);
                    }
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setTicketSearch("");
                    }}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="w-[160px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Categories" },
                  { value: "hardware_malfunction", label: "Hardware Malfunction" },
                  { value: "software_issue", label: "Software Issue" },
                  { value: "lost_stolen", label: "Lost / Stolen" },
                  { value: "physical_damage", label: "Physical Damage" },
                  { value: "general_it", label: "General IT" }
                ]}
                value={ticketCategory}
                onChange={val => setTicketCategory(val)}
                className="w-full"
              />
            </div>

            {/* Priority */}
            <div className="w-[130px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Priorities" },
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" }
                ]}
                value={ticketPriority}
                onChange={val => setTicketPriority(val)}
                className="w-full"
              />
            </div>

            {/* Status */}
            <div className="w-[130px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Status" },
                  { value: "pending", label: "Pending" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                  { value: "cancelled", label: "Cancelled" }
                ]}
                value={ticketStatus}
                onChange={val => setTicketStatus(val)}
                className="w-full"
              />
            </div>

            {/* Location */}
            <div className="w-[150px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Locations" },
                  ...locations.map(loc => ({ value: loc.id, label: loc.name }))
                ]}
                value={ticketLocation}
                onChange={val => setTicketLocation(val)}
                className="w-full"
              />
            </div>

            {/* Date Range Picker */}
            <div className="w-[210px] shrink-0">
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
                  placeholder="Search tickets..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setTicketSearch(searchInput);
                    }
                  }}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setTicketSearch("");
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
              aria-label="Filter Tickets"
              title="Filter Tickets"
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
              {ticketCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {CATEGORY_LABELS[ticketCategory] || ticketCategory}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setTicketCategory("")}
                  />
                </span>
              )}
              {ticketPriority && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {ticketPriority}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setTicketPriority("")}
                  />
                </span>
              )}
              {ticketStatus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {ticketStatus}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setTicketStatus("")}
                  />
                </span>
              )}
              {ticketLocation && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {locations.find(l => String(l.id) === String(ticketLocation))?.name || "Location"}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setTicketLocation("")}
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
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('ticketId')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('subject')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('priority')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('raisedBy')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('assignee')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('lastUpdated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <FileText size={20} />
                        </div>
                        <span className="font-medium">No matching ticket logs found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((tkt) => (
                    <tr key={tkt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">{tkt.ticket_no}</td>
                      <td className="px-5 py-4 text-xs text-slate-800 font-bold max-w-[200px] truncate" title={tkt.title}>{tkt.title}</td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-medium">
                        {CATEGORY_LABELS[tkt.category] || tkt.category}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border inline-block ${getPriorityBadgeClass(tkt.priority)}`}>
                          {tkt.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block"
                          style={{
                            backgroundColor: `${STATUS_COLORS[tkt.status]}15`,
                            color: STATUS_COLORS[tkt.status],
                            border: `1px solid ${STATUS_COLORS[tkt.status]}30`,
                          }}
                        >
                          {tkt.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-700 font-medium">{tkt.reporter?.name || "—"}</td>
                      <td className="px-5 py-4 text-xs text-slate-700 font-medium">{tkt.assignee?.name || "—"}</td>
                      <td className="px-5 py-4 text-xs text-slate-600 font-semibold">
                        {tkt.updated_at ? new Date(tkt.updated_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <FileText size={20} />
                </div>
                <span className="font-medium">No matching ticket logs found.</span>
              </div>
            ) : (
              tickets.map((tkt) => (
                <div key={tkt.id} className="p-3.5 sm:p-4 flex flex-col gap-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{tkt.title}</h4>
                      <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">{tkt.ticket_no}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getPriorityBadgeClass(tkt.priority)}`}>
                        {tkt.priority}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                        style={{
                          backgroundColor: `${STATUS_COLORS[tkt.status]}15`,
                          color: STATUS_COLORS[tkt.status],
                          border: `1px solid ${STATUS_COLORS[tkt.status]}30`,
                        }}
                      >
                        {tkt.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('category')}</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {CATEGORY_LABELS[tkt.category] || tkt.category}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('raisedBy')}</span>
                      <span className="font-semibold text-slate-700 truncate block">{tkt.reporter?.name || "—"}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignee')}</span>
                      <span className="font-semibold text-slate-700 truncate block">{tkt.assignee?.name || "—"}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('lastUpdated')}</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {tkt.updated_at ? new Date(tkt.updated_at).toLocaleDateString() : "—"}
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
            currentItemsCount={tickets.length}
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
                <h3 className="text-base font-bold text-slate-900">Filter Tickets</h3>
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
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Categories" },
                    { value: "hardware_malfunction", label: "Hardware Malfunction" },
                    { value: "software_issue", label: "Software Issue" },
                    { value: "lost_stolen", label: "Lost / Stolen" },
                    { value: "physical_damage", label: "Physical Damage" },
                    { value: "general_it", label: "General IT" }
                  ]}
                  value={ticketCategory}
                  onChange={(val) => setTicketCategory(val)}
                  className="w-full"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priority</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Priorities" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "critical", label: "Critical" }
                  ]}
                  value={ticketPriority}
                  onChange={(val) => setTicketPriority(val)}
                  className="w-full"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Status" },
                    { value: "pending", label: "Pending" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" },
                    { value: "cancelled", label: "Cancelled" }
                  ]}
                  value={ticketStatus}
                  onChange={(val) => setTicketStatus(val)}
                  className="w-full"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Locations" },
                    ...locations.map(loc => ({ value: loc.id, label: loc.name }))
                  ]}
                  value={ticketLocation}
                  onChange={(val) => setTicketLocation(val)}
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

export default function TicketsReportPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-sm text-slate-500 font-semibold bg-white rounded-2xl border border-slate-100 m-6">
        Loading tickets support reports...
      </div>
    }>
      <TicketsReportPageInner />
    </Suspense>
  );
}
