'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Bell, Menu, Globe } from 'lucide-react';

const languagesList = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ms', label: 'Melayu', flag: '🇲🇾' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ar', label: 'العربية', flag: '🇦🇪' },
];

export default function TopBar({ isOpen, toggleSidebar }) {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const dropRef = useRef(null);
  const langDropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false);
      if (langDropRef.current && !langDropRef.current.contains(e.target)) setShowLangDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const currentLanguageObject = languagesList.find(l => l.code === language) || languagesList[0];

  return (
    <header className={`fixed top-0 right-0 h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-7 z-[90] transition-all duration-300 ${
      isOpen ? 'left-[220px]' : 'left-[80px]'
    }`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar} 
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>
        {/* <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-[320px] text-slate-400 text-sm">
          <Search size={16} />
          <input placeholder={t('searchPlaceholder')} readOnly className="border-none bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-400" />
        </div> */}
      </div>
      <div className="flex items-center gap-4">
        {/* Language Selector Dropdown */}
        <div ref={langDropRef} className="relative">
          <button 
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer text-sm font-medium"
            title={t('language')}
          >
            <Globe size={16} className="text-slate-400 animate-pulse" />
            <span>{currentLanguageObject?.flag}</span>
            <span className="hidden sm:inline">{currentLanguageObject?.label}</span>
          </button>
          {showLangDropdown && (
            <div className="absolute top-11 right-0 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[150px] z-[200] py-1.5">
              {languagesList.map((lang) => (
                <button
                  key={lang.code}
                  className={`flex items-center gap-3 px-4 py-2 text-sm w-full text-left cursor-pointer transition-colors bg-transparent border-none ${
                    language === lang.code 
                      ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLangDropdown(false);
                  }}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="w-[34px] h-[34px] p-0 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"><Bell size={20} /></button>
        <div ref={dropRef} className="relative">
          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-semibold cursor-pointer relative" onClick={() => setShowDropdown(!showDropdown)}>
            {initials}
            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          {showDropdown && (
            <div className="absolute top-11 right-0 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[200px] z-[200] py-2">
              <div className="px-4 py-2.5 border-b border-slate-100 text-xs">
                <strong className="block text-slate-800 font-bold">{user?.name || 'User'}</strong>
                <span className="text-slate-400 text-[11px]">{user?.email || ''}</span>
              </div>
              <button className="block px-4 py-2 text-sm text-slate-600 cursor-pointer w-full text-left hover:bg-slate-50 hover:text-slate-900 bg-transparent border-none" onClick={() => { setShowDropdown(false); router.push('/profile'); }}>{t('profile')}</button>
              <button className="block px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer w-full text-left bg-transparent border-none" onClick={handleLogout}>{t('logout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

