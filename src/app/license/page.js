'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import SearchableSelect from '@/components/SearchableSelect';
import { licenseApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Search, Plus, Eye, Pencil, Trash2, KeyRound, X, Calendar, User } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

export default function LicensePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Roles & Permissions check
  const isItOrGlobalAdmin = ['Super Admin', 'Admin', 'IT Admin'].includes(user?.role_name || user?.role);
  const canManage = isItOrGlobalAdmin;

  // State Variables
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingLicense, setViewingLicense] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    software_name: '',
    license_key: '',
    valid_from: '',
    valid_until: '',
    assigned_user_id: '',
    status: 'available',
    notes: ''
  });

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
    setForm({
      software_name: '',
      license_key: '',
      valid_from: '',
      valid_until: '',
      assigned_user_id: '',
      status: 'available',
      notes: ''
    });
    setShowModal(true);
  };

  const openEdit = (license) => {
    setEditingLicense(license);
    setForm({
      id: license.id,
      software_name: license.software_name || '',
      license_key: license.license_key || '',
      valid_from: license.valid_from || '',
      valid_until: license.valid_until || '',
      assigned_user_id: license.assigned_user_id || '',
      status: license.status || 'available',
      notes: license.notes || ''
    });
    setShowModal(true);
  };

  const openViewDetails = (license) => {
    setViewingLicense(license);
    setShowDetailsModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.software_name.trim()) {
      showToast('Software Name is required.', 'error');
      return;
    }
    if (!form.license_key.trim()) {
      showToast('License Key is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingLicense) {
        await licenseApi.edit(form);
        showToast('License updated successfully!', 'success');
      } else {
        await licenseApi.add(form);
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

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">License Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, allocate, and track software licenses & subscriptions</p>
        </div>
        {canManage && (
          <button
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            onClick={openAdd}
          >
            <Plus size={18} /> Add License
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative min-w-[280px]">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search by software title or license key..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
              { value: "", label: "All Statuses" },
              { value: "available", label: "Available" },
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" }
            ]}
            value={statusFilter}
            onChange={val => { setStatusFilter(val); setPage(1); }}
            className="min-w-[170px]"
          />
        </div>

        {/* License Table */}
        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
              <KeyRound className="animate-pulse text-emerald-500 mb-2" size={32} />
              Loading licenses...
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No software licenses found matching your filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Software Title</th>
                  <th className="py-3 px-4">License Key</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.map((license) => (
                  <tr key={license.id} className="text-slate-700 text-sm hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{license.software_name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{license.license_key.substring(0, 12)}...</td>
                    <td className="py-3.5 px-4">
                      {license.user ? (
                        <div className="flex items-center gap-1.5">
                          <User size={15} className="text-slate-400" />
                          <span>{license.user.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-light italic">Unassigned</span>
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
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openViewDetails(license)}
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(license)}
                              className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 border-none bg-transparent cursor-pointer"
                              title="Edit License"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(license.id, license.software_name)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border-none bg-transparent cursor-pointer"
                              title="Delete License"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500">
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
      </div>

      {/* Add / Edit Modal */}
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
                onChange={(e) => setForm({ ...form, software_name: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">License Key / Activation Key *</label>
              <input
                placeholder="e.g. AAAA-BBBB-CCCC-DDDD"
                value={form.license_key}
                onChange={(e) => setForm({ ...form, license_key: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valid From</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valid Until</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
              <textarea
                placeholder="Add any additional details or licensing terms..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
              />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">License key</span>
                <span className="block mt-1 font-mono text-sm text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 select-all">{viewingLicense.license_key}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration / Validity</span>
                <span className="block mt-2 text-sm text-slate-800">
                  {viewingLicense.valid_from ? `${viewingLicense.valid_from} to ` : ''}
                  {viewingLicense.valid_until ? viewingLicense.valid_until : 'Perpetual (No Expiration)'}
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
    </AppLayout>
  );
}
