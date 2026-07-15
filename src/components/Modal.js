'use client';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', overflowVisible = false }) {
  if (!isOpen) return null;

  const maxWidthClass = size === 'lg' ? 'max-w-[850px]' : size === 'xl' ? 'max-w-[1100px]' : 'max-w-[520px]';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[500] backdrop-blur-xs px-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidthClass} max-h-[90vh] ${overflowVisible ? 'overflow-visible' : 'overflow-y-auto'} flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button className="w-[34px] h-[34px] p-0 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={onClose}><X size={20} /></button>
        </div>
        <div className={`p-6 ${overflowVisible ? 'overflow-visible' : 'overflow-y-auto'} flex-1`}>{children}</div>
        {footer && <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
