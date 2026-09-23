'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AnimatedPageTitle from '@/components/AnimatedPageTitle';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import SearchableSelect from '@/components/SearchableSelect';
import DatePicker from '@/components/DatePicker';
import { licenseApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Search, Plus, Eye, Pencil, Trash2, KeyRound, X, Calendar, User, RefreshCw, CheckCircle, XCircle, Bell, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function LicensePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Dynamic permission checks (driven by JWT permissions from backend)
  const permissions = user?.permissions || [];
  const canList = permissions.includes('license.list');
  const canAdd = permissions.includes('license.add');
  const canEdit = permissions.includes('license.edit');
  const canDelete = permissions.includes('license.delete');
  const canSubmitRenew = permissions.includes('license.renewal.submit');
  const canDecideRenew = permissions.includes('license.renewal.decide');
  const canNotify = permissions.includes('license.notify');

  // Derived helper flags (kept for UI branching)
  const canManage = canAdd || canEdit || canDelete;

  // State Variables
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingLicense, setViewingLicense] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    software_name: '',
    license_key: '',
    valid_from: '',
    valid_until: '',
    assigned_user_id: '',
    status: 'available',
    notes: '',
    license_type: 'validity'
  });
  const [renewalAlert, setRenewalAlert] = useState('');

  // Renewal state
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalLicense, setRenewalLicense] = useState(null);
  const [renewalForm, setRenewalForm] = useState({ proposed_valid_until: '', renewal_notes: '' });
  const [renewalRequests, setRenewalRequests] = useState([]);
  const [showRenewalListModal, setShowRenewalListModal] = useState(false);
  const [renewalDeciding, setRenewalDeciding] = useState(null); // renewal request being decided
  const [decisionForm, setDecisionForm] = useState({ response_notes: '' });
  const [renewalSaving, setRenewalSaving] = useState(false);

  // Fetch licenses
  const loadLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await licenseApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined
      });
      setLicenses(data.licenses || []);
      setUsers(data.users || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load software licenses.', 'error');
    }
    setLoading(false);
  }, [page, limit, search, statusFilter, showToast]);

  // Load data initially and on page/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLicenses();
    }, 0);
    return () => clearTimeout(timer);
  }, [page, search, statusFilter, loadLicenses]);

  // Real-time synchronization via WebSockets (Socket.IO)
  useEffect(() => {
    const handleLicenseChange = () => {
      setTimeout(() => {
        loadLicenses();
      }, 50);
    };

    socket.on('license_change', handleLicenseChange);
    return () => {
      socket.off('license_change', handleLicenseChange);
    };
  }, [loadLicenses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const openAdd = () => {
    setEditingLicense(null);
    setErrors({});
    setForm({
      software_name: '',
      license_key: '',
      valid_from: '',
      valid_until: '',
      assigned_user_id: '',
      status: 'available',
      notes: '',
      license_type: 'validity'
    });
    setRenewalAlert('30 days');
    setShowModal(true);
  };

  const openEdit = (license) => {
    setEditingLicense(license);
    setErrors({});
    setForm({
      id: license.id,
      software_name: license.software_name || '',
      license_key: license.license_key || '',
      valid_from: license.valid_from ? license.valid_from.split('T')[0] : '',
      valid_until: license.valid_until ? license.valid_until.split('T')[0] : '',
      assigned_user_id: license.assigned_user_id || '',
      status: license.status || 'available',
      notes: license.notes || '',
      license_type: license.license_type || 'validity'
    });
    setRenewalAlert(license.renewal_alert ? (license.renewal_alert.toString().includes('day') ? license.renewal_alert : `${license.renewal_alert} days`) : '30 days');
    setShowModal(true);
  };

  const openViewDetails = (license) => {
    setViewingLicense(license);
    setShowDetailsModal(true);
  };

  const validateLicenseForm = () => {
    const errs = {};
    if (!form.software_name || !form.software_name.trim()) {
      errs.software_name = 'Software Title is required.';
    } else if (form.software_name.length > 50) {
      errs.software_name = 'Software Title cannot exceed 50 characters.';
    } else if (/[^a-zA-Z0-9\s.\-+_]/.test(form.software_name)) {
      errs.software_name = 'Software Title contains invalid characters.';
    }

    if (!form.license_key || !form.license_key.trim()) {
      errs.license_key = 'License Key is required.';
    } else if (form.license_key.length > 255) {
      errs.license_key = 'License Key cannot exceed 255 characters.';
    } else if (/[^a-zA-Z0-9\-_.]/.test(form.license_key)) {
      errs.license_key = 'License Key contains invalid characters.';
    }

    if (form.valid_from && form.valid_until) {
      const fromDate = new Date(form.valid_from);
      const untilDate = new Date(form.valid_until);
      if (untilDate < fromDate) {
        errs.valid_until = 'Valid Until date cannot be earlier than Valid From date.';
      }
    }

    if (form.notes && form.notes.length > 500) {
      errs.notes = 'Remarks / Notes cannot exceed 500 characters.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLicenseForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast(Object.values(errs)[0], 'error');
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        ...form,
        renewal_alert: renewalAlert || '30 days'
      };
      if (editingLicense) {
        await licenseApi.edit(payload);
        showToast('License updated successfully!', 'success');
      } else {
        await licenseApi.add(payload);
        showToast('License created successfully!', 'success');
      }
      setShowModal(false);
      await loadLicenses();
    } catch (e) {
      showToast(e.data?.error || 'Failed to save software license.', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!await confirm('Delete Software License', `Are you sure you want to delete the software license for "${name}"?`)) return;
    try {
      await licenseApi.delete(id);
      showToast(`License for "${name}" deleted successfully!`, 'success');
      await loadLicenses();
    } catch (e) {
      showToast(e.data?.error || 'Failed to delete software license.', 'error');
    }
  };

  const handleTriggerTest = async () => {
    try {
      await licenseApi.triggerTest();
      showToast('Test notification triggered successfully! Check your email & device alerts.', 'success');
    } catch (e) {
      showToast(e.data?.error || 'Failed to trigger test notification.', 'error');
    }
  };

  // ── Renewal Handlers ──────────────────────────────────────────────────────
  const openRenewalModal = (license) => {
    setRenewalLicense(license);
    setRenewalForm({ proposed_valid_until: '', renewal_notes: '' });
    setShowRenewalModal(true);
  };

  const handleSubmitRenewal = async (e) => {
    e.preventDefault();
    setRenewalSaving(true);
    try {
      await licenseApi.submitRenewal({
        license_id: renewalLicense.id,
        proposed_valid_until: renewalForm.proposed_valid_until || undefined,
        renewal_notes: renewalForm.renewal_notes || undefined
      });
      showToast('Renewal request submitted! Admins have been notified.', 'success');
      setShowRenewalModal(false);
    } catch (e) {
      showToast(e.data?.error || 'Failed to submit renewal request.', 'error');
    }
    setRenewalSaving(false);
  };

  const loadRenewalRequests = useCallback(async () => {
    try {
      const data = await licenseApi.listRenewals({});
      setRenewalRequests(data.renewalRequests || []);
    } catch (e) {
      showToast('Failed to load renewal requests.', 'error');
    }
  }, [showToast]);

  const openRenewalList = async () => {
    await loadRenewalRequests();
    setShowRenewalListModal(true);
  };

  const handleDecision = async (renewalId, decision) => {
    setRenewalSaving(true);
    try {
      await licenseApi.decideRenewal({
        renewal_request_id: renewalId,
        decision,
        response_notes: decisionForm.response_notes || undefined
      });
      showToast(`Renewal request ${decision}!`, decision === 'approved' ? 'success' : 'error');
      setRenewalDeciding(null);
      await loadRenewalRequests();
      await loadLicenses();
    } catch (e) {
      showToast(e.data?.error || 'Failed to process decision.', 'error');
    }
    setRenewalSaving(false);
  };

  const handleNotifyUser = async (licenseId, licenseName) => {
    try {
      await licenseApi.notifyUser(licenseId);
      showToast(`User has been notified about the renewed license "${licenseName}".`, 'success');
    } catch (e) {
      showToast(e.data?.error || 'Failed to notify user.', 'error');
    }
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 sm:gap-4 mb-4 sm:mb-6 -mt-2 sm:-mt-4">
        <div className="w-full sm:w-auto">
          <AnimatedPageTitle title="License Management" className="!text-xl sm:!text-2xl md:!text-3xl" />
        </div>
        {(canAdd || canDecideRenew) && (
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {canDecideRenew && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium cursor-pointer border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors shrink-0 whitespace-nowrap"
                onClick={openRenewalList}
                title="Renewal Requests"
              >
                <RefreshCw size={15} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Renewal Requests</span>
                <span className="sm:hidden">Renewals</span>
              </button>
            )}
            {canAdd && (
              <>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium cursor-pointer border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shrink-0 whitespace-nowrap"
                  onClick={handleTriggerTest}
                  title="Test Alert"
                >
                  <Bell size={15} className="text-slate-500 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Test Alert</span>
                  <span className="sm:hidden">Test Alert</span>
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0 whitespace-nowrap shadow-xs"
                  onClick={openAdd}
                  title="Add License"
                >
                  <Plus size={16} className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] shrink-0" />
                  <span className="hidden sm:inline">Add License</span>
                  <span className="sm:hidden">Add License</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-xs w-full max-w-full">
        {/* Desktop Filter Row */}
        <div className="hidden md:flex items-center gap-3 mb-4 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative min-w-[280px]">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search by software title or license key..."
                value={searchInput}
                maxLength={100}
                onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden bg-transparent border-none p-0"
              />
              {searchInput && (
                <button type="button" onClick={handleClearSearch} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                  <X size={16} />
                </button>
              )}
            </div>
          </form>

          <SearchableSelect
            options={[
              { value: "", label: "All Status" },
              { value: "available", label: "Available" },
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" }
            ]}
            value={statusFilter}
            onChange={val => { setStatusFilter(val); setPage(1); }}
            className="min-w-[170px]"
          />
        </div>

        {/* Mobile Filter & Search Bar */}
        <div className="block md:hidden mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search licenses..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(searchInput);
                      setPage(1);
                    }
                  }}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Single Filter Button Trigger */}
            <button
              onClick={() => setShowMobileFilterSheet(true)}
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 text-xs font-semibold ${statusFilter
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              aria-label="Filter Licenses"
              title="Filter Licenses"
            >
              <SlidersHorizontal size={15} />
              <span>Filter</span>
              {statusFilter && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Active Filters Badges on Mobile */}
          {statusFilter && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                {statusFilter === 'available' ? 'Available' : statusFilter === 'active' ? 'Active' : 'Expired'}
                <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => { setStatusFilter(''); setPage(1); }} />
              </span>
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPage(1);
                }}
                className="text-[11px] text-slate-400 hover:text-rose-600 underline ml-1 cursor-pointer shrink-0 border-none bg-transparent"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-2.5 sm:mb-3">Showing <strong>{licenses.length}</strong> of {total} licenses</p>

        {/* License Table & Mobile Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
            <KeyRound className="animate-pulse text-emerald-500 mb-2" size={32} />
            Loading licenses...
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-10 sm:py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
            <KeyRound size={44} className="mb-2.5 opacity-40" />
            <p className="text-sm">No software licenses found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">{t('software')}</th>
                    <th className="py-3 px-4">{t('licenseKey')}</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">{t('assignedTo')}</th>
                    <th className="py-3 px-4">{t('validUntil')}</th>
                    <th className="py-3 px-4">{t('status')}</th>
                    <th className="py-3 px-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {licenses.map((license) => (
                    <tr key={license.id} className="text-slate-700 text-sm hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{license.software_name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{license.license_key.substring(0, 12)}...</td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-semibold text-slate-600">{license.license_type || 'validity'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {license.user ? (
                          <div className="flex items-center gap-1.5">
                            <User size={15} className="text-slate-400" />
                            <span>{license.user.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-light italic">{t('unassigned')}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {license.valid_until ? (
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-slate-400" />
                            <span>Expires {license.valid_until}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Perpetual / Ongoing</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={license.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => openViewDetails(license)}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                            title={t('view')}
                          >
                            <Eye size={16} />
                          </button>
                          {/* IT Admin / Admin: Submit renewal request for expired licenses */}
                          {canSubmitRenew && license.status === 'expired' && (
                            <button
                              onClick={() => openRenewalModal(license)}
                              className="p-2 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 border-none bg-transparent cursor-pointer"
                              title="Submit Renewal Request"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                          {/* Location Admin: Notify user if license is active (just renewed) */}
                          {canNotify && license.status === 'active' && license.user && (
                            <button
                              onClick={() => handleNotifyUser(license.id, license.software_name)}
                              className="p-2 text-emerald-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 border-none bg-transparent cursor-pointer"
                              title="Notify Assigned User"
                            >
                              <Bell size={16} />
                            </button>
                          )}
                          {(canEdit || canDelete) && (
                            <>
                              {canEdit && (
                                <button
                                  onClick={() => openEdit(license)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 border-none bg-transparent cursor-pointer"
                                  title={t('edit')}
                                >
                                  <Pencil size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(license.id, license.software_name)}
                                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border-none bg-transparent cursor-pointer"
                                  title={t('delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact Cards View */}
            <div className="block md:hidden space-y-2.5">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3 py-2.5 shadow-2xs flex flex-col transition-all"
                >
                  {/* 1. Top Row: License Key/ID Badge + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-bold font-mono tracking-tight inline-flex items-center">
                      {license.license_key ? (license.license_key.length > 20 ? `${license.license_key.substring(0, 18)}...` : license.license_key) : 'LICENSE'}
                    </span>
                    <StatusBadge status={license.status} className="!text-[10px] !px-2 !py-0.5" />
                  </div>

                  {/* 2. Software Name: Bold Title */}
                  <div className="mt-1.5">
                    <h4 className="text-[13.5px] font-bold text-slate-900 leading-tight tracking-tight truncate" title={license.software_name}>
                      {license.software_name}
                    </h4>
                  </div>

                  {/* 3. Metadata Info: Clean Open 2-Column Grid (No nested boxes) */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                    {/* Row 1: Assigned To & License Type */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                          {t('assignedTo')}
                        </span>
                        <span className="font-semibold text-slate-800 text-[12px] truncate block leading-tight">
                          {license.user?.name || <span className="text-slate-400 italic font-normal">{t('unassigned')}</span>}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                          Type
                        </span>
                        <span className="font-semibold text-slate-800 text-[12px] truncate block leading-tight capitalize">
                          {license.license_type || 'Validity'}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Valid Until & Renewal Alert */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                          {t('validUntil')}
                        </span>
                        <span className="font-semibold text-slate-800 text-[12px] truncate block leading-tight">
                          {license.valid_until || 'Perpetual'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                          Renewal Alert
                        </span>
                        <span className="text-[12px] font-medium text-amber-700 truncate block leading-tight">
                          {license.renewal_alert ? (license.renewal_alert.toString().includes('day') ? license.renewal_alert : `${license.renewal_alert} days`) : '30 days'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Action Icons Row (Icon-Only, Same as Assets Page) */}
                  <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-100/90">
                    <button
                      onClick={() => openViewDetails(license)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                      title={t('view')}
                      aria-label={t('view')}
                    >
                      <Eye size={13.5} />
                    </button>
                    {canSubmitRenew && license.status === 'expired' && (
                      <button
                        onClick={() => openRenewalModal(license)}
                        className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                        title="Request Renewal"
                        aria-label="Request Renewal"
                      >
                        <RefreshCw size={13.5} />
                      </button>
                    )}
                    {canNotify && license.status === 'active' && license.user && (
                      <button
                        onClick={() => handleNotifyUser(license.id, license.software_name)}
                        className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                        title="Notify Assigned User"
                        aria-label="Notify Assigned User"
                      >
                        <Bell size={13.5} />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => openEdit(license)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                        title={t('edit')}
                        aria-label={t('edit')}
                      >
                        <Pencil size={13.5} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(license.id, license.software_name)}
                        className="w-7 h-7 rounded-md bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                        title={t('delete')}
                        aria-label={t('delete')}
                      >
                        <Trash2 size={13.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Desktop Pagination Controls */}
        {totalPages > 1 && (
          <div className="hidden md:flex items-center justify-between mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> licenses
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Mobile Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex md:hidden justify-between items-center mt-3 pt-3 border-t border-slate-200 text-xs">
            <button
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {showMobileFilterSheet && (
        <Modal
          isOpen={showMobileFilterSheet}
          onClose={() => setShowMobileFilterSheet(false)}
          title="Filter Software Licenses"
          footer={
            <>
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => {
                  setStatusFilter('');
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                  setShowMobileFilterSheet(false);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                onClick={() => {
                  setSearch(searchInput);
                  setPage(1);
                  setShowMobileFilterSheet(false);
                }}
              >
                Apply Filters
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Search</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search by title or key..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => setSearchInput(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                  className="w-full text-xs text-slate-800 outline-none bg-transparent"
                />
                {searchInput && (
                  <button type="button" onClick={() => setSearchInput('')} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Status</label>
              <SearchableSelect
                options={[
                  { value: "", label: "All Status" },
                  { value: "available", label: "Available" },
                  { value: "active", label: "Active" },
                  { value: "expired", label: "Expired" }
                ]}
                value={statusFilter}
                onChange={val => setStatusFilter(val)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Software License Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          title={editingLicense ? 'Edit Software License' : 'Add Software License'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Software Title *</label>
              <input
                placeholder="e.g. Adobe Photoshop CC, Microsoft Office 365"
                value={form.software_name}
                maxLength={50}
                onChange={(e) => {
                  setForm({ ...form, software_name: e.target.value.replace(/[^a-zA-Z0-9\s.\-+_]/g, '') });
                  if (errors.software_name) setErrors(prev => ({ ...prev, software_name: '' }));
                }}
                className={`w-full text-sm border rounded-xl px-4 py-2.5 outline-hidden focus:ring-1 text-slate-800 ${errors.software_name ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                required
              />
              {errors.software_name && <p className="text-xs text-rose-500 mt-1">{errors.software_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">License Key / Activation Key *</label>
              <input
                placeholder="e.g. AAAA-BBBB-CCCC-DDDD"
                value={form.license_key}
                maxLength={255}
                onChange={(e) => {
                  setForm({ ...form, license_key: e.target.value.replace(/[^a-zA-Z0-9\-_.]/g, '') });
                  if (errors.license_key) setErrors(prev => ({ ...prev, license_key: '' }));
                }}
                className={`w-full text-sm border rounded-xl px-4 py-2.5 outline-hidden focus:ring-1 text-slate-800 font-mono ${errors.license_key ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                required
              />
              {errors.license_key && <p className="text-xs text-rose-500 mt-1">{errors.license_key}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">License Type</label>
              <div className="flex gap-4 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                <label className="flex-1 flex items-center justify-center gap-2 text-sm text-slate-700 cursor-pointer py-1.5 rounded-lg hover:bg-white transition-all">
                  <input
                    type="radio"
                    name="license_type"
                    value="validity"
                    checked={form.license_type === 'validity'}
                    onChange={() => setForm({ ...form, license_type: 'validity' })}
                    className="accent-emerald-600"
                  />
                  Validity
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 text-sm text-slate-700 cursor-pointer py-1.5 rounded-lg hover:bg-white transition-all">
                  <input
                    type="radio"
                    name="license_type"
                    value="subscription"
                    checked={form.license_type === 'subscription'}
                    onChange={() => setForm({ ...form, license_type: 'subscription' })}
                    className="accent-emerald-600"
                  />
                  Subscription
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valid From</label>
                <DatePicker
                  value={form.valid_from}
                  onChange={(dateStr) => {
                    setForm({ ...form, valid_from: dateStr });
                    if (errors.valid_until) setErrors(prev => ({ ...prev, valid_until: '' }));
                  }}
                  placeholder="Select Start Date"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valid Until</label>
                <DatePicker
                  value={form.valid_until}
                  onChange={(dateStr) => {
                    setForm({ ...form, valid_until: dateStr });
                    if (errors.valid_until) setErrors(prev => ({ ...prev, valid_until: '' }));
                  }}
                  placeholder="Select End Date"
                />
                {errors.valid_until && <p className="text-xs text-rose-500 mt-1">{errors.valid_until}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assign User</label>
              <SearchableSelect
                options={[
                  { value: "", label: "-- Unassigned --" },
                  ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
                ]}
                value={form.assigned_user_id}
                placeholder="-- Unassigned --"
                onChange={val => setForm({ ...form, assigned_user_id: val })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <SearchableSelect
                  options={[
                    { value: "available", label: "Available" },
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" }
                  ]}
                  value={form.status}
                  onChange={val => setForm({ ...form, status: val })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Renewal Alert</label>
                <SearchableSelect
                  options={[
                    { value: "15 days", label: "15 days" },
                    { value: "30 days", label: "30 days" },
                    { value: "45 days", label: "45 days" }
                  ]}
                  value={renewalAlert}
                  placeholder="Select renewal alert..."
                  onChange={val => setRenewalAlert(val)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
              <textarea
                placeholder="Add any additional details or licensing terms..."
                value={form.notes}
                maxLength={500}
                onChange={(e) => {
                  setForm({ ...form, notes: e.target.value });
                  if (errors.notes) setErrors(prev => ({ ...prev, notes: '' }));
                }}
                rows={3}
                className={`w-full text-sm border rounded-xl px-4 py-2.5 outline-hidden focus:ring-1 text-slate-800 ${errors.notes ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
              />
              {errors.notes && <p className="text-xs text-rose-500 mt-1">{errors.notes}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 border-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save License'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Details Modal */}
      {showDetailsModal && viewingLicense && (
        <Modal
          isOpen={showDetailsModal}
          title="Software License Details"
          onClose={() => setShowDetailsModal(false)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingLicense.software_name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">Software entitlement mapping</p>
              </div>
              <StatusBadge status={viewingLicense.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">License key</span>
                <span className="block mt-1 font-mono text-sm text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 select-all">{viewingLicense.license_key}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">License Type</span>
                <span className="block mt-2 text-sm font-semibold text-slate-800 capitalize">{viewingLicense.license_type || 'Validity'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration / Validity</span>
                <span className="block mt-2 text-sm text-slate-800">
                  {viewingLicense.valid_from ? `${viewingLicense.valid_from} to ` : ''}
                  {viewingLicense.valid_until ? viewingLicense.valid_until : 'Perpetual (No Expiration)'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Renewal Alert</span>
                <span className="block mt-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg w-fit">
                  🔔 {viewingLicense.renewal_alert || '30 days'} before expiry
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned User</span>
              <span className="block mt-2 text-sm text-slate-800">
                {viewingLicense.user ? `${viewingLicense.user.name} (${viewingLicense.user.email})` : <span className="text-slate-400 italic">None</span>}
              </span>
            </div>

            {viewingLicense.notes && (
              <div className="pt-2">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes / Licensing Terms</span>
                <p className="mt-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">{viewingLicense.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* ── Submit Renewal Request Modal (IT Admin) ─────────────────────────── */}
      {showRenewalModal && renewalLicense && (
        <Modal isOpen={showRenewalModal} title={`Request Renewal: ${renewalLicense.software_name}`} onClose={() => setShowRenewalModal(false)}>
          <form onSubmit={handleSubmitRenewal} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-700">
              ⚠️ This license expired on <strong>{renewalLicense.valid_until}</strong>. Submit a renewal request for Admin approval.
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Proposed New Valid Until</label>
              <DatePicker
                value={renewalForm.proposed_valid_until}
                onChange={dateStr => setRenewalForm({ ...renewalForm, proposed_valid_until: dateStr })}
                placeholder="Select Proposed End Date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Renewal Notes</label>
              <textarea
                placeholder="Reason for renewal, vendor details, cost info..."
                value={renewalForm.renewal_notes}
                onChange={e => setRenewalForm({ ...renewalForm, renewal_notes: e.target.value })}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowRenewalModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={renewalSaving} className="px-5 py-2.5 border-none bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer">
                {renewalSaving ? 'Submitting...' : 'Submit Renewal Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Renewal Requests List + Decision Modal (Admin) ───────────────────── */}
      {showRenewalListModal && (
        <Modal isOpen={showRenewalListModal} title="License Renewal Requests" onClose={() => { setShowRenewalListModal(false); setRenewalDeciding(null); }}>
          <div className="space-y-3 max-h-[520px] overflow-y-auto">
            {renewalRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No renewal requests found.</p>
              </div>
            ) : renewalRequests.map((rr) => (
              <div key={rr.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{rr.license?.software_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Requested by {rr.requester?.name} • {new Date(rr.createdAt || rr.created_at).toLocaleDateString()}</p>
                    {rr.proposed_valid_until && <p className="text-xs text-slate-600 mt-1">Proposed validity: <strong>{rr.proposed_valid_until}</strong></p>}
                    {rr.renewal_notes && <p className="text-xs text-slate-500 italic mt-1">&ldquo;{rr.renewal_notes}&rdquo;</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${rr.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      rr.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                    }`}>{rr.status.toUpperCase()}</span>
                </div>

                {/* Decision panel for Admin */}
                {canDecideRenew && rr.status === 'pending' && (
                  renewalDeciding?.id === rr.id ? (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <textarea
                        placeholder="Response notes (optional)..."
                        value={decisionForm.response_notes}
                        onChange={e => setDecisionForm({ response_notes: e.target.value })}
                        rows={2}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none text-slate-800"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleDecision(rr.id, 'approved')} disabled={renewalSaving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold border-none cursor-pointer">
                          <CheckCircle size={14} /> {renewalSaving ? 'Processing...' : 'Approve'}
                        </button>
                        <button onClick={() => handleDecision(rr.id, 'rejected')} disabled={renewalSaving} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold border-none cursor-pointer">
                          <XCircle size={14} /> Reject
                        </button>
                        <button onClick={() => setRenewalDeciding(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 cursor-pointer bg-transparent">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => { setRenewalDeciding(rr); setDecisionForm({ response_notes: '' }); }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer border-none bg-transparent"
                      >
                        Review &amp; Decide →
                      </button>
                    </div>
                  )
                )}

                {rr.status !== 'pending' && rr.response_notes && (
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">Response: <em>{rr.response_notes}</em></p>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button onClick={() => setShowRenewalListModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Close</button>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
