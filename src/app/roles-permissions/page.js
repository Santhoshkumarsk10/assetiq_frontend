'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';
import { rolesApi } from '@/lib/api';
import { 
  Shield, Key, CheckSquare, Square, Save, RefreshCw, Plus, Pencil, Trash2, Search, X,
  Box, Users, MapPin, LifeBuoy, UserPlus, FileText, Bell, Activity, Settings, Cpu,
  ChevronRight, ArrowLeft, Info, Lock
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const getCategoryMeta = (prefix) => {
  const meta = {
    asset: { title: 'Asset Management', color: 'emerald', icon: Box },
    user: { title: 'User Management', color: 'blue', icon: Users },
    location: { title: 'Location Setup', color: 'amber', icon: MapPin },
    role: { title: 'Roles & Security', color: 'indigo', icon: Shield },
    permission: { title: 'System Permissions', color: 'purple', icon: Key },
    ticket: { title: 'Support & Helpdesk', color: 'rose', icon: LifeBuoy },
    onboarding: { title: 'Employee Onboarding', color: 'cyan', icon: UserPlus },
    license: { title: 'Software & Licensing', color: 'violet', icon: FileText },
    notification: { title: 'Notification Channels', color: 'teal', icon: Bell },
    audit: { title: 'Audit & Compliance', color: 'slate', icon: Activity },
    general: { title: 'General Operations', color: 'slate', icon: Settings }
  };
  return meta[prefix.toLowerCase()] || { title: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Module`, color: 'slate', icon: Cpu };
};

const getCategoryColor = (colorName) => {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-100',
    blue: 'text-blue-600 bg-blue-500/10 border-blue-100',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-100',
    indigo: 'text-indigo-600 bg-indigo-500/10 border-indigo-100',
    purple: 'text-purple-600 bg-purple-500/10 border-purple-100',
    rose: 'text-rose-600 bg-rose-500/10 border-rose-100',
    cyan: 'text-cyan-600 bg-cyan-500/10 border-cyan-100',
    violet: 'text-violet-600 bg-violet-500/10 border-violet-100',
    teal: 'text-teal-600 bg-teal-500/10 border-teal-100',
    slate: 'text-slate-600 bg-slate-500/10 border-slate-100'
  };
  return colors[colorName] || colors.slate;
};

const getCategoryBadgeClass = (name) => {
  const match = name.match(/^([a-zA-Z0-9_-]+)[.:_]/);
  const prefix = match ? match[1].toLowerCase() : 'general';
  const styles = {
    asset: 'bg-emerald-50 text-emerald-700 border-emerald-250/60',
    user: 'bg-blue-50 text-blue-700 border-blue-250/60',
    location: 'bg-amber-50 text-amber-700 border-amber-250/60',
    role: 'bg-indigo-50 text-indigo-700 border-indigo-250/60',
    permission: 'bg-purple-50 text-purple-700 border-purple-250/60',
    ticket: 'bg-rose-50 text-rose-700 border-rose-250/60',
    onboarding: 'bg-cyan-50 text-cyan-700 border-cyan-250/60',
    license: 'bg-violet-50 text-violet-700 border-violet-250/60',
    notification: 'bg-teal-50 text-teal-700 border-teal-250/60',
    audit: 'bg-slate-50 text-slate-700 border-slate-200',
    general: 'bg-slate-100 text-slate-600 border-slate-250'
  };
  return styles[prefix] || 'bg-slate-50 text-slate-700 border-slate-200';
};

const groupPermissions = (perms) => {
  const groups = {};
  perms.forEach(perm => {
    const match = perm.name.match(/^([a-zA-Z0-9_-]+)[.:_]/);
    const prefix = match ? match[1].toLowerCase() : 'general';
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(perm);
  });
  return groups;
};

export default function RolesPermissionsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canAdd = permissions.includes('role.add');
  const canEdit = permissions.includes('role.edit');
  const canDelete = permissions.includes('role.delete');
  
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'permissions'
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState(null);
  
  // Track selected role in Master-Detail view
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Search input states
  const [roleSearch, setRoleSearch] = useState('');
  const [rolePermSearch, setRolePermSearch] = useState('');
  const [modalRoleSearch, setModalRoleSearch] = useState('');

  // Track modified permissions locally per roleId: { roleId: [permissionIds] }
  const [rolePermissionsState, setRolePermissionsState] = useState({});

  // Permissions tab search & pagination states
  const [permSearch, setPermSearch] = useState('');
  const [permPage, setPermPage] = useState(1);
  const [permLimit, setPermLimit] = useState(10);

  // Role Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [savingRole, setSavingRole] = useState(false);

  // Permission Modal states
  const [showPermModal, setShowPermModal] = useState(false);
  const [editingPerm, setEditingPerm] = useState(null);
  const [permForm, setPermForm] = useState({ name: '', description: '', roleIds: [] });
  const [savingPerm, setSavingPerm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolesApi.list({}); // Get all roles and permissions without pagination
      const fetchedRoles = data.roles || [];
      setRoles(fetchedRoles);
      setAllPermissions(data.permissions || []);
      
      // Initialize local state mapping roleId to array of its permission IDs
      const stateMap = {};
      fetchedRoles.forEach(role => {
        stateMap[role.id] = role.permissions.map(p => p.id);
      });
      setRolePermissionsState(stateMap);

      // Select first role by default
      if (fetchedRoles.length > 0) {
        setSelectedRoleId(prev => {
          if (prev && fetchedRoles.some(r => r.id === prev)) {
            return prev;
          }
          return fetchedRoles[0].id;
        });
      }
    } catch (e) {
      console.error('Error loading roles & permissions:', e);
    }
    setLoading(false);
  }, []);

  // Load data when mounting or activeTab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, loadData]);

  const handleTogglePermission = (roleId, permissionId) => {
    setRolePermissionsState(prev => {
      const currentPerms = prev[roleId] || [];
      const updatedPerms = currentPerms.includes(permissionId)
        ? currentPerms.filter(id => id !== permissionId)
        : [...currentPerms, permissionId];
      
      return {
        ...prev,
        [roleId]: updatedPerms
      };
    });
  };

  const handleSavePermissions = async (roleId, roleName) => {
    setSavingRoleId(roleId);
    try {
      const permissionIds = rolePermissionsState[roleId] || [];
      await rolesApi.updatePermissions(roleId, permissionIds);
      showToast(`Permissions for "${roleName}" updated successfully.`, 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to update permissions', 'error');
    }
    setSavingRoleId(null);
  };

  const hasChanges = (roleId) => {
    const originalRole = roles.find(r => r.id === roleId);
    if (!originalRole) return false;
    const originalIds = originalRole.permissions.map(p => p.id).sort().join(',');
    const currentIds = (rolePermissionsState[roleId] || []).sort().join(',');
    return originalIds !== currentIds;
  };

  // Roles CRUD Handlers
  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setShowRoleModal(true);
  };

  const openEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name) {
      showToast('Role Name is required.', 'error');
      return;
    }
    if (/[^a-zA-Z0-9\s]/.test(roleForm.name)) {
      showToast('Role Name cannot contain special characters.', 'error');
      return;
    }
    if (roleForm.description && /[^a-zA-Z0-9\s]/.test(roleForm.description)) {
      showToast('Description cannot contain special characters.', 'error');
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole) {
        await rolesApi.editRole({ id: editingRole.id, ...roleForm });
        showToast('Role updated successfully!', 'success');
      } else {
        await rolesApi.addRole(roleForm);
        showToast('Role created successfully!', 'success');
      }
      setShowRoleModal(false);
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to save role', 'error');
    }
    setSavingRole(false);
  };

  const handleDeleteRole = async (id, name) => {
    if (!await confirm('Delete Role', `Are you sure you want to delete role "${name}"?`)) return;
    try {
      await rolesApi.deleteRole(id);
      showToast(`Role "${name}" deleted successfully!`, 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to delete role', 'error');
    }
  };

  // Permissions CRUD Handlers
  const openAddPerm = () => {
    setEditingPerm(null);
    setPermForm({ name: '', description: '', roleIds: [] });
    setModalRoleSearch('');
    setShowPermModal(true);
  };

  const openEditPerm = (perm) => {
    setEditingPerm(perm);
    setPermForm({ name: perm.name, description: perm.description || '', roleIds: [] });
    setShowPermModal(true);
  };

  const handleSavePermission = async () => {
    if (!permForm.name) {
      showToast('Permission Name is required.', 'error');
      return;
    }
    if (/[^a-zA-Z0-9\s:\.]/.test(permForm.name)) {
      showToast('Permission Name cannot contain special characters except colons and dots.', 'error');
      return;
    }
    if (permForm.description && /[^a-zA-Z0-9\s]/.test(permForm.description)) {
      showToast('Description cannot contain special characters.', 'error');
      return;
    }

    setSavingPerm(true);
    try {
      if (editingPerm) {
        await rolesApi.editPermission({
          id: editingPerm.id,
          name: permForm.name,
          description: permForm.description
        });
        showToast('Permission updated successfully!', 'success');
      } else {
        const res = await rolesApi.addPermission({
          name: permForm.name,
          description: permForm.description
        });
        const newPerm = res.permission;

        if (newPerm && permForm.roleIds && permForm.roleIds.length > 0) {
          await Promise.all(
            permForm.roleIds.map(async (roleId) => {
              const role = roles.find(r => r.id === roleId);
              if (role) {
                const currentPermIds = role.permissions.map(p => p.id);
                await rolesApi.updatePermissions(roleId, [...currentPermIds, newPerm.id]);
              }
            })
          );
        }

        showToast('Permission created successfully!', 'success');
      }
      setShowPermModal(false);
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to save permission', 'error');
    }
    setSavingPerm(false);
  };

  const handleDeletePermission = async (id, name) => {
    if (!await confirm('Delete Permission', `Are you sure you want to delete permission "${name}"?`)) return;
    try {
      await rolesApi.deletePermission(id);
      showToast(`Permission "${name}" deleted successfully!`, 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to delete permission', 'error');
    }
  };

  const filteredPerms = allPermissions.filter(p => 
    p.name.toLowerCase().includes(permSearch.toLowerCase()) || 
    (p.description || '').toLowerCase().includes(permSearch.toLowerCase())
  );
  
  const totalPermPages = Math.ceil(filteredPerms.length / permLimit);
  
  const displayedPerms = filteredPerms.slice(
    (permPage - 1) * permLimit, 
    permPage * permLimit
  );

  // Filters for role sidebar
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
    (role.description || '').toLowerCase().includes(roleSearch.toLowerCase())
  );

  // Filters for roles checkboxes in modal
  const filteredModalRoles = roles.filter(role => 
    role.name.toLowerCase().includes(modalRoleSearch.toLowerCase()) ||
    (role.description || '').toLowerCase().includes(modalRoleSearch.toLowerCase())
  );

  return (
    <AppLayout>
      {/* Premium Top Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t('rolesPermissions')}</h1>
          <p className="text-slate-500 text-xs mt-1">Configure role access scopes and system permissions mapping</p>
        </div>
        <div className="flex gap-2.5 items-center w-full sm:w-auto">
          {activeTab === 'roles' ? (
            canAdd && (
              <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-200" onClick={openAddRole}>
                <Plus size={18} /> Add Role
              </button>
            )
          ) : (
            canAdd && (
              <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-200" onClick={openAddPerm}>
                <Plus size={18} /> Add Permission
              </button>
            )
          )}

          <button className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all duration-200" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Premium Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -bottom-6 text-blue-500/10 pointer-events-none">
            <Shield size={96} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Roles</span>
            <h2 className="text-3xl font-extrabold text-slate-800">{roles.length}</h2>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
            <Shield size={22} />
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -bottom-6 text-emerald-500/10 pointer-events-none">
            <Key size={96} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Permissions</span>
            <h2 className="text-3xl font-extrabold text-slate-800">{allPermissions.length}</h2>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
            <Key size={22} />
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-r from-purple-50 to-violet-50/50 border border-purple-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -bottom-6 text-purple-500/10 pointer-events-none">
            <Lock size={96} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Access Coverage</span>
            <h2 className="text-3xl font-extrabold text-slate-800">
              {roles.length > 0 
                ? `${Math.round((roles.reduce((acc, r) => acc + (rolePermissionsState[r.id]?.length || 0), 0) / (roles.length * allPermissions.length)) * 100)}%` 
                : '0%'
              }
            </h2>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
            <Lock size={22} />
          </div>
        </div>
      </div>

      {/* Modern Segmented Control Tab */}
      <div className="bg-slate-100/80 border border-slate-200/60 p-1 rounded-xl flex w-fit gap-1 mb-8 shadow-3xs">
        <button 
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 border-none cursor-pointer ${
            activeTab === 'roles' 
              ? "bg-white text-emerald-700 shadow-xs" 
              : "text-slate-500 hover:text-slate-800 bg-transparent"
          }`}
          onClick={() => setActiveTab('roles')}
        >
          <Shield size={14} />
          Roles
        </button>
        <button 
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 border-none cursor-pointer ${
            activeTab === 'permissions' 
              ? "bg-white text-emerald-700 shadow-xs" 
              : "text-slate-500 hover:text-slate-800 bg-transparent"
          }`}
          onClick={() => setActiveTab('permissions')}
        >
          <Key size={14} />
          Permissions
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400 gap-3 text-sm">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading schema...
        </div>
      ) : activeTab === 'roles' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          
          {/* Left Column: Roles Master List (Role Side) */}
          <div className={`lg:col-span-4 space-y-4 ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Roles</span>
                {canAdd && (
                  <button className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-transparent border-none cursor-pointer transition-colors" onClick={openAddRole}>
                    <Plus size={14} /> Add Role
                  </button>
                )}
              </div>

              {/* Role Side Search Option */}
              <div className="relative mb-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {roleSearch && (
                  <button onClick={() => setRoleSearch('')} className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent flex items-center">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredRoles.map(role => {
                  const isActive = selectedRoleId === role.id;
                  const isModified = hasChanges(role.id);
                  const assignedCount = rolePermissionsState[role.id]?.length || 0;
                  
                  return (
                    <div 
                      key={role.id}
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setShowMobileDetail(true);
                      }}
                      className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col ${
                        isActive 
                          ? 'border-emerald-650 bg-emerald-50/10 shadow-3xs ring-1 ring-emerald-500/10' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Shield size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">{role.name}</h3>
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">ID: {role.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isModified && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive 
                              ? 'bg-emerald-100/40 text-emerald-700 border-emerald-250' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {assignedCount} / {allPermissions.length}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                        {role.description || 'No description provided.'}
                      </p>
                    </div>
                  );
                })}
                {filteredRoles.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No roles found matching &quot;{roleSearch}&quot;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Scopes & Permissions Manager (Assign Permission Side) */}
          {selectedRoleId && (() => {
            const role = roles.find(r => r.id === selectedRoleId);
            if (!role) return null;
            
            const isModified = hasChanges(role.id);
            const isSaving = savingRoleId === role.id;
            const currentPerms = rolePermissionsState[role.id] || [];

            // Filter permissions to assign on this side
            const filteredAllPermissionsForRole = allPermissions.filter(p => 
              p.name.toLowerCase().includes(rolePermSearch.toLowerCase()) || 
              (p.description || '').toLowerCase().includes(rolePermSearch.toLowerCase())
            );

            // Group filtered permissions by prefix
            const grouped = groupPermissions(filteredAllPermissionsForRole);
            
            return (
              <div className={`lg:col-span-8 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-3xs ${
                showMobileDetail ? 'block' : 'hidden lg:block'
              }`}>
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowMobileDetail(false)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 lg:hidden cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">{role.name}</h2>
                        {canEdit && (
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-850 transition-colors" onClick={() => openEditRole(role)} title="Edit Role Name/Desc">
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors" onClick={() => handleDeleteRole(role.id, role.name)} title="Delete Role">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{role.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {canEdit && (
                      <button 
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                          isModified 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer shadow-xs' 
                            : 'bg-slate-50 text-slate-400 border-slate-205 cursor-not-allowed'
                        }`}
                        disabled={!isModified || isSaving}
                        onClick={() => handleSavePermissions(role.id, role.name)}
                      >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Scopes Section */}
                <div className="p-6 overflow-y-auto max-h-[580px] space-y-5 flex-1 custom-scrollbar">
                  
                  {/* Assign Permission Side Search Option */}
                  <div className="relative flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                    <Search size={16} className="text-slate-450 shrink-0" />
                    <input
                      placeholder="Search permissions to assign..."
                      value={rolePermSearch}
                      onChange={(e) => setRolePermSearch(e.target.value)}
                      className="border-none bg-transparent outline-none text-xs text-slate-850 w-full placeholder-slate-400"
                    />
                    {rolePermSearch && (
                      <button onClick={() => setRolePermSearch('')} className="text-slate-400 hover:text-slate-650 cursor-pointer border-none bg-transparent flex items-center">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {isModified && (
                    <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-850 ">
                      <Info className="shrink-0 text-amber-600 mt-0.5" size={15} />
                      <div>
                        <span className="font-semibold">Unsaved configuration changes!</span> Make sure to click <span className="font-semibold">Save Changes</span> at the top to commit your permissions modification.
                      </div>
                    </div>
                  )}

                  {Object.keys(grouped).map(prefix => {
                    const category = getCategoryMeta(prefix);
                    const CategoryIcon = category.icon;
                    const perms = grouped[prefix];
                    const colorClasses = getCategoryColor(category.color);
                    
                    return (
                      <div key={prefix} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                        <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-slate-100/60">
                          <div className={`p-1.5 rounded-lg border ${colorClasses}`}>
                            <CategoryIcon size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{category.title}</h4>
                            <span className="text-[10px] text-slate-400">Prefix: <span className="font-mono">{prefix}</span></span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {perms.map(perm => {
                            const isAssigned = currentPerms.includes(perm.id);
                            return (
                              <div 
                                key={perm.id} 
                                onClick={() => canEdit && handleTogglePermission(role.id, perm.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                                  isAssigned 
                                    ? 'bg-white border-emerald-500/30 shadow-3xs ring-1 ring-emerald-500/5' 
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 pr-2 max-w-[80%]">
                                  <span className="text-xs font-semibold text-slate-700 font-mono tracking-tight">{perm.name}</span>
                                  <span className="text-[10px] text-slate-400 line-clamp-1">{perm.description || 'No description'}</span>
                                </div>
                                <button 
                                  type="button"
                                  className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none ${
                                    isAssigned ? 'bg-emerald-600 shadow-xs shadow-emerald-500/10' : 'bg-slate-200'
                                  }`}
                                  disabled={!canEdit}
                                >
                                  <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                    isAssigned ? 'translate-x-4.5' : 'translate-x-0'
                                  }`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(grouped).length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No permissions match your search query.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs">
          <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
            <div className="w-full sm:flex-1 relative">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  placeholder="Search permissions by scope name or description..."
                  value={permSearch}
                  onChange={(e) => {
                    setPermSearch(e.target.value);
                    setPermPage(1);
                  }}
                  className="border-none bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-400"
                />
                {permSearch && (
                  <button
                    onClick={() => {
                      setPermSearch('');
                      setPermPage(1);
                    }}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <SearchableSelect
              options={[
                { value: 5, label: "5 per page" },
                { value: 10, label: "10 per page" },
                { value: 20, label: "20 per page" },
                { value: 50, label: "50 per page" }
              ]}
              value={permLimit}
              onChange={val => {
                setPermLimit(val);
                setPermPage(1);
              }}
              className="w-full sm:w-[150px]"
            />
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Permission Scope Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedPerms.map(perm => (
                  <tr key={perm.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase border tracking-wider ${getCategoryBadgeClass(perm.name)}`}>
                          {perm.name.match(/^([a-zA-Z0-9_-]+)[.:_]/)?.[1] || 'general'}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 font-mono">{perm.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 align-middle leading-relaxed">{perm.description || '—'}</td>
                    <td className="px-4 py-3.5 text-xs align-middle text-right space-x-1">
                      {canEdit && (
                        <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-450 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => openEditPerm(perm)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {canDelete && (
                        <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors" onClick={() => handleDeletePermission(perm.id, perm.name)} title="Delete"><Trash2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedPerms.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-xs text-slate-400">
                      No permissions found matching &quot;{permSearch}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {displayedPerms.map(perm => (
              <div key={perm.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1.5">
                    <span className={`w-fit px-2 py-0.5 rounded-md text-[8px] font-bold uppercase border tracking-wider ${getCategoryBadgeClass(perm.name)}`}>
                      {perm.name.match(/^([a-zA-Z0-9_-]+)[.:_]/)?.[1] || 'general'}
                    </span>
                    <span className="text-xs text-slate-850 font-semibold font-mono">{perm.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && (
                      <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => openEditPerm(perm)} title="Edit"><Pencil size={14} /></button>
                    )}
                    {canDelete && (
                      <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-rose-100 bg-rose-50 cursor-pointer text-rose-600 hover:bg-rose-100 transition-colors" onClick={() => handleDeletePermission(perm.id, perm.name)} title="Delete"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Description</span>
                  <span className="text-xs text-slate-700 leading-relaxed">{perm.description || '—'}</span>
                </div>
              </div>
            ))}
            {displayedPerms.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                No permissions found matching &quot;{permSearch}&quot;
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPermPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-slate-200">
              <div className="text-xs font-medium text-slate-500">
                Showing {Math.min((permPage - 1) * permLimit + 1, filteredPerms.length)} to {Math.min(permPage * permLimit, filteredPerms.length)} of {filteredPerms.length} entries
              </div>
              <div className="flex gap-1.5">
                <button 
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-750 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                  onClick={() => setPermPage(p => Math.max(p - 1, 1))} 
                  disabled={permPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPermPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p} 
                    className={permPage === p 
                      ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white border-none cursor-pointer transition-all" 
                      : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-all"
                    } 
                    onClick={() => setPermPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button 
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-750 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                  onClick={() => setPermPage(p => Math.min(p + 1, totalPermPages))} 
                  disabled={permPage === totalPermPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? 'Edit Role' : 'Add Role'}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowRoleModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleSaveRole} disabled={savingRole}>{savingRole ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Role Name *</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 transition-all" placeholder="e.g. Finance Admin" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} required />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 transition-all" placeholder="Role description..." value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} />
        </div>
      </Modal>

      {/* Right Slide-over Drawer for Add/Edit Permission */}
      <div className={`fixed inset-0 z-[100] overflow-hidden transition-all duration-300 ${
        showPermModal ? 'visible opacity-100' : 'invisible opacity-0'
      }`}>
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setShowPermModal(false)}
        />
        
        {/* Drawer Panel container */}
        <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div className={`w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
            showPermModal ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingPerm ? 'Edit Permission' : 'Add Permission'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Define permission scope and assign to roles</p>
              </div>
              <button 
                onClick={() => setShowPermModal(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Permission Scope Name *</label>
                <input 
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 transition-all" 
                  placeholder="e.g. process:payroll" 
                  value={permForm.name} 
                  onChange={(e) => setPermForm({ ...permForm, name: e.target.value.replace(/[^a-zA-Z0-9\s:\.]/g, '') })} 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
                <textarea 
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 transition-all resize-none" 
                  placeholder="Permission scope description..." 
                  value={permForm.description} 
                  onChange={(e) => setPermForm({ ...permForm, description: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} 
                />
              </div>

              {!editingPerm && roles.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">{t('assignDirectlyToRoles')}</label>
                  
                  <div className="flex flex-wrap gap-2">
                    {roles.map(role => {
                      const isChecked = permForm.roleIds?.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            const updatedIds = isChecked
                              ? permForm.roleIds.filter(id => id !== role.id)
                              : [...(permForm.roleIds || []), role.id];
                            setPermForm({ ...permForm, roleIds: updatedIds });
                          }}
                          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 ${
                            isChecked
                              ? 'border-emerald-600 bg-emerald-50/10 text-emerald-700 shadow-3xs ring-1 ring-emerald-500/10 font-bold'
                              : 'border-slate-200 bg-white text-slate-650 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'border-emerald-600 bg-emerald-600 text-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 stroke-[3] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span>{role.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4.5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors" 
                onClick={() => setShowPermModal(false)}
              >
                Cancel
              </button>
              <button 
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors" 
                onClick={handleSavePermission} 
                disabled={savingPerm}
              >
                {savingPerm ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
