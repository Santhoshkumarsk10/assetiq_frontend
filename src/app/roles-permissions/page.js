'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { rolesApi } from '@/lib/api';
import { Shield, Key, CheckSquare, Square, Save, RefreshCw, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

export default function RolesPermissionsPage() {
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
  
  // Track modified permissions locally per roleId: { roleId: [permissionIds] }
  const [rolePermissionsState, setRolePermissionsState] = useState({});

  // Permissions search & pagination states
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
  const [permForm, setPermForm] = useState({ name: '', description: '' });
  const [savingPerm, setSavingPerm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await rolesApi.list({}); // Get all roles and permissions without pagination
      setRoles(data.roles || []);
      setAllPermissions(data.permissions || []);
      
      // Initialize local state mapping roleId to array of its permission IDs
      const stateMap = {};
      (data.roles || []).forEach(role => {
        stateMap[role.id] = role.permissions.map(p => p.id);
      });
      setRolePermissionsState(stateMap);
    } catch (e) {
      console.error('Error loading roles & permissions:', e);
    }
    setLoading(false);
  };

  // Load data when mounting or activeTab changes
  useEffect(() => {
    loadData();
  }, [activeTab]);

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
    setPermForm({ name: '', description: '' });
    setShowPermModal(true);
  };

  const openEditPerm = (perm) => {
    setEditingPerm(perm);
    setPermForm({ name: perm.name, description: perm.description || '' });
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
        await rolesApi.editPermission({ id: editingPerm.id, ...permForm });
        showToast('Permission updated successfully!', 'success');
      } else {
        await rolesApi.addPermission(permForm);
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

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="text-slate-500 text-sm mt-1">Configure role access scopes and system permissions mapping</p>
        </div>
        <div className="flex gap-2.5 items-center">
          {activeTab === 'roles' ? (
            canAdd && (
              <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={openAddRole}>
                <Plus size={18} /> Add Role
              </button>
            )
          ) : (
            canAdd && (
              <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={openAddPerm}>
                <Plus size={18} /> Add Permission
              </button>
            )
          )}

          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2.5 mb-5">
        <button 
          className={activeTab === 'roles' 
            ? "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-emerald-600 text-white border-none cursor-pointer" 
            : "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
          }
          onClick={() => setActiveTab('roles')}
        >
          Roles
        </button>
        <button 
          className={activeTab === 'permissions' 
            ? "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-emerald-600 text-white border-none cursor-pointer" 
            : "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
          }
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
          <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading roles and permissions schema...
        </div>
      ) : activeTab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {roles.map(role => {
            const isModified = hasChanges(role.id);
            const isSaving = savingRoleId === role.id;
            
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col" key={role.id}>
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <Shield className="text-emerald-500" size={24} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-800">{role.name}</h3>
                        {canEdit && (
                          <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => openEditRole(role)} title="Edit Role"><Pencil size={14} /></button>
                        )}
                        {canDelete && (
                          <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors" onClick={() => handleDeleteRole(role.id, role.name)} title="Delete Role"><Trash2 size={14} /></button>
                        )}
                      </div>
                      <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">ID: {role.id}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <button 
                      className={isModified 
                        ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer" 
                        : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                      }
                      disabled={!isModified || isSaving}
                      onClick={() => handleSavePermissions(role.id, role.name)}
                    >
                      <Save size={14} />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-slate-500 mb-5">{role.description || 'No description provided.'}</p>
                
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Key size={16} /> 
                    System Permissions Configuration
                  </h4>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {allPermissions.map(perm => {
                      const isAssigned = (rolePermissionsState[role.id] || []).includes(perm.id);
                      
                      return (
                        <div 
                          key={perm.id} 
                          className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-150 ${
                            canEdit ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            isAssigned ? 'bg-emerald-50/40 border-emerald-100' : 'border-slate-100 hover:bg-slate-50'
                          }`}
                          onClick={() => canEdit && handleTogglePermission(role.id, perm.id)}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isAssigned ? (
                              <CheckSquare size={18} className="text-emerald-600" />
                            ) : (
                              <Square size={18} className="text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 font-mono">{perm.name}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{perm.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex gap-4 items-center mb-5">
            <div className="flex-1 relative">
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
            <select 
              className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white cursor-pointer outline-none w-[130px]" 
              value={permLimit} 
              onChange={(e) => {
                setPermLimit(parseInt(e.target.value));
                setPermPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Permission Scope Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedPerms.map(perm => (
                <tr key={perm.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="px-4 py-3.5 text-sm font-semibold text-emerald-600 font-mono align-middle">{perm.name}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 align-middle">{perm.description || '—'}</td>
                  <td className="px-4 py-3.5 text-sm align-middle">
                    {canEdit && (
                      <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => openEditPerm(perm)} title="Edit"><Pencil size={16} /></button>
                    )}
                    {canDelete && (
                      <button className="w-[34px] h-[34px] p-0 inline-flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors" onClick={() => handleDeletePermission(perm.id, perm.name)} title="Delete" style={{ marginLeft: 8 }}><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {displayedPerms.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-sm text-slate-400">
                    No permissions found matching "{permSearch}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPermPages > 1 && activeTab === 'permissions' && (
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            Showing {Math.min((permPage - 1) * permLimit + 1, filteredPerms.length)} to {Math.min(permPage * permLimit, filteredPerms.length)} of {filteredPerms.length} entries
          </div>
          <div className="flex gap-1.5">
            <button 
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={() => setPermPage(p => Math.max(p - 1, 1))} 
              disabled={permPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPermPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={permPage === p 
                  ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer" 
                  : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                } 
                onClick={() => setPermPage(p)}
              >
                {p}
              </button>
            ))}
            <button 
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={() => setPermPage(p => Math.min(p + 1, totalPermPages))} 
              disabled={permPage === totalPermPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? 'Edit Role' : 'Add Role'}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowRoleModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleSaveRole} disabled={savingRole}>{savingRole ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Role Name *</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" placeholder="e.g. Finance Admin" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} required />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" placeholder="Role description..." value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} />
        </div>
      </Modal>

      {/* Add/Edit Permission Modal */}
      <Modal isOpen={showPermModal} onClose={() => setShowPermModal(false)} title={editingPerm ? 'Edit Permission' : 'Add Permission'}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowPermModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" onClick={handleSavePermission} disabled={savingPerm}>{savingPerm ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Permission Scope Name *</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" placeholder="e.g. process:payroll" value={permForm.name} onChange={(e) => setPermForm({ ...permForm, name: e.target.value.replace(/[^a-zA-Z0-9\s:\.]/g, '') })} required />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
          <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" placeholder="Permission scope description..." value={permForm.description} onChange={(e) => setPermForm({ ...permForm, description: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} />
        </div>
      </Modal>
    </AppLayout>
  );
}
