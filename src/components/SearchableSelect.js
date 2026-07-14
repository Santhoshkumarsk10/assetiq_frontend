import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function SearchableSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option", 
  searchPlaceholder = "Search...", 
  disabled = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt =>
    String(opt.label).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-850 outline-none bg-white focus:border-emerald-500 transition-colors flex justify-between items-center cursor-pointer text-left ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-55' : ''
        }`}
      >
        <span className={selectedOption ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              className="w-full bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 focus:ring-0"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer flex items-center justify-between ${
                    String(opt.value) === String(value) ? 'bg-slate-100 font-semibold text-slate-900' : ''
                  }`}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && <Check size={14} className="text-emerald-600 shrink-0" />}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-3 text-xs text-slate-400 text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
