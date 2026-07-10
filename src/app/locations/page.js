'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { locationApi } from '@/lib/api';
import { Search, Plus, Pencil, Trash2, MapPin, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

export default function LocationsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canAdd = permissions.includes('location.add');
  const canEdit = permissions.includes('location.edit');
  const canDelete = permissions.includes('location.delete');
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLocations = async () => {
    try {
      const data = await locationApi.list({ page, limit, search, paginate: true });
      setLocations(data.locations || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Fetch suggestions based on searchInput
  useEffect(() => {
    if (!searchInput.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await locationApi.list({ page: 1, limit: 10, search: searchInput, paginate: true });
        const results = [];
        const seen = new Set();
        (data.locations || []).forEach(loc => {
          if (loc.name && loc.name.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`name:${loc.name}`)) {
            seen.add(`name:${loc.name}`);
            results.push({ type: 'name', value: loc.name, label: loc.name });
          }
        });
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearchInputChange = (val) => {
    setSearchInput(val);
    if (val === '') {
      setSearch('');
      setPage(1);
    }
  };

  // Load when page, limit or search changes
  useEffect(() => {
    loadLocations();
  }, [page, limit, search]);

  const filtered = locations;

  const openAdd = () => {
    setEditingLoc(null);
    setForm({ name: '', address: '', country_code: '' });
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditingLoc(loc);
    setForm({ id: loc.id, name: loc.name, address: loc.address || '', country_code: loc.country_code || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (/[^a-zA-Z0-9\s]/.test(form.name)) {
      showToast('Location Name cannot contain special characters.', 'error');
      return;
    }
    if (form.address && /[^a-zA-Z0-9\s,.-]/.test(form.address)) {
      showToast('Address cannot contain special characters (only letters, numbers, spaces, commas, periods, and hyphens are allowed).', 'error');
      return;
    }
    if (form.country_code && !/^\+?[0-9]{1,6}$/.test(form.country_code)) {
      showToast('Country Code must contain only a leading + and digits.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingLoc) { 
        await locationApi.edit(form); 
        showToast('Location updated successfully!', 'success');
      } else { 
        await locationApi.add(form); 
        showToast('Location added successfully!', 'success');
      }
      setShowModal(false);
      await loadLocations();
    } catch (e) { showToast(e.data?.error || 'Failed to save', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!await confirm('Delete Location', `Are you sure you want to delete location "${name}"?`)) return;
    try {
      await locationApi.delete(id);
      showToast(`Location "${name}" deleted successfully!`, 'success');
      await loadLocations();
    } catch (e) { showToast(e.data?.error || 'Failed to delete', 'error'); }
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system reference data</p>
        </div>
        {canAdd && (
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={openAdd}><Plus size={18} /> Add New</button>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-emerald-600 text-white border-none cursor-pointer">
          Locations <span className="bg-white/30 px-2 py-0.5 rounded-full ml-1.5 text-[11px]">{total}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex gap-4 items-center mb-5">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search locations..."
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(searchInput);
                    setPage(1);
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="border-none bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-400"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    handleSearchInputChange('');
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
                    <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                    <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white cursor-pointer outline-none w-[130px]" value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
            <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading locations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
            <MapPin size={48} className="mb-3 opacity-40" />
            <p className="text-sm">No locations found</p>
          </div>
        ) : (
          filtered.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    {loc.name}
                    {loc.country_code && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {loc.country_code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{loc.address || 'No address specified'}</div>
                </div>
              </div>
              <div className="flex gap-1">
                {canEdit && (
                  <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => openEdit(loc)}><Pencil size={16} /></button>
                )}
                {canDelete && (
                  <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => handleDelete(loc.id, loc.name)}><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} entries
            </div>
            <div className="flex gap-1.5">
              <button 
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => setPage(p => Math.max(p - 1, 1))} 
                disabled={page === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button 
                  key={p} 
                  className={page === p 
                    ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer" 
                    : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                  } 
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button 
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingLoc ? 'Edit Location' : 'Add Location'}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Location Name *</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} required />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Country Code (e.g. +91)</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" placeholder="e.g. +91" value={form.country_code || ''} onChange={(e) => setForm({ ...form, country_code: e.target.value.replace(/[^0-9+]/g, '').slice(0, 7) })} />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Address</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value.replace(/[^a-zA-Z0-9\s,.-]/g, '') })} />
        </div>
      </Modal>
    </AppLayout>
  );
}
