'use client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';

const routePermissions = {
  '/roles-permissions': ['role.list'],
  '/audit-logs': ['auditlog.list'],
  '/locations': ['location.list'],
  '/users': ['user.list'],
  '/assets': ['asset.list'],
  '/onboarding': ['onboarding.list', 'email_request.list']
};

export default function AppLayout({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const { isAuxinzio, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Global listener to prevent background scrolling when any modal, filter sheet, or popup is visible
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let isLockedByObserver = false;

    const overlaySelector = [
      '.animate-sheet-fade-in',
      '.animate-sheet-slide-up',
      '[role="dialog"]',
      '.fixed.inset-0.z-\\[500\\]',
      '.fixed.inset-0.z-\\[1000\\]',
      '.fixed.inset-0.z-\\[10000\\]',
      '.fixed.inset-0.bg-black\\/50',
      '.fixed.inset-0.bg-black\\/40',
      '.fixed.inset-0.bg-slate-900\\/60',
      '.fixed.inset-0.bg-slate-900\\/40'
    ].join(', ');

    const checkOverlays = () => {
      const elements = document.querySelectorAll(overlaySelector);
      let visibleOverlay = false;
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.classList.contains('invisible') || el.classList.contains('opacity-0')) {
          continue;
        }
        visibleOverlay = true;
        break;
      }

      if (visibleOverlay && !isLockedByObserver) {
        lockScroll();
        isLockedByObserver = true;
      } else if (!visibleOverlay && isLockedByObserver) {
        unlockScroll();
        isLockedByObserver = false;
      }
    };

    checkOverlays();

    const observer = new MutationObserver(() => {
      checkOverlays();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      observer.disconnect();
      if (isLockedByObserver) {
        unlockScroll();
      }
    };
  }, []);

  // Register Firebase Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('[SW] Service worker registered successfully:', registration.scope);
      })
      .catch((err) => {
        console.error('[SW ERROR] Service worker registration failed:', err);
      });
  }, []);

  // Request FCM token when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchFcmToken = async () => {
        try {
          const { requestForToken } = await import('@/lib/firebase');
          const token = await requestForToken();
          if (token) {
            const cachedToken = localStorage.getItem('last_fcm_token');
            if (cachedToken !== token) {
              const { userApi } = await import('@/lib/api');
              await userApi.updateFcmToken(token);
              localStorage.setItem('last_fcm_token', token);
              console.log('[FIREBASE] Registered FCM Token on backend.');
            } else {
              console.log('[FIREBASE] FCM Token is already up-to-date (cached locally).');
            }
          }
        } catch (err) {
          console.error('[FCM REGISTRATION ERROR]', err);
        }
      };
      // Short delay to let Service Worker get ready
      const timer = setTimeout(fetchFcmToken, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);

  // Listen for foreground Firebase Cloud Messages and display native system alerts
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let unsubscribe = () => {};

    const setupListener = async () => {
      try {
        const { registerOnMessage } = await import('@/lib/firebase');
        unsubscribe = registerOnMessage((payload) => {
          console.log('[FIREBASE] Foreground message received: ', payload);
          if (payload && payload.notification) {
            // Show native OS/system notification
            if (Notification.permission === 'granted') {
              new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/icon.png'
              });
            }
          }
        });
      } catch (err) {
        console.error('[FCM FOREGROUND LISTENER ERROR]', err);
      }
    };

    setupListener();

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user) {
        const permissions = user.permissions || [];
        // Find matching restricted path
        const matchPath = Object.keys(routePermissions).find(path => 
          pathname === path || pathname.startsWith(path + '/')
        );
        if (matchPath) {
          const allowedPermissions = routePermissions[matchPath];
          const hasAccess = allowedPermissions.some(p => permissions.includes(p));
          if (!hasAccess) {
            router.push('/dashboard');
          }
        }
      }
    }
  }, [loading, isAuthenticated, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-400 gap-3 text-sm">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`flex min-h-screen ${isAuxinzio ? 'bg-[#f4f6fb]' : isDark ? 'bg-[#0F1115]' : 'bg-slate-50'}`}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[95] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <TopBar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <main className={`flex-1 pt-[60px] max-w-full overflow-x-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-0 lg:ml-[220px]' : 'ml-0 lg:ml-[80px]'
      }`}>
        <div className="p-3 sm:p-4 md:p-8 max-w-full">{children}</div>
      </main>
    </div>
  );
}
