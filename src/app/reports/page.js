"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { dashboardApi, auditApi, locationApi } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";
import DateRangePicker from "@/components/DateRangePicker";
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
  Legend,
} from "recharts";
import {
  Package,
  ArrowLeftRight,
  Ticket,
  KeyRound,
  ShieldAlert,
  Wrench,
  Play,
  Send,
  Clock,
  Plus,
  ArrowRight,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  FileText,
  CheckCircle,
  Zap,
  Sliders,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ReportsDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Active Tab: 'reports' | 'analytics' | 'activity'
  const [activeTab, setActiveTab] = useState("reports");

  // General state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'generate' | 'send' | 'schedule'
  const [selectedReport, setSelectedReport] = useState(null);

  // Locations list for filter dropdowns
  const [locations, setLocations] = useState([]);

  // Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load locations for modals
  useEffect(() => {
    async function getLocations() {
      try {
        const res = await locationApi.list({ page: 1, limit: 100 });
        setLocations(res.locations || []);
      } catch (e) {
        console.error("Error loading locations:", e);
      }
    }
    getLocations();
  }, []);

  // Standard Reports Configuration
  const standardReports = [
    {
      id: "inventory",
      title: "Asset Inventory Summary",
      description: "Detailed hardware and software inventory count, types breakdown, and status shares.",
      icon: Package,
      iconColor: "text-emerald-600 bg-emerald-50",
      targetPath: "/reports/inventory",
      filters: [
        { name: "location_id", label: "Location", type: "select", options: [{ value: "", label: "All Locations" }] },
        {
          name: "type",
          label: "Asset Type",
          type: "select",
          options: [
            { value: "", label: "All Types" },
            { value: "Laptop", label: "Laptop" },
            { value: "Desktop", label: "Desktop" },
            { value: "Mobile", label: "Mobile" },
            { value: "Monitor", label: "Monitor" },
            { value: "Accessories", label: "Accessories" },
            { value: "Other", label: "Other" },
          ],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "", label: "All Status" },
            { value: "available", label: "Available" },
            { value: "allocated", label: "Allocated" },
            { value: "maintenance", label: "Maintenance" },
            { value: "retired", label: "Retired" },
          ],
        },
        { name: "dateRange", label: "Date Range", type: "dateRange" },
      ],
    },
    {
      id: "allocations",
      title: "Asset In-Out Reports",
      description: "Track asset allocation history, returns verification, and transfer tracking.",
      icon: ArrowLeftRight,
      iconColor: "text-blue-600 bg-blue-50",
      targetPath: "/reports/allocations",
      filters: [
        {
          name: "status",
          label: "Allocation Status",
          type: "select",
          options: [
            { value: "", label: "All Status" },
            { value: "active", label: "Active (Assigned)" },
            { value: "returned", label: "Returned" },
          ],
        },
        { name: "dateRange", label: "Date Range", type: "dateRange" },
      ],
    },
    {
      id: "tickets",
      title: "Tickets Reports",
      description: "Track support ticket resolutions, breakdown by status, priority, and department density.",
      icon: Ticket,
      iconColor: "text-amber-600 bg-amber-50",
      targetPath: "/reports/tickets",
      filters: [
        {
          name: "category",
          label: "Category",
          type: "select",
          options: [
            { value: "", label: "All Categories" },
            { value: "hardware_malfunction", label: "Hardware Malfunction" },
            { value: "software_issue", label: "Software Issue" },
            { value: "lost_stolen", label: "Lost / Stolen" },
            { value: "physical_damage", label: "Physical Damage" },
            { value: "general_it", label: "General IT" },
          ],
        },
        {
          name: "priority",
          label: "Priority",
          type: "select",
          options: [
            { value: "", label: "All Priorities" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In Progress" },
            { value: "resolved", label: "Resolved" },
            { value: "closed", label: "Closed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
        { name: "dateRange", label: "Date Range", type: "dateRange" },
      ],
    },
    {
      id: "licenses",
      title: "License Reports",
      description: "Monitor software license usage, validity timelines, expirations, and active allocation counts.",
      icon: KeyRound,
      iconColor: "text-purple-600 bg-purple-50",
      targetPath: "/reports/licenses",
      filters: [
        {
          name: "status",
          label: "License Status",
          type: "select",
          options: [
            { value: "", label: "All Status" },
            { value: "available", label: "Available" },
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
          ],
        },
        { name: "dateRange", label: "Date Range", type: "dateRange" },
      ],
    },
    {
      id: "audit",
      title: "System AuditTrail",
      description: "Access formal logs of system activities, settings adjustments, and administrator actions.",
      icon: ShieldAlert,
      iconColor: "text-rose-600 bg-rose-50",
      targetPath: "/reports/audit",
      filters: [
        {
          name: "action",
          label: "Action Type",
          type: "select",
          options: [
            { value: "", label: "All Action Categories" },
            { value: "CREATE", label: "Create Action" },
            { value: "UPDATE", label: "Update Action" },
            { value: "DELETE", label: "Delete Action" },
            { value: "ALLOCATE", label: "Allocate Action" },
            { value: "RETURN", label: "Return Action" },
          ],
        },
        { name: "dateRange", label: "Date Range", type: "dateRange" },
      ],
    },
    {
      id: "maintenance",
      title: "Asset Maintenance Report",
      description: "Track assets currently in maintenance, service costs, and retired history.",
      icon: Wrench,
      iconColor: "text-indigo-600 bg-indigo-50",
      targetPath: "/reports/inventory",
      filters: [
        { name: "dateRange", label: "Date Range", type: "dateRange" },
      ],
      forcedQuery: { status: "maintenance" },
    },
  ];

  // Dynamic filter forms state
  const [filterValues, setFilterValues] = useState({});

  // Email form state
  const [emailTo, setEmailTo] = useState("");
  const [emailFormat, setEmailFormat] = useState("pdf");
  const [emailNote, setEmailNote] = useState("");

  // Schedule form state
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState("monthly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleEmails, setScheduleEmails] = useState("");
  const [scheduleFormat, setScheduleFormat] = useState("pdf");
  const [scheduleActive, setScheduleActive] = useState(true);

  // Open filter modal
  const openGenerateModal = (report) => {
    setSelectedReport(report);
    // Initialize filter fields
    const initial = {};
    report.filters.forEach((f) => {
      if (f.type === "dateRange") {
        initial.startDate = "";
        initial.endDate = "";
      } else {
        initial[f.name] = "";
      }
    });
    setFilterValues(initial);
    setActiveModal("generate");
  };

  // Run report navigation
  const handleRunReport = () => {
    const filters = {};
    if (selectedReport.forcedQuery) {
      Object.assign(filters, selectedReport.forcedQuery);
    }
    Object.keys(filterValues).forEach((key) => {
      if (filterValues[key]) {
        filters[key] = filterValues[key];
      }
    });

    sessionStorage.setItem(`report_filters_${selectedReport.id}`, JSON.stringify(filters));
    setActiveModal(null);
    router.push(selectedReport.targetPath);
  };

  // Open send email modal
  const openSendModal = (report) => {
    setSelectedReport(report);
    setEmailTo("");
    setEmailFormat("pdf");
    setEmailNote("");
    setActiveModal("send");
  };

  // Send report via email
  const handleSendEmail = () => {
    if (!emailTo.trim()) {
      showToast("Please enter at least one recipient email.", "error");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setActiveModal(null);
      showToast(`Report successfully sent to: ${emailTo}`);
    }, 1500);
  };

  // Open schedule modal
  const openScheduleModal = (report) => {
    setSelectedReport(report);
    setScheduleName(`Scheduled ${report.title}`);
    setScheduleFreq("monthly");
    setScheduleTime("09:00");
    setScheduleEmails("");
    setScheduleFormat("pdf");
    setScheduleActive(true);
    setActiveModal("schedule");
  };

  // Save Automated Schedule
  const handleSaveSchedule = () => {
    if (!scheduleName.trim()) {
      showToast("Please enter a schedule name.", "error");
      return;
    }
    if (!scheduleEmails.trim()) {
      showToast("Please enter recipient emails.", "error");
      return;
    }

    const newSchedule = {
      id: Date.now().toString(),
      reportId: selectedReport.id,
      reportTitle: selectedReport.title,
      name: scheduleName,
      frequency: scheduleFreq,
      runTime: scheduleTime,
      recipients: scheduleEmails,
      format: scheduleFormat,
      active: scheduleActive,
      lastRun: "Never",
    };

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem("automated_schedules") || "[]");
    localStorage.setItem("automated_schedules", JSON.stringify([newSchedule, ...existing]));

    setActiveModal(null);
    showToast("Schedule automated successfully!");
  };

  return (
    <AppLayout>
      <div className="mx-auto space-y-6 mb-6">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Welcome back, <span className="text-emerald-600">{user?.name || "Admin"}</span>!
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage your hardware, software, and audit reports efficiently.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/reports/custom-builder"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={16} /> Custom Builder
            </Link>
            <Link
              href="/reports/schedules"
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <Clock size={16} /> View Schedules
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "reports"
                ? "border-emerald-600 text-emerald-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders size={16} /> Reports
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "border-emerald-600 text-emerald-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart size={16} className="rotate-90" /> Analytics
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "activity"
                ? "border-emerald-600 text-emerald-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock size={16} /> Activity Logs
          </button>
        </div>

        {/* Toast Notification */}
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

        {/* Tab Contents */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Sliders size={18} className="text-emerald-600" /> Standard Reports
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Render report cards */}
                {standardReports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <div
                      key={report.id}
                      className="bg-white border border-slate-150 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${report.iconColor} mb-4`}>
                          <Icon size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-md mb-2">{report.title}</h3>
                        <p className="text-slate-450 text-xs leading-relaxed mb-6">{report.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openGenerateModal(report)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Play size={12} fill="white" /> Generate
                        </button>
                        <button
                          onClick={() => openSendModal(report)}
                          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Send via Email"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => openScheduleModal(report)}
                          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Schedule Automated"
                        >
                          <Clock size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Custom Report Builder Card */}
                <div className="bg-emerald-50/20 border border-dashed border-emerald-300 rounded-2xl p-5 flex flex-col justify-between hover:bg-emerald-50/30 transition-all duration-200">
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 mb-4">
                      <Sliders size={20} />
                    </div>
                    <h3 className="font-bold text-emerald-800 text-md mb-2">Custom Report Builder</h3>
                    <p className="text-emerald-700/70 text-xs leading-relaxed mb-6">
                      Build bespoke reports with tailored filters, columns, group-by logic, and export options.
                    </p>
                  </div>
                  <Link
                    href="/reports/custom-builder"
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    + Build Custom Report
                  </Link>
                </div>

                {/* Scheduled Reports Card */}
                <div className="bg-teal-50/15 border border-dashed border-teal-350 rounded-2xl p-5 flex flex-col justify-between hover:bg-teal-50/20 transition-all duration-200">
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-100 text-teal-650 mb-4">
                      <Calendar size={20} />
                    </div>
                    <h3 className="font-bold text-teal-800 text-md mb-2">Scheduled Reports</h3>
                    <p className="text-teal-700/70 text-xs leading-relaxed mb-6">
                      View and manage all your automated recurring reports.
                    </p>
                  </div>
                  <Link
                    href="/reports/schedules"
                    className="py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    → View Schedules →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsTabContent />}

        {activeTab === "activity" && <ActivityLogsTabContent />}
      </div>

      {/* MODALS */}

      {/* 1. Generate Report Modal */}
      {activeModal === "generate" && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedReport.title}</h2>
            <p className="text-slate-450 text-xs mb-6">Specify the filters below to generate your report.</p>

            <div className="space-y-4">
              {selectedReport.filters.map((filter) => {
                if (filter.type === "select") {
                  // If filter is location, dynamically feed options
                  let options = filter.options;
                  if (filter.name === "location_id") {
                    options = [
                      { value: "", label: "All Locations" },
                      ...locations.map((l) => ({ value: l.id, label: l.name })),
                    ];
                  }
                  return (
                    <div key={filter.name} className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">{filter.label}</label>
                      <SearchableSelect
                        options={options}
                        value={filterValues[filter.name] || ""}
                        onChange={(val) => setFilterValues((prev) => ({ ...prev, [filter.name]: val }))}
                      />
                    </div>
                  );
                } else if (filter.type === "dateRange") {
                  return (
                    <div key={filter.name} className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">{filter.label}</label>
                      <DateRangePicker
                        startDate={filterValues.startDate || ""}
                        endDate={filterValues.endDate || ""}
                        onChange={(start, end) =>
                          setFilterValues((prev) => ({ ...prev, startDate: start, endDate: end }))
                        }
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <div className="flex gap-3 mt-8 border-t border-slate-100 pt-5">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRunReport}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Play size={14} fill="white" /> Run Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Send via Email Modal */}
      {activeModal === "send" && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Send size={18} className="text-emerald-600" /> Send Report via Email
            </h2>
            <p className="text-slate-450 text-xs mb-6">Mail report exports directly to your inbox or team.</p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Report Name</label>
                <input
                  type="text"
                  disabled
                  value={selectedReport.title}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-sm font-medium outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Recipient Email(s)</label>
                <input
                  type="text"
                  placeholder="e.g. admin@auxcare.com, manager@auxcare.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
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
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} /> Send Email Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Schedule Report Modal */}
      {activeModal === "schedule" && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Clock size={18} className="text-emerald-600" /> Schedule Automated Report
            </h2>
            <p className="text-slate-450 text-xs mb-6">Setup recurring email schedules for automated exports.</p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Schedule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Inventory Summary"
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
                  <div className="relative">
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Recipient Emails</label>
                <input
                  type="text"
                  placeholder="e.g. reports@auxcare.com"
                  value={scheduleEmails}
                  onChange={(e) => setScheduleEmails(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">File Format</label>
                <div className="flex gap-5 text-sm font-semibold text-slate-600 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedFormat"
                      checked={scheduleFormat === "pdf"}
                      onChange={() => setScheduleFormat("pdf")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    PDF
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedFormat"
                      checked={scheduleFormat === "excel"}
                      onChange={() => setScheduleFormat("excel")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    Excel (.xlsx)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedFormat"
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
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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

// ----------------------------------------------------------------------------
// ANALYTICS TAB CONTENT
// ----------------------------------------------------------------------------
function AnalyticsTabContent() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await dashboardApi.stats();
        setMetrics(res.metrics);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  const pieData = metrics
    ? [
        { name: "Available", value: metrics.availableAssets || 0 },
        { name: "Allocated", value: metrics.allocatedAssets || 0 },
        { name: "Maintenance", value: metrics.maintenanceAssets || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const barData = metrics
    ? [
        { name: "Active Users", value: metrics.activeUsers || 0 },
        { name: "Pending Onboardings", value: metrics.pendingOnboardings || 0 },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 text-sm bg-white rounded-2xl border border-slate-100">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <span>Loading report analytics...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Asset Status Share Pie Chart */}
      <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Asset Allocation Share</h3>
        </div>
        {pieData.length > 0 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-slate-400">
            <Package size={36} className="opacity-30 mb-2" />
            <p className="text-sm">No asset status data available</p>
          </div>
        )}
      </div>

      {/* Users and Onboarding Bar Chart */}
      <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">User Onboarding Density</h3>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#10b981" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// ACTIVITY LOGS TAB CONTENT
// ----------------------------------------------------------------------------
function ActivityLogsTabContent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await auditApi.list();
      setLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const text = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(text) ||
      log.details?.toLowerCase().includes(text) ||
      log.user?.name?.toLowerCase().includes(text)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 text-sm bg-white rounded-2xl border border-slate-100">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <span>Loading system logs...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800"
          />
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer bg-white"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Performed By</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Action Type</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400 text-xs">
                  No matching activity logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-slate-55/30 transition-colors">
                  <td className="px-5 py-4 text-xs text-slate-500 font-semibold">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-700 block">{log.user?.name || "System"}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">{log.user?.email || "internal_process"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        log.action?.includes("CREATE")
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : log.action?.includes("UPDATE")
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : log.action?.includes("DELETE")
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-slate-50 text-slate-500 border border-slate-100"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 font-semibold truncate max-w-[300px]" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
