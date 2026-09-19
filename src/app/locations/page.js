'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AnimatedPageTitle from '@/components/AnimatedPageTitle';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';
import LocationSticker from '@/components/LocationSticker';
import { locationApi } from '@/lib/api';
import { Search, Plus, Pencil, Trash2, MapPin, X, Globe, Phone } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { getLocationSticker } from '@/lib/locationStickers';

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
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLocations = useCallback(async () => {
    try {
      const data = await locationApi.list({ page, limit, search, paginate: true });
      setLocations(data.locations || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, limit, search]);

  // Fetch suggestions based on searchInput
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await locationApi.list({ page: 1, limit: 10, search: searchInput, paginate: true });
        const results = [];
        const seen = new Set();
        (data.locations || []).forEach((loc) => {
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
    const timer = setTimeout(() => {
      loadLocations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLocations]);

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
    } catch (e) {
      showToast(e.data?.error || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!await confirm('Delete Location', `Are you sure you want to delete location "${name}"?`)) return;
    try {
      await locationApi.delete(id);
      showToast(`Location "${name}" deleted successfully!`, 'success');
      await loadLocations();
    } catch (e) {
      showToast(e.data?.error || 'Failed to delete', 'error');
    }
  };

  return (
    <AppLayout>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 -mt-3 sm:-mt-4">
        <div>
          <AnimatedPageTitle title="Locations" />
        </div>
        {canAdd && (
          <button
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all duration-200"
            onClick={openAdd}
          >
            <Plus size={18} /> Add New Location
          </button>
        )}
      </div>

      {/* Tabs / Subheader Bar */}
      <div className="flex gap-2 mb-6">
        <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-emerald-600 text-white border-none cursor-pointer shadow-xs">
          Locations <span className="bg-white/25 px-2 py-0.5 rounded-full ml-1 text-[11px] font-bold">{total}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:flex-1 relative">
            <div className="flex items-center gap-2 bg-slate-50/70 border border-slate-200/80 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search locations by name..."
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
                  onClick={() => handleSearchInputChange('')}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent p-0.5 rounded"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1.5 divide-y divide-slate-50">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchInput(item.value);
                      setSearch(item.value);
                      setPage(1);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                    <span className="text-sm text-slate-800 font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-full md:w-auto flex items-center justify-end gap-3">
            <SearchableSelect
              options={[
                { value: 6, label: '6 per page' },
                { value: 9, label: '9 per page' },
                { value: 12, label: '12 per page' },
                { value: 24, label: '24 per page' },
                { value: 48, label: '48 per page' },
              ]}
              value={limit}
              onChange={(val) => {
                setLimit(val);
                setPage(1);
              }}
              className="w-full md:w-[150px]"
            />
          </div>
        </div>

        {/* Card Grid Layout */}
        {loading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-20 flex flex-col items-center justify-center text-slate-400 gap-3 text-sm shadow-xs">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            <span>Loading locations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl py-20 px-6 text-center text-slate-400 flex flex-col items-center justify-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center mb-4">
              <MapPin size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No locations found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {search ? `No locations matched "${search}". Try searching for something else.` : 'Get started by adding your first location hub.'}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
                className="mt-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((loc) => {
              const sticker = getLocationSticker(loc.name);
              const isActive = loc.is_active !== false && loc.status !== 'inactive';

              return (
                <div
                  key={loc.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Header inside Card */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {/* Left: Country / Region Pill */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sticker?.country ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sticker.badgeBg}`}>
                            {sticker.country}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-200">
                            Global
                          </span>
                        )}
                        {loc.country_code && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/70">
                            <Phone size={10} className="text-slate-400" />
                            {loc.country_code}
                          </span>
                        )}
                      </div>

                      {/* Right: Active/Inactive Status Badge */}
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive
                                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                                : 'bg-slate-400'
                              }`}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Hero Die-Cut Travel Sticker Showcase */}
                    <div className="h-32 sm:h-36 w-full flex items-center justify-center my-1.5 relative">
                      <LocationSticker locationName={loc.name} />
                    </div>

                    {/* Location Name & Details */}
                    <div className="mt-1 text-center">
                      <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight line-clamp-1">
                        {loc.name}
                      </h3>
                      <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1 px-1 text-center line-clamp-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {loc.address || 'No address specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Footer with Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      ID #{loc.id || '—'}
                    </div>

                    {/* Action buttons (Edit & Delete - ALWAYS visible) */}
                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(loc)}
                          title="Edit Location"
                          className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200/90 bg-slate-50/70 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(loc.id, loc.name)}
                          title="Delete Location"
                          className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200/90 bg-slate-50/70 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> entries
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={
                    page === p
                      ? 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer shadow-xs'
                      : 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors'
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLoc ? 'Edit Location' : 'Add Location'}
        footer={
          <>
            <button
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location Name *</label>
          <input
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400 transition-all"
            value={form.name || ''}
            placeholder="e.g. Bangalore, Mumbai, London"
            onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Country Code (e.g. +91, +44, +971)</label>
          <input
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400 transition-all"
            placeholder="e.g. +91"
            value={form.country_code || ''}
            onChange={(e) => setForm({ ...form, country_code: e.target.value.replace(/[^0-9+]/g, '').slice(0, 7) })}
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
          <input
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400 transition-all"
            placeholder="Building, Street, City"
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value.replace(/[^a-zA-Z0-9\s,.-]/g, '') })}
          />
        </div>
      </Modal>
    </AppLayout>
  );
}
