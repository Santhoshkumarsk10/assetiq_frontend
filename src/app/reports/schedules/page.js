"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Play,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  ToggleLeft,
  ToggleRight,
  Plus,
} from "lucide-react";

export default function ScheduledReportsManager() {
  const [schedules, setSchedules] = useState([]);
  const [loadingScheduleId, setLoadingScheduleId] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal for creating schedule directly from here
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [newReportType, setNewReportType] = useState("inventory");
  const [newFreq, setNewFreq] = useState("monthly");
  const [newTime, setNewTime] = useState("09:00");
  const [newEmails, setNewEmails] = useState("");
  const [newFormat, setNewFormat] = useState("pdf");

  const reportTypeLabels = {
    inventory: "Asset Inventory Summary",
    allocations: "Asset In-Out Reports",
    tickets: "Tickets Reports",
    licenses: "License Reports",
    audit: "System AuditTrail",
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load schedules from localStorage
  const loadSchedules = () => {
    const data = JSON.parse(localStorage.getItem("automated_schedules") || "[]");
    setSchedules(data);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  // Toggle Schedule Active Status
  const handleToggleActive = (id) => {
    const updated = schedules.map((s) => {
      if (s.id === id) {
        const nextState = !s.active;
        showToast(
          `Schedule "${s.name}" is now ${nextState ? "Active" : "Paused"}.`,
          nextState ? "success" : "info"
        );
        return { ...s, active: nextState };
      }
      return s;
    });
    localStorage.setItem("automated_schedules", JSON.stringify(updated));
    setSchedules(updated);
  };

  // Delete Schedule
  const handleDeleteSchedule = (id) => {
    const target = schedules.find((s) => s.id === id);
    const updated = schedules.filter((s) => s.id !== id);
    localStorage.setItem("automated_schedules", JSON.stringify(updated));
    setSchedules(updated);
    showToast(`Deleted schedule: "${target?.name}"`);
  };

  // Trigger Schedule Run Now
  const handleRunNow = (id) => {
    setLoadingScheduleId(id);
    setTimeout(() => {
      const updated = schedules.map((s) => {
        if (s.id === id) {
          showToast(`Report successfully generated and emailed to: ${s.recipients}`);
          return { ...s, lastRun: new Date().toLocaleString() };
        }
        return s;
      });
      localStorage.setItem("automated_schedules", JSON.stringify(updated));
      setSchedules(updated);
      setLoadingScheduleId(null);
    }, 1500);
  };

  // Create Direct Schedule
  const handleCreateSchedule = () => {
    if (!newScheduleName.trim()) {
      showToast("Please enter a schedule name.", "error");
      return;
    }
    if (!newEmails.trim()) {
      showToast("Please enter recipient emails.", "error");
      return;
    }

    const newSchedule = {
      id: Date.now().toString(),
      reportId: newReportType,
      reportTitle: reportTypeLabels[newReportType] || "Custom Report",
      name: newScheduleName,
      frequency: newFreq,
      runTime: newTime,
      recipients: newEmails,
      format: newFormat,
      active: true,
      lastRun: "Never",
    };

    const existing = JSON.parse(localStorage.getItem("automated_schedules") || "[]");
    const updated = [newSchedule, ...existing];
    localStorage.setItem("automated_schedules", JSON.stringify(updated));
    setSchedules(updated);

    setShowCreateModal(false);
    showToast("Schedule automated successfully!");

    // Reset fields
    setNewScheduleName("");
    setNewEmails("");
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
                <Calendar size={22} className="text-emerald-600" /> Scheduled Automated Reports
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                View, pause, trigger, and manage recurring report distribution policies.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Create Schedule
          </button>
        </div>

        {/* Schedules Registry Table */}
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Recurring Schedule Policies</h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {schedules.length} Active Schedules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule Name</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Report Type</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Recipients</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Format</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Run</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 font-medium">
                      No automated schedules configured. Click "Create Schedule" or use standard report clocks.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{s.reportTitle}</td>
                      <td className="px-5 py-4 font-semibold text-slate-550 capitalize">
                        {s.frequency} at {s.runTime}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-500 truncate max-w-[180px]" title={s.recipients}>
                        {s.recipients}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {s.format}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-500">{s.lastRun}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleActive(s.id)}
                          className="text-slate-550 hover:text-emerald-600 cursor-pointer transition-colors"
                        >
                          {s.active ? (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold">
                              <ToggleRight size={24} /> Active
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 font-semibold">
                              <ToggleLeft size={24} /> Paused
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRunNow(s.id)}
                            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Execute Schedule Immediately"
                            disabled={loadingScheduleId === s.id}
                          >
                            {loadingScheduleId === s.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Play size={14} fill="currentColor" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(s.id)}
                            className="p-1.5 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TOAST notifications */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 z-[9999] transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-rose-50 text-rose-700 border-rose-100"
              : toast.type === "info"
              ? "bg-blue-50 text-blue-750 border-blue-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle size={18} />
          ) : toast.type === "info" ? (
            <Clock size={18} className="text-blue-600" />
          ) : (
            <CheckCircle size={18} />
          )}
          {toast.message}
        </div>
      )}

      {/* CREATE DIRECT SCHEDULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-600" /> Create Automated Schedule
            </h2>
            <p className="text-slate-455 text-xs mb-6">Setup automated emails for your selected standard reports.</p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Schedule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Asset Audit Mailer"
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-850 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Report Type</label>
                <SearchableSelect
                  options={[
                    { value: "inventory", label: "Asset Inventory Summary" },
                    { value: "allocations", label: "Asset In-Out Reports" },
                    { value: "tickets", label: "Tickets Reports" },
                    { value: "licenses", label: "License Reports" },
                    { value: "audit", label: "System AuditTrail" },
                  ]}
                  value={newReportType}
                  onChange={setNewReportType}
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
                    value={newFreq}
                    onChange={setNewFreq}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Run Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Recipient Emails</label>
                <input
                  type="text"
                  placeholder="e.g. admin@auxcare.com, audit@auxcare.com"
                  value={newEmails}
                  onChange={(e) => setNewEmails(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-emerald-500 transition-all text-slate-805 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">File Format</label>
                <div className="flex gap-5 text-sm font-semibold text-slate-600 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="newFormat"
                      checked={newFormat === "pdf"}
                      onChange={() => setNewFormat("pdf")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    PDF
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="newFormat"
                      checked={newFormat === "excel"}
                      onChange={() => setNewFormat("excel")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    Excel (.xlsx)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="newFormat"
                      checked={newFormat === "csv"}
                      onChange={() => setNewFormat("csv")}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    CSV
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle size={14} /> Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
