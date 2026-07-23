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
  FileText,
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

export default function TicketsReportPage() {
  const { t } = useLanguage();
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
      setTotalItems(data.pagination?.total || data.total || 0);
      setSummary(data.summary || null);
    } catch (e) {
      console.error("Error loading tickets data:", e);
    }
    setLoading(false);
  }, [page, limit, ticketSearch, ticketCategory, ticketPriority, ticketStatus, ticketLocation, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const ext = format === "excel" ? "xlsx" : "pdf";
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
      <div className="mx-auto space-y-6 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Tickets Support Reports
            </h1>
            <p className="text-slate-455 text-sm mt-1">
              Analyze support ticket priority logs, categories, and resolution timelines.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-600">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800">{totalTicketsCount}</div>
              <div className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Total Tickets</div>
            </div>
          </div>

          <div className="p-4 border border-amber-100 bg-amber-50/30 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-700">{pendingTicketsCount}</div>
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Pending</div>
            </div>
          </div>

          <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-700">{progressTicketsCount}</div>
              <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">In Progress</div>
            </div>
          </div>

          <div className="p-4 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-700">{resolvedTicketsCount}</div>
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Resolved</div>
            </div>
          </div>

          <div className="p-4 border border-slate-100 bg-slate-50/80 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-700">{closedTicketsCount}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Closed</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Layers size={16} /> Tickets Priority Breakdown
            </h3>
            <div className="h-64">
              {ticketPriorityBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketPriorityBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {ticketPriorityBreakdown.map((entry, index) => (
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
              <Filter size={16} /> Ticket Status Share
            </h3>
            <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
              {ticketStatusBreakdown.length === 0 ? (
                <div className="text-xs text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="flex-1 h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketStatusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
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
                  <div className="flex flex-col gap-2.5 shrink-0 self-center">
                    {ticketStatusBreakdown.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3.5 h-3.5 rounded-md"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] || COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="font-semibold text-slate-650">{entry.name}:</span>
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
          <div className="lg:col-span-3 relative h-10 flex items-center">
            <Search 
              size={16} 
              className="absolute left-3 text-slate-400 cursor-pointer hover:text-emerald-600 transition-colors" 
              onClick={() => setTicketSearch(searchInput)}
              title="Click to search"
            />
            <input
              type="text"
              placeholder="Search by ticket no, title, reporter, assignee (Press Enter)..."
              className="w-full h-full pl-9 pr-9 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-5 gap-2 w-full">
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
            />
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
            />
            <SearchableSelect
              options={[
                { value: "", label: "All Statuses" },
                { value: "pending", label: "Pending" },
                { value: "in_progress", label: "In Progress" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
                { value: "cancelled", label: "Cancelled" }
              ]}
              value={ticketStatus}
              onChange={val => setTicketStatus(val)}
            />
            <SearchableSelect
              options={[
                { value: "", label: "All Locations" },
                ...locations.map(loc => ({ value: loc.id, label: loc.name }))
              ]}
              value={ticketLocation}
              onChange={val => setTicketLocation(val)}
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
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('ticketId')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('subject')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('category')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('priority')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('raisedBy')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('assignee')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('lastUpdated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">No matching tickets logs found.</td>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          tkt.priority === "critical" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                          tkt.priority === "high" ? "bg-orange-50 text-orange-600 border border-orange-200" :
                          tkt.priority === "medium" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          "bg-slate-50 text-slate-500 border border-slate-200"
                        }`}>
                          {tkt.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
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
                      <td className="px-5 py-4 text-xs text-slate-650 font-bold">
                        {tkt.updated_at ? new Date(tkt.updated_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No matching tickets logs found.</div>
            ) : (
              tickets.map((tkt) => (
                <div key={tkt.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{tkt.title}</h4>
                      <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">{tkt.ticket_no}</span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                      style={{
                        backgroundColor: `${STATUS_COLORS[tkt.status]}15`,
                        color: STATUS_COLORS[tkt.status],
                        border: `1px solid ${STATUS_COLORS[tkt.status]}30`,
                      }}
                    >
                      {tkt.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('priority')}</span>
                      <span className="font-semibold text-slate-700 capitalize">{tkt.priority}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('raisedBy')}</span>
                      <span className="font-semibold text-slate-700">{tkt.reporter?.name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignee')}</span>
                      <span className="font-semibold text-slate-700">{tkt.assignee?.name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('lastUpdated')}</span>
                      <span className="font-semibold text-slate-750">{tkt.updated_at ? new Date(tkt.updated_at).toLocaleDateString() : "—"}</span>
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
