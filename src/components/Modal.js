'use client';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[500] backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button className="w-[34px] h-[34px] p-0 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );
}
