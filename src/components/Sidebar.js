'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import {
  LayoutDashboard, Users, ClipboardList,
  MapPin, Package, Shield, UserCheck, BarChart2, KeyRound, Ticket,
  ChevronDown, ChevronLeft, ChevronRight, X
} from 'lucide-react';

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
    href: '/reports', 
    labelKey: 'reports', 
    icon: BarChart2, 
    permissions: ['asset.list'],
    children: [
      { href: '/reports/inventory', labelKey: 'Asset Inventory Summary', permissions: ['asset.list'] },
      { href: '/reports/allocations', labelKey: 'Asset In-Out Reports', permissions: ['asset.list'] },
      { href: '/reports/tickets', labelKey: 'Tickets Reports', permissions: ['ticket.list'] },
      { href: '/reports/licenses', labelKey: 'License Reports', permissions: ['asset.list'] },
      { href: '/reports/audit', labelKey: 'System AuditTrail', permissions: ['auditlog.list'] },
      { href: '/reports/custom-builder', labelKey: 'Custom Report Builder', permissions: ['asset.list'] }
    ]
  },
  { href: '/tickets', labelKey: 'tickets', icon: Ticket, permissions: ['ticket.list'] }
];

export default function Sidebar({ isOpen, toggleSidebar }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isAuxinzio, isDark } = useTheme();
  const permissions = user?.permissions || [];
  
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = {};
    const reportsChildren = [
      '/reports/inventory',
      '/reports/allocations',
      '/reports/tickets',
      '/reports/licenses',
      '/reports/audit',
      '/reports/custom-builder'
    ];
    if (reportsChildren.some(href => pathname === href)) {
      initial['reports'] = true;
    }
    return initial;
  });

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
    <aside className={`fixed top-0 bottom-0 flex flex-col z-[100] transition-all duration-300 h-screen min-h-screen max-h-screen ${
      isAuxinzio
        ? 'bg-[#171A32] text-slate-200 border-r border-[#202544] shadow-xl'
        : isDark
        ? 'bg-[#13151A] text-slate-200 border-r border-slate-800 shadow-xl'
        : 'bg-white border-r border-slate-200 text-slate-800'
    } ${
      isOpen ? 'w-[220px] left-0' : 'w-[80px] -left-20 lg:left-0'
    }`}>
      {/* Sidebar Edge Toggle Button (Desktop Only) */}
      <button
        onClick={toggleSidebar}
        type="button"
        className={`hidden lg:flex absolute -right-[14px] top-[16px] z-50 w-7 h-7 rounded-full items-center justify-center cursor-pointer transition-all duration-200 shadow-md hover:scale-105 border ${
          isAuxinzio
            ? 'bg-[#171A32] text-slate-200 border-[#2e3560] hover:bg-[#202544] hover:text-white'
            : isDark
            ? 'bg-[#13151A] text-slate-200 border-slate-700 hover:bg-[#1e2129] hover:text-white'
            : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white'
        }`}
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? (
          <ChevronLeft size={14} strokeWidth={2.5} />
        ) : (
          <ChevronRight size={14} strokeWidth={2.5} />
        )}
      </button>

      {/* Brand Header */}
      <div className={`px-4 flex items-center ${isOpen ? 'justify-between lg:justify-center' : 'justify-center'} shrink-0 ${isAuxinzio ? 'border-b border-[#202544]' : isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`} style={{ height: '60px' }}>
        {isOpen ? (
          <>
            <img src="/images/option 1.png" alt="Auxinzio AssetCare" className="h-8 max-w-[150px] sm:max-w-[180px] w-auto object-contain" />
            <button
              onClick={toggleSidebar}
              type="button"
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </>
        ) : (
          <img src="/images/option 1.png" alt="Auxinzio AssetCare" className="h-8 w-8 object-cover object-left" />
        )}
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

          // Conditional Styling based on theme
          let linkClass = '';
          if (isAuxinzio) {
            linkClass = `flex items-center py-2.5 mx-2.5 my-0.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer w-[calc(100%-20px)] text-left bg-transparent border-none ${
              isOpen ? 'gap-3 px-3' : 'justify-center px-0'
            } ${
              isActive && !hasChildren
                ? 'bg-[#252B50] text-white font-semibold shadow-xs' 
                : isActive 
                ? 'bg-[#202544] text-white font-semibold'
                : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
            }`;
          } else {
            linkClass = `flex items-center py-2.5 mx-2 my-0.5 text-slate-500 text-sm font-medium rounded-lg transition-all duration-150 hover:bg-slate-55 hover:text-slate-900 border-l-3 cursor-pointer w-[calc(100%-16px)] text-left bg-transparent border-none ${
              isOpen ? 'gap-3 px-5' : 'justify-center px-0'
            } ${
              isActive && !hasChildren
                ? 'bg-emerald-50 text-emerald-600 font-semibold border-emerald-500' 
                : isActive 
                ? 'text-slate-900 font-semibold border-emerald-500 bg-slate-50/50'
                : 'border-transparent'
            }`;
          }

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
                  <Icon size={isAuxinzio ? 18 : 20} className="shrink-0 text-slate-300" />
                  {isOpen && <span className="overflow-hidden whitespace-nowrap flex-1">{t(item.labelKey)}</span>}
                  {isOpen && (
                    <ChevronDown 
                      size={14} 
                      className={`${isAuxinzio ? 'text-slate-400' : 'text-slate-400'} transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={linkClass}
                  title={!isOpen ? t(item.labelKey) : undefined}
                  onClick={() => {
                    if (item.href === '/tickets') {
                      sessionStorage.removeItem('ticket_list_filters');
                    }
                  }}
                >
                  <Icon size={isAuxinzio ? 18 : 20} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                  {isOpen && <span className="overflow-hidden whitespace-nowrap">{t(item.labelKey)}</span>}
                </Link>
              )}
              {isOpen && hasChildren && (
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className={`flex flex-col ml-6 pl-3 my-1 space-y-0.5 ${isAuxinzio ? 'border-l border-[#2B3158]' : isDark ? 'border-l border-slate-700' : 'border-l border-slate-200'}`}>
                      {itemChildren.map(child => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center py-1.5 px-3.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
                              isAuxinzio
                                ? (isChildActive ? 'text-white font-semibold bg-[#252B50]' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]')
                                : (isChildActive ? 'text-emerald-600 font-bold bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-55 hover:text-slate-900')
                            }`}
                            onClick={() => {
                              const reportId = child.href.split("/").pop();
                              sessionStorage.removeItem(`report_filters_${reportId}`);
                              if (reportId === "inventory") {
                                sessionStorage.removeItem(`report_filters_maintenance`);
                              }
                            }}
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
    </aside>
  );
}


