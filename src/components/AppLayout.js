'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

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
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} />
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[95] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <TopBar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <main className={`flex-1 pt-[60px] transition-all duration-300 ${
        sidebarOpen ? 'ml-0 lg:ml-[220px]' : 'ml-0 lg:ml-[80px]'
      }`}>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
