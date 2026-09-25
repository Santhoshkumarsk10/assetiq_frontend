"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import SearchableSelect from "@/components/SearchableSelect";
import { reportApi } from "@/lib/api";
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
  const [newRunDay, setNewRunDay] = useState("monday");
  const [newRunDate, setNewRunDate] = useState("1");
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

  // Load schedules from backend API
  const loadSchedules = async () => {
    try {
      const res = await reportApi.listSchedules();
      if (res && res.schedules) {
        const normalized = res.schedules.map(s => ({
          id: s.id,
          reportId: s.report_id,
          reportTitle: s.report_title,
          name: s.name,
          frequency: s.frequency,
          runTime: s.run_time,
          recipients: s.recipients,
          format: s.format,
          active: s.active,
          lastRun: s.last_run,
          runDay: s.run_day,
          runDate: s.run_date
        }));
        setSchedules(normalized);
      }
    } catch (err) {
      console.error("Failed to load schedules: ", err);
      showToast(err.message || "Failed to load automated schedules.", "error");
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  // Toggle Schedule Active Status
  const handleToggleActive = async (id) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;
    const nextState = !target.active;

    try {
      await reportApi.updateSchedule(id, { active: nextState });
      showToast(
        `Schedule "${target.name}" is now ${nextState ? "Active" : "Paused"}.`,
        nextState ? "success" : "info"
      );
      setSchedules(schedules.map(s => s.id === id ? { ...s, active: nextState } : s));
    } catch (err) {
      console.error("Failed to toggle status: ", err);
      showToast("Failed to toggle schedule status.", "error");
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;

    try {
      await reportApi.deleteSchedule(id);
      showToast(`Deleted schedule: "${target.name}"`);
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete schedule: ", err);
      showToast("Failed to delete schedule.", "error");
    }
  };

  // Trigger Schedule Run Now
  const handleRunNow = async (id) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;

    setLoadingScheduleId(id);
    try {
      const res = await reportApi.runSchedule(id);
      showToast(`Report successfully generated and emailed to: ${target.recipients}`);
      setSchedules(schedules.map(s => s.id === id ? { ...s, lastRun: res.last_run || new Date().toLocaleString() } : s));
    } catch (err) {
      console.error("Failed to run schedule: ", err);
      showToast(err.message || "Failed to run schedule.", "error");
    } finally {
      setLoadingScheduleId(null);
    }
  };

  // Create Direct Schedule
  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) {
      showToast("Please enter a schedule name.", "error");
      return;
    }
    if (!newEmails.trim()) {
      showToast("Please enter recipient emails.", "error");
      return;
    }
    if (newFreq === "weekly" && !newRunDay) {
      showToast("Please select a day of the week.", "error");
      return;
    }
    if (newFreq === "monthly" && !newRunDate) {
      showToast("Please select a day of the month.", "error");
      return;
    }

    try {
      const payload = {
        reportId: newReportType,
        reportTitle: reportTypeLabels[newReportType] || "Custom Report",
        name: newScheduleName,
        frequency: newFreq,
        runTime: newTime,
        recipients: newEmails,
        format: newFormat,
        runDay: newFreq === "weekly" ? newRunDay : null,
        runDate: newFreq === "monthly" ? parseInt(newRunDate, 10) : null
      };

      const res = await reportApi.createSchedule(payload);
      if (res && res.schedule) {
        const fresh = {
          id: res.schedule.id,
          reportId: res.schedule.report_id,
          reportTitle: res.schedule.report_title,
          name: res.schedule.name,
          frequency: res.schedule.frequency,
          runTime: res.schedule.run_time,
          recipients: res.schedule.recipients,
          format: res.schedule.format,
          active: res.schedule.active,
          lastRun: res.schedule.last_run || "Never",
          runDay: res.schedule.run_day,
          runDate: res.schedule.run_date
        };
        setSchedules([fresh, ...schedules]);
        setShowCreateModal(false);
        showToast("Schedule automated successfully!");
        setNewScheduleName("");
        setNewEmails("");
      }
    } catch (err) {
      console.error("Failed to create schedule: ", err);
      showToast(err.message || "Failed to create schedule.", "error");
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

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
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
                      No automated schedules configured. Click &quot;Create Schedule&quot; or use standard report clocks.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{s.reportTitle}</td>
                      <td className="px-5 py-4 font-semibold text-slate-550 capitalize">
                        {s.frequency === 'weekly' && s.runDay ? `Weekly on ${s.runDay} at ${s.runTime}` :
                         s.frequency === 'monthly' && s.runDate ? `Monthly on Day ${s.runDate} at ${s.runTime}` :
                         `${s.frequency} at ${s.runTime}`}
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

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-2.5 p-3 sm:p-4">
            {schedules.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-xs">
                No automated schedules configured. Click &quot;Create Schedule&quot; or use standard report clocks.
              </div>
            ) : (
              schedules.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3.5 py-3 shadow-2xs flex flex-col transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13.5px] font-bold text-slate-900 leading-snug tracking-tight truncate">{s.name}</h4>
                      <span className="text-xs font-semibold text-slate-500 mt-0.5 block truncate">
                        {s.reportTitle}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleActive(s.id)}
                      className="cursor-pointer transition-colors shrink-0"
                    >
                      {s.active ? (
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <ToggleRight size={18} /> Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 font-semibold text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          <ToggleLeft size={18} /> Paused
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100/90 grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Frequency</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight capitalize">
                        {s.frequency === 'weekly' && s.runDay ? `Weekly (${s.runDay})` :
                         s.frequency === 'monthly' && s.runDate ? `Monthly (Day ${s.runDate})` :
                         s.frequency}
                      </span>
                    </div>
                    <div className="min-w-0 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Format</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight uppercase">{s.format}</span>
                    </div>
                    <div className="min-w-0 col-span-2 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Recipients</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight">{s.recipients}</span>
                    </div>
                    <div className="min-w-0 col-span-2 bg-slate-50/70 border border-slate-100/90 rounded-lg px-2 py-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Last Run</span>
                      <span className="font-semibold text-slate-800 text-[11.5px] truncate block leading-tight">{s.lastRun}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex justify-end gap-2">
                    <button
                      onClick={() => handleRunNow(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-emerald-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Execute Schedule Immediately"
                      disabled={loadingScheduleId === s.id}
                    >
                      {loadingScheduleId === s.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play size={13} fill="currentColor" />
                      )}
                      <span>Run Now</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Delete Schedule"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
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

              {newFreq === "weekly" && (
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
                    value={newRunDay}
                    onChange={setNewRunDay}
                  />
                </div>
              )}

              {newFreq === "monthly" && (
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
                    value={newRunDate}
                    onChange={setNewRunDate}
                  />
                </div>
              )}

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
