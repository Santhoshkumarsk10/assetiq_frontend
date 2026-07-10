export default function StatusBadge({ status }) {
  const map = {
    active: { containerCls: 'bg-emerald-50 text-emerald-700', dotCls: 'bg-emerald-500', label: 'Active' },
    available: { containerCls: 'bg-emerald-50 text-emerald-700', dotCls: 'bg-emerald-500', label: 'Available' },
    allocated: { containerCls: 'bg-blue-50 text-blue-600', dotCls: 'bg-blue-500', label: 'In Use' },
    maintenance: { containerCls: 'bg-amber-50 text-amber-800', dotCls: 'bg-amber-500', label: 'Under Repair' },
    inactive: { containerCls: 'bg-rose-50 text-rose-600', dotCls: 'bg-rose-500', label: 'Inactive' },
    retired: { containerCls: 'bg-rose-50 text-rose-600', dotCls: 'bg-rose-500', label: 'Retired' },
    pending: { containerCls: 'bg-amber-50 text-amber-800', dotCls: 'bg-amber-500', label: 'Pending' },
    approved: { containerCls: 'bg-emerald-50 text-emerald-700', dotCls: 'bg-emerald-500', label: 'Approved' },
    rejected: { containerCls: 'bg-rose-50 text-rose-600', dotCls: 'bg-rose-500', label: 'Rejected' },
    completed: { containerCls: 'bg-emerald-50 text-emerald-700', dotCls: 'bg-emerald-500', label: 'Completed' },
    resigned: { containerCls: 'bg-amber-50 text-amber-800', dotCls: 'bg-amber-500', label: 'Resigned' },
  };

  const info = map[status?.toLowerCase()] || { containerCls: 'bg-slate-100 text-slate-600', dotCls: 'bg-slate-400', label: status || 'Unknown' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${info.containerCls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dotCls}`} />
      {info.label}
    </span>
  );
}
