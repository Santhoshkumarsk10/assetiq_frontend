'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { notificationApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Bell, Globe, X, CheckCheck, AlertTriangle, RefreshCw, CheckCircle, XCircle, Info, Menu } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';

const languagesList = [
  { code: 'en', label: 'English', country: 'gb' },
  { code: 'hi', label: 'हिन्दी', country: 'in' },
  { code: 'ta', label: 'தமிழ்', country: 'in' },
  { code: 'ms', label: 'Melayu', country: 'my' },
  { code: 'sw', label: 'Kiswahili', country: 'ke' },
  { code: 'ar', label: 'العربية', country: 'ae' },
];

const notifTypeConfig = {
  license_expired: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' },
  renewal_submitted: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50' },
  renewal_approved: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  renewal_rejected: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  user_notify: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ticket_raised: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  ticket_assigned: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  ticket_resolved: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ticket_closed: { icon: CheckCircle, color: 'text-slate-500', bg: 'bg-slate-50' },
  ticket_cancelled: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  ticket_comment: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  ticket_update: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  info: { icon: Info, color: 'text-slate-400', bg: 'bg-slate-50' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TopBar({ isOpen, toggleSidebar }) {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropRef = useRef(null);
  const langDropRef = useRef(null);
  const notifDropRef = useRef(null);

  const loadNotifications = useCallback(async (force = false) => {
    try {
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem('cached_notifications');
        const cachedTime = localStorage.getItem('cached_notifications_time');
        
        if (!force && cachedData && cachedTime && (Date.now() - parseInt(cachedTime, 10) < 60 * 1000)) {
          const parsed = JSON.parse(cachedData);
          setNotifications(parsed.notifications || []);
          setUnreadCount(parsed.unreadCount || 0);
          return;
        }
      }

      const data = await notificationApi.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);

      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_notifications', JSON.stringify(data));
        localStorage.setItem('cached_notifications_time', Date.now().toString());
      }
    } catch (e) {
      // Silently fail – non-critical
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Join user-specific socket room for live notification push
    if (user?.id && socket) {
      socket.emit('join_user_room', user.id);
      socket.on('new_notification', (notif) => {
        setNotifications(prev => {
          const updated = [notif, ...prev];
          if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('cached_notifications');
            if (cached) {
              const parsed = JSON.parse(cached);
              parsed.notifications = [notif, ...(parsed.notifications || [])];
              parsed.unreadCount = (parsed.unreadCount || 0) + 1;
              localStorage.setItem('cached_notifications', JSON.stringify(parsed));
            }
          }
          return updated;
        });
        setUnreadCount(prev => prev + 1);
      });
    }

    // Poll every 2 minutes as fallback
    const interval = setInterval(() => loadNotifications(true), 2 * 60 * 1000);
    return () => {
      clearInterval(interval);
      if (socket) socket.off('new_notification');
    };
  }, [user?.id, loadNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false);
      if (langDropRef.current && !langDropRef.current.contains(e.target)) setShowLangDropdown(false);
      if (notifDropRef.current && !notifDropRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markRead({ mark_all: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_notifications_time');
      }
    } catch (e) { /* silent */ }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await notificationApi.markRead({ notification_id: id });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_notifications_time');
      }
    } catch (e) { /* silent */ }
  };

  const currentLanguageObject = languagesList.find(l => l.code === language) || languagesList[0];

  return (
    <header className={`fixed top-0 right-0 h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-7 z-[90] transition-all duration-300 ${
      isOpen ? 'left-0 lg:left-[220px]' : 'left-0 lg:left-[80px]'
    }`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Toggle navigation menu"
          title="Toggle Navigation"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Language Selector */}
        <div ref={langDropRef} className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer text-sm font-medium"
            title={t('language')}
          >
            <Globe size={16} className="text-slate-400" />
            <CountryFlag code={currentLanguageObject?.country} />
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
                  <CountryFlag code={lang.country} />
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div ref={notifDropRef} className="relative">
          <button
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); if (!showNotifDropdown) loadNotifications(true); }}
            className="relative w-[34px] h-[34px] p-0 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <>
              {/* Mobile backdrop */}
              <div
                className="fixed inset-0 top-[60px] bg-slate-900/20 backdrop-blur-[1px] sm:hidden z-[190]"
                onClick={() => setShowNotifDropdown(false)}
              />
              <div className="fixed inset-x-3 top-[64px] sm:inset-x-auto sm:top-11 sm:right-0 sm:absolute w-auto sm:w-[380px] max-w-lg sm:max-w-none mx-auto sm:mx-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer border-none bg-transparent"
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifDropdown(false)}
                      className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-[calc(100vh-140px)] sm:max-h-[380px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                      <Bell size={30} className="opacity-30" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const cfg = notifTypeConfig[notif.type] || notifTypeConfig.info;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={notif.id}
                          className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-blue-50/40' : ''}`}
                          onClick={() => !notif.is_read && handleMarkOneRead(notif.id)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                            <Icon size={15} className={cfg.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold text-slate-800 leading-snug ${!notif.is_read ? 'font-bold' : ''}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar / Profile Dropdown */}
        <div ref={dropRef} className="relative">
          <div
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-semibold cursor-pointer relative"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {initials}
            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          {showDropdown && (
            <div className="absolute top-11 right-0 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[200px] z-[200] py-2">
              <div className="px-4 py-2.5 border-b border-slate-100 text-xs">
                <strong className="block text-slate-800 font-bold">{user?.name || 'User'}</strong>
                <span className="text-slate-400 text-[11px]">{user?.email || ''}</span>
              </div>
              <button
                className="block px-4 py-2 text-sm text-slate-600 cursor-pointer w-full text-left hover:bg-slate-50 hover:text-slate-900 bg-transparent border-none"
                onClick={() => { setShowDropdown(false); router.push('/profile'); }}
              >
                {t('profile')}
              </button>
              <button
                className="block px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer w-full text-left bg-transparent border-none"
                onClick={handleLogout}
              >
                {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
