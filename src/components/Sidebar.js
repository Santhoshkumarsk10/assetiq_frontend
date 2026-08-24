'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import {
  LayoutDashboard, Users, ClipboardList,
  MapPin, LogOut, Package, Shield, UserCheck, BarChart2, KeyRound, Ticket,
  ChevronDown, Sparkles
} from 'lucide-react';

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const { isAuxinzio } = useTheme();
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

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'AU';

  return (
    <aside className={`fixed top-0 bottom-0 flex flex-col z-[100] transition-all duration-300 ${
      isAuxinzio
        ? 'bg-gradient-to-b from-[#181236] via-[#1e1546] to-[#2b1757] text-white border-r border-purple-900/40 shadow-xl'
        : 'bg-white border-r border-slate-200 text-slate-800'
    } ${
      isOpen ? 'w-[220px] left-0' : 'w-[80px] -left-20 lg:left-0'
    }`}>
      {/* Brand Header */}
      <div className={`p-3 flex items-center ${isAuxinzio ? 'border-b border-purple-800/30' : 'border-b border-slate-100'} ${isOpen ? 'justify-start pl-5' : 'justify-center'}`} style={{ height: '60px' }}>
        {isOpen ? (
          <img src="/images/option 1.png" alt="Auxinzio AssetCare" className="h-9 w-full object-contain" />
        ) : (
          <img src="/images/option 1.png" alt="Auxinzio AssetCare" className="h-8 w-8 object-cover object-left" />
        )}
      </div>

      {/* Auxinzio User Profile Card in Sidebar */}
      {isAuxinzio && isOpen && (
        <div className="px-4 py-3 mx-3 my-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 backdrop-blur-xs">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-0.5 shrink-0 shadow-sm">
            <div className="w-full h-full rounded-full bg-[#1e1546] flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate leading-tight">{user?.name || 'User'}</div>
            <div className="text-[10px] text-purple-300/80 truncate mt-0.5 font-medium">{user?.role || user?.role_name || 'Administrator'}</div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
        {isAuxinzio && isOpen && (
          <div className="px-5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-purple-300/60">
            Navigation
          </div>
        )}

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
            linkClass = `flex items-center py-2.5 mx-2.5 my-1 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer w-[-webkit-fill-available] text-left bg-transparent border-none ${
              isOpen ? 'gap-3 px-4' : 'justify-center px-0'
            } ${
              isActive && !hasChildren
                ? 'bg-white text-indigo-700 shadow-md font-bold' 
                : isActive 
                ? 'bg-white/15 text-white font-bold'
                : 'text-purple-200/75 hover:bg-white/10 hover:text-white'
            }`;
          } else {
            linkClass = `flex items-center py-2.5 mx-2 my-0.5 text-slate-500 text-sm font-medium rounded-lg transition-all duration-150 hover:bg-slate-55 hover:text-slate-900 border-l-3 cursor-pointer w-[-webkit-fill-available] text-left bg-transparent border-none ${
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
                  <Icon size={isAuxinzio ? 18 : 20} className="shrink-0" />
                  {isOpen && <span className="overflow-hidden whitespace-nowrap flex-1">{t(item.labelKey)}</span>}
                  {isOpen && (
                    <ChevronDown 
                      size={14} 
                      className={`${isAuxinzio ? 'text-purple-300/70' : 'text-slate-400'} transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
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
                  <Icon size={isAuxinzio ? 18 : 20} className="shrink-0" />
                  {isOpen && <span className="overflow-hidden whitespace-nowrap">{t(item.labelKey)}</span>}
                </Link>
              )}
              {isOpen && hasChildren && (
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className={`flex flex-col ml-6 pl-3 my-1 space-y-1 ${isAuxinzio ? 'border-l border-purple-700/40' : 'border-l border-slate-200'}`}>
                      {itemChildren.map(child => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center py-2 px-4 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
                              isAuxinzio
                                ? (isChildActive ? 'text-white font-bold bg-white/20' : 'text-purple-200/70 hover:text-white hover:bg-white/10')
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

        {/* Auxinzio APPS Promo Card */}
        {isAuxinzio && isOpen && (
          <div className="px-3 pt-4 pb-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600/80 via-purple-600/80 to-pink-600/80 border border-white/15 shadow-md text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1 rounded-lg bg-white/20">
                  <Sparkles size={14} className="text-yellow-300" />
                </span>
                <span className="text-xs font-bold">Auxinzio Pro</span>
              </div>
              <p className="text-[10px] text-white/80 leading-relaxed">
                Smart IT Lifecycle &amp; Automated Audit reports enabled.
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* Logout Row */}
      <div className={`p-4 ${isAuxinzio ? 'border-t border-purple-800/30' : 'border-t border-slate-100'}`}>
        <button 
          className={`flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-150 cursor-pointer w-full text-left bg-transparent border-none ${
            isAuxinzio
              ? 'text-purple-300 hover:bg-rose-500/20 hover:text-rose-300'
              : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
          } ${
            isOpen ? 'gap-3 px-4' : 'justify-center px-0'
          }`}
          onClick={logout}
          title={!isOpen ? t('logout') : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {isOpen && <span className="overflow-hidden whitespace-nowrap">{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
}


