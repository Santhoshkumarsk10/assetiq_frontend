'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import SearchableSelect from '@/components/SearchableSelect';
import { assetApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Search, Plus, Eye, Pencil, Trash2, Package, Upload, UserPlus, UserMinus, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

export default function AssetsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canAdd = permissions.includes('asset.add');
  const canEdit = permissions.includes('asset.edit');
  const canDelete = permissions.includes('asset.delete');
  const canImport = permissions.includes('asset.import');
  const canAllocate = permissions.includes('asset.allocate');
  const canReturn = permissions.includes('asset.return');
  const userRole = user?.role || user?.role_name;
  const isLocAdmin = userRole === 'Location Admin';
  const isItOrGlobalAdmin = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'IT Admin';
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // New allocation & detail states
  const [users, setUsers] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [allocatingAsset, setAllocatingAsset] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [allocateForm, setAllocateForm] = useState({ user_id: '', notes: '' });
  const [allocating, setAllocating] = useState(false);

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLocationId, setImportLocationId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Asset Requests states
  const [activeTab, setActiveTab] = useState('inventory');
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ asset_name: '', asset_type: 'Laptop', quantity: 1, notes: '' });
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({ request_id: '', asset_tag: '', brand: '', serial_number: '', mac_address: '', specification: '', warranty: '1 Year', remarks: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      const data = await assetApi.requestList({});
      setRequests(data.requests || []);
    } catch (e) {
      console.error('Failed to load requests:', e);
    }
  }, []);

  const handleRaiseRequest = async () => {
    if (!requestForm.asset_name || !requestForm.asset_type) {
      showToast('Asset Name and Type are required', 'error');
      return;
    }
    try {
      await assetApi.requestAdd(requestForm);
      showToast('Asset request raised successfully', 'success');
      setShowRequestModal(false);
      setRequestForm({ asset_name: '', asset_type: 'Laptop', quantity: 1, notes: '' });
      await loadRequests();
    } catch (e) {
      showToast(e.data?.error || 'Failed to raise request', 'error');
    }
  };

  const handlePurchaseRequest = async (id) => {
    const confirmed = await confirm(
      'Mark as Purchased',
      'Are you sure this asset has been purchased? This will update the request status to purchased.',
      {
        confirmText: 'Yes, Purchased',
        cancelText: 'Cancel',
        type: 'info'
      }
    );
    if (!confirmed) return;
    try {
      await assetApi.requestPurchase(id);
      showToast('Request status updated to purchased', 'success');
      await loadRequests();
    } catch (e) {
      showToast(e.data?.error || 'Failed to update request', 'error');
    }
  };

  const openCompleteModal = (req) => {
    setSelectedRequest(req);
    setCompleteForm({
      request_id: req.id,
      asset_tag: '',
      brand: req.brand || '',
      serial_number: '',
      mac_address: '',
      specification: req.notes || '',
      warranty: '3 Years',
      remarks: ''
    });
    setShowCompleteModal(true);
  };

  const handleCompleteRequest = async () => {
    if (!completeForm.asset_tag) {
      showToast('Asset Code/Tag is required', 'error');
      return;
    }
    try {
      await assetApi.requestComplete(completeForm);
      showToast('Asset added to inventory and allocated successfully!', 'success');
      setShowCompleteModal(false);
      await loadRequests();
      await loadAssets();
    } catch (e) {
      showToast(e.data?.error || 'Failed to complete request', 'error');
    }
  };

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetApi.list({
        page,
        limit,
        search,
        status: statusFilter || undefined,
        type: typeFilter || undefined
      });
      setAssets(data.assets || []);
      setLocations(data.locations || []);
      setUsers(data.users || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, limit, search, statusFilter, typeFilter]);

  // Fetch suggestions based on searchInput
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await assetApi.list({ 
          page: 1, 
          limit: 10, 
          search: searchInput,
          status: statusFilter || undefined,
          type: typeFilter || undefined
        });
        const results = [];
        const seen = new Set();
        (data.assets || []).forEach(a => {
          if (a.name && a.name.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`name:${a.name}`)) {
            seen.add(`name:${a.name}`);
            results.push({ type: 'name', value: a.name, label: a.name });
          }
          if (a.asset_tag && a.asset_tag.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`tag:${a.asset_tag}`)) {
            seen.add(`tag:${a.asset_tag}`);
            results.push({ type: 'asset tag', value: a.asset_tag, label: a.asset_tag });
          }
        });
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchInput, statusFilter, typeFilter]);

  const handleSearchInputChange = (val) => {
    setSearchInput(val);
    if (val === '') {
      setSearch('');
      setPage(1);
    }
  };

  // Load assets when pagination or filter states change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAssets();
      loadRequests();
    }, 0);
    return () => clearTimeout(timer);
  }, [page, limit, search, statusFilter, typeFilter, loadAssets, loadRequests]);

  // Real-time synchronization via WebSockets (Socket.IO)
  useEffect(() => {
    const handleAssetChange = () => {
      setTimeout(() => {
        loadAssets();
        loadRequests();
      }, 50);
    };

    socket.on('asset_request_change', handleAssetChange);
    socket.on('onboarding_change', handleAssetChange);

    return () => {
      socket.off('asset_request_change', handleAssetChange);
      socket.off('onboarding_change', handleAssetChange);
    };
  }, [loadAssets, loadRequests]);

  const filtered = assets;

  const types = ['Laptop', 'Mobile', 'Desktop', 'Accessories', 'Monitor', 'Mobile Device', 'Other'];

  const downloadSampleCSV = () => {
    const headers = 'Location,Asset Code,Asset Name,Asset Type,Brand,Specification,Serial Number,MAC Address,Warranty,Status,Remarks,Assigned\n';
    const sampleRows = [
      'Headquarters (Chennai),,MacBook Pro 16,Laptop,Apple,M2 Max 16GB 512GB,C02F1234Q05D,00:1A:2B:3C:4D:5E,3 Years,available,New Developer Laptop,John Doe',
      'Tech Hub (Bangalore),,ThinkPad T14,Laptop,Lenovo,Gen 3 16GB 256GB,PF345678,00:1A:2B:3C:4D:5F,1 Year,available,Standard Office Laptop,Jane Smith',
      'Innovation Center (Delhi),DEL-9999,UltraSharp Monitor,Monitor,Dell,U2723QE 4K,,3 Years,available,Dual Monitor Setup,Available',
    ].join('\n');
    
    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'assetiq_sample_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAdd = () => {
    setEditingAsset(null);
    setForm({ asset_tag: '', name: '', brand: '', type: '', serial_number: '', location_id: '', status: 'available', mac_address: '', specification: '', warranty: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (asset) => {
    setEditingAsset(asset);
    setForm({
      id: asset.id,
      asset_tag: asset.asset_tag,
      name: asset.name,
      brand: asset.brand || '',
      type: asset.type || '',
      serial_number: asset.serial_number || '',
      status: asset.status,
      location_id: asset.location_id || '',
      mac_address: asset.mac_address || '',
      specification: asset.specification || '',
      warranty: asset.warranty || '',
      remarks: asset.remarks || ''
    });
    setShowModal(true);
  };

  const handleLocationChange = async (locId) => {
    setForm(prev => ({ ...prev, location_id: locId }));
    if (!editingAsset && locId) {
      try {
        const res = await assetApi.nextCode(locId);
        if (res && res.next_code) {
          setForm(prev => ({ ...prev, asset_tag: res.next_code }));
        }
      } catch (e) {
        console.error('Failed to generate next asset code:', e);
      }
    }
  };

  const handleSave = async () => {
    if (form.asset_tag && /[^a-zA-Z0-9\s-]/.test(form.asset_tag)) {
      showToast('Asset Tag cannot contain special characters (only letters, numbers, spaces, and hyphens are allowed).', 'error');
      return;
    }
    if (!form.name || form.name.trim() === '') {
      showToast('Asset Name is required.', 'error');
      return;
    }
    if (!form.type || form.type.trim() === '') {
      showToast('Asset Type is required.', 'error');
      return;
    }
    if (form.mac_address && /[^a-zA-Z0-9\s:-]/.test(form.mac_address)) {
      showToast('MAC Address format is invalid (letters, numbers, colons, and hyphens only).', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingAsset) {
        await assetApi.edit(form);
        showToast('Asset updated successfully!', 'success');
      } else {
        await assetApi.add(form);
        showToast('Asset added successfully!', 'success');
      }
      setShowModal(false);
      await loadAssets();
    } catch (e) { showToast(e.data?.error || 'Failed to save', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id, tag) => {
    if (!await confirm('Delete Asset', `Are you sure you want to delete asset "${tag}"?`)) return;
    try {
      await assetApi.delete(id);
      showToast(`Asset "${tag}" deleted successfully!`, 'success');
      await loadAssets();
    } catch (e) { showToast(e.data?.error || 'Failed to delete', 'error'); }
  };

  const openAllocate = (asset) => {
    setAllocatingAsset(asset);
    setAllocateForm({ user_id: '', notes: '' });
    setShowAllocateModal(true);
  };

  const handleAllocateSubmit = async () => {
    if (!allocateForm.user_id) {
      showToast('Please select a user to allocate the asset.', 'error');
      return;
    }
    setAllocating(true);
    try {
      await assetApi.allocate({
        asset_id: allocatingAsset.id,
        user_id: allocateForm.user_id,
        notes: allocateForm.notes
      });
      showToast('Asset allocated successfully!', 'success');
      setShowAllocateModal(false);
      await loadAssets();
    } catch (e) {
      showToast(e.data?.error || 'Failed to allocate asset.', 'error');
    }
    setAllocating(false);
  };

  const handleReturnAsset = async (asset) => {
    const activeAlloc = asset.allocations && asset.allocations[0];
    const allocationId = activeAlloc ? activeAlloc.id : null;
    if (!allocationId) {
      showToast('No active allocation record found for this asset.', 'error');
      return;
    }
    if (!await confirm('Return Asset', `Are you sure you want to return asset "${asset.asset_tag}" (${asset.name}) to available inventory?`)) return;
    try {
      await assetApi.returnAsset(allocationId);
      showToast(`Asset "${asset.asset_tag}" returned successfully!`, 'success');
      await loadAssets();
    } catch (e) {
      showToast(e.data?.error || 'Failed to return asset.', 'error');
    }
  };

  const openViewDetails = (asset) => {
    setViewingAsset(asset);
    setShowDetailsModal(true);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Please select an Excel file first.', 'error');
      return;
    }
    if (!importLocationId) {
      showToast('Please select a target location.', 'error');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const arrayBuffer = evt.target.result;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = window.btoa(binary);

          const res = await assetApi.importAssets({
            fileData: base64Data,
            locationId: importLocationId
          });

          showToast(
            `Import completed successfully! Assets created: ${res.createdCount}, updated: ${res.updatedCount}`,
            'success'
          );

          setShowImportModal(false);
          setImportFile(null);
          setImportLocationId('');
          await loadAssets();
        } catch (err) {
          console.error(err);
          showToast(err.data?.error || 'Failed to import assets.', 'error');
        } finally {
          setImporting(false);
        }
      };

      reader.onerror = () => {
        showToast('Failed to read the file.', 'error');
        setImporting(false);
      };

      reader.readAsArrayBuffer(importFile);
    } catch (err) {
      console.error(err);
      showToast('An error occurred while uploading the file.', 'error');
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track all IT assets</p>
        </div>
        <div className="flex gap-2.5">
          {activeTab === 'inventory' ? (
            <>
              {canImport && (
                <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowImportModal(true)}><Upload size={18} /> Import Excel</button>
              )}
              {canAdd && (
                <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={openAdd}><Plus size={18} /> Add Asset</button>
              )}
            </>
          ) : (
            isLocAdmin && (
              <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={() => setShowRequestModal(true)}><Plus size={18} /> Raise Request</button>
            )
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Inventory
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Asset Requests
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search by asset name or ID..."
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
          <SearchableSelect
            options={[
              { value: "", label: "All Categories" },
              ...types.map(t => ({ value: t, label: t }))
            ]}
            value={typeFilter}
            onChange={val => { setTypeFilter(val); setPage(1); }}
            className="w-[160px]"
          />
          <SearchableSelect
            options={[
              { value: "", label: "All Statuses" },
              { value: "available", label: "Available" },
              { value: "allocated", label: "In Use" },
              { value: "maintenance", label: "Under Repair" }
            ]}
            value={statusFilter}
            onChange={val => { setStatusFilter(val); setPage(1); }}
            className="w-[155px]"
          />
          <SearchableSelect
            options={[
              { value: 5, label: "5 per page" },
              { value: 10, label: "10 per page" },
              { value: 20, label: "20 per page" },
              { value: 50, label: "50 per page" }
            ]}
            value={limit}
            onChange={val => setLimit(val)}
            className="w-[145px]"
          />
        </div>

        <p className="text-xs text-slate-500 mb-3">Showing <strong>{filtered.length}</strong> of {total} assets</p>

        {loading ? (
          <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
            <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading assets...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
            <Package size={48} className="mb-3 opacity-40" />
            <p className="text-sm">No assets found</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="px-4 py-3.5 text-sm text-emerald-600 font-semibold text-xs align-middle">{a.asset_tag}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-800 align-middle">{a.name}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 align-middle">{a.brand || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 align-middle">{a.type || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 align-middle">{a.location?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 align-middle font-medium">
                    {a.allocated_user_name ? (
                      <span className="text-slate-800 font-semibold">{a.allocated_user_name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm align-middle"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3.5 text-sm align-middle">
                    <div className="flex items-center gap-0.5">
                      <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" title="View Details" onClick={() => openViewDetails(a)}><Eye size={16} /></button>
                      {canEdit && (
                        <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" title="Edit" onClick={() => openEdit(a)}><Pencil size={16} /></button>
                      )}
                      {canAllocate && a.status === 'available' && (
                        <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors" title="Allocate Asset" onClick={() => openAllocate(a)}><UserPlus size={16} /></button>
                      )}
                      {canReturn && a.status === 'allocated' && (
                        <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors" title="Return Asset" onClick={() => handleReturnAsset(a)}><UserMinus size={16} /></button>
                      )}
                      {canDelete && (
                        <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors" title="Delete" onClick={() => handleDelete(a.id, a.asset_tag)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          {requests.length === 0 ? (
            <div className="text-center py-15 px-5 text-slate-400 flex flex-col items-center justify-center">
              <Package size={48} className="mb-3 opacity-40" />
              <p className="text-sm">No asset requests found</p>
              {isLocAdmin && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Raise First Request
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Requested Asset</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Requested By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Remarks / Notes</th>
                    {isItOrGlobalAdmin && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 font-mono">#{req.id}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 font-semibold">{req.asset_name}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{req.asset_type}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{req.location?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-700">
                        {req.requester?.name || '—'}{' '}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">({req.requester?.email})</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
                          req.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-250' :
                          req.status === 'purchased' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {req.status === 'completed' ? 'Completed' : req.status === 'purchased' ? 'Purchased' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[200px] truncate" title={req.notes || ''}>{req.notes || '—'}</td>
                      {isItOrGlobalAdmin && (
                        <td className="px-4 py-3.5 text-sm">
                          <div className="flex gap-2">
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handlePurchaseRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              >
                                Mark Purchased
                              </button>
                            )}
                            {req.status === 'purchased' && (
                              <button
                                onClick={() => openCompleteModal(req)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                              >
                                Add & Allocate
                              </button>
                            )}
                            {req.status === 'completed' && (
                              <span className="text-xs text-slate-400 italic font-medium">No action required</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAsset ? 'Edit Asset' : 'Add Asset'}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Location *</label>
            <SearchableSelect
              options={locations.map(l => ({ value: l.id, label: l.name }))}
              value={form.location_id || ''}
              placeholder="Select Location"
              onChange={val => handleLocationChange(val)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Code (Auto-generated) *</label>
            <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.asset_tag || ''} onChange={(e) => setForm({ ...form, asset_tag: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })} placeholder="Select location or enter code" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Name *</label>
            <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} required />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Type *</label>
            <SearchableSelect
              options={[
                { value: "Laptop", label: "Laptop" },
                { value: "Mobile", label: "Mobile" },
                { value: "Desktop", label: "Desktop" },
                { value: "Accessories", label: "Accessories" },
                { value: "Monitor", label: "Monitor" },
                { value: "Mobile Device", label: "Mobile Device" },
                { value: "Other", label: "Other" }
              ]}
              value={form.type || ''}
              placeholder="Select Type"
              onChange={val => setForm({ ...form, type: val })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Brand</label>
            <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })} placeholder="e.g. Apple, Dell, Lenovo" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Serial Number</label>
            <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.serial_number || ''} onChange={(e) => setForm({ ...form, serial_number: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })} placeholder="e.g. SN-123456" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">MAC Address</label>
            <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.mac_address || ''} onChange={(e) => setForm({ ...form, mac_address: e.target.value.replace(/[^a-zA-Z0-9\s:-]/g, '') })} placeholder="e.g. 00:1A:2B:3C:4D:5E" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Warranty</label>
            <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.warranty || ''} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="e.g. 1 Year, 3 Years" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
            <SearchableSelect
              options={[
                { value: "available", label: "Available" },
                { value: "allocated", label: "Allocated" },
                { value: "maintenance", label: "Maintenance" },
                { value: "retired", label: "Retired" }
              ]}
              value={form.status || 'available'}
              onChange={val => setForm({ ...form, status: val })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks</label>
            <textarea className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.remarks || ''} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} placeholder="Optional remarks..." />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Specification</label>
          <textarea className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={form.specification || ''} onChange={(e) => setForm({ ...form, specification: e.target.value })} rows={2} placeholder="e.g. 16GB RAM, 512GB SSD, Intel i7" />
        </div>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportFile(null); }} title="Import Assets from Excel"
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => { setShowImportModal(false); setImportFile(null); }}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleImportSubmit} disabled={importing}>{importing ? 'Importing...' : 'Import'}</button>
        </>}>
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Import Template Guide</span>
          <span className="block text-xs text-slate-500 mb-2.5">Use our predefined format with columns: Location, Asset Code, Asset Name, Asset Type, Brand, Specification, Serial Number, MAC Address, Warranty, Status, Remarks, Assigned.</span>
          <button 
            type="button" 
            onClick={downloadSampleCSV} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            Download Sample CSV
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Target Location *</label>
          <SearchableSelect
            options={locations.map(l => ({ value: l.id, label: l.name }))}
            value={importLocationId}
            placeholder="Select Location"
            onChange={val => setImportLocationId(val)}
          />
          <p className="block text-xs text-slate-400 mt-1">
            All imported assets will be registered under this selected location.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Excel File (.xlsx, .xls) *</label>
          <input type="file" accept=".xlsx, .xls" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" onChange={(e) => setImportFile(e.target.files[0])} required />
        </div>
      </Modal>

      {/* Allocate Asset Modal */}
      <Modal isOpen={showAllocateModal} onClose={() => setShowAllocateModal(false)} title={`Allocate Asset: ${allocatingAsset?.asset_tag}`}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowAllocateModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleAllocateSubmit} disabled={allocating}>{allocating ? 'Allocating...' : 'Allocate'}</button>
        </>}>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Detail</label>
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-200">
            <span className="font-semibold text-emerald-600">{allocatingAsset?.asset_tag}</span> - {allocatingAsset?.name} ({allocatingAsset?.type})
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Employee / User *</label>
          <SearchableSelect
            options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
            value={allocateForm.user_id}
            placeholder="Select Employee"
            onChange={val => setAllocateForm({ ...allocateForm, user_id: val })}
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Allocation Notes</label>
          <textarea className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" value={allocateForm.notes} onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })} rows={3} placeholder="Add optional instructions, accessories provided, etc..." />
        </div>
      </Modal>

      {/* Asset Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Asset Details"
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowDetailsModal(false)}>Close</button>
        </>}>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">{viewingAsset?.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tag: <span className="font-semibold text-emerald-600">{viewingAsset?.asset_tag}</span></p>
            </div>
            <StatusBadge status={viewingAsset?.status} />
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
            <div>
              <span className="block text-xs font-medium text-slate-400">Category</span>
              <span className="text-slate-700 font-medium">{viewingAsset?.type || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">Brand / Manufacturer</span>
              <span className="text-slate-700 font-medium">{viewingAsset?.brand || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">Serial Number</span>
              <span className="text-slate-700 font-mono text-xs">{viewingAsset?.serial_number || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">MAC Address</span>
              <span className="text-slate-700 font-mono text-xs">{viewingAsset?.mac_address || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">Location</span>
              <span className="text-slate-700 font-medium">{viewingAsset?.location?.name || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">Warranty</span>
              <span className="text-slate-700 font-medium">{viewingAsset?.warranty || '—'}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="block text-xs font-medium text-slate-400 mb-1">Specifications</span>
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-xs text-slate-700 font-mono whitespace-pre-wrap">
              {viewingAsset?.specification || 'No specifications provided.'}
            </div>
          </div>

          {viewingAsset?.status === 'allocated' && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="block text-xs font-semibold text-blue-800 mb-1">Current Assignment</span>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Assigned To:</strong> {viewingAsset?.allocated_user_name}</p>
                {viewingAsset?.allocations && viewingAsset.allocations[0] && (
                  <>
                    <p><strong>Assigned On:</strong> {new Date(viewingAsset.allocations[0].created_at).toLocaleDateString()}</p>
                    {viewingAsset.allocations[0].notes && <p><strong>Notes:</strong> {viewingAsset.allocations[0].notes}</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {viewingAsset?.remarks && (
            <div className="pt-2">
              <span className="block text-xs font-medium text-slate-400 mb-1">Remarks</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-150 italic">{viewingAsset.remarks}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Raise Asset Request Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Raise Hardware Asset Request"
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowRequestModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleRaiseRequest}>Submit Request</button>
        </>}
      >
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Name *</label>
          <input
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
            placeholder="e.g. ThinkPad T14, MacBook Pro"
            value={requestForm.asset_name}
            onChange={(e) => setRequestForm({ ...requestForm, asset_name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Type *</label>
            <SearchableSelect
              options={[
                { value: "Laptop", label: "Laptop" },
                { value: "Mobile", label: "Mobile" },
                { value: "Desktop", label: "Desktop" },
                { value: "Accessories", label: "Accessories" },
                { value: "Monitor", label: "Monitor" },
                { value: "Other", label: "Other" }
              ]}
              value={requestForm.asset_type}
              onChange={val => setRequestForm({ ...requestForm, asset_type: val })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity</label>
            <input
              type="number"
              min={1}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors"
              value={requestForm.quantity}
              onChange={(e) => setRequestForm({ ...requestForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason / Notes</label>
          <textarea
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors h-24 resize-none"
            placeholder="Please specify the reason for request..."
            value={requestForm.notes}
            onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
          />
        </div>
      </Modal>

      {/* Complete Request and Allocate Modal */}
      {selectedRequest && (
        <Modal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          title="Add Purchased Asset to Inventory & Allocate"
          footer={<>
            <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowCompleteModal(false)}>Cancel</button>
            <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleCompleteRequest}>Complete Allocation</button>
          </>}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-xs space-y-1">
            <div><strong>Request Detail:</strong> {selectedRequest.asset_name} ({selectedRequest.asset_type})</div>
            <div><strong>Requested By:</strong> {selectedRequest.requester?.name} ({selectedRequest.requester?.email})</div>
            <div><strong>Target Location:</strong> {selectedRequest.location?.name}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Code / Tag *</label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder="e.g. AST-10023"
                value={completeForm.asset_tag}
                onChange={(e) => setCompleteForm({ ...completeForm, asset_tag: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Brand</label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder="e.g. Apple, Dell"
                value={completeForm.brand}
                onChange={(e) => setCompleteForm({ ...completeForm, brand: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Serial Number</label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder="e.g. SN-98765"
                value={completeForm.serial_number}
                onChange={(e) => setCompleteForm({ ...completeForm, serial_number: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">MAC Address</label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
                value={completeForm.mac_address}
                onChange={(e) => setCompleteForm({ ...completeForm, mac_address: e.target.value.replace(/[^a-zA-Z0-9\s:-]/g, '') })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Warranty</label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder="e.g. 3 Years"
                value={completeForm.warranty}
                onChange={(e) => setCompleteForm({ ...completeForm, warranty: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Specification</label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors"
                placeholder="e.g. 16GB RAM, 512GB SSD"
                value={completeForm.specification}
                onChange={(e) => setCompleteForm({ ...completeForm, specification: e.target.value })}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks</label>
            <textarea
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors h-16 resize-none"
              placeholder="Optional remarks..."
              value={completeForm.remarks}
              onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
