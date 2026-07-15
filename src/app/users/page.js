"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import SearchableSelect from "@/components/SearchableSelect";
import { userApi } from "@/lib/api";
import {
  Search,
  Plus,
  Mail,
  Phone,
  MoreVertical,
  Users as UsersIcon,
  Check,
  AlertCircle,
  ShieldAlert,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function UsersPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role_name === 'Super Admin';
  const permissions = currentUser?.permissions || [];
  const canAdd = permissions.includes("user.add");
  const canEdit = permissions.includes("user.edit");
  const canDelete = permissions.includes("user.delete");
  const canResign = permissions.includes("user.resign");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [managers, setManagers] = useState([]);

  const loadManagers = useCallback(async () => {
    try {
      const data = await userApi.managers();
      setManagers(data.managers || []);
    } catch (e) {
      console.error("Failed to load managers:", e);
    }
  }, []);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");

  // Offboarding states
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'offboarding'
  const [offboardQueue, setOffboardQueue] = useState([]);
  const [loadingOffboard, setLoadingOffboard] = useState(false);

  const loadOffboardQueue = useCallback(async () => {
    setLoadingOffboard(true);
    try {
      const data = await userApi.offboardList();
      setOffboardQueue(data.queue || []);
    } catch (e) {
      showToast(e.data?.error || "Failed to load offboarding queue", "error");
    }
    setLoadingOffboard(false);
  }, [showToast]);

  const handleVerifyReturn = async (allocationId) => {
    try {
      await userApi.verifyReturn(allocationId);
      showToast("Asset return verification recorded successfully.", "success");
      await loadOffboardQueue();
      await loadUsers();
    } catch (e) {
      showToast(e.data?.error || "Failed to verify asset return", "error");
    }
  };

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadUsers = useCallback(async () => {
    try {
      const data = await userApi.list({
        page,
        limit,
        search,
        location_id: locationFilter || undefined,
      });
      setUsers(data.users || []);
      setRoles(data.roles || []);
      setLocations(data.locations || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
      await loadManagers();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, limit, search, locationFilter, loadManagers]);

  // Fetch suggestions based on searchInput
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await userApi.list({
          page: 1,
          limit: 10,
          search: searchInput,
          location_id: locationFilter || undefined,
        });
        const results = [];
        const seen = new Set();
        (data.users || []).forEach((u) => {
          if (
            u.name &&
            u.name.toLowerCase().includes(searchInput.toLowerCase()) &&
            !seen.has(`name:${u.name}`)
          ) {
            seen.add(`name:${u.name}`);
            results.push({ type: "name", value: u.name, label: u.name });
          }
          if (
            u.email &&
            u.email.toLowerCase().includes(searchInput.toLowerCase()) &&
            !seen.has(`email:${u.email}`)
          ) {
            seen.add(`email:${u.email}`);
            results.push({ type: "email", value: u.email, label: u.email });
          }
          if (
            u.department &&
            u.department.toLowerCase().includes(searchInput.toLowerCase()) &&
            !seen.has(`dept:${u.department}`)
          ) {
            seen.add(`dept:${u.department}`);
            results.push({
              type: "department",
              value: u.department,
              label: u.department,
            });
          }
        });
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchInput, locationFilter]);

  const handleSearchInputChange = (val) => {
    setSearchInput(val);
    if (val === "") {
      setSearch("");
      setPage(1);
    }
  };

  // Load when page, limit, search, or locationFilter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "offboarding") {
        loadOffboardQueue();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, loadOffboardQueue]);

  const filtered = users;

  const activeCount = users.filter((u) => u.status === "active").length;
  const adminCount = users.filter(
    (u) => u.role?.name === "Super Admin" || u.role?.name === "General Admin",
  ).length;

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      role_id: "",
      location_id: "",
      department: "",
      designation: "",
      employee_id: "",
      reporting_manager_id: "",
    });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    let displayPhone = user.phone || "";
    if (user.location_id) {
      const loc = locations.find(
        (l) => String(l.id) === String(user.location_id),
      );
      if (
        loc &&
        loc.country_code &&
        displayPhone.startsWith(loc.country_code)
      ) {
        displayPhone = displayPhone.substring(loc.country_code.length).trim();
      }
    }
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: displayPhone,
      role_id: user.role_id,
      location_id: user.location_id || "",
      department: user.department || "",
      designation: user.designation || "",
      employee_id: user.employee_id || "",
      reporting_manager_id: user.reporting_manager_id || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    // 1. Phone number validation & prepending country code
    let phoneWithCountryCode = form.phone;
    if (form.phone) {
      const selectedLoc = locations.find(
        (l) => String(l.id) === String(form.location_id),
      );
      const cCode = selectedLoc?.country_code || "";

      const phoneDigits = form.phone.replace(/\D/g, "");
      if (cCode === "+91") {
        if (phoneDigits.length !== 10) {
          showToast("Phone number must be exactly 10 digits.", "error");
          return;
        }
        if (parseInt(phoneDigits[0]) < 6) {
          showToast(
            "Phone number must start with a digit greater than or equal to 6 (6, 7, 8, or 9).",
            "error",
          );
          return;
        }
      } else {
        if (phoneDigits.length < 7 || phoneDigits.length > 12) {
          showToast("Phone number must be between 7 and 12 digits.", "error");
          return;
        }
      }

      if (cCode) {
        phoneWithCountryCode = `${cCode} ${phoneDigits}`;
      }
    }

    // 2. Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("Please enter a valid email.", "error");
      return;
    }

    // 3. Special characters validation for other fields
    const textFields = {
      "Employee ID": form.employee_id,
      "Full Name": form.name,
      Department: form.department,
      Designation: form.designation,
    };
    for (const [fieldName, val] of Object.entries(textFields)) {
      if (val && /[^a-zA-Z0-9\s]/.test(val)) {
        showToast(`${fieldName} cannot contain special characters.`, "error");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form, phone: phoneWithCountryCode || null };
      if (editingUser) {
        await userApi.edit(payload);
        showToast("User updated successfully!", "success");
      } else {
        await userApi.add(payload);
        showToast("User added successfully!", "success");
      }
      setShowModal(false);
      await loadUsers();
    } catch (e) {
      showToast(e.data?.error || "Failed to save", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (
      !(await confirm(
        "Delete User",
        `Are you sure you want to delete user "${name}"?`,
      ))
    )
      return;
    try {
      await userApi.delete(id);
      showToast(`User "${name}" deleted successfully!`, "success");
      await loadUsers();
    } catch (e) {
      showToast(e.data?.error || "Failed to delete", "error");
    }
  };

  const handleResign = async (id, name) => {
    if (
      !(await confirm(
        "Resign User",
        `Are you sure you want to mark user "${name}" as Resigned? This will place them in the offboarding queue for dual-admin asset return verification.`,
        { type: "warning", confirmText: "Resign" },
      ))
    )
      return;
    try {
      await userApi.resign(id);
      showToast(
        `User "${name}" has been marked as resigned. Assets are now pending dual-admin return verification.`,
        "success",
      );
      await loadUsers();
    } catch (e) {
      showToast(e.data?.error || "Failed to process resignation", "error");
    }
  };

  const handleToggleMfa = async (userId, name, action) => {
    let actionLabel = action === 'enable' ? 'enable' : action === 'disable' ? 'disable' : 'reset';
    if (
      !(await confirm(
        `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} MFA`,
        `Are you sure you want to ${actionLabel} MFA for user "${name}"?`,
        { type: action === 'disable' ? 'danger' : 'warning', confirmText: actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1) }
      ))
    )
      return;
    try {
      await userApi.toggleMfa({ userId, action });
      showToast(`MFA successfully ${action}d for ${name}!`, "success");
      await loadUsers();
    } catch (e) {
      showToast(e.data?.error || "Failed to update MFA settings", "error");
    }
  };

  const getInitials = (name) =>
    name
      ? name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "??";
  const getRoleBadgeClass = (role) => {
    if (!role) return "bg-slate-100 text-slate-600";
    const n = role.toLowerCase();
    if (n.includes("admin")) return "bg-amber-100 text-amber-800";
    if (n.includes("manager") || n.includes("it"))
      return "bg-blue-100 text-blue-805";
    return "bg-slate-100 text-slate-600";
  };

  const selectedLocation = locations.find(
    (l) => String(l.id) === String(form.location_id),
  );
  const countryCode = selectedLocation?.country_code || "";

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage system users and access
          </p>
        </div>
        {canAdd && (
          <button
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            onClick={openAdd}
          >
            <Plus size={18} /> Add User
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Total Users
          </span>
          <div className="text-3xl font-extrabold mt-2 tracking-tight text-slate-900">
            {users.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Active Users
          </span>
          <div className="text-3xl font-extrabold mt-2 tracking-tight text-emerald-600">
            {activeCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Admins
          </span>
          <div className="text-3xl font-extrabold mt-2 tracking-tight text-emerald-600">
            {adminCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Locations
          </span>
          <div className="text-3xl font-extrabold mt-2 tracking-tight text-emerald-600">
            {locations.length}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
              activeTab === "users"
                ? "border-emerald-600 text-emerald-600 border-solid"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("users")}
          >
            All Users
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
              activeTab === "offboarding"
                ? "border-emerald-600 text-emerald-600 border-solid"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("offboarding")}
          >
            Offboarding Queue
          </button>
        </div>

        {activeTab === "users" ? (
          <>
            <div className="flex gap-4 items-center mb-5">
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                  <Search size={18} className="text-slate-400 shrink-0" />
                  <input
                    placeholder="Search users by name, email, or department..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearch(searchInput);
                        setPage(1);
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                    className="border-none bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-400"
                  />
                  {searchInput && (
                    <button
                      onClick={() => {
                        handleSearchInputChange("");
                      }}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchInput(item.value);
                          setSearch(item.value);
                          setPage(1);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                      >
                        <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase">
                          {item.type}
                        </span>
                        <span className="text-sm text-slate-700 font-medium">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {currentUser?.role?.name !== "Location Admin" && (
                <SearchableSelect
                  options={[
                    { value: "", label: "All Locations" },
                    ...locations.map((l) => ({ value: l.id, label: l.name }))
                  ]}
                  value={locationFilter}
                  onChange={(val) => {
                    setLocationFilter(val);
                    setPage(1);
                  }}
                  className="w-[180px]"
                />
              )}
              <SearchableSelect
                options={[
                  { value: 5, label: "5 per page" },
                  { value: 10, label: "10 per page" },
                  { value: 20, label: "20 per page" },
                  { value: 50, label: "50 per page" }
                ]}
                value={limit}
                onChange={val => setLimit(val)}
                className="w-[150px]"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
                <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />{" "}
                Loading users...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
                <UsersIcon size={48} className="mb-3 opacity-40" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              filtered.map((u) => (
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 border-b border-slate-100 transition-all duration-150 hover:bg-slate-50"
                  key={u.id}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-semibold shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">
                          {u.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeClass(u.role?.name)}`}
                        >
                          {u.role?.name || "User"}
                        </span>
                        {u.mfa_enabled ? (
                          u.mfa_configured ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              MFA Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              MFA Pending
                            </span>
                          )
                        ) : null}
                        <StatusBadge status={u.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail size={14} className="shrink-0" /> {u.email}
                        </span>
                        {u.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} className="shrink-0" /> {u.phone}
                          </span>
                        )}
                        {u.reportingManager && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                            Manager: {u.reportingManager.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center sm:flex-col sm:items-end gap-2 border-t border-slate-100 pt-3 sm:border-none sm:pt-0">
                    <div className="text-sm font-medium text-slate-700">
                      {u.department || "—"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {u.location?.name || "—"}
                    </div>
                  </div>
                  <div className="relative flex gap-1.5 items-center justify-end border-t border-slate-100 pt-3 sm:border-none sm:pt-0">
                    {/* Super Admin MFA Actions */}
                    {isSuperAdmin && (
                      <div className="flex gap-1 mr-2">
                        {u.mfa_enabled ? (
                          <>
                            <button
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              onClick={() => handleToggleMfa(u.id, u.name, 'disable')}
                              title="Disable MFA"
                            >
                              Disable MFA
                            </button>
                            {u.mfa_configured && (
                              <button
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                onClick={() => handleToggleMfa(u.id, u.name, 'reset')}
                                title="Reset MFA"
                              >
                                Reset
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            onClick={() => handleToggleMfa(u.id, u.name, 'enable')}
                            title="Enable MFA"
                          >
                            Enable MFA
                          </button>
                        )}
                      </div>
                    )}
                    {u.status === "active" && canResign && (
                      <button
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                        onClick={() => handleResign(u.id, u.name)}
                        title="Resign User"
                      >
                        Resign
                      </button>
                    )}
                    {canEdit && (
                      <button
                        className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        onClick={() => openEdit(u)}
                        title="Edit"
                      >
                        <MoreVertical size={18} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors text-lg font-bold"
                        onClick={() => handleDelete(u.id, u.name)}
                        title="Delete"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-500">
                  Showing {Math.min((page - 1) * limit + 1, total)} to{" "}
                  {Math.min(page * limit, total)} of {total} entries
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        className={
                          page === p
                            ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer"
                            : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        }
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <p className="text-xs text-slate-500 mb-6">
              Below is the offboarding queue of employees in{" "}
              <strong>resigned</strong> state. Both the{" "}
              <strong>Location Admin</strong> and <strong>General Admin</strong>{" "}
              must verify the return of each allocated asset before final
              offboarding completion.
            </p>
            {loadingOffboard ? (
              <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
                <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />{" "}
                Loading offboarding queue...
              </div>
            ) : offboardQueue.length === 0 ? (
              <div className="text-center py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
                <ShieldAlert size={48} className="mb-3 opacity-40" />
                <p className="text-sm font-semibold">
                  No pending exit clearances
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  All resigned users have completed their asset returns.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {offboardQueue.map((item) => {
                  const hasPendingAssets =
                    item.allocations && item.allocations.length > 0;
                  return (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 shadow-2xs"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-base">
                              {item.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                              Resigned
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Emp ID:{" "}
                            <span className="font-semibold">
                              {item.employee_id || "—"}
                            </span>{" "}
                            | Dept:{" "}
                            <span className="font-semibold">
                              {item.department || "—"}
                            </span>{" "}
                            | Location:{" "}
                            <span className="font-semibold">
                              {item.location?.name || "Global"}
                            </span>
                          </div>
                        </div>
                        {!hasPendingAssets && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                            ✓ Ready for Clearance
                          </span>
                        )}
                      </div>

                      {hasPendingAssets ? (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                  <th className="p-3">{t('asset')}</th>
                                  <th className="p-3">{t('category')} / Brand</th>
                                  <th className="p-3">Location Admin</th>
                                  <th className="p-3">General Admin</th>
                                  <th className="p-3 text-right">{t('actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.allocations.map((alloc) => {
                                  const isLocAdmin =
                                    currentUser?.role_name === "Location Admin";
                                  const isGenAdmin =
                                    currentUser?.role_name === "Admin" ||
                                    currentUser?.role_name === "Super Admin" ||
                                    currentUser?.role_name === "General Admin";

                                  // Disable action button logic
                                  const alreadyVerified = isLocAdmin
                                    ? alloc.verified_by_location_admin
                                    : alloc.verified_by_general_admin;
                                  const canVerify =
                                    (isLocAdmin &&
                                      !alloc.verified_by_location_admin) ||
                                    (isGenAdmin &&
                                      !alloc.verified_by_general_admin);

                                  return (
                                    <tr
                                      key={alloc.id}
                                      className="border-b border-slate-100 last:border-none text-sm text-slate-700"
                                    >
                                      <td className="p-3">
                                        <div className="font-semibold text-slate-800">
                                          {alloc.asset?.name || "—"}
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                                          {alloc.asset?.asset_tag || "—"}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div>{t(alloc.asset?.type) || "—"}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                          {alloc.asset?.brand || "—"}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        {alloc.verified_by_location_admin ? (
                                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                            <Check
                                              size={14}
                                              className="stroke-[3px]"
                                            />{" "}
                                            Verified
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                                            <AlertCircle size={14} /> Pending
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        {alloc.verified_by_general_admin ? (
                                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                            <Check
                                              size={14}
                                              className="stroke-[3px]"
                                            />{" "}
                                            Verified
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                                            <AlertCircle size={14} /> Pending
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleVerifyReturn(alloc.id)
                                          }
                                          disabled={!canVerify}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                            alreadyVerified
                                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                              : canVerify
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                          }`}
                                        >
                                          {alreadyVerified
                                            ? "Verified by You"
                                            : "Verify Return"}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Cards View */}
                          <div className="block md:hidden space-y-4">
                            {item.allocations.map((alloc) => {
                              const isLocAdmin =
                                currentUser?.role_name === "Location Admin";
                              const isGenAdmin =
                                currentUser?.role_name === "Admin" ||
                                currentUser?.role_name === "Super Admin" ||
                                currentUser?.role_name === "General Admin";

                              // Disable action button logic
                              const alreadyVerified = isLocAdmin
                                ? alloc.verified_by_location_admin
                                : alloc.verified_by_general_admin;
                              const canVerify =
                                (isLocAdmin &&
                                  !alloc.verified_by_location_admin) ||
                                (isGenAdmin &&
                                  !alloc.verified_by_general_admin);

                              return (
                                <div key={alloc.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-800">{alloc.asset?.name || "—"}</h4>
                                      <span className="text-xs text-slate-450 font-mono mt-0.5 block">{alloc.asset?.asset_tag || "—"}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-b border-slate-100 py-2">
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('category')}</span>
                                      <span className="font-semibold text-slate-700">{t(alloc.asset?.type) || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Brand</span>
                                      <span className="font-semibold text-slate-700">{alloc.asset?.brand || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Location Admin</span>
                                      {alloc.verified_by_location_admin ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                          Verified
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-450">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase">General Admin</span>
                                      {alloc.verified_by_general_admin ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                          Verified
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-450">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleVerifyReturn(alloc.id)
                                      }
                                      disabled={!canVerify}
                                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                        alreadyVerified
                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                          : canVerify
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                            : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                      }`}
                                    >
                                      {alreadyVerified
                                        ? "Verified by You"
                                        : "Verify Return"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          All assigned assets have been returned and verified.
                          The user account has been successfully deactivated.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? "Edit User" : "Add User"}
        footer={
          <>
            <button
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Employee ID
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
              value={form.employee_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  employee_id: e.target.value.replace(/[^a-zA-Z0-9]/g, ""),
                })
              }
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Full Name *
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
              value={form.name || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""),
                })
              }
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Email *
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Phone
            </label>
            <div className="flex gap-2">
              {countryCode && (
                <span className="inline-flex items-center px-3.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm font-semibold select-none">
                  {countryCode}
                </span>
              )}
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder={
                  countryCode === "+91" ? "e.g. 9876543210" : "e.g. 567361461"
                }
                value={form.phone || ""}
                onChange={(e) => {
                  let cleaned = e.target.value.replace(/\D/g, "");
                  if (countryCode === "+91") {
                    cleaned = cleaned.slice(0, 10);
                    if (cleaned.length > 0 && parseInt(cleaned[0]) < 6) return;
                  } else {
                    cleaned = cleaned.slice(0, 12);
                  }
                  setForm({ ...form, phone: cleaned });
                }}
              />
            </div>
          </div>
        </div>
        {!editingUser && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Password *
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
              type="password"
              value={form.password || ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Role *
            </label>
            <SearchableSelect
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              value={form.role_id || ""}
              placeholder="Select Role"
              onChange={val => setForm({ ...form, role_id: val })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Location
            </label>
            <SearchableSelect
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={form.location_id || ""}
              placeholder="Select Location"
              onChange={val => setForm({ ...form, location_id: val })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Department
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
              value={form.department || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  department: e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""),
                })
              }
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Designation
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
              value={form.designation || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  designation: e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""),
                })
              }
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Report Manager
          </label>
          <SearchableSelect
            options={managers
              .filter((m) => String(m.id) !== String(editingUser?.id))
              .map((m) => ({
                value: m.id,
                label: `${m.name} (${m.designation || "No Designation"}) - ${m.email}`
              }))}
            value={form.reporting_manager_id || ""}
            placeholder="Select Report Manager"
            onChange={val => setForm({ ...form, reporting_manager_id: val })}
          />
        </div>
      </Modal>
    </AppLayout>
  );
}
