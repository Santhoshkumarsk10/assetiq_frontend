'use client';
import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ value, onChange, placeholder = "Select date", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const popoverRef = useRef(null);

  // Sync current month view when value changes
  useEffect(() => {
    if (value) {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        setCurrentMonth(parsedDate);
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const formatted = day.toISOString().split('T')[0];
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];
    onChange(formatted);
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const isSelected = (day) => {
    if (!day || !value) return false;
    const dateClicked = day.toISOString().split('T')[0];
    return value === dateClicked;
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return day.getDate() === today.getDate() &&
           day.getMonth() === today.getMonth() &&
           day.getFullYear() === today.getFullYear();
  };

  const displayLabel = value ? formatDateDisplay(value) : placeholder;

  return (
    <div className={`relative inline-block text-left w-full ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white hover:border-slate-350 text-slate-700 font-medium flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs"
      >
        <span className="flex items-center gap-2 text-slate-650 truncate">
          <CalendarIcon size={15} className="text-slate-400 shrink-0" />
          <span className={`truncate ${!value ? 'text-slate-400 font-normal' : 'text-slate-800'}`}>{displayLabel}</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-xl z-[1050] p-4 flex flex-col gap-3 animate-in fade-in duration-100">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg border-none cursor-pointer bg-transparent"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-800">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg border-none cursor-pointer bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[10px] font-bold text-slate-400 uppercase py-0.5">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-7 w-7" />;
              
              const selected = isSelected(day);
              const todayFlag = isToday(day);

              return (
                <button
                  key={day.getTime()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-7 w-7 text-xs font-semibold rounded-full flex items-center justify-center border-none cursor-pointer transition-all ${
                    selected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : todayFlag
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                      : "text-slate-650 hover:bg-slate-100"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg border-none bg-transparent cursor-pointer font-bold transition-all"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-xs text-slate-400 hover:bg-slate-50 rounded-lg border-none bg-transparent cursor-pointer font-semibold transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
