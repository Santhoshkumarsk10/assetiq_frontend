'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import AnimatedPageTitle from '@/components/AnimatedPageTitle';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import SearchableSelect from '@/components/SearchableSelect';
import { ticketApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import {
  Search,
  Plus,
  Eye,
  UserCheck,
  CheckCircle,
  XCircle,
  X,
  User,
  MessageSquare,
  Send,
  AlertTriangle,
  ShieldAlert,
  Zap,
  FileText,
  Layers,
  Filter,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const CATEGORIES = [
  { value: 'hardware_malfunction', label: 'Hardware Malfunction' },
  { value: 'software_issue', label: 'Software Issue' },
  { value: 'lost_stolen', label: 'Lost / Stolen' },
  { value: 'physical_damage', label: 'Physical Damage' },
  { value: 'general_it', label: 'General IT' },
  { value: 'other', label: 'Other' }
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

function PageSizeSelect({ value, onChange }) {
  return (
    <div className="relative inline-flex items-center shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Rows per page"
        className="appearance-none bg-slate-50 hover:bg-slate-100/90 text-slate-700 text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors shadow-2xs"
      >
        <option value={5}>5 / page</option>
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function TablePagination({ currentPage, totalItems, limit, onPageChange, onLimitChange, currentItemsCount = 0 }) {
  const effectiveTotal = Math.max(Number(totalItems) || 0, Number(currentItemsCount) || 0);
  if (effectiveTotal === 0) return null;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / limit));

  const getVisiblePages = (current, total) => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }
    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="border-t border-slate-100 p-3 sm:p-4 bg-white">
      {/* Desktop Pagination */}
      <div className="hidden sm:flex justify-between items-center gap-4">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * limit + 1, effectiveTotal)}</span> to{" "}
          <span className="font-semibold text-slate-700">{Math.min(currentPage * limit, effectiveTotal)}</span> of{" "}
          <span className="font-semibold text-slate-700">{effectiveTotal}</span> tickets
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelect
            value={limit}
            onChange={(newLimit) => {
              onLimitChange(newLimit);
              onPageChange(1);
            }}
          />
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors" 
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))} 
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {visiblePages.map(p => (
                <button 
                  key={p} 
                  type="button"
                  className={currentPage === p 
                    ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer shadow-2xs" 
                    : "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                  } 
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              ))}
              <button 
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors" 
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Pagination */}
      <div className="flex sm:hidden flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            {Math.min((currentPage - 1) * limit + 1, effectiveTotal)}-{Math.min(currentPage * limit, effectiveTotal)} of {effectiveTotal}
          </span>
          <PageSizeSelect
            value={limit}
            onChange={(newLimit) => {
              onLimitChange(newLimit);
              onPageChange(1);
            }}
          />
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button 
              type="button"
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center" 
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))} 
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="text-xs font-semibold text-slate-600 px-2 whitespace-nowrap">
              {currentPage} / {totalPages}
            </span>
            <button 
              type="button"
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center" 
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))} 
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [summary, setSummary] = useState(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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
  const [otherCategory, setOtherCategory] = useState('');
  const commentsEndRef = useRef(null);

  // Scroll locking for modals & filter drawer
  useEffect(() => {
    if (showFilterSheet || showRaiseModal || showDetailsModal || showAssignModal || showResolveModal || showCancelModal) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => unlockScroll();
  }, [showFilterSheet, showRaiseModal, showDetailsModal, showAssignModal, showResolveModal, showCancelModal]);

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
      setSummary(data.summary || null);
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

  const initialized = useRef(false);

  // Initial & Filter load
  useEffect(() => {
    const stored = sessionStorage.getItem("ticket_list_filters");
    if (stored) {
      try {
        const filters = JSON.parse(stored);
        if (filters.search !== undefined) {
          setSearch(filters.search);
          setSearchInput(filters.search);
        }
        if (filters.statusFilter !== undefined) setStatusFilter(filters.statusFilter);
        if (filters.priorityFilter !== undefined) setPriorityFilter(filters.priorityFilter);
        if (filters.categoryFilter !== undefined) setCategoryFilter(filters.categoryFilter);
        if (filters.page !== undefined) setPage(filters.page);
      } catch (e) {
        console.error(e);
      }
    }
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const filters = {
      search,
      statusFilter,
      priorityFilter,
      categoryFilter,
      page
    };
    sessionStorage.setItem("ticket_list_filters", JSON.stringify(filters));
  }, [search, statusFilter, priorityFilter, categoryFilter, page]);

  useEffect(() => {
    loadTickets();
  }, [page, limit, search, statusFilter, priorityFilter, categoryFilter, loadTickets]);

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

  const handleResetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const activeFilterCount = [statusFilter, priorityFilter, categoryFilter].filter(Boolean).length;

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
    setOtherCategory('');
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
    if (raiseForm.category === 'other' && !otherCategory.trim()) {
      showToast('Please specify the category.', 'error');
      return;
    }

    const categoryValue = raiseForm.category === 'other'
      ? otherCategory.trim()
      : raiseForm.category;

    setSubmitting(true);
    try {
      await ticketApi.raise({
        asset_id: raiseForm.asset_id || null,
        category: categoryValue,
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

  const totalTicketsCount = summary?.totalTicketsCount ?? total;
  const pendingTicketsCount = summary?.pendingTicketsCount ?? 0;
  const progressTicketsCount = summary?.progressTicketsCount ?? 0;
  const resolvedTicketsCount = summary?.resolvedTicketsCount ?? 0;
  const closedTicketsCount = summary?.closedTicketsCount ?? 0;

  const PRIORITY_LABELS = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL"
  };
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const STATUS_COLORS = {
    pending: "#f59e0b",
    in_progress: "#3b82f6",
    resolved: "#10b981",
    closed: "#64748b",
    cancelled: "#ef4444"
  };

  const priorityRawMap = summary?.ticketPriorityMap || {};
  const ticketPriorityBreakdown = Object.keys(priorityRawMap).map((key) => ({
    name: PRIORITY_LABELS[key] || key?.toUpperCase() || "MEDIUM",
    value: priorityRawMap[key],
  }));

  const ticketStatusBreakdown = [
    { name: "Pending", value: pendingTicketsCount },
    { name: "In Progress", value: progressTicketsCount },
    { name: "Resolved", value: resolvedTicketsCount },
    { name: "Closed", value: closedTicketsCount },
    { name: "Cancelled", value: summary?.cancelledTicketsCount || 0 }
  ].filter(item => item.value > 0);

  return (
    <AppLayout>
      <div className="mx-auto space-y-4 sm:space-y-6 pt-3 sm:pt-5 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <AnimatedPageTitle title="Support Ticketing" />
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Manage IT support requests, hardware incidents, and resolution tracking.
            </p>
          </div>
          {canAdd && (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs w-full sm:w-auto shrink-0"
              onClick={openRaiseTicket}
            >
              <Plus size={16} /> Raise Ticket
            </button>
          )}
        </div>

        {/* Compact Single-Container Statistics Overview */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-2 sm:p-3">
          <div className="grid grid-cols-5 divide-x divide-slate-100">
            {/* Stat 1: Total */}
            <div
              onClick={() => { setStatusFilter(""); setPage(1); }}
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-1 sm:py-1.5 text-center sm:text-left min-w-0 rounded-xl cursor-pointer transition-all ${
                statusFilter === "" ? "bg-slate-100/90 ring-1 ring-slate-300" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Total</span>
                <div className="text-xs sm:text-xl font-bold text-slate-900 tracking-tight leading-tight mt-0.5 font-mono">
                  {totalTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 2: Pending */}
            <div
              onClick={() => { setStatusFilter("pending"); setPage(1); }}
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-1 sm:py-1.5 text-center sm:text-left min-w-0 rounded-xl cursor-pointer transition-all ${
                statusFilter === "pending" ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Pending</span>
                <div className="text-xs sm:text-xl font-bold text-amber-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {pendingTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 3: In Progress */}
            <div
              onClick={() => { setStatusFilter("in_progress"); setPage(1); }}
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-1 sm:py-1.5 text-center sm:text-left min-w-0 rounded-xl cursor-pointer transition-all ${
                statusFilter === "in_progress" ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Progress</span>
                <div className="text-xs sm:text-xl font-bold text-blue-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {progressTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 4: Resolved */}
            <div
              onClick={() => { setStatusFilter("resolved"); setPage(1); }}
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-1 sm:py-1.5 text-center sm:text-left min-w-0 rounded-xl cursor-pointer transition-all ${
                statusFilter === "resolved" ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Resolved</span>
                <div className="text-xs sm:text-xl font-bold text-emerald-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {resolvedTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat 5: Closed */}
            <div
              onClick={() => { setStatusFilter("closed"); setPage(1); }}
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 px-1 sm:px-3 py-1 sm:py-1.5 text-center sm:text-left min-w-0 rounded-xl cursor-pointer transition-all ${
                statusFilter === "closed" ? "bg-slate-200 ring-1 ring-slate-400" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-slate-200 text-slate-600 border border-slate-300/70 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle size={15} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-medium text-slate-500 truncate">Closed</span>
                <div className="text-xs sm:text-xl font-bold text-slate-700 tracking-tight leading-tight mt-0.5 font-mono">
                  {closedTicketsCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-3 sm:space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" /> Tickets Priority Breakdown
            </h3>
            <div className="h-64 sm:h-72">
              {ticketPriorityBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketPriorityBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {ticketPriorityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white space-y-3 sm:space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter size={16} className="text-emerald-600" /> Ticket Status Share
            </h3>
            <div className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
              {ticketStatusBreakdown.length === 0 ? (
                <div className="text-xs text-slate-400 font-bold">No data available</div>
              ) : (
                <>
                  <div className="flex-1 h-44 sm:h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketStatusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {ticketStatusBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-2.5 shrink-0 justify-center">
                    {ticketStatusBreakdown.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3 h-3 rounded-md shrink-0"
                          style={{
                            backgroundColor: STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] || COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="font-semibold text-slate-600">{entry.name}:</span>
                        <span className="font-extrabold text-slate-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Filter Toolbar */}
        <div className="hidden md:flex flex-col gap-3 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by Title or Ticket Number (Press Enter)..."
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Status Select */}
            <div className="w-[170px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Status" },
                  { value: "pending", label: "Pending Approval" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                  { value: "cancelled", label: "Cancelled" }
                ]}
                value={statusFilter}
                onChange={val => { setStatusFilter(val); setPage(1); }}
                className="w-full"
              />
            </div>

            {/* Priority Select */}
            <div className="w-[160px] shrink-0">
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
                className="w-full"
              />
            </div>

            {/* Category Select */}
            <div className="w-[180px] shrink-0">
              <SearchableSelect
                options={[
                  { value: "", label: "All Categories" },
                  ...CATEGORIES
                ]}
                value={categoryFilter}
                onChange={val => { setCategoryFilter(val); setPage(1); }}
                className="w-full"
              />
            </div>

            {/* Clear Button */}
            {(activeFilterCount > 0 || search) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
                title="Reset all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search & Filter Bar */}
        <div className="block md:hidden">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 shadow-2xs transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="border-none bg-transparent outline-none text-xs text-slate-800 w-full placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Single Filter Button Trigger */}
            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 text-xs font-semibold ${
                activeFilterCount > 0
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
              aria-label="Filter Tickets"
              title="Filter Tickets"
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Badges on Mobile */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 text-xs custom-scrollbar">
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {statusFilter.replace("_", " ")}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setStatusFilter("")}
                  />
                </span>
              )}
              {priorityFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0 capitalize">
                  {priorityFilter}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setPriorityFilter("")}
                  />
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium shrink-0">
                  {getCategoryLabel(categoryFilter)}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-emerald-900"
                    onClick={() => setCategoryFilter("")}
                  />
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-transparent border-none cursor-pointer underline shrink-0 px-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Tickets Table & Mobile Cards */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-2" />
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-medium">
              No support tickets found matching your filters.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
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
                        <tr key={tkt.id} className="text-slate-700 text-xs hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{tkt.ticket_no}</td>
                          <td className="py-3.5 px-4 font-medium max-w-[200px] truncate" title={tkt.title}>{tkt.title}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">{t(getCategoryLabel(tkt.category))}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(tkt.priority)}`}>
                              {t(getPriorityLabel(tkt.priority))}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={tkt.status} />
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {tkt.reporter ? (
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-800">{tkt.reporter.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {tkt.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-800">{tkt.assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium italic">{t('unassigned')}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(tkt.createdAt || tkt.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1 items-center">
                              <button
                                type="button"
                                onClick={() => openViewDetails(tkt)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
                                title={t('view')}
                              >
                                <Eye size={16} />
                              </button>
                              {canAssignThis && (
                                <button
                                  type="button"
                                  onClick={() => openAssign(tkt)}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 border-none bg-transparent cursor-pointer transition-colors"
                                  title="Assign to IT Admin"
                                >
                                  <UserCheck size={16} />
                                </button>
                              )}
                              {canResolveThis && (
                                <button
                                  type="button"
                                  onClick={() => openResolve(tkt)}
                                  className="p-1.5 text-emerald-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 border-none bg-transparent cursor-pointer transition-colors"
                                  title="Resolve Ticket"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              {canCancelThis && (
                                <button
                                  type="button"
                                  onClick={() => openCancel(tkt)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 border-none bg-transparent cursor-pointer transition-colors"
                                  title={t('cancel')}
                                >
                                  <XCircle size={16} />
                                </button>
                              )}
                              {canCloseThis && (
                                <button
                                  type="button"
                                  onClick={() => handleClose(tkt)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
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
              <div className="block md:hidden divide-y divide-slate-100">
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
                    <div key={tkt.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-xs text-slate-400 font-bold font-mono">{tkt.ticket_no}</span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5 break-words">{tkt.title}</h4>
                        </div>
                        <StatusBadge status={tkt.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/90">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('category')}</span>
                          <span className="font-semibold text-slate-700 truncate block">{t(getCategoryLabel(tkt.category))}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('priority')}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(tkt.priority)}`}>
                            {t(getPriorityLabel(tkt.priority))}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('raisedBy')}</span>
                          <span className="font-semibold text-slate-700 truncate block">{tkt.reporter?.name || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('assignee')}</span>
                          <span className="font-semibold text-slate-700 truncate block">{tkt.assignee?.name || t('unassigned')}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-200/50 flex justify-between items-center text-[11px] text-slate-400">
                          <span>{t('lastUpdated')}:</span>
                          <span className="font-semibold text-slate-600">{new Date(tkt.createdAt || tkt.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-1.5 pt-1 items-center">
                        <button
                          type="button"
                          onClick={() => openViewDetails(tkt)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} /> {t('view')}
                        </button>
                        {canAssignThis && (
                          <button
                            type="button"
                            onClick={() => openAssign(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <UserCheck size={13} /> Assign
                          </button>
                        )}
                        {canResolveThis && (
                          <button
                            type="button"
                            onClick={() => openResolve(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <CheckCircle size={13} /> Resolve
                          </button>
                        )}
                        {canCancelThis && (
                          <button
                            type="button"
                            onClick={() => openCancel(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <XCircle size={13} /> {t('cancel')}
                          </button>
                        )}
                        {canCloseThis && (
                          <button
                            type="button"
                            onClick={() => handleClose(tkt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <X size={13} /> Close
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

          {/* Persistent Pagination */}
          <TablePagination
            currentPage={page}
            totalItems={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            currentItemsCount={tickets.length}
          />
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet Drawer */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-[500] md:hidden" onClick={() => setShowFilterSheet(false)}>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-sheet-fade-in" />

          {/* Bottom Sheet Drawer */}
          <div
            className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-[501] flex flex-col animate-sheet-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Filter Tickets</h3>
                {activeFilterCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ticket Status</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Status" },
                    { value: "pending", label: "Pending Approval" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" },
                    { value: "cancelled", label: "Cancelled" }
                  ]}
                  value={statusFilter}
                  onChange={(val) => { setStatusFilter(val); setPage(1); }}
                  className="w-full"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priority Level</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Priorities" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "critical", label: "Critical" }
                  ]}
                  value={priorityFilter}
                  onChange={(val) => { setPriorityFilter(val); setPage(1); }}
                  className="w-full"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Categories" },
                    ...CATEGORIES
                  ]}
                  value={categoryFilter}
                  onChange={(val) => { setCategoryFilter(val); setPage(1); }}
                  className="w-full"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl bg-white cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer border-none"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category *</label>
                <SearchableSelect
                  options={CATEGORIES}
                  value={raiseForm.category}
                  onChange={val => {
                    setRaiseForm({ ...raiseForm, category: val });
                    if (val !== 'other') setOtherCategory('');
                  }}
                />
                {raiseForm.category === 'other' && (
                  <input
                    type="text"
                    placeholder="Please specify the category..."
                    value={otherCategory}
                    onChange={e => setOtherCategory(e.target.value)}
                    className="mt-2 w-full text-xs sm:text-sm border border-emerald-300 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800 bg-emerald-50/30 placeholder-slate-400"
                    autoFocus
                  />
                )}
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
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
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
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRaiseModal(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 sm:px-5 py-2 sm:py-2.5 border-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Left 2 Cols: Ticket details & Comments timeline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base break-words">{selectedTicket.title}</h3>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap break-words">{selectedTicket.description}</p>
                <div className="text-[11px] text-slate-400 mt-2">
                  Raised by {selectedTicket.reporter?.name} • Category: {getCategoryLabel(selectedTicket.category)}
                </div>
              </div>

              {/* Comments / Timeline header */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <MessageSquare size={14} /> Activity &amp; Comments
                </h4>

                {/* Timeline Box */}
                <div className="space-y-3 sm:space-y-4 max-h-[350px] overflow-y-auto pr-2 bg-slate-50/50 p-3 sm:p-4 rounded-xl border border-slate-100 flex flex-col">
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
                            <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
                              <span className="text-[10px] text-slate-400 font-semibold mb-1 mr-1">You</span>
                              <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-none px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-sm text-xs sm:text-sm">
                                <p className="leading-relaxed whitespace-pre-wrap break-words">{c.message}</p>
                                <span className="text-[9px] text-emerald-100/80 mt-1 block text-right">
                                  {new Date(c.createdAt || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 max-w-[85%] sm:max-w-[75%] items-start">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 mt-3 sm:mt-4">
                                {c.author?.name ? c.author.name[0].toUpperCase() : '?'}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-semibold mb-1 ml-1 truncate">{c.author?.name || 'Unknown Agent'}</span>
                                <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-sm text-xs sm:text-sm">
                                  <p className="leading-relaxed whitespace-pre-wrap break-words">{c.message}</p>
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
                      className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
                    />
                    <button
                      type="submit"
                      className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer flex items-center justify-center transition-colors shadow-2xs shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right 1 Col: Metadata & Info Panel */}
            <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-xl space-y-3 sm:space-y-4 h-fit">
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
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
              <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 sm:px-5 py-2 sm:py-2.5 border-none bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-xs">
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
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowResolveModal(false)} className="px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting || (resolveForm.resolution_type === 'replaced' && availableReplacements.length === 0)} className="px-4 sm:px-5 py-2 sm:py-2.5 border-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-xs">
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
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex gap-2">
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
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowCancelModal(false)} className="px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Close</button>
              <button type="submit" disabled={submitting} className="px-4 sm:px-5 py-2 sm:py-2.5 border-none bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-xs">
                {submitting ? 'Cancelling...' : 'Cancel Ticket'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
