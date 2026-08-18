"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import DateRangePicker from "@/components/DateRangePicker";
import { reportApi, locationApi } from "@/lib/api";
import {
  ArrowLeft,
  Sliders,
  Play,
  Download,
  Send,
  Clock,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";

export default function CustomReportBuilder() {
  const router = useRouter();

  // Loading & Toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals integration
  const [activeModal, setActiveModal] = useState(null); // 'send' | 'schedule'

  // General Filter fields
  const [reportName, setReportName] = useState("Custom Asset Summary");
  const [dataSource, setDataSource] = useState("assets"); // assets, tickets, licenses, allocations, audit
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Dependent Filter fields
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Options list
  const [locations, setLocations] = useState([]);
  const [fetchedData, setFetchedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Email form state
  const [emailTo, setEmailTo] = useState("");
  const [emailFormat, setEmailFormat] = useState("pdf");
  const [emailNote, setEmailNote] = useState("");

  // Schedule form state
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState("monthly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleRunDay, setScheduleRunDay] = useState("monday");
  const [scheduleRunDate, setScheduleRunDate] = useState("1");
  const [scheduleEmails, setScheduleEmails] = useState("");
  const [scheduleFormat, setScheduleFormat] = useState("pdf");
  const [scheduleActive, setScheduleActive] = useState(true);

  // Column options per data source
  const columnsConfig = {
    assets: [
      { id: "asset_tag", label: "Asset Tag", getVal: (r) => r.asset_tag || "—" },
      { id: "name", label: "Asset Name", getVal: (r) => r.name || "—" },
      { id: "type", label: "Type", getVal: (r) => r.type || "—" },
      { id: "status", label: "Status", getVal: (r) => r.status || "—" },
      { id: "serial_number", label: "Serial Number", getVal: (r) => r.serial_number || "—" },
      { id: "location", label: "Location", getVal: (r) => r.location?.name || "—" },
      { id: "cost", label: "Purchase Cost", getVal: (r) => (r.cost ? `$${Number(r.cost).toFixed(2)}` : "—") },
      { id: "created_at", label: "Created At", getVal: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : "—") },
    ],
    tickets: [
      { id: "ticket_no", label: "Ticket ID", getVal: (r) => r.ticket_no || "—" },
      { id: "title", label: "Subject", getVal: (r) => r.title || "—" },
      { id: "category", label: "Category", getVal: (r) => r.category || "—" },
      { id: "priority", label: "Priority", getVal: (r) => r.priority || "—" },
      { id: "status", label: "Status", getVal: (r) => r.status || "—" },
      { id: "reporter", label: "Raised By", getVal: (r) => r.reporter?.name || "—" },
      { id: "assignee", label: "Assignee", getVal: (r) => r.assignee?.name || "—" },
      { id: "updated_at", label: "Last Updated", getVal: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—") },
    ],
    licenses: [
      { id: "software_name", label: "Software", getVal: (r) => r.software_name || "—" },
      { id: "license_key", label: "License Key", getVal: (r) => r.license_key || "—" },
      { id: "user", label: "Assigned Employee", getVal: (r) => r.user?.name || "—" },
      { id: "created_at", label: "Purchased Date", getVal: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : "—") },
      { id: "valid_until", label: "Valid Until", getVal: (r) => (r.valid_until ? new Date(r.valid_until).toLocaleDateString() : "Perpetual") },
      { id: "status", label: "Status", getVal: (r) => r.status || "—" },
    ],
    allocations: [
      { id: "asset_tag", label: "Asset Tag", getVal: (r) => r.asset?.asset_tag || "—" },
      { id: "user", label: "Assigned Employee", getVal: (r) => r.user?.name || "—" },
      { id: "allocator", label: "Allocated By", getVal: (r) => r.allocator?.name || "—" },
      { id: "notes", label: "Notes/Reason", getVal: (r) => r.notes || "—" },
      { id: "status", label: "Status", getVal: (r) => r.status || "—" },
      { id: "created_at", label: "Allocated Date", getVal: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : "—") },
      { id: "returned_at", label: "Returned Date", getVal: (r) => (r.returned_at ? new Date(r.returned_at).toLocaleDateString() : "—") },
    ],
    audit: [
      { id: "created_at", label: "Timestamp", getVal: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : "—") },
      { id: "user", label: "Performed By", getVal: (r) => r.user?.name || "System" },
      { id: "action", label: "Action Type", getVal: (r) => r.action || "—" },
      { id: "details", label: "Details", getVal: (r) => r.details || "—" },
    ],
  };

  // Selected Columns Map (active columns per source)
  const [selectedColumns, setSelectedColumns] = useState({
    assets: ["asset_tag", "name", "type", "status", "location", "cost"],
    tickets: ["ticket_no", "title", "category", "priority", "status", "assignee"],
    licenses: ["software_name", "license_key", "user", "valid_until", "status"],
    allocations: ["asset_tag", "user", "allocator", "status", "created_at"],
    audit: ["created_at", "user", "action", "details"],
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle columns
  const handleToggleColumn = (colId) => {
    const activeCols = selectedColumns[dataSource];
    let updated;
    if (activeCols.includes(colId)) {
      if (activeCols.length === 1) {
        showToast("You must include at least one column.", "error");
        return;
      }
      updated = activeCols.filter((id) => id !== colId);
    } else {
      updated = [...activeCols, colId];
    }
    setSelectedColumns((prev) => ({ ...prev, [dataSource]: updated }));
  };

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await locationApi.list({ page: 1, limit: 100 });
        setLocations(res.locations || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadLocations();
  }, []);

  // Sync report prefill name when data source changes
  useEffect(() => {
    const names = {
      assets: "Custom Asset Summary",
      tickets: "Custom Support Tickets",
      licenses: "Custom License Summary",
      allocations: "Custom Asset Allocations",
      audit: "Custom System Audit Logs",
    };
    setReportName(names[dataSource] || "Custom Report");
    // Clear preview list when switching data sources
    setFetchedData([]);
    setFilteredData([]);
  }, [dataSource]);

  // Load and Filter Data
  const runReport = async () => {
    setLoading(true);
    try {
      let data = [];
      const queryParams = { page: 1, limit: 500 };

      if (dataSource === "assets") {
        const res = await reportApi.inventory(queryParams);
        data = res.assets || [];
      } else if (dataSource === "tickets") {
        const res = await reportApi.tickets(queryParams);
        data = res.tickets || [];
      } else if (dataSource === "licenses") {
        const res = await reportApi.licenses(queryParams);
        data = res.licenses || [];
      } else if (dataSource === "allocations") {
        const res = await reportApi.allocations(queryParams);
        data = res.allocations || [];
      } else if (dataSource === "audit") {
        const res = await reportApi.auditLogs(queryParams);
        data = res.logs || [];
      }

      setFetchedData(data);

      // Client-side Filtering
      const filtered = data.filter((item) => {
        // Date filters
        if (startDate) {
          const itemDate = new Date(item.created_at || item.updated_at);
          if (itemDate < new Date(startDate)) return false;
        }
        if (endDate) {
          const itemDate = new Date(item.created_at || item.updated_at);
          if (itemDate > new Date(endDate + "T23:59:59")) return false;
        }

        // Dependent dropdown filters
        if (dataSource === "assets") {
          if (selectedLocation && item.location_id?.toString() !== selectedLocation) return false;
          if (selectedType && item.type !== selectedType) return false;
          if (selectedStatus && item.status !== selectedStatus) return false;
        } else if (dataSource === "tickets") {
          if (selectedLocation && item.reporter?.location_id?.toString() !== selectedLocation) return false;
          if (selectedCategory && item.category !== selectedCategory) return false;
          if (selectedPriority && item.priority !== selectedPriority) return false;
          if (selectedStatus && item.status !== selectedStatus) return false;
        } else if (dataSource === "licenses") {
          if (selectedStatus && item.status !== selectedStatus) return false;
        } else if (dataSource === "allocations") {
          if (selectedStatus && item.status !== selectedStatus) return false;
        } else if (dataSource === "audit") {
          if (selectedStatus && !item.action?.includes(selectedStatus)) return false;
        }

        return true;
      });

      setFilteredData(filtered);
      showToast(`Loaded ${filtered.length} matching entries.`);
    } catch (e) {
      console.error(e);
      showToast("Error fetching report data.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reset Filters
  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedLocation("");
    setSelectedStatus("");
    setSelectedType("");
    setSelectedPriority("");
    setSelectedCategory("");
    setFilteredData([]);
    setFetchedData([]);
  };

  // EXPORTS
  const activeCols = columnsConfig[dataSource].filter((col) =>
    selectedColumns[dataSource].includes(col.id)
  );

  const getExportRows = () => {
    return filteredData.map((row) =>
      activeCols.map((col) => col.getVal(row))
    );
  };

  const handleExport = async (format) => {
    if (filteredData.length === 0) {
      showToast("No data to export. Please run report first.", "error");
      return;
    }
    setLoading(true);
    try {
      const headers = activeCols.map((c) => c.label);
      const body = getExportRows();

      const payload = {
        reportType: "custom",
        reportName: reportName,
        format,
        headers,
        data: body,
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
      const filename = `${reportName.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.${ext}`;
      
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
      showToast("Export failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Send Email Modal launchers
  const openSendModal = () => {
    if (filteredData.length === 0) {
      showToast("Run report before attempting to send.", "error");
      return;
    }
    setEmailTo("");
    setEmailFormat("pdf");
    setEmailNote("");
    setActiveModal("send");
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      showToast("Please enter at least one recipient email.", "error");
      return;
    }
    setLoading(true);
    try {
      const headers = activeCols.map((c) => c.label);
      const body = getExportRows();

      const payload = {
        reportType: "custom",
        reportName: reportName,
        format: emailFormat,
        headers,
        data: body,
        emailTo,
        emailNote,
      };

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

      const res = await fetch(`${API_BASE}/reports/send-email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send email");
      }

      showToast(`Custom report successfully sent to: ${emailTo}`, "success");
      setActiveModal(null);
    } catch (err) {
      console.error("Email Send Error: ", err);
      showToast(err.message || "Failed to send email report.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Schedule Modal launchers
  const openScheduleModal = () => {
    setScheduleName(`Automated ${reportName}`);
    setScheduleFreq("monthly");
    setScheduleTime("09:00");
    setScheduleRunDay("monday");
    setScheduleRunDate("1");
    setScheduleEmails("");
    setScheduleFormat("pdf");
    setScheduleActive(true);
    setActiveModal("schedule");
  };

  const handleSaveSchedule = async () => {
    if (!scheduleName.trim()) {
      showToast("Please enter a schedule name.", "error");
      return;
    }
    if (!scheduleEmails.trim()) {
      showToast("Please enter recipient emails.", "error");
      return;
    }
    if (scheduleFreq === "weekly" && !scheduleRunDay) {
      showToast("Please select a day of the week.", "error");
      return;
    }
    if (scheduleFreq === "monthly" && !scheduleRunDate) {
      showToast("Please select a day of the month.", "error");
      return;
    }

    try {
      const payload = {
        reportId: `custom_${dataSource}`,
        reportTitle: reportName,
        name: scheduleName,
        frequency: scheduleFreq,
        runTime: scheduleTime,
        recipients: scheduleEmails,
        format: scheduleFormat,
        runDay: scheduleFreq === "weekly" ? scheduleRunDay : null,
        runDate: scheduleFreq === "monthly" ? parseInt(scheduleRunDate, 10) : null
      };

      await reportApi.createSchedule(payload);
      setActiveModal(null);
      showToast("Automated schedule configured successfully!", "success");
    } catch (err) {
      console.error("Failed to configure schedule: ", err);
      showToast(err.message || "Failed to configure automated schedule.", "error");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto space-y-6 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              href="/reports"
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <Sliders size={22} className="text-emerald-600" /> Custom Report Builder
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Build tailored asset & tickets reports with custom column filters and live preview.
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => showToast("Features unlocked! You are currently on the Enterprise tier.", "success")}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} /> Upgrade to Pro
            </button>
          </div>
        </div>

        {/* Builder Configuration Panel */}
        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-850 font-bold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Data Source</label>
              <SearchableSelect
                options={[
                  { value: "assets", label: "Assets Inventory" },
                  { value: "tickets", label: "Tickets Logs" },
                  { value: "licenses", label: "Software Licenses" },
                  { value: "allocations", label: "Asset In/Out Logs" },
                  { value: "audit", label: "System Audit Logs" },
                ]}
                value={dataSource}
                onChange={setDataSource}
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-bold text-slate-600">Date Range (Optional)</label>
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

          {/* Conditional Filters Based on Data Source */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Source Filters</h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {dataSource === "assets" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                    <SearchableSelect
                      options={[{ value: "", label: "All Locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                      value={selectedLocation}
                      onChange={setSelectedLocation}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Type</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "All Types" },
                        { value: "Laptop", label: "Laptop" },
                        { value: "Desktop", label: "Desktop" },
                        { value: "Mobile", label: "Mobile" },
                        { value: "Monitor", label: "Monitor" },
                      ]}
                      value={selectedType}
                      onChange={setSelectedType}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "All Status" },
                        { value: "available", label: "Available" },
                        { value: "allocated", label: "Allocated" },
                        { value: "maintenance", label: "Maintenance" },
                      ]}
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                    />
                  </div>
                </>
              )}

              {dataSource === "tickets" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                    <SearchableSelect
                      options={[{ value: "", label: "All Locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                      value={selectedLocation}
                      onChange={setSelectedLocation}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "All Categories" },
                        { value: "hardware_malfunction", label: "Hardware" },
                        { value: "software_issue", label: "Software" },
                        { value: "general_it", label: "General IT" },
                      ]}
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "All Priorities" },
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                        { value: "critical", label: "Critical" },
                      ]}
                      value={selectedPriority}
                      onChange={setSelectedPriority}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "in_progress", label: "In Progress" },
                        { value: "resolved", label: "Resolved" },
                        { value: "closed", label: "Closed" },
                      ]}
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                    />
                  </div>
                </>
              )}

              {dataSource === "licenses" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Status" },
                      { value: "available", label: "Available" },
                      { value: "active", label: "Active" },
                      { value: "expired", label: "Expired" },
                    ]}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                  />
                </div>
              )}

              {dataSource === "allocations" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Status" },
                      { value: "active", label: "Active" },
                      { value: "returned", label: "Returned" },
                    ]}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                  />
                </div>
              )}

              {dataSource === "audit" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Action type</label>
                  <SearchableSelect
                    options={[
                      { value: "", label: "All Actions" },
                      { value: "CREATE", label: "Create Action" },
                      { value: "UPDATE", label: "Update Action" },
                      { value: "DELETE", label: "Delete Action" },
                    ]}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Columns selection pills */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600">Columns to Include in Report</h4>
            <div className="flex flex-wrap gap-2">
              {columnsConfig[dataSource].map((col) => {
                const isActive = selectedColumns[dataSource].includes(col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                      isActive
                        ? "bg-emerald-50 border-emerald-350 text-emerald-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-50"
                    }`}
                  >
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-100">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Clear Filters
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={runReport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Play size={12} fill="white" /> Run Report
              </button>

              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={12} /> PDF
              </button>

              <button
                onClick={() => handleExport('excel')}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={12} /> Excel
              </button>

              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={12} /> CSV
              </button>

              <button
                onClick={openSendModal}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send size={12} /> Send Now
              </button>

              <button
                onClick={openScheduleModal}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-55 text-slate-750 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clock size={12} /> Save & Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Table */}
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Report Results Preview</h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {filteredData.length} Records Found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {activeCols.map((c) => (
                    <th key={c.id} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={activeCols.length} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                        <span>Running query calculations...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={activeCols.length} className="text-center py-12 text-slate-400 font-medium">
                      No matching records loaded. Configure the settings above and click "Run Report".
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {activeCols.map((c) => (
                        <td key={c.id} className="px-5 py-3.5 font-semibold text-slate-700">
                          {c.getVal(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TOAST alerts */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 z-[9999] transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-rose-50 text-rose-700 border-rose-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* MODALS */}

      {/* 1. Send via Email Modal */}
      {activeModal === "send" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Send size={18} className="text-emerald-600" /> Send Custom Report
            </h2>
            <p className="text-slate-450 text-xs mb-6">Mail custom report exports directly to your inbox or team.</p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Report Title</label>
                <input
                  type="text"
                  disabled
                  value={reportName}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-sm font-medium outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Recipient Email(s)</label>
                <input
                  type="text"
                  placeholder="e.g. analyst@auxcare.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                />
                <span className="text-[10px] text-slate-450 font-medium">Separate multiple emails with commas.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">File Format</label>
                <SearchableSelect
                  options={[
                    { value: "pdf", label: "PDF Document (.pdf)" },
                    { value: "excel", label: "Excel Spreadsheet (.xlsx)" },
                    { value: "csv", label: "CSV File (.csv)" },
                  ]}
                  value={emailFormat}
                  onChange={setEmailFormat}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Custom Note (Optional)</label>
                <textarea
                  placeholder="Add a short message to recipients..."
                  rows={3}
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8 border-t border-slate-100 pt-5">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-705 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} /> Send Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Schedule Report Modal */}
      {activeModal === "schedule" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Clock size={18} className="text-emerald-600" /> Schedule Custom Report
            </h2>
            <p className="text-slate-450 text-xs mb-6">Setup recurring email schedules for automated exports.</p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Schedule Name</label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Frequency</label>
                  <SearchableSelect
                    options={[
                      { value: "daily", label: "Daily" },
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                    value={scheduleFreq}
                    onChange={setScheduleFreq}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Run Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>

              {scheduleFreq === "weekly" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Day of Week</label>
                  <SearchableSelect
                    options={[
                      { value: "monday", label: "Monday" },
                      { value: "tuesday", label: "Tuesday" },
                      { value: "wednesday", label: "Wednesday" },
                      { value: "thursday", label: "Thursday" },
                      { value: "friday", label: "Friday" },
                      { value: "saturday", label: "Saturday" },
                      { value: "sunday", label: "Sunday" },
                    ]}
                    value={scheduleRunDay}
                    onChange={setScheduleRunDay}
                  />
                </div>
              )}

              {scheduleFreq === "monthly" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Day of Month</label>
                  <SearchableSelect
                    options={Array.from({ length: 31 }, (_, i) => ({
                      value: String(i + 1),
                      label: `${i + 1}${
                        (i + 1) === 1 || (i + 1) === 21 || (i + 1) === 31 ? "st" :
                        (i + 1) === 2 || (i + 1) === 22 ? "nd" :
                        (i + 1) === 3 || (i + 1) === 23 ? "rd" : "th"
                      } Day`
                    }))}
                    value={scheduleRunDate}
                    onChange={setScheduleRunDate}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Recipient Emails</label>
                <input
                  type="text"
                  placeholder="e.g. managers@auxcare.com"
                  value={scheduleEmails}
                  onChange={(e) => setScheduleEmails(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">File Format</label>
                <div className="flex gap-5 text-sm font-semibold text-slate-605 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="customSchedFormat"
                      checked={scheduleFormat === "pdf"}
                      onChange={() => setScheduleFormat("pdf")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    PDF
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="customSchedFormat"
                      checked={scheduleFormat === "excel"}
                      onChange={() => setScheduleFormat("excel")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    Excel (.xlsx)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="customSchedFormat"
                      checked={scheduleFormat === "csv"}
                      onChange={() => setScheduleFormat("csv")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    CSV
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={scheduleActive}
                  onChange={(e) => setScheduleActive(e.target.checked)}
                  className="accent-emerald-600 rounded-sm h-4 w-4"
                />
                Active Schedule
              </label>
            </div>

            <div className="flex gap-3 mt-8 border-t border-slate-100 pt-5">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-55 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-705 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle size={14} /> Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
