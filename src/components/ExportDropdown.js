'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';

export default function ExportDropdown({ onExport, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50 border-none"
      >
        <Download size={16} />
        Export
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-30 bg-white border border-slate-200 rounded-xl shadow-xl z-[1000] py-1 overflow-hidden">
          <button
            onClick={() => {
              onExport('excel');
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer font-medium"
          >
            <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
            Excel
          </button>
          <button
            onClick={() => {
              onExport('pdf');
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer font-medium"
          >
            <FileText size={16} className="text-rose-600 shrink-0" />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
