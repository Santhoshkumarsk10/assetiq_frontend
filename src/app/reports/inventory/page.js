"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import ExportDropdown from "@/components/ExportDropdown";
import DateRangePicker from "@/components/DateRangePicker";
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
  Search,
  Filter,
  Download,
  RefreshCw,
  Layers,
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

export default function InventoryReportPage() {
  const { t } = useLanguage();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setTimeout(()=>{
      setPage(1);
    },0)
  }, [searchQuery, selectedLocation, selectedType, selectedStatus, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsData = await reportApi.inventory({ paginate: false });
      setAssets(assetsData.assets || []);
      setLocations(assetsData.locations || []);
    } catch (e) {
      console.error("Error loading inventory data:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setTimeout(()=>{
      loadData();
    },0)
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

  // Filtering Logic
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

    const assetDate = asset.created_at ? new Date(asset.created_at) : null;
    const matchesStart = startDate === "" || !assetDate || assetDate >= new Date(startDate);
    const matchesEnd = endDate === "" || !assetDate || assetDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesLocation && matchesType && matchesStatus && matchesStart && matchesEnd;
  });

  // Metrics
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

  return (
    <AppLayout>
      <div className="mx-auto space-y-6 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Asset Inventory Summary
            </h1>
            <p className="text-slate-450 text-sm mt-1">
              Generate and analyze dynamic hardware and software inventory reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-55 transition-colors cursor-pointer bg-white"
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
              <Package size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{totalAssetsCount}</div>
              <div className="text-xs text-slate-455 font-medium">Total Active Assets</div>
            </div>
          </div>

          <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Zap size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{availableAssetsCount}</div>
              <div className="text-xs text-emerald-500 font-medium">Available Assets</div>
            </div>
          </div>

          <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">{allocatedAssetsCount}</div>
              <div className="text-xs text-blue-500 font-medium">Allocated Assets</div>
            </div>
          </div>

          <div className="p-5 border border-amber-100 bg-amber-50/30 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700">{maintenanceAssetsCount}</div>
              <div className="text-xs text-amber-500 font-medium">Under Maintenance</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Layers size={16} /> Asset Type Distribution
            </h3>
            <div className="h-64">
              {typeBreakdownData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
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

          <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Filter size={16} /> Allocation & Status Share
            </h3>
            <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
              {statusBreakdownData.length === 0 ? (
                <div className="text-xs text-slate-400">No data available</div>
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
                  <div className="flex flex-col gap-2.5 shrink-0 self-center">
                    {statusBreakdownData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3.5 h-3.5 rounded-md"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase()] || COLORS[idx % COLORS.length],
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
          <div className="lg:col-span-4 relative h-10 flex items-center">
            <Search size={16} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by tag, name, brand, serial..."
              className="w-full h-full pl-9 pr-4 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
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
                  <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-wider">{t('assetTag')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('assetDetails')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('location')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-455 uppercase tracking-wider">{t('allocatedTo')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">No assets found.</td>
                  </tr>
                ) : (
                  filteredAssets.slice((page - 1) * limit, page * limit).map((asset) => (
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

          <div className="block md:hidden divide-y divide-slate-100">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No assets found.</div>
            ) : (
              filteredAssets.slice((page - 1) * limit, page * limit).map((asset) => (
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
            currentPage={page}
            totalItems={filteredAssets.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      </div>
    </AppLayout>
  );
}
