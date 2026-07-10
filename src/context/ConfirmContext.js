'use client';
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState({});
  const resolverRef = useRef(null);

  const confirm = useCallback((confirmTitle, confirmMessage, confirmOptions = {}) => {
    setTitle(confirmTitle);
    setMessage(confirmMessage);
    setOptions({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'danger', // 'danger' | 'warning' | 'info'
      ...confirmOptions
    });
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) resolverRef.current(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) resolverRef.current(true);
  };

  const getConfirmButtonStyles = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      default:
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                options.type === 'danger' ? 'bg-rose-50 text-rose-600' :
                options.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-950 mb-1">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 flex justify-end gap-2.5 border-t border-slate-100">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 border-none rounded-lg cursor-pointer transition-colors"
              >
                {options.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-xs font-semibold border-none rounded-lg cursor-pointer transition-colors ${getConfirmButtonStyles(options.type)}`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
