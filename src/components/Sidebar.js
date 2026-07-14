'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard, Settings2, Users, ClipboardList,
  MapPin, LogOut, Package, Shield, UserCheck, BarChart2, KeyRound
} from 'lucide-react';

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const permissions = user?.permissions || [];

  const menuConfig = [
    { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, permissions: [] },      
    { href: '/assets', labelKey: 'assets', icon: Package, permissions: ['asset.list'] },
    { href: '/license', labelKey: 'license', icon: KeyRound, permissions: ['asset.list'] },
    { href: '/locations', labelKey: 'locations', icon: MapPin, permissions: ['location.list'] },
    { href: '/users', labelKey: 'users', icon: Users, permissions: ['user.list'] },
    { href: '/onboarding', labelKey: 'onboarding', icon: UserCheck, permissions: ['onboarding.list', 'email_request.list'] },
    { href: '/roles-permissions', labelKey: 'rolesPermissions', icon: Shield, permissions: ['role.list'] },
    { href: '/audit-logs', labelKey: 'auditLogs', icon: ClipboardList, permissions: ['auditlog.list'] },
    { href: '/reports', labelKey: 'reports', icon: BarChart2, permissions: ['asset.list'] }
  ];

  const navItems = menuConfig.filter(item => 
    item.permissions.length === 0 || item.permissions.some(p => permissions.includes(p))
  );

  return (
    <aside className={`fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 flex flex-col z-[100] transition-all duration-300 ${
      isOpen ? 'w-[220px]' : 'w-[80px]'
    }`}>
      <div className={`p-5 pb-4 flex items-center gap-2 border-b border-slate-100 ${isOpen ? '' : 'justify-center px-2'}`}>
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex shrink-0 items-center justify-center text-emerald-600">
          <Settings2 size={20} />
        </div>
        {isOpen && <h1 className="text-lg font-bold text-slate-900 overflow-hidden whitespace-nowrap">Asset<span className="text-emerald-500">IQ</span></h1>}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center py-2.5 mx-2 my-0.5 text-slate-500 text-sm font-medium rounded-lg transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 border-l-3 cursor-pointer ${
                isOpen ? 'gap-3 px-5' : 'justify-center px-0'
              } ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-600 font-semibold border-emerald-500' 
                  : 'border-transparent'
              }`}
              title={!isOpen ? t(item.labelKey) : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {isOpen && <span className="overflow-hidden whitespace-nowrap">{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button 
          className={`flex items-center py-2.5 text-slate-500 text-sm font-medium rounded-lg transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 cursor-pointer border-l-3 border-transparent w-full text-left bg-transparent border-none ${
            isOpen ? 'gap-3 px-5' : 'justify-center px-0'
          }`}
          onClick={logout}
          title={!isOpen ? t('logout') : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {isOpen && <span className="overflow-hidden whitespace-nowrap">{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
}

