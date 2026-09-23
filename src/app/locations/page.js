'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AnimatedPageTitle from '@/components/AnimatedPageTitle';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';
import LocationSticker from '@/components/LocationSticker';
import { locationApi } from '@/lib/api';
import { Search, Plus, Pencil, Trash2, MapPin, X, Globe, Phone, Upload, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { getLocationSticker, PRESET_STICKERS } from '@/lib/locationStickers';

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
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);

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
    setForm({ name: '', address: '', country_code: '', image: '' });
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditingLoc(loc);
    setForm({
      id: loc.id,
      name: loc.name,
      address: loc.address || '',
      country_code: loc.country_code || '',
      image: loc.image || loc.image_url || '',
    });
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setForm((prev) => ({ ...prev, image: uploadEvent.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name || !form.name.trim()) {
      showToast('Location Name is required.', 'error');
      return;
    }
    if (form.name.length > 50) {
      showToast('Location Name cannot exceed 50 characters.', 'error');
      return;
    }
    if (/[^a-zA-Z0-9\s]/.test(form.name)) {
      showToast('Location Name cannot contain special characters.', 'error');
      return;
    }
    if (form.address && form.address.length > 300) {
      showToast('Address cannot exceed 300 characters.', 'error');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pt-3 sm:pt-5">
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <AnimatedPageTitle title="Locations" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Locations</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-900 font-mono bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md leading-none">
                {total}
              </span>
            </div>
          </div>

          {canAdd && (
            <button
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
              onClick={openAdd}
            >
              <Plus size={15} /> Add
            </button>
          )}
        </div>

        {canAdd && (
          <div className="hidden sm:flex items-center justify-end gap-2.5 shrink-0">
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all duration-200 shrink-0"
              onClick={openAdd}
            >
              <Plus size={18} /> Add New Location
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="space-y-4 sm:space-y-6">
        {/* Desktop Search & Filter Bar */}
        <div className="hidden md:flex bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-slate-50/70 border border-slate-200/80 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search locations by name..."
                value={searchInput}
                maxLength={100}
                onChange={(e) => handleSearchInputChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
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

          <div className="w-auto flex items-center justify-end gap-3">
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
              className="w-[150px]"
            />
          </div>
        </div>

        {/* Mobile Search & Filter Bar */}
        <div className="block md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search locations..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => handleSearchInputChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(searchInput);
                      setPage(1);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    onClick={() => handleSearchInputChange('')}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent p-0.5 rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Mobile Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto py-1.5 divide-y divide-slate-50">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchInput(item.value);
                        setSearch(item.value);
                        setPage(1);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-emerald-50/50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                    >
                      <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                      <span className="text-xs text-slate-800 font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Single Filter Button Trigger */}
            <button
              onClick={() => setShowMobileFilterSheet(true)}
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 text-xs font-semibold ${limit !== 12 || search
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                }`}
              aria-label="Filter Locations"
              title="Filter Locations"
            >
              <SlidersHorizontal size={15} />
              <span>Filter</span>
              {(limit !== 12 || search) && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {(limit !== 12 ? 1 : 0) + (search ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Badges on Mobile */}
          {(limit !== 12 || search) && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 text-xs">
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  &quot;{search}&quot;
                  <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} />
                </span>
              )}
              {limit !== 12 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {limit} per page
                  <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => { setLimit(12); setPage(1); }} />
                </span>
              )}
              <button
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setLimit(12);
                  setPage(1);
                }}
                className="text-[11px] text-slate-400 hover:text-rose-600 underline ml-1 cursor-pointer shrink-0 border-none bg-transparent"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-2.5 sm:mb-3">Showing <strong>{filtered.length}</strong> of {total} locations</p>

        {/* Card Grid Layout (2-Column on Mobile, 2-Column on SM, 3-Column on LG) */}
        {loading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-16 sm:p-20 flex flex-col items-center justify-center text-slate-400 gap-3 text-sm shadow-xs">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            <span>Loading locations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl py-16 sm:py-20 px-6 text-center text-slate-400 flex flex-col items-center justify-center shadow-xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center mb-4">
              <MapPin size={28} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">No locations found</h3>
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
            {filtered.map((loc) => {
              const sticker = getLocationSticker(loc.name);
              const isActive = loc.is_active !== false && loc.status !== 'inactive';

              return (
                <div
                  key={loc.id}
                  className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Header inside Card */}
                  <div>
                    <div className="flex items-start sm:items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-1.5">
                      {/* Left: Country / Region Pill */}
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        {sticker?.country ? (
                          <span className={`px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider border shrink-0 ${sticker.badgeBg}`}>
                            {sticker.country}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-200 shrink-0">
                            Global
                          </span>
                        )}
                        {loc.country_code && (
                          <span className="hidden xs:inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/70 shrink-0">
                            <Phone size={9} className="text-slate-400 sm:w-2.5 sm:h-2.5" />
                            {loc.country_code}
                          </span>
                        )}
                      </div>

                      {/* Right: Active/Inactive Status Badge */}
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[9px] sm:text-[11px] font-semibold transition-colors ${isActive
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
                    <div className="h-20 sm:h-32 md:h-36 w-full flex items-center justify-center my-1 sm:my-1.5 relative">
                      <LocationSticker locationName={loc.name} image={loc.image || loc.image_url} />
                    </div>

                    {/* Location Name & Details */}
                    <div className="mt-1 text-center">
                      <h3 className="text-xs sm:text-[15px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight line-clamp-1" title={loc.name}>
                        {loc.name}
                      </h3>
                      <div className="text-[9.5px] sm:text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-0.5 sm:gap-1 px-0.5 text-center line-clamp-1" title={loc.address || 'No address specified'}>
                        <MapPin size={10} className="text-slate-400 shrink-0 sm:w-3 sm:h-3" />
                        <span className="truncate">
                          {loc.address || 'No address specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Footer with Action Buttons */}
                  <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[9px] sm:text-[11px] font-medium text-slate-400 flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      ID #{loc.id || '—'}
                    </div>

                    {/* Action buttons (Edit & Delete - ALWAYS visible) */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(loc)}
                          title="Edit Location"
                          className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200/90 bg-slate-50/70 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                        >
                          <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(loc.id, loc.name)}
                          title="Delete Location"
                          className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200/90 bg-slate-50/70 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            {/* Desktop Pagination */}
            <div className="hidden sm:flex justify-between items-center gap-4">
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

            {/* Mobile Pagination */}
            <div className="flex sm:hidden justify-between items-center text-xs">
              <button
                className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-3 py-1.5 rounded-lg font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filter Bottom Sheet Modal */}
      {showMobileFilterSheet && (
        <Modal
          isOpen={showMobileFilterSheet}
          onClose={() => setShowMobileFilterSheet(false)}
          title="Filter Locations"
          footer={
            <>
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setLimit(12);
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
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Search Query</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search locations by name..."
                  value={searchInput}
                  maxLength={100}
                  onChange={(e) => handleSearchInputChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                  className="w-full text-xs text-slate-800 outline-none bg-transparent"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => handleSearchInputChange('')}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Locations Per Page</label>
              <SearchableSelect
                options={[
                  { value: 6, label: '6 per page' },
                  { value: 9, label: '9 per page' },
                  { value: 12, label: '12 per page' },
                  { value: 24, label: '24 per page' },
                  { value: 48, label: '48 per page' },
                ]}
                value={limit}
                onChange={(val) => setLimit(val)}
              />
            </div>
          </div>
        </Modal>
      )}

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
            maxLength={50}
            onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Country Code (e.g. +91, +44, +971)</label>
          <input
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400 transition-all"
            placeholder="e.g. +91"
            maxLength={7}
            value={form.country_code || ''}
            onChange={(e) => setForm({ ...form, country_code: e.target.value.replace(/[^0-9+]/g, '').slice(0, 7) })}
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
          <input
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400 transition-all"
            placeholder="Building, Street, City"
            maxLength={300}
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value.replace(/[^a-zA-Z0-9\s,.-]/g, '') })}
          />
        </div>

        {/* Upload Image / Sticker Field */}
        <div className="mb-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Location Sticker / Image
          </label>

          {form.image ? (
            <div className="relative border border-slate-200 rounded-2xl p-3.5 bg-slate-50/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  <img
                    src={form.image}
                    alt="Location Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">Image Selected</div>
                  <div className="text-[11px] text-slate-400">Will be displayed on the location hub card</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, image: '' })}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors shrink-0"
              >
                <Trash2 size={13} />
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Upload Box */}
              <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload size={18} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">
                    Click to upload location sticker
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    PNG, JPG, WebP, or SVG (Max 5MB)
                  </span>
                </div>
              </label>

              {/* Preset Stickers Quick Selector */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Or select a preset city sticker:
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {PRESET_STICKERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setForm({ ...form, image: preset.path })}
                      className="group/btn flex flex-col items-center p-1.5 rounded-xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 bg-white transition-all cursor-pointer shadow-2xs hover:scale-105"
                      title={preset.name}
                    >
                      <div className="w-9 h-9 flex items-center justify-center p-0.5">
                        <img
                          src={preset.path}
                          alt={preset.name}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 group-hover/btn:text-emerald-700 truncate w-full text-center mt-1">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
