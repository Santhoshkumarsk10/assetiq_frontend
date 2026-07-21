'use client';
import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const popoverRef = useRef(null);

  // Parse date strings to Date objects when props change
  useEffect(() => {
    setTempStart(startDate ? new Date(startDate) : null);
    setTempEnd(endDate ? new Date(endDate) : null);
  }, [startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    const startStr = tempStart ? tempStart.toISOString().split('T')[0] : '';
    const endStr = tempEnd ? tempEnd.toISOString().split('T')[0] : '';
    onChange(startStr, endStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange('', '');
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    
    // Normalize to midnight for accurate comparisons
    const dateClicked = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateClicked);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (dateClicked < tempStart) {
        setTempStart(dateClicked);
      } else {
        setTempEnd(dateClicked);
      }
    }
  };

  // Helper to format Date back to display format
  const formatDateDisplay = (date) => {
    if (!date) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Generate calendar days for currentMonth
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

  // Check state helpers
  const isSelected = (day) => {
    if (!day) return false;
    const dStr = day.toDateString();
    return (tempStart && tempStart.toDateString() === dStr) || (tempEnd && tempEnd.toDateString() === dStr);
  };

  const isInRange = (day) => {
    if (!day || !tempStart || !tempEnd) return false;
    return day > tempStart && day < tempEnd;
  };

  const displayLabel = tempStart && tempEnd 
    ? `${formatDateDisplay(tempStart)} - ${formatDateDisplay(tempEnd)}`
    : tempStart
    ? `From ${formatDateDisplay(tempStart)}`
    : tempEnd
    ? `Until ${formatDateDisplay(tempEnd)}`
    : 'Select Dates';

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-350 text-slate-700 font-medium flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs"
      >
        <span className="flex items-center gap-2 text-slate-600 truncate">
          <CalendarIcon size={16} className="text-slate-400 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[280px] sm:w-[300px] bg-white border border-slate-200 rounded-2xl shadow-xl z-[1050] p-4 flex flex-col gap-3">
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
              const inRange = isInRange(day);

              return (
                <button
                  key={day.getTime()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-7 w-7 text-xs font-bold rounded-full flex items-center justify-center border-none cursor-pointer transition-all ${
                    selected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : inRange
                      ? "bg-emerald-50 text-emerald-700 rounded-none w-full"
                      : "text-slate-650 hover:bg-slate-100"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Selected Info display */}
          <div className="text-[10px] text-slate-455 font-semibold border-t border-slate-50 pt-2 flex flex-col gap-0.5">
            <div><span className="text-slate-400">Start:</span> {tempStart ? formatDateDisplay(tempStart) : 'None'}</div>
            <div><span className="text-slate-400">End:</span> {tempEnd ? formatDateDisplay(tempEnd) : 'None'}</div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg border-none bg-transparent cursor-pointer font-semibold"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg border-none cursor-pointer font-bold"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
