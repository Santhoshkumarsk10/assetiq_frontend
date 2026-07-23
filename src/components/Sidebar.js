'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard, Settings2, Users, ClipboardList,
  MapPin, LogOut, Package, Shield, UserCheck, BarChart2, KeyRound, Ticket,
  ChevronDown
} from 'lucide-react';

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const permissions = user?.permissions || [];
  
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = {};
    const reportsChildren = [
      '/reports/inventory',
      '/reports/allocations',
      '/reports/tickets',
      '/reports/licenses',
      '/reports/audit'
    ];
    if (reportsChildren.some(href => pathname === href)) {
      initial['reports'] = true;
    }
    return initial;
  });

  const menuConfig = [
    { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, permissions: [] },      
    { href: '/assets', labelKey: 'assets', icon: Package, permissions: ['asset.list'] },
    { href: '/license', labelKey: 'license', icon: KeyRound, permissions: ['asset.list'] },
    { href: '/locations', labelKey: 'locations', icon: MapPin, permissions: ['location.list'] },
    { href: '/users', labelKey: 'users', icon: Users, permissions: ['user.list'] },
    { href: '/onboarding', labelKey: 'onboarding', icon: UserCheck, permissions: ['onboarding.list', 'email_request.list'] },
    { href: '/roles-permissions', labelKey: 'rolesPermissions', icon: Shield, permissions: ['role.list'] },
    { href: '/audit-logs', labelKey: 'auditLogs', icon: ClipboardList, permissions: ['auditlog.list'] },
    { 
      href: '/reports/inventory', 
      labelKey: 'reports', 
      icon: BarChart2, 
      permissions: ['asset.list'],
      children: [
        { href: '/reports/inventory', labelKey: 'Asset Inventory Summary', permissions: ['asset.list'] },
        { href: '/reports/allocations', labelKey: 'Asset In-Out Reports', permissions: ['asset.list'] },
        { href: '/reports/tickets', labelKey: 'Tickets Reports', permissions: ['ticket.list'] },
        { href: '/reports/licenses', labelKey: 'License Reports', permissions: ['asset.list'] },
        { href: '/reports/audit', labelKey: 'System AuditTrail', permissions: ['auditlog.list'] }
      ]
    },
    { href: '/tickets', labelKey: 'tickets', icon: Ticket, permissions: ['ticket.list'] }
  ];

  useEffect(() => {
    menuConfig.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname === child.href);
        if (hasActiveChild) {
          setExpandedMenus(prev => ({ ...prev, [item.labelKey]: true }));
        }
      }
    });
  }, [pathname]);

  const navItems = menuConfig.filter(item => 
    item.permissions.length === 0 || item.permissions.some(p => permissions.includes(p))
  );

  return (
    <aside className={`fixed top-0 bottom-0 bg-white border-r border-slate-200 flex flex-col z-[100] transition-all duration-300 ${
      isOpen ? 'w-[220px] left-0' : 'w-[80px] -left-20 lg:left-0'
    }`}>
      <div className={`p-5 pb-4 flex items-center gap-2 border-b border-slate-100 ${isOpen ? '' : 'justify-center px-2'}`}>
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex shrink-0 items-center justify-center text-emerald-600">
          <Settings2 size={20} />
        </div>
        {isOpen && <h1 className="text-md font-bold text-slate-900 overflow-hidden whitespace-nowrap">AUX Asset<span className="text-emerald-500">CARE</span></h1>}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          const itemChildren = item.children
            ? item.children.filter(child => child.permissions.length === 0 || child.permissions.some(p => permissions.includes(p)))
            : [];
          const hasChildren = itemChildren.length > 0;
          
          const isActive = pathname === item.href || 
                           (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')) ||
                           (hasChildren && itemChildren.some(child => pathname === child.href));
          const isExpanded = !!expandedMenus[item.labelKey];

          const linkClass = `flex items-center py-2.5 mx-2 my-0.5 text-slate-500 text-sm font-medium rounded-lg transition-all duration-150 hover:bg-slate-55 hover:text-slate-900 border-l-3 cursor-pointer w-[-webkit-fill-available] text-left bg-transparent border-none ${
            isOpen ? 'gap-3 px-5' : 'justify-center px-0'
          } ${
            isActive && !hasChildren
              ? 'bg-emerald-50 text-emerald-600 font-semibold border-emerald-500' 
              : isActive 
              ? 'text-slate-900 font-semibold border-emerald-500 bg-slate-50/50'
              : 'border-transparent'
          }`;

          const handleToggle = () => {
            setExpandedMenus(prev => ({ ...prev, [item.labelKey]: !prev[item.labelKey] }));
          };

          return (
            <div key={item.href} className="flex flex-col">
              {hasChildren ? (
                <button
                  onClick={handleToggle}
                  className={linkClass}
                  title={!isOpen ? t(item.labelKey) : undefined}
                >
                  <Icon size={20} className="shrink-0" />
                  {isOpen && <span className="overflow-hidden whitespace-nowrap flex-1">{t(item.labelKey)}</span>}
                  {isOpen && (
                    <ChevronDown 
                      size={14} 
                      className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={linkClass}
                  title={!isOpen ? t(item.labelKey) : undefined}
                >
                  <Icon size={20} className="shrink-0" />
                  {isOpen && <span className="overflow-hidden whitespace-nowrap">{t(item.labelKey)}</span>}
                </Link>
              )}
              {isOpen && hasChildren && (
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col ml-6 pl-3 border-l border-slate-200 my-1 space-y-1">
                      {itemChildren.map(child => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center py-2 px-4 text-xs font-medium rounded-md transition-all duration-150 hover:bg-slate-55 hover:text-slate-900 cursor-pointer ${
                              isChildActive 
                                ? 'text-emerald-600 font-bold bg-emerald-50/50' 
                                : 'text-slate-500'
                            }`}
                          >
                            <span className="overflow-hidden whitespace-nowrap">{t(child.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

