"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import { useAuth } from "@/context/AuthContext";
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
  Package,
  CheckCircle,
  Zap,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  RefreshCw,
  Layers,
  ShieldAlert,
  KeyRound,
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
  active: "#3b82f6",
  expired: "#ef4444",
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
    <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-slate-100 gap-4">
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

export default function ReportsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");

  // Data States
  const [assets, setAssets] = useState([]);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State for Inventory & In/Out
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  // Filters State for Tickets
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPriority, setTicketPriority] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  const [ticketLocation, setTicketLocation] = useState("");

  // Filters State for Licenses
  const [licenseSearch, setLicenseSearch] = useState("");
  const [licenseStatus, setLicenseStatus] = useState("");

  // Global Date Range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination States
  const [pageInventory, setPageInventory] = useState(1);
  const [limitInventory, setLimitInventory] = useState(10);

  const [pageAllocations, setPageAllocations] = useState(1);
  const [limitAllocations, setLimitAllocations] = useState(10);

  const [pageAudit, setPageAudit] = useState(1);
  const [limitAudit, setLimitAudit] = useState(10);

  const [pageTickets, setPageTickets] = useState(1);
  const [limitTickets, setLimitTickets] = useState(10);

  const [pageLicenses, setPageLicenses] = useState(1);
  const [limitLicenses, setLimitLicenses] = useState(10);

  // Reset page numbers on tab/filter changes
  useEffect(() => {
    setPageInventory(1);
    setPageAllocations(1);
    setPageAudit(1);
    setPageTickets(1);
    setPageLicenses(1);
  }, [
    activeTab,
    searchQuery,
    selectedLocation,
    selectedType,
    selectedStatus,
    selectedAction,
    ticketSearch,
    ticketCategory,
    ticketPriority,
    ticketStatus,
    ticketLocation,
    licenseSearch,
    licenseStatus,
    startDate,
    endDate
  ]);

  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsData = await reportApi.inventory({ paginate: false });
      const allocationsData = await reportApi.allocations({ paginate: false });
      setAssets(assetsData.assets || []);
      setLocations(assetsData.locations || []);
      setAllocationHistory(allocationsData.allocations || []);
    } catch (e) {
      console.error("Error loading inventory data:", e);
    }
    setLoading(false);
  }, []);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const auditData = await reportApi.auditLogs({ paginate: false }).catch(() => ({ logs: [] }));
      setAuditLogs(auditData.logs || []);
    } catch (e) {
      console.error("Error loading audit data:", e);
    }
    setLoading(false);
  }, []);

  const loadTicketsData = useCallback(async () => {
    setLoading(true);
    try {
      const ticketsData = await reportApi.tickets({ paginate: false });
      setTickets(ticketsData.tickets || []);
    } catch (e) {
      console.error("Error loading tickets data:", e);
    }
    setLoading(false);
  }, []);

  const loadLicensesData = useCallback(async () => {
    setLoading(true);
    try {
      const licensesData = await reportApi.licenses({ paginate: false });
      setLicenses(licensesData.licenses || []);
    } catch (e) {
      console.error("Error loading licenses data:", e);
    }
    setLoading(false);
  }, []);

  const loadData = useCallback(() => {
    if (activeTab === "inventory" || activeTab === "allocations") {
      loadInventoryData();
    } else if (activeTab === "tickets") {
      loadTicketsData();
    } else if (activeTab === "licenses") {
      loadLicensesData();
    } else if (activeTab === "audit") {
      loadAuditData();
    }
  }, [activeTab, loadInventoryData, loadTicketsData, loadLicensesData, loadAuditData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchQuery("");
    setSelectedLocation("");
    setSelectedType("");
    setSelectedStatus("");
    setSelectedAction("");
    setTicketSearch("");
    setTicketCategory("");
    setTicketPriority("");
    setTicketStatus("");
    setTicketLocation("");
    setLicenseSearch("");
    setLicenseStatus("");
    setStartDate("");
    setEndDate("");
  };

  // ── FILTERING ─────────────────────────────────────────────────────────────

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      searchQuery === "" ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      selectedLocation === "" || String(asset.location_id) === selectedLocation;
    const matchesType = selectedType === "" || asset.type === selectedType;
    const matchesStatus =
      selectedStatus === "" || asset.status === selectedStatus;

    // Date Range (Asset Created Date)
    const assetDate = asset.created_at ? new Date(asset.created_at) : null;
    const matchesStart = startDate === "" || !assetDate || assetDate >= new Date(startDate);
    const matchesEnd = endDate === "" || !assetDate || assetDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesLocation && matchesType && matchesStatus && matchesStart && matchesEnd;
  });

  const filteredAllocations = allocationHistory.filter((alloc) => {
    const matchesSearch =
      searchQuery === "" ||
      alloc.asset?.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alloc.asset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alloc.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alloc.allocator?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "" || alloc.status === selectedStatus;

    // Date Range (Allocation Check-out Date)
    const allocDate = alloc.created_at ? new Date(alloc.created_at) : null;
    const matchesStart = startDate === "" || !allocDate || allocDate >= new Date(startDate);
    const matchesEnd = endDate === "" || !allocDate || allocDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesStatus && matchesStart && matchesEnd;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      selectedAction === "" || log.action?.includes(selectedAction);

    // Date Range
    const logDate = log.created_at ? new Date(log.created_at) : null;
    const matchesStart = startDate === "" || !logDate || logDate >= new Date(startDate);
    const matchesEnd = endDate === "" || !logDate || logDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesAction && matchesStart && matchesEnd;
  });

  const filteredTickets = tickets.filter((tkt) => {
    const matchesSearch =
      ticketSearch === "" ||
      tkt.ticket_no?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      tkt.title?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      tkt.description?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      tkt.reporter?.name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      tkt.assignee?.name?.toLowerCase().includes(ticketSearch.toLowerCase());

    const matchesCategory =
      ticketCategory === "" || tkt.category === ticketCategory;
    const matchesPriority =
      ticketPriority === "" || tkt.priority === ticketPriority;
    const matchesStatus =
      ticketStatus === "" || tkt.status === ticketStatus;
    const matchesLocation =
      ticketLocation === "" || String(tkt.location_id) === ticketLocation;

    // Date Range (Ticket raised date)
    const tktDate = tkt.created_at ? new Date(tkt.created_at) : null;
    const matchesStart = startDate === "" || !tktDate || tktDate >= new Date(startDate);
    const matchesEnd = endDate === "" || !tktDate || tktDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus && matchesLocation && matchesStart && matchesEnd;
  });

  const filteredLicenses = licenses.filter((license) => {
    const matchesSearch =
      licenseSearch === "" ||
      license.software_name?.toLowerCase().includes(licenseSearch.toLowerCase()) ||
      license.license_key?.toLowerCase().includes(licenseSearch.toLowerCase()) ||
      license.user?.name?.toLowerCase().includes(licenseSearch.toLowerCase());

    const matchesStatus =
      licenseStatus === "" || license.status === licenseStatus;

    // Date Range (Expiration date)
    const untilDate = license.valid_until ? new Date(license.valid_until) : null;
    const matchesStart = startDate === "" || !untilDate || untilDate >= new Date(startDate);
    const matchesEnd = endDate === "" || !untilDate || untilDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesStatus && matchesStart && matchesEnd;
  });

  // ── EXPORTS ───────────────────────────────────────────────────────────────

  const getExportPayload = (format) => {
    let reportType = "";
    let filters = {};

    if (activeTab === "inventory") {
      reportType = "inventory";
      filters = {
        search: searchQuery,
        location_id: selectedLocation,
        type: selectedType,
        status: selectedStatus,
        startDate,
        endDate,
      };
    } else if (activeTab === "allocations") {
      reportType = "allocations";
      filters = {
        search: searchQuery,
        status: selectedStatus,
        startDate,
        endDate,
      };
    } else if (activeTab === "tickets") {
      reportType = "tickets";
      filters = {
        search: ticketSearch,
        category: ticketCategory,
        priority: ticketPriority,
        status: ticketStatus,
        location_id: ticketLocation,
        startDate,
        endDate,
      };
    } else if (activeTab === "licenses") {
      reportType = "licenses";
      filters = {
        search: licenseSearch,
        status: licenseStatus,
        startDate,
        endDate,
      };
    } else if (activeTab === "audit") {
      reportType = "audit-logs";
      filters = {
        search: searchQuery,
        action: selectedAction,
        startDate,
        endDate,
      };
    }

    return {
      reportType,
      format,
      ...filters
    };
  };

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const payload = getExportPayload(format);
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

      if (!res.ok) {
        throw new Error("Export request failed");
      }

      const blob = await res.blob();
      
      const ext = format === "excel" ? "xlsx" : "pdf";
      const filename = `${payload.reportType}_report_${new Date().toISOString().split("T")[0]}.${ext}`;
      
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

  // ── METRICS & CHARTS DATA ─────────────────────────────────────────────────

  // Inventory breakdown
  const totalAssetsCount = assets.length;
  const availableAssetsCount = assets.filter((a) => a.status === "available").length;
  const allocatedAssetsCount = assets.filter((a) => a.status === "allocated").length;
  const maintenanceAssetsCount = assets.filter((a) => a.status === "maintenance").length;

  const typeMap = {};
  assets.forEach((a) => {
    typeMap[a.type] = (typeMap[a.type] || 0) + 1;
  });
  const typeBreakdownData = Object.keys(typeMap).map((key) => ({
    name: key,
    value: typeMap[key],
  }));

  const statusBreakdownData = [
    { name: "Available", value: availableAssetsCount },
    { name: "Allocated", value: allocatedAssetsCount },
    { name: "Maintenance", value: maintenanceAssetsCount },
  ].filter((item) => item.value > 0);

  // Tickets breakdown
  const totalTicketsCount = tickets.length;
  const pendingTicketsCount = tickets.filter(t => t.status === "pending").length;
  const progressTicketsCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedTicketsCount = tickets.filter(t => t.status === "resolved").length;
  const closedTicketsCount = tickets.filter(t => t.status === "closed").length;
  const criticalTicketsCount = tickets.filter(t => t.priority === "critical" || t.priority === "high").length;

  const ticketPriorityMap = {};
  tickets.forEach((t) => {
    const prioLabel = PRIORITY_LABELS[t.priority] || t.priority?.toUpperCase() || "MEDIUM";
    ticketPriorityMap[prioLabel] = (ticketPriorityMap[prioLabel] || 0) + 1;
  });
  const ticketPriorityBreakdown = Object.keys(ticketPriorityMap).map((key) => ({
    name: key,
    value: ticketPriorityMap[key],
  }));

  const ticketCategoryMap = {};
  tickets.forEach((t) => {
    const catLabel = CATEGORY_LABELS[t.category] || t.category?.toUpperCase() || "GENERAL IT";
    ticketCategoryMap[catLabel] = (ticketCategoryMap[catLabel] || 0) + 1;
  });
  const ticketCategoryBreakdown = Object.keys(ticketCategoryMap).map((key) => ({
    name: key,
    value: ticketCategoryMap[key],
  }));

  const ticketStatusBreakdown = [
    { name: "Pending", value: pendingTicketsCount },
    { name: "In Progress", value: progressTicketsCount },
    { name: "Resolved", value: resolvedTicketsCount },
    { name: "Closed", value: closedTicketsCount },
    { name: "Cancelled", value: tickets.filter(t => t.status === "cancelled").length }
  ].filter(item => item.value > 0);

  // Licenses breakdown
  const totalLicensesCount = licenses.length;
  const activeLicensesCount = licenses.filter(l => l.status === "active").length;
  const availableLicensesCount = licenses.filter(l => l.status === "available").length;
  const expiredLicensesCount = licenses.filter(l => l.status === "expired").length;

  const licenseSoftwareMap = {};
  licenses.forEach((l) => {
    const softName = l.software_name || "Unknown Software";
    licenseSoftwareMap[softName] = (licenseSoftwareMap[softName] || 0) + 1;
  });
  const licenseSoftwareBreakdown = Object.keys(licenseSoftwareMap).map((key) => ({
    name: key,
    value: licenseSoftwareMap[key],
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
              Reports & Analytics
            </h1>
            <p className="text-slate-450 text-sm mt-1">
              Generate dynamic inventory logs, allocations, ticket resolution sheets, and software licensing audits.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => handleExport("excel")}
              disabled={loading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
            >
              <Download size={16} />
              Export Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={loading}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-4 rounded-t-2xl border-x border-t border-slate-100 shadow-xs overflow-x-auto scrollbar-none whitespace-nowrap">
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "inventory"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => handleTabChange("inventory")}
          >
            <Package size={16} />
            Asset Inventory Summary
          </button>
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "allocations"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => handleTabChange("allocations")}
          >
            <FileText size={16} />
            Asset In/Out Reports
          </button>
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "tickets"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => handleTabChange("tickets")}
          >
            <FileText size={16} />
            Tickets Reports
          </button>
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "licenses"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => handleTabChange("licenses")}
          >
            <KeyRound size={16} />
            License Reports
          </button>
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "audit"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => handleTabChange("audit")}
          >
            <ShieldAlert size={16} />
            System Audit Trail
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="bg-white p-6 rounded-b-2xl border-x border-b border-slate-100 shadow-xs mt-[-24px] space-y-6">
          
          {/* TAB 1: INVENTORY SUMMARY */}
          {activeTab === "inventory" && (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-600">
                    <Package size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {totalAssetsCount}
                    </div>
                    <div className="text-xs text-slate-450 font-medium">
                      Total Active Assets
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Zap size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {availableAssetsCount}
                    </div>
                    <div className="text-xs text-emerald-500 font-medium">
                      Available Assets
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {allocatedAssetsCount}
                    </div>
                    <div className="text-xs text-blue-500 font-medium">
                      Allocated Assets
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-amber-100 bg-amber-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-700">
                      {maintenanceAssetsCount}
                    </div>
                    <div className="text-xs text-amber-500 font-medium">
                      Under Maintenance
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Type distribution */}
                <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Layers size={16} /> Asset Type Distribution
                  </h3>
                  <div className="h-64">
                    {typeBreakdownData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No type data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typeBreakdownData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis
                            dataKey="name"
                            fontSize={11}
                            stroke="#94a3b8"
                          />
                          <YAxis
                            fontSize={11}
                            stroke="#94a3b8"
                            allowDecimals={false}
                          />
                          <Tooltip cursor={{ fill: "#f8fafc" }} />
                          <Bar
                            dataKey="value"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={45}
                          >
                            {typeBreakdownData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Status distribution */}
                <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Filter size={16} /> Allocation & Status Share
                  </h3>
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {statusBreakdownData.length === 0 ? (
                      <div className="text-xs text-slate-400">
                        No status data available.
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 h-full w-full">
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
                                {statusBreakdownData.map((entry, index) => {
                                  const colorKey = entry.name.toLowerCase();
                                  return (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        STATUS_COLORS[colorKey] ||
                                        COLORS[index % COLORS.length]
                                      }
                                    />
                                  );
                                })}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2.5 shrink-0 self-center">
                          {statusBreakdownData.map((entry, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-md"
                                style={{
                                  backgroundColor:
                                    STATUS_COLORS[entry.name.toLowerCase()] ||
                                    COLORS[idx % COLORS.length],
                                }}
                              />
                              <span className="font-semibold text-slate-650">
                                {entry.name}:
                              </span>
                              <span className="font-extrabold text-slate-800">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Block */}
              <div className="flex flex-col md:flex-row gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by tag, name, brand, serial..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 shrink-0 w-full md:w-[650px]">
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Locations" },
                      ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
                    ]}
                    value={selectedLocation}
                    onChange={val => setSelectedLocation(val)}
                  />
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Types" },
                      { value: "Laptop", label: "Laptop" },
                      { value: "Desktop", label: "Desktop" },
                      { value: "Mobile", label: "Mobile" },
                      { value: "Monitor", label: "Monitor" },
                      { value: "Accessories", label: "Accessories" },
                      { value: "Other", label: "Other" }
                    ]}
                    value={selectedType}
                    onChange={val => setSelectedType(val)}
                  />
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Statuses" },
                      { value: "available", label: "Available" },
                      { value: "allocated", label: "Allocated" },
                      { value: "maintenance", label: "Maintenance" },
                      { value: "retired", label: "Retired" }
                    ]}
                    value={selectedStatus}
                    onChange={val => setSelectedStatus(val)}
                  />
                  {/* Date range picker inside filter row */}
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    title="Created From"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    title="Created To"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('assetTag')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('assetDetails')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('location')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('status')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('allocatedTo')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-10 text-slate-400 text-xs"
                          >
                            No matching assets found.
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.slice((pageInventory - 1) * limitInventory, pageInventory * limitInventory).map((asset) => (
                          <tr
                            key={asset.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">
                              {asset.asset_tag}
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-xs font-bold text-slate-800">
                                {asset.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {t(asset.type) || asset.type} • {asset.brand || "No Brand"} • SN:{" "}
                                {asset.serial_number || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-660 font-medium">
                              {asset.location?.name || "—"}
                            </td>
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
                            <td className="px-5 py-4 text-xs text-slate-650 font-bold">
                              {asset.allocated_user_name || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredAssets.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No matching assets found.
                    </div>
                  ) : (
                    filteredAssets.slice((pageInventory - 1) * limitInventory, pageInventory * limitInventory).map((asset) => (
                      <div key={asset.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{asset.name}</h4>
                            <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">{asset.asset_tag}</span>
                          </div>
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
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('category')}</span>
                            <span className="font-semibold text-slate-700">{t(asset.type) || asset.type}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('location')}</span>
                            <span className="font-semibold text-slate-700">{asset.location?.name || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('allocatedTo')}</span>
                            <span className="font-semibold text-slate-750">{asset.allocated_user_name || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">SN</span>
                            <span className="font-semibold text-slate-700">{asset.serial_number || "—"}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <TablePagination
                  currentPage={pageInventory}
                  totalItems={filteredAssets.length}
                  limit={limitInventory}
                  onPageChange={setPageInventory}
                  onLimitChange={setLimitInventory}
                />
              </div>
            </>
          )}

          {/* TAB 2: ASSET IN/OUT REPORTS */}
          {activeTab === "allocations" && (
            <>
              {/* Filters Block */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search allocation by asset tag, employee, allocator..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Statuses" },
                      { value: "active", label: "Active (Assigned)" },
                      { value: "returned", label: "Returned" }
                    ]}
                    value={selectedStatus}
                    onChange={val => setSelectedStatus(val)}
                    className="w-full sm:w-[180px]"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    title="Allocation From"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    title="Allocation To"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('assetTag')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('assignedEmployee')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('allocatedBy')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('notesReason')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('state')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('allocatedDate')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('returnedDate')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAllocations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-10 text-slate-400 text-xs"
                          >
                            No allocation records found.
                          </td>
                        </tr>
                      ) : (
                        filteredAllocations.slice((pageAllocations - 1) * limitAllocations, pageAllocations * limitAllocations).map((alloc) => (
                          <tr
                            key={alloc.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">
                              {alloc.asset?.asset_tag || "—"}
                            </td>
                            <td className="px-5 py-4 text-xs font-bold text-slate-800">
                              {alloc.user?.name || "—"}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-650 font-medium">
                              {alloc.allocator?.name || "—"}
                            </td>
                            <td
                              className="px-5 py-4 text-xs text-slate-500 max-w-[200px] truncate"
                              title={alloc.notes}
                            >
                              {alloc.notes || "—"}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  alloc.status === "active"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {alloc.status === "active"
                                  ? t('active')
                                  : t('returned')}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 font-medium">
                              {alloc.created_at
                                ? new Date(alloc.created_at).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 font-medium">
                              {alloc.returned_at
                                ? new Date(alloc.returned_at).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredAllocations.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No allocation records found.
                    </div>
                  ) : (
                    filteredAllocations.slice((pageAllocations - 1) * limitAllocations, pageAllocations * limitAllocations).map((alloc) => (
                      <div key={alloc.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{alloc.asset?.name || "—"}</h4>
                            <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">{alloc.asset?.asset_tag || "—"}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              alloc.status === "active"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {alloc.status === "active" ? t('active') : t('returned')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignedEmployee')}</span>
                            <span className="font-semibold text-slate-700">{alloc.user?.name || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('allocatedBy')}</span>
                            <span className="font-semibold text-slate-700">{alloc.allocator?.name || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('allocatedDate')}</span>
                            <span className="font-semibold text-slate-700">
                              {alloc.created_at ? new Date(alloc.created_at).toLocaleDateString() : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('returnedDate')}</span>
                            <span className="font-semibold text-slate-700">
                              {alloc.returned_at ? new Date(alloc.returned_at).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <TablePagination
                  currentPage={pageAllocations}
                  totalItems={filteredAllocations.length}
                  limit={limitAllocations}
                  onPageChange={setPageAllocations}
                  onLimitChange={setPageAllocations}
                />
              </div>
            </>
          )}

          {/* TAB 3: TICKETS REPORTS */}
          {activeTab === "tickets" && (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-600">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {totalTicketsCount}
                    </div>
                    <div className="text-xs text-slate-450 font-medium">
                      Total Support Tickets
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-amber-100 bg-amber-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-700">
                      {pendingTicketsCount + progressTicketsCount}
                    </div>
                    <div className="text-xs text-amber-500 font-medium">
                      Open & In Progress
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {resolvedTicketsCount + closedTicketsCount}
                    </div>
                    <div className="text-xs text-emerald-500 font-medium">
                      Resolved & Closed
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-rose-100 bg-rose-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-700">
                      {criticalTicketsCount}
                    </div>
                    <div className="text-xs text-rose-500 font-medium">
                      High & Critical
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category distribution */}
                <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Layers size={16} /> Category Distribution
                  </h3>
                  <div className="h-64">
                    {ticketCategoryBreakdown.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No ticket categories available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ticketCategoryBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                          <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip cursor={{ fill: "#f8fafc" }} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            {ticketCategoryBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Priority share */}
                <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Filter size={16} /> Priority Share
                  </h3>
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {ticketPriorityBreakdown.length === 0 ? (
                      <div className="text-xs text-slate-400">No priority data available.</div>
                    ) : (
                      <>
                        <div className="flex-1 h-full w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={ticketPriorityBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {ticketPriorityBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2.5 shrink-0 self-center">
                          {ticketPriorityBreakdown.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
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

              {/* Filters Block */}
              <div className="flex flex-col md:flex-row gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by ticket number, title, description..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 shrink-0 w-full md:w-[750px]">
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Locations" },
                      ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
                    ]}
                    value={ticketLocation}
                    onChange={val => setTicketLocation(val)}
                  />
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Categories" },
                      { value: "hardware_malfunction", label: "Hardware" },
                      { value: "software_issue", label: "Software" },
                      { value: "lost_stolen", label: "Lost/Stolen" },
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
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    title="Ticket raised from"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    title="Ticket raised to"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Ticket No</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Subject</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Category</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Priority</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Raised By</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Assignee</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">No matching tickets found.</td>
                        </tr>
                      ) : (
                        filteredTickets.slice((pageTickets - 1) * limitTickets, pageTickets * limitTickets).map((tkt) => (
                          <tr key={tkt.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">{tkt.ticket_no}</td>
                            <td className="px-5 py-4">
                              <div className="text-xs font-bold text-slate-800">{tkt.title}</div>
                              <div className="text-[10px] text-slate-400 max-w-[250px] truncate">{tkt.description}</div>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-650 font-medium">
                              {CATEGORY_LABELS[tkt.category] || tkt.category.toUpperCase()}
                            </td>
                            <td className="px-5 py-4 text-xs font-medium">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tkt.priority === "critical" ? "bg-rose-100 text-rose-700" :
                                tkt.priority === "high" ? "bg-amber-100 text-amber-700" :
                                tkt.priority === "medium" ? "bg-blue-100 text-blue-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {PRIORITY_LABELS[tkt.priority] || tkt.priority.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                tkt.status === "closed" ? "bg-slate-100 text-slate-650" :
                                tkt.status === "resolved" ? "bg-emerald-105 text-emerald-700" :
                                tkt.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                                tkt.status === "cancelled" ? "bg-rose-100 text-rose-700" :
                                "bg-amber-100 text-amber-700"
                              }`}
                              style={{
                                border: `1px solid ${STATUS_COLORS[tkt.status]}30`,
                                color: STATUS_COLORS[tkt.status],
                                backgroundColor: `${STATUS_COLORS[tkt.status]}10`
                              }}>
                                {tkt.status.replace("_", " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-650">{tkt.reporter?.name || "—"}</td>
                            <td className="px-5 py-4 text-xs text-slate-650">{tkt.assignee?.name || "—"}</td>
                            <td className="px-5 py-4 text-xs text-slate-500">{tkt.created_at ? new Date(tkt.created_at).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">No matching tickets found.</div>
                  ) : (
                    filteredTickets.slice((pageTickets - 1) * limitTickets, pageTickets * limitTickets).map((tkt) => (
                      <div key={tkt.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{tkt.title}</h4>
                            <span className="text-xs font-mono text-emerald-600 font-bold mt-0.5 block">{tkt.ticket_no}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                          style={{
                            border: `1px solid ${STATUS_COLORS[tkt.status]}30`,
                            color: STATUS_COLORS[tkt.status],
                            backgroundColor: `${STATUS_COLORS[tkt.status]}10`
                          }}>
                            {tkt.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Category</span>
                            <span className="font-semibold text-slate-700">{CATEGORY_LABELS[tkt.category] || tkt.category}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Priority</span>
                            <span className="font-semibold text-slate-700">{PRIORITY_LABELS[tkt.priority] || tkt.priority}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Raised By</span>
                            <span className="font-semibold text-slate-700">{tkt.reporter?.name || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Assignee</span>
                            <span className="font-semibold text-slate-700">{tkt.assignee?.name || "—"}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <TablePagination
                  currentPage={pageTickets}
                  totalItems={filteredTickets.length}
                  limit={limitTickets}
                  onPageChange={setPageTickets}
                  onLimitChange={setLimitTickets}
                />
              </div>
            </>
          )}

          {/* TAB 4: LICENSE REPORTS */}
          {activeTab === "licenses" && (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-600">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {totalLicensesCount}
                    </div>
                    <div className="text-xs text-slate-450 font-medium">
                      Total Software Licenses
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {activeLicensesCount}
                    </div>
                    <div className="text-xs text-blue-500 font-medium">
                      Active Allocations
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Package size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {availableLicensesCount}
                    </div>
                    <div className="text-xs text-emerald-500 font-medium">
                      Available Keys
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-rose-100 bg-rose-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-700">
                      {expiredLicensesCount}
                    </div>
                    <div className="text-xs text-rose-500 font-medium">
                      Expired Subscriptions
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Software distribution */}
                <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Layers size={16} /> Software Entitlements Distribution
                  </h3>
                  <div className="h-64">
                    {licenseSoftwareBreakdown.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No license software distribution available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={licenseSoftwareBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                          <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip cursor={{ fill: "#f8fafc" }} />
                          <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            {licenseSoftwareBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Status Share */}
                <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Filter size={16} /> Status Share
                  </h3>
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {licenseStatusBreakdown.length === 0 ? (
                      <div className="text-xs text-slate-400">No status data available.</div>
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
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2.5 shrink-0 self-center">
                          {licenseStatusBreakdown.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
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

              {/* Filters Block */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by software name, key, or assigned user..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
                    value={licenseSearch}
                    onChange={(e) => setLicenseSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Statuses" },
                      { value: "available", label: "Available" },
                      { value: "active", label: "Active" },
                      { value: "expired", label: "Expired" }
                    ]}
                    value={licenseStatus}
                    onChange={val => setLicenseStatus(val)}
                    className="w-full sm:w-[200px]"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    title="Expiration from"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    title="Expiration to"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Software Name</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">License Key</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Assigned To</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Valid From</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Valid Until</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLicenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">No matching licenses found.</td>
                        </tr>
                      ) : (
                        filteredLicenses.slice((pageLicenses - 1) * limitLicenses, pageLicenses * limitLicenses).map((license) => (
                          <tr key={license.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4 text-xs font-bold text-slate-800">{license.software_name}</td>
                            <td className="px-5 py-4 text-xs font-mono text-slate-500">{license.license_key}</td>
                            <td className="px-5 py-4 text-xs text-slate-650">{license.user?.name || "—"}</td>
                            <td className="px-5 py-4 text-xs text-slate-600">{license.valid_from || "—"}</td>
                            <td className="px-5 py-4 text-xs text-slate-600">{license.valid_until || "Perpetual"}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                license.status === "expired" ? "bg-rose-100 text-rose-700" :
                                license.status === "active" ? "bg-blue-100 text-blue-700" :
                                "bg-emerald-100 text-emerald-700"
                              }`}
                              style={{
                                border: `1px solid ${STATUS_COLORS[license.status]}30`,
                                color: STATUS_COLORS[license.status],
                                backgroundColor: `${STATUS_COLORS[license.status]}10`
                              }}>
                                {license.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredLicenses.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">No matching licenses found.</div>
                  ) : (
                    filteredLicenses.slice((pageLicenses - 1) * limitLicenses, pageLicenses * limitLicenses).map((license) => (
                      <div key={license.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{license.software_name}</h4>
                            <span className="text-xs font-mono text-slate-450 mt-0.5 block">{license.license_key}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                          style={{
                            border: `1px solid ${STATUS_COLORS[license.status]}30`,
                            color: STATUS_COLORS[license.status],
                            backgroundColor: `${STATUS_COLORS[license.status]}10`
                          }}>
                            {license.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Assigned To</span>
                            <span className="font-semibold text-slate-700">{license.user?.name || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Valid Until</span>
                            <span className="font-semibold text-slate-700">{license.valid_until || "Perpetual"}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <TablePagination
                  currentPage={pageLicenses}
                  totalItems={filteredLicenses.length}
                  limit={limitLicenses}
                  onPageChange={setPageLicenses}
                  onLimitChange={setLimitLicenses}
                />
              </div>
            </>
          )}

          {/* TAB 5: SYSTEM AUDIT TRAIL */}
          {activeTab === "audit" && (
            <>
              {/* Filters Block */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search logs by action, details, user..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Actions" },
                      { value: "ASSET_CREATE", label: "Asset Created" },
                      { value: "ASSET_UPDATE", label: "Asset Updated" },
                      { value: "ASSET_DELETE", label: "Asset Deleted" },
                      { value: "ASSET_ALLOCATED", label: "Asset Allocated" },
                      { value: "ASSET_RETURNED", label: "Asset Returned" },
                      { value: "USER_LOGIN", label: "User Login" },
                      { value: "USER_MFA", label: "MFA Modification" }
                    ]}
                    value={selectedAction}
                    onChange={val => setSelectedAction(val)}
                    className="w-full sm:w-[240px]"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    title="Audit From"
                  />
                  <input
                    type="date"
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none text-slate-800"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    title="Audit To"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider w-[180px]">
                          {t('timestamp')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider w-[160px]">
                          {t('performedBy')}
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider w-[180px]">
                          Action
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          {t('logDetails')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-10 text-slate-400 text-xs"
                          >
                            No audit logs found.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.slice((pageAudit - 1) * limitAudit, pageAudit * limitAudit).map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-5 py-4 text-xs text-slate-660 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Calendar
                                  size={13}
                                  className="text-slate-400"
                                />
                                {log.created_at
                                  ? new Date(log.created_at).toLocaleString()
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-800">
                              <span className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                {log.user?.name || "System"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-650 leading-relaxed font-medium">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No audit logs found.
                    </div>
                  ) : (
                    filteredAuditLogs.slice((pageAudit - 1) * limitAudit, pageAudit * limitAudit).map((log) => (
                      <div key={log.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.action}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 border-t border-slate-50 pt-2">
                          <span className="block text-[10px] text-slate-450 font-bold uppercase mb-1">{t('performedBy')}</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            {log.user?.name || "System"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-650 leading-relaxed font-medium">
                          <span className="block text-[10px] text-slate-450 font-bold uppercase mb-1">{t('logDetails')}</span>
                          <p>{log.details}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <TablePagination
                  currentPage={pageAudit}
                  totalItems={filteredAuditLogs.length}
                  limit={limitAudit}
                  onPageChange={setPageAudit}
                  onLimitChange={setLimitAudit}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
