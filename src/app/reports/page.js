"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import { useAuth } from "@/context/AuthContext";
import { assetApi, auditApi } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
          onChange={val => onLimitChange(val)}
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");

  // Data States
  const [assets, setAssets] = useState([]);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  // Pagination States
  const [pageInventory, setPageInventory] = useState(1);
  const [limitInventory, setLimitInventory] = useState(10);

  const [pageAllocations, setPageAllocations] = useState(1);
  const [limitAllocations, setLimitAllocations] = useState(10);

  const [pageAudit, setPageAudit] = useState(1);
  const [limitAudit, setLimitAudit] = useState(10);

  // Reset page numbers on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageInventory(1);
      setPageAllocations(1);
      setPageAudit(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation, selectedType, selectedStatus, selectedAction]);

  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsData = await assetApi.list({ paginate: false });
      setAssets(assetsData.assets || []);
      setAllocationHistory(assetsData.allocationHistory || []);
      setLocations(assetsData.locations || []);
    } catch (e) {
      console.error("Error loading inventory data:", e);
    }
    setLoading(false);
  }, []);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const auditData = await auditApi.list({ paginate: false }).catch(() => ({ logs: [] }));
      setAuditLogs(auditData.logs || []);
    } catch (e) {
      console.error("Error loading audit data:", e);
    }
    setLoading(false);
  }, []);

  const loadData = useCallback(() => {
    if (activeTab === "inventory" || activeTab === "allocations") {
      loadInventoryData();
    } else if (activeTab === "audit") {
      loadAuditData();
    }
  }, [activeTab, loadInventoryData, loadAuditData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Filter Assets
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

    return matchesSearch && matchesLocation && matchesType && matchesStatus;
  });

  // Filter Allocations
  const filteredAllocations = allocationHistory.filter((alloc) => {
    const matchesSearch =
      searchQuery === "" ||
      alloc.asset?.asset_tag
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      alloc.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alloc.allocator?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "" || alloc.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Filter Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      selectedAction === "" || log.action?.includes(selectedAction);

    return matchesSearch && matchesAction;
  });

  // Export CSV Helper
  const handleExportCSV = () => {
    if (activeTab === "inventory") {
      const headers = [
        "Asset Tag",
        "Name",
        "Type",
        "Brand",
        "Serial Number",
        "Location",
        "Status",
        "Assigned To",
      ];
      const data = filteredAssets.map((a) => [
        a.asset_tag,
        a.name,
        a.type,
        a.brand || "—",
        a.serial_number || "—",
        a.location?.name || "—",
        a.status.toUpperCase(),
        a.allocated_user_name || "—",
      ]);
      downloadCSV(headers, data, "asset_inventory_report.csv");
    } else if (activeTab === "allocations") {
      const headers = [
        "Asset Tag",
        "Allocated To",
        "Allocated By",
        "Notes",
        "Status",
        "Allocation Date",
        "Return Date",
      ];
      const data = filteredAllocations.map((a) => [
        a.asset?.asset_tag || "—",
        a.user?.name || "—",
        a.allocator?.name || "—",
        a.notes || "—",
        a.status.toUpperCase(),
        a.created_at ? new Date(a.created_at).toLocaleDateString() : "—",
        a.returned_at ? new Date(a.returned_at).toLocaleDateString() : "—",
      ]);
      downloadCSV(headers, data, "asset_allocations_report.csv");
    } else {
      const headers = [
        "Timestamp",
        "Performed By",
        "Action",
        "Entity Type",
        "Details",
      ];
      const data = filteredAuditLogs.map((l) => [
        l.created_at ? new Date(l.created_at).toLocaleString() : "—",
        l.user?.name || "System",
        l.action,
        l.entity_type,
        l.details,
      ]);
      downloadCSV(headers, data, "audit_trail_report.csv");
    }
  };

  const downloadCSV = (headers, data, filename) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...data.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Metrics & Chart Data
  const totalAssetsCount = assets.length;
  const availableAssetsCount = assets.filter(
    (a) => a.status === "available",
  ).length;
  const allocatedAssetsCount = assets.filter(
    (a) => a.status === "allocated",
  ).length;
  const maintenanceAssetsCount = assets.filter(
    (a) => a.status === "maintenance",
  ).length;

  // Types breakdown data
  const typeMap = {};
  assets.forEach((a) => {
    typeMap[a.type] = (typeMap[a.type] || 0) + 1;
  });
  const typeBreakdownData = Object.keys(typeMap).map((key) => ({
    name: key,
    value: typeMap[key],
  }));

  // Status breakdown data
  const statusBreakdownData = [
    { name: "Available", value: availableAssetsCount },
    { name: "Allocated", value: allocatedAssetsCount },
    { name: "Maintenance", value: maintenanceAssetsCount },
  ].filter((item) => item.value > 0);

  // Location breakdown data
  const locationMap = {};
  assets.forEach((a) => {
    const locName = a.location?.name || "Unknown";
    locationMap[locName] = (locationMap[locName] || 0) + 1;
  });
  const locationBreakdownData = Object.keys(locationMap).map((key) => ({
    name: key,
    value: locationMap[key],
  }));

  return (
    <AppLayout>
      <div className="mx-auto space-y-6  mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Reports & Analytics
            </h1>
            <p className="text-slate-450 text-sm mt-1">
              Generate dynamic inventory logs, allocation sheets, and
              administrative audit trails.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.2)] disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-4 rounded-t-2xl border-x border-t border-slate-100 shadow-xs">
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "inventory"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => {
              setActiveTab("inventory");
              setSearchQuery("");
            }}
          >
            <Package size={16} />
            Asset Inventory Summary
          </button>
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "allocations"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => {
              setActiveTab("allocations");
              setSearchQuery("");
            }}
          >
            <FileText size={16} />
            Asset Allocation Registry
          </button>
          <button
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "audit"
                ? "border-emerald-500 text-emerald-600 font-extrabold"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
            onClick={() => {
              setActiveTab("audit");
              setSearchQuery("");
            }}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 w-full md:w-[450px]">
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
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Asset Tag
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Asset Details
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Assigned To
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
                                {asset.type} • {asset.brand || "No Brand"} • SN:{" "}
                                {asset.serial_number || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 font-medium">
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
                                {asset.status}
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

          {/* TAB 2: ALLOCATIONS */}
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
                <SearchableSelect
                  options={[
                    { value: "", label: "All Allocations" },
                    { value: "active", label: "Active (Assigned)" },
                    { value: "returned", label: "Returned" }
                  ]}
                  value={selectedStatus}
                  onChange={val => setSelectedStatus(val)}
                  className="w-full sm:w-[200px]"
                />
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Asset Tag
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Assigned Employee
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Allocated By
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Notes / Reason
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          State
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Allocated Date
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Returned Date
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
                                  ? "Active"
                                  : "Returned"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 font-medium">
                              {alloc.created_at
                                ? new Date(
                                    alloc.created_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 font-medium">
                              {alloc.returned_at
                                ? new Date(
                                    alloc.returned_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  currentPage={pageAllocations}
                  totalItems={filteredAllocations.length}
                  limit={limitAllocations}
                  onPageChange={setPageAllocations}
                  onLimitChange={setLimitAllocations}
                />
              </div>
            </>
          )}

          {/* TAB 3: SYSTEM AUDIT TRAIL */}
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
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider w-[180px]">
                          Timestamp
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider w-[160px]">
                          Performed By
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider w-[180px]">
                          Action
                        </th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          Log Details
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
