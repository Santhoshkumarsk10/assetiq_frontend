'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import SearchableSelect from '@/components/SearchableSelect';
import { ticketApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Search, Plus, Eye, UserCheck, CheckCircle, XCircle, X, Calendar, User, MessageSquare, Send, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const CATEGORIES = [
  { value: 'hardware_malfunction', label: 'Hardware Malfunction' },
  { value: 'software_issue', label: 'Software Issue' },
  { value: 'lost_stolen', label: 'Lost / Stolen' },
  { value: 'physical_damage', label: 'Physical Damage' },
  { value: 'general_it', label: 'General IT' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const RESOLUTION_TYPES = [
  { value: 'repaired', label: 'Repaired (Returned to active use)' },
  { value: 'replaced', label: 'Replaced (Old retired, new allocated)' },
  { value: 'retired', label: 'Retired (Old retired, allocation ended)' },
  { value: 'no_issue_found', label: 'No Issue Found' },
  { value: 'rejected', label: 'Rejected / Invalid Ticket' }
];

export default function TicketsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const permissions = user?.permissions || [];
  const canList = permissions.includes('ticket.list');
  const canAdd = permissions.includes('ticket.add');
  const canEdit = permissions.includes('ticket.edit');

  const userRole = user?.role || user?.role_name;
  const isSuperAdminOrAdmin = ['Super Admin', 'Admin'].includes(userRole);
  const isLocationAdmin = userRole === 'Location Admin';
  const isITAdmin = userRole === 'IT Admin';
  const isRegularUser = userRole === 'User';

  // List State
  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Focus Tickets & Data
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [myAssets, setMyAssets] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [availableReplacements, setAvailableReplacements] = useState([]);
  
  // Forms
  const [raiseForm, setRaiseForm] = useState({
    asset_id: '',
    category: 'general_it',
    priority: 'medium',
    title: '',
    description: ''
  });

  const [assignForm, setAssignForm] = useState({
    assigned_to: ''
  });

  const [resolveForm, setResolveForm] = useState({
    resolution_type: 'repaired',
    resolution_notes: '',
    replacement_asset_id: ''
  });

  const [cancelForm, setCancelForm] = useState({
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef(null);

  // Load Tickets
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ticketApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined
      });
      setTickets(data.tickets || []);
      setAdmins(data.admins || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load support tickets.', 'error');
    }
    setLoading(false);
  }, [page, limit, search, statusFilter, priorityFilter, categoryFilter, showToast]);

  // Initial & Filter load
  useEffect(() => {
    loadTickets();
  }, [page, search, statusFilter, priorityFilter, categoryFilter, loadTickets]);

  // Socket sync
  useEffect(() => {
    const handleTicketChange = () => {
      setTimeout(() => {
        loadTickets();
        if (selectedTicket) {
          refreshTicketDetails(selectedTicket.id);
        }
      }, 50);
    };

    socket.on('ticket_change', handleTicketChange);
    return () => {
      socket.off('ticket_change', handleTicketChange);
    };
  }, [loadTickets, selectedTicket]);

  // Load User Assets for Raise Modal
  const loadMyAssets = async () => {
    try {
      const data = await ticketApi.myAssets();
      setMyAssets(data.assets || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load eligible assets.', 'error');
    }
  };

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

  // Open Raise Modal
  const openRaiseTicket = () => {
    loadMyAssets();
    setRaiseForm({
      asset_id: '',
      category: 'general_it',
      priority: 'medium',
      title: '',
      description: ''
    });
    setShowRaiseModal(true);
  };

  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    if (!raiseForm.title.trim()) {
      showToast('Title is required.', 'error');
      return;
    }
    if (!raiseForm.description.trim()) {
      showToast('Description is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await ticketApi.raise({
        asset_id: raiseForm.asset_id || null,
        category: raiseForm.category,
        priority: raiseForm.priority,
        title: raiseForm.title,
        description: raiseForm.description
      });
      showToast('Ticket raised successfully!', 'success');
      setShowRaiseModal(false);
      loadTickets();
    } catch (e) {
      showToast(e.data?.error || 'Failed to raise ticket.', 'error');
    }
    setSubmitting(false);
  };

  // Refresh details & comments
  const refreshTicketDetails = async (id) => {
    try {
      const res = await ticketApi.details(id);
      setSelectedTicket(res.ticket);
      setComments(res.ticket.comments || []);
      setAvailableReplacements(res.availableAssets || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openViewDetails = async (ticket) => {
    setSelectedTicket(ticket);
    setComments(ticket.comments || []);
    setShowDetailsModal(true);
    // Fetch fresh details with full history
    await refreshTicketDetails(ticket.id);
  };

  useEffect(() => {
    if (showDetailsModal && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, showDetailsModal]);

  // Post manual comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const data = await ticketApi.addComment({
        ticket_id: selectedTicket.id,
        message: newComment
      });
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
      if (commentsEndRef.current) {
        setTimeout(() => {
          commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (e) {
      showToast(e.data?.error || 'Failed to post comment.', 'error');
    }
  };

  // Assign action
  const openAssign = (ticket) => {
    setSelectedTicket(ticket);
    setAssignForm({ assigned_to: ticket.assigned_to || '' });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.assigned_to) {
      showToast('Please select an assignee.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await ticketApi.assign({
        id: selectedTicket.id,
        assigned_to: assignForm.assigned_to
      });
      showToast('Ticket assigned successfully.', 'success');
      setShowAssignModal(false);
      loadTickets();
      if (selectedTicket) refreshTicketDetails(selectedTicket.id);
    } catch (e) {
      showToast(e.data?.error || 'Failed to assign ticket.', 'error');
    }
    setSubmitting(false);
  };

  // Resolve action
  const openResolve = async (ticket) => {
    setSelectedTicket(ticket);
    setResolveForm({
      resolution_type: 'repaired',
      resolution_notes: '',
      replacement_asset_id: ''
    });
    setShowResolveModal(true);
    await refreshTicketDetails(ticket.id);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (resolveForm.resolution_type === 'replaced' && !resolveForm.replacement_asset_id) {
      showToast('Please select a replacement asset.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await ticketApi.resolve({
        id: selectedTicket.id,
        resolution_type: resolveForm.resolution_type,
        resolution_notes: resolveForm.resolution_notes,
        replacement_asset_id: resolveForm.replacement_asset_id || undefined
      });
      showToast('Ticket marked as resolved!', 'success');
      setShowResolveModal(false);
      loadTickets();
      if (selectedTicket) refreshTicketDetails(selectedTicket.id);
    } catch (e) {
      showToast(e.data?.error || 'Failed to resolve ticket.', 'error');
    }
    setSubmitting(false);
  };

  // Close action
  const handleClose = async (ticket) => {
    if (!await confirm('Close Support Ticket', `Are you sure you want to close ticket ${ticket.ticket_no}?`)) return;
    try {
      await ticketApi.close(ticket.id);
      showToast('Ticket closed successfully.', 'success');
      loadTickets();
      if (selectedTicket && selectedTicket.id === ticket.id) refreshTicketDetails(ticket.id);
    } catch (e) {
      showToast(e.data?.error || 'Failed to close ticket.', 'error');
    }
  };

  // Cancel action
  const openCancel = (ticket) => {
    setSelectedTicket(ticket);
    setCancelForm({ reason: '' });
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketApi.cancel({
        id: selectedTicket.id,
        reason: cancelForm.reason
      });
      showToast('Ticket cancelled successfully.', 'success');
      setShowCancelModal(false);
      loadTickets();
      if (selectedTicket) refreshTicketDetails(selectedTicket.id);
    } catch (e) {
      showToast(e.data?.error || 'Failed to cancel ticket.', 'error');
    }
    setSubmitting(false);
  };

  const getCategoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val;
  const getPriorityLabel = (val) => PRIORITIES.find(p => p.value === val)?.label || val;

  const getPriorityColor = (prio) => {
    switch (prio) {
      case 'low': return 'bg-slate-100 text-slate-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'high': return 'bg-amber-100 text-amber-700';
      case 'critical': return 'bg-rose-100 text-rose-700 font-semibold';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Ticketing</h1>
          <p className="text-slate-500 text-sm mt-1">Raise support requests, track resolution process, and view comments timeline</p>
        </div>
        {canAdd && (
          <button
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            onClick={openRaiseTicket}
          >
            <Plus size={18} /> Raise Ticket
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
        <div className="flex gap-3 flex-wrap items-center">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search by Title or Ticket Number..."
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
              { value: "pending", label: "Pending Approval" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
              { value: "cancelled", label: "Cancelled" }
            ]}
            value={statusFilter}
            onChange={val => { setStatusFilter(val); setPage(1); }}
            className="min-w-[170px]"
          />

          <SearchableSelect
            options={[
              { value: "", label: "All Priorities" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" }
            ]}
            value={priorityFilter}
            onChange={val => { setPriorityFilter(val); setPage(1); }}
            className="min-w-[170px]"
          />

          <SearchableSelect
            options={[
              { value: "", label: "All Categories" },
              ...CATEGORIES
            ]}
            value={categoryFilter}
            onChange={val => { setCategoryFilter(val); setPage(1); }}
            className="min-w-[180px]"
          />
        </div>

        {/* Tickets Table */}
        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2" />
              Loading tickets...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">{t('ticketId')}</th>
                      <th className="py-3 px-4">{t('subject')}</th>
                      <th className="py-3 px-4">{t('category')}</th>
                      <th className="py-3 px-4">{t('priority')}</th>
                      <th className="py-3 px-4">{t('status')}</th>
                      <th className="py-3 px-4">{t('raisedBy')}</th>
                      <th className="py-3 px-4">{t('assignee')}</th>
                      <th className="py-3 px-4">{t('lastUpdated')}</th>
                      <th className="py-3 px-4 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((tkt) => {
                      const canAssignThis = !['closed', 'cancelled'].includes(tkt.status) && (
                        isSuperAdminOrAdmin || (isLocationAdmin && (!tkt.assigned_to || ['pending', 'in_progress'].includes(tkt.status)))
                      );
                      const canResolveThis = tkt.status === 'in_progress' && (
                        isSuperAdminOrAdmin || (isITAdmin && parseInt(tkt.assigned_to) === parseInt(user?.id))
                      );
                      const canCloseThis = !['closed', 'cancelled'].includes(tkt.status) && (
                        isSuperAdminOrAdmin ||
                        (isITAdmin && tkt.assigned_to && parseInt(tkt.assigned_to) === parseInt(user?.id)) ||
                        (isRegularUser && tkt.status === 'resolved' && parseInt(tkt.user_id) === parseInt(user?.id))
                      );
                      const canCancelThis = !['closed', 'cancelled'].includes(tkt.status) && (
                        isSuperAdminOrAdmin ||
                        isLocationAdmin ||
                        (isITAdmin && tkt.assigned_to && parseInt(tkt.assigned_to) === parseInt(user?.id))
                      );

                      return (
                        <tr key={tkt.id} className="text-slate-700 text-sm hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{tkt.ticket_no}</td>
                          <td className="py-3.5 px-4 font-medium max-w-[200px] truncate">{tkt.title}</td>
                          <td className="py-3.5 px-4 text-xs">{t(getCategoryLabel(tkt.category))}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(tkt.priority)}`}>
                              {t(getPriorityLabel(tkt.priority))}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={tkt.status} />
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {tkt.reporter ? (
                              <div className="flex items-center gap-1">
                                <User size={13} className="text-slate-400" />
                                <span>{tkt.reporter.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {tkt.assignee ? (
                              <div className="flex items-center gap-1">
                                <User size={13} className="text-slate-400" />
                                <span>{tkt.assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium italic">{t('unassigned')}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(tkt.createdAt || tkt.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1 items-center">
                              <button
                                onClick={() => openViewDetails(tkt)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                                title={t('view')}
                              >
                                <Eye size={16} />
                              </button>
                              {canAssignThis && (
                                <button
                                  onClick={() => openAssign(tkt)}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 border-none bg-transparent cursor-pointer"
                                  title="Assign to IT Admin"
                                >
                                  <UserCheck size={16} />
                                </button>
                              )}
                              {canResolveThis && (
                                <button
                                  onClick={() => openResolve(tkt)}
                                  className="p-1.5 text-emerald-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 border-none bg-transparent cursor-pointer"
                                  title="Resolve Ticket"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              {canCancelThis && (
                                <button
                                  onClick={() => openCancel(tkt)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 border-none bg-transparent cursor-pointer"
                                  title={t('cancel')}
                                >
                                  <XCircle size={16} />
                                </button>
                              )}
                              {canCloseThis && (
                                <button
                                  onClick={() => handleClose(tkt)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                                  title={t('close')}
                                >
                                  <X size={16} />
                                </button>
                              )}
                              {isITAdmin && !tkt.assigned_to && !['closed', 'cancelled'].includes(tkt.status) && (
                                <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded">
                                  Awaiting Location Admin
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden space-y-4">
                {tickets.map((tkt) => {
                  const canAssignThis = !['closed', 'cancelled'].includes(tkt.status) && (
                    isSuperAdminOrAdmin || (isLocationAdmin && (!tkt.assigned_to || ['pending', 'in_progress'].includes(tkt.status)))
                  );
                  const canResolveThis = tkt.status === 'in_progress' && (
                    isSuperAdminOrAdmin || (isITAdmin && parseInt(tkt.assigned_to) === parseInt(user?.id))
                  );
                  const canCloseThis = !['closed', 'cancelled'].includes(tkt.status) && (
                    isSuperAdminOrAdmin ||
                    (isITAdmin && tkt.assigned_to && parseInt(tkt.assigned_to) === parseInt(user?.id)) ||
                    (isRegularUser && tkt.status === 'resolved' && parseInt(tkt.user_id) === parseInt(user?.id))
                  );
                  const canCancelThis = !['closed', 'cancelled'].includes(tkt.status) && (
                    isSuperAdminOrAdmin ||
                    isLocationAdmin ||
                    (isITAdmin && tkt.assigned_to && parseInt(tkt.assigned_to) === parseInt(user?.id))
                  );

                  return (
                    <div key={tkt.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-slate-400 font-semibold font-mono">{tkt.ticket_no}</span>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{tkt.title}</h4>
                        </div>
                        <StatusBadge status={tkt.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-b border-slate-100 py-2">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('category')}</span>
                          <span className="font-semibold text-slate-700">{t(getCategoryLabel(tkt.category))}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('priority')}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityColor(tkt.priority)}`}>
                            {t(getPriorityLabel(tkt.priority))}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('raisedBy')}</span>
                          <span className="font-semibold text-slate-700">{tkt.reporter?.name || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignee')}</span>
                          <span className="font-semibold text-slate-700">{tkt.assignee?.name || t('unassigned')}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('lastUpdated')}</span>
                          <span className="font-semibold text-slate-700">{new Date(tkt.createdAt || tkt.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1 items-center">
                        <button
                          onClick={() => openViewDetails(tkt)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-650 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye size={14} /> {t('view')}
                        </button>
                        {canAssignThis && (
                          <button
                            onClick={() => openAssign(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <UserCheck size={14} /> Assign
                          </button>
                        )}
                        {canResolveThis && (
                          <button
                            onClick={() => openResolve(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <CheckCircle size={14} /> Resolve
                          </button>
                        )}
                        {canCancelThis && (
                          <button
                            onClick={() => openCancel(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <XCircle size={14} /> {t('cancel')}
                          </button>
                        )}
                        {canCloseThis && (
                          <button
                            onClick={() => handleClose(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <X size={14} /> Close
                          </button>
                        )}
                        {isITAdmin && !tkt.assigned_to && !['closed', 'cancelled'].includes(tkt.status) && (
                          <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-1 rounded">
                            Awaiting Location Admin
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> tickets
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

      {/* Raise Ticket Modal */}
      {showRaiseModal && (
        <Modal isOpen={showRaiseModal} title="Raise Support Ticket" onClose={() => setShowRaiseModal(false)} overflowVisible={true}>
          <form onSubmit={handleRaiseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Asset Concerned *</label>
              <SearchableSelect
                options={[
                  { value: "", label: "General IT / No Specific Asset" },
                  ...myAssets.map(a => ({ value: a.id, label: `${a.asset_tag} - ${a.name} (${a.brand || 'No Brand'})` }))
                ]}
                value={raiseForm.asset_id}
                onChange={val => setRaiseForm({ ...raiseForm, asset_id: val })}
              />
              <p className="text-[11px] text-slate-400 mt-1">Select from assets currently allocated to you, or choose General IT.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category *</label>
                <SearchableSelect
                  options={CATEGORIES}
                  value={raiseForm.category}
                  onChange={val => setRaiseForm({ ...raiseForm, category: val })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority *</label>
                <SearchableSelect
                  options={PRIORITIES}
                  value={raiseForm.priority}
                  onChange={val => setRaiseForm({ ...raiseForm, priority: val })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title / Subject *</label>
              <input
                placeholder="Briefly state the issue (e.g. Blue screen on boot, RAM upgrade request)"
                value={raiseForm.title}
                onChange={e => setRaiseForm({ ...raiseForm, title: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Detailed Description *</label>
              <textarea
                placeholder="Provide details of the issue, error codes, steps to reproduce, etc."
                value={raiseForm.description}
                onChange={e => setRaiseForm({ ...raiseForm, description: e.target.value })}
                rows={4}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRaiseModal(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 border-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer"
                disabled={submitting}
              >
                {submitting ? 'Raising Ticket...' : 'Raise Ticket'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Ticket Details & Comments Timeline Modal */}
      {showDetailsModal && selectedTicket && (
        <Modal isOpen={showDetailsModal} title={`Ticket Timeline: ${selectedTicket.ticket_no}`} onClose={() => setShowDetailsModal(false)} size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* Left 2 Cols: Ticket details & Comments timeline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-base">{selectedTicket.title}</h3>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedTicket.description}</p>
                <div className="text-[11px] text-slate-400 mt-2">
                  Raised by {selectedTicket.reporter?.name} • Category: {getCategoryLabel(selectedTicket.category)}
                </div>
              </div>

              {/* Comments / Timeline header */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare size={14} /> Activity &amp; Comments
                </h4>

                {/* Timeline Box */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col">
                  {comments.length === 0 ? (
                    <p className="text-slate-400 text-xs italic text-center py-6">No activity logged yet.</p>
                  ) : (
                    comments.map((c) => {
                      const isSystem = c.type !== 'comment';
                      const isMe = parseInt(c.user_id) === parseInt(user?.id);
                      return (
                        <div key={c.id} className={`flex w-full ${isSystem ? 'justify-center my-1.5' : isMe ? 'justify-end' : 'justify-start'}`}>
                          {isSystem ? (
                            <div className="bg-slate-100 text-slate-500 rounded-full px-3.5 py-1 text-[10px] font-medium border border-slate-200 max-w-[90%] text-center shadow-2xs">
                              {c.message} <span className="text-[9px] text-slate-400 ml-1.5">• {new Date(c.createdAt || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : isMe ? (
                            <div className="flex flex-col items-end max-w-[75%]">
                              <span className="text-[10px] text-slate-400 font-semibold mb-1 mr-1">You</span>
                              <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-sm">
                                <p className="leading-relaxed whitespace-pre-wrap">{c.message}</p>
                                <span className="text-[9px] text-emerald-100/80 mt-1 block text-right">
                                  {new Date(c.createdAt || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2.5 max-w-[75%] items-start">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 mt-4">
                                {c.author?.name ? c.author.name[0].toUpperCase() : '?'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-semibold mb-1 ml-1">{c.author?.name || 'Unknown Agent'}</span>
                                <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm">
                                  <p className="leading-relaxed whitespace-pre-wrap">{c.message}</p>
                                  <span className="text-[9px] text-slate-400 mt-1 block">
                                    {new Date(c.createdAt || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Add Comment Input */}
                {!['closed', 'cancelled'].includes(selectedTicket.status) && (
                  <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                    <input
                      placeholder="Type a comment or status update..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer flex items-center justify-center transition-colors"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right 1 Col: Metadata & Info Panel */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4 h-fit">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ticket Info</span>
                <div className="mt-1.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Priority:</span>
                    <span className={`font-semibold capitalize text-${selectedTicket.priority === 'critical' ? 'rose' : 'slate'}-700`}>{selectedTicket.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-700">{getCategoryLabel(selectedTicket.category)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created:</span>
                    <span className="font-semibold text-slate-700">{new Date(selectedTicket.createdAt || selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {selectedTicket.asset && (
                <div className="border-t border-slate-200/60 pt-3">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Asset Details</span>
                  <div className="mt-1.5 text-xs space-y-1">
                    <p className="font-bold text-slate-800">{selectedTicket.asset.name}</p>
                    <p className="text-slate-500">Tag: <span className="font-mono text-slate-700">{selectedTicket.asset.asset_tag}</span></p>
                    <p className="text-slate-500">Type: <span className="text-slate-700">{selectedTicket.asset.type}</span></p>
                    {selectedTicket.asset.location && (
                      <p className="text-slate-500">Location: <span className="text-slate-700">{selectedTicket.asset.location.name}</span></p>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200/60 pt-3">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assignee</span>
                <p className="text-xs mt-1.5 font-semibold text-slate-700">
                  {selectedTicket.assignee ? selectedTicket.assignee.name : <span className="text-slate-400 italic">None</span>}
                </p>
              </div>

              {selectedTicket.resolution_type && (
                <div className="border-t border-slate-200/60 pt-3 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50">
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Resolution</span>
                  <div className="mt-1 text-xs space-y-1">
                    <p className="font-semibold capitalize text-emerald-800">{selectedTicket.resolution_type.replace(/_/g, ' ')}</p>
                    {selectedTicket.resolution_notes && (
                      <p className="text-slate-600 italic">&ldquo;{selectedTicket.resolution_notes}&rdquo;</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
          <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Assign Ticket Modal */}
      {showAssignModal && selectedTicket && (
        <Modal isOpen={showAssignModal} title={`Assign Ticket ${selectedTicket.ticket_no}`} onClose={() => setShowAssignModal(false)} overflowVisible={true}>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assign to IT Admin *</label>
              <SearchableSelect
                options={[
                  { value: "", label: "-- Select IT Admin --" },
                  ...admins.map(a => ({ value: a.id, label: `${a.name} (${a.email})` }))
                ]}
                value={assignForm.assigned_to}
                onChange={val => setAssignForm({ assigned_to: val })}
              />
              <p className="text-[11px] text-slate-400 mt-1">Ticket will be assigned to the selected IT Admin to begin work and resolution.</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2.5 border-none bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold cursor-pointer">
                {submitting ? 'Assigning...' : 'Assign to IT Admin'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Resolve Ticket Modal */}
      {showResolveModal && selectedTicket && (
        <Modal isOpen={showResolveModal} title={`Resolve Ticket ${selectedTicket.ticket_no}`} onClose={() => setShowResolveModal(false)} overflowVisible={true}>
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resolution Action *</label>
              <SearchableSelect
                options={RESOLUTION_TYPES}
                value={resolveForm.resolution_type}
                onChange={val => setResolveForm({ ...resolveForm, resolution_type: val })}
              />
            </div>

            {resolveForm.resolution_type === 'replaced' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Replacement Asset (From Location Available Stock) *</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "-- Select Available Replacement --" },
                    ...availableReplacements.map(a => ({ value: a.id, label: `${a.asset_tag} - ${a.name} (${a.brand || 'No Brand'})` }))
                  ]}
                  value={resolveForm.replacement_asset_id}
                  onChange={val => setResolveForm({ ...resolveForm, replacement_asset_id: val })}
                />
                {availableReplacements.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                    <ShieldAlert size={12} /> No available assets found at this location. Add assets to inventory first.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resolution Notes / Comments</label>
              <textarea
                placeholder="Describe actions taken to resolve the issue..."
                value={resolveForm.resolution_notes}
                onChange={e => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowResolveModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting || (resolveForm.resolution_type === 'replaced' && availableReplacements.length === 0)} className="px-5 py-2.5 border-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer">
                {submitting ? 'Resolving...' : 'Mark Resolved'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Ticket Modal */}
      {showCancelModal && selectedTicket && (
        <Modal isOpen={showCancelModal} title={`Cancel Ticket ${selectedTicket.ticket_no}`} onClose={() => setShowCancelModal(false)}>
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex gap-2">
              <AlertTriangle className="shrink-0" size={16} />
              <span>Cancelling this ticket will terminate the resolution process. This action is logged.</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Cancellation</label>
              <textarea
                placeholder="Reason (e.g. Raised by mistake, asset was found elsewhere)..."
                value={cancelForm.reason}
                onChange={e => setCancelForm({ ...cancelForm, reason: e.target.value })}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowCancelModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Close</button>
              <button type="submit" disabled={submitting} className="px-5 py-2.5 border-none bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold cursor-pointer">
                {submitting ? 'Cancelling...' : 'Cancel Ticket'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
