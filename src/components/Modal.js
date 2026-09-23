'use client';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', overflowVisible = false }) {
  if (!isOpen) return null;

  const maxWidthClass = size === 'lg' ? 'sm:max-w-[920px]' : size === 'xl' ? 'sm:max-w-[1150px]' : 'sm:max-w-[560px]';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[500] backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-sheet-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl sm:shadow-xl w-full ${maxWidthClass} max-h-[88vh] sm:max-h-[90vh] flex flex-col max-sm:animate-sheet-slide-up overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle Indicator */}
        <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1 shrink-0 bg-white">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Dialog Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4.5 border-b border-slate-100 shrink-0 bg-white">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate pr-2">{title}</h2>
          <button
            type="button"
            className="w-8 h-8 sm:w-[34px] sm:h-[34px] p-0 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Dialog Body (Scrollable) */}
        <div className={`p-4 sm:p-6 ${overflowVisible ? 'overflow-y-auto sm:overflow-visible' : 'overflow-y-auto'} flex-1 overscroll-contain`}>
          {children}
        </div>

        {/* Sticky Fixed Footer */}
        {footer && (
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-2 sm:gap-2.5 shrink-0 z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

