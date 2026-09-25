'use client';

export default function CountryFlag({ code, className = "w-[19px] h-[13px] rounded-[2px] border border-slate-200/90 shadow-2xs shrink-0 inline-block overflow-hidden align-middle" }) {
  const c = String(code || '').toLowerCase();

  switch (c) {
    case 'gb':
    case 'en':
    case 'uk':
      return (
        <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="United Kingdom Flag">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0 0l60 30m0-30L0 30" stroke="#ffffff" strokeWidth="6" />
          <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="2.5" />
          <path d="M30 0v30M0 15h60" stroke="#ffffff" strokeWidth="10" />
          <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      );

    case 'in':
    case 'hi':
    case 'ta':
      return (
        <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="India Flag">
          <rect width="60" height="10" fill="#FF9933" />
          <rect y="10" width="60" height="10" fill="#FFFFFF" />
          <rect y="20" width="60" height="10" fill="#138808" />
          <circle cx="30" cy="15" r="4.2" fill="none" stroke="#000080" strokeWidth="0.8" />
          <circle cx="30" cy="15" r="1.1" fill="#000080" />
          <g stroke="#000080" strokeWidth="0.5">
            <line x1="30" y1="11" x2="30" y2="19" />
            <line x1="26" y1="15" x2="34" y2="15" />
            <line x1="27.2" y1="12.2" x2="32.8" y2="17.8" />
            <line x1="27.2" y1="17.8" x2="32.8" y2="12.2" />
            <line x1="28.5" y1="11.2" x2="31.5" y2="18.8" />
            <line x1="31.5" y1="11.2" x2="28.5" y2="18.8" />
            <line x1="26.2" y1="13.5" x2="33.8" y2="16.5" />
            <line x1="26.2" y1="16.5" x2="33.8" y2="13.5" />
          </g>
        </svg>
      );

    case 'my':
    case 'ms':
      return (
        <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Malaysia Flag">
          <rect width="60" height="30" fill="#CC0000" />
          <rect y={30 * 1 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect y={30 * 3 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect y={30 * 5 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect y={30 * 7 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect y={30 * 9 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect y={30 * 11 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect y={30 * 13 / 14} width="60" height={30 / 14} fill="#FFFFFF" />
          <rect width="30" height={30 * 8 / 14} fill="#000066" />
          <circle cx="12" cy="8.5" r="5.5" fill="#FFCC00" />
          <circle cx="13.6" cy="8.5" r="4.6" fill="#000066" />
          <circle cx="19.5" cy="8.5" r="3.2" fill="#FFCC00" />
        </svg>
      );

    case 'ke':
    case 'sw':
      return (
        <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Kenya Flag">
          <rect width="60" height="9" fill="#000000" />
          <rect y="9" width="60" height="1.5" fill="#FFFFFF" />
          <rect y="10.5" width="60" height="9" fill="#BB0000" />
          <rect y="19.5" width="60" height="1.5" fill="#FFFFFF" />
          <rect y="21" width="60" height="9" fill="#006600" />
          <ellipse cx="30" cy="15" rx="4.8" ry="7.8" fill="#880000" stroke="#000000" strokeWidth="0.8" />
          <ellipse cx="30" cy="15" rx="1.8" ry="7.2" fill="#FFFFFF" />
          <circle cx="30" cy="15" r="1.3" fill="#000000" />
          <line x1="24" y1="8.5" x2="36" y2="21.5" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="36" y1="8.5" x2="24" y2="21.5" stroke="#FFFFFF" strokeWidth="0.8" />
        </svg>
      );

    case 'ae':
    case 'ar':
      return (
        <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="United Arab Emirates Flag">
          <rect x="15" width="45" height="10" fill="#00732F" />
          <rect x="15" y="10" width="45" height="10" fill="#FFFFFF" />
          <rect x="15" y="20" width="45" height="10" fill="#000000" />
          <rect width="15" height="30" fill="#FF0000" />
        </svg>
      );

    default:
      return (
        <span className="w-4 h-3 bg-slate-200 text-[10px] font-mono rounded-[2px] inline-flex items-center justify-center uppercase font-bold text-slate-600">
          {c.substring(0, 2)}
        </span>
      );
  }
}
