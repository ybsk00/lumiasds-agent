'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드', icon: 'dashboard' },
  { href: '/analysis', label: '데이터 분석', icon: 'analytics' },
  { href: '/strategy', label: '전략 수립', icon: 'insights' },
  { href: '/creative', label: '소재 관리', icon: 'palette' },
  { href: '/campaigns', label: '캠페인', icon: 'campaign' },
  { href: '/reports', label: '리포트', icon: 'assessment' },
  { href: '/approvals', label: '승인 대기', icon: 'pending_actions' },
];

const settingsItem = { href: '/settings', label: '설정', icon: 'settings' };

export function Sidebar() {
  const pathname = usePathname();

  const renderNavLink = (item: typeof navItems[0]) => {
    const isActive = pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium tracking-tight transition-all duration-200 ease-fluid',
          isActive
            ? 'bg-blue-100 text-blue-700'
            : 'text-slate-600 hover:bg-slate-200',
        )}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-slate-200 bg-slate-50 z-20">
      <div className="flex flex-col h-full p-4">
        {/* Brand */}
        <div className="mb-8 px-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">rocket_launch</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-600 tracking-tight">LumiAds</h1>
            <p className="text-[10px] text-slate-400 font-medium">v0.1.0</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map(renderNavLink)}
          <div className="pt-4 mt-4 border-t border-slate-200">
            {renderNavLink(settingsItem)}
          </div>
        </nav>

        {/* User Profile */}
        <div className="mt-auto p-4 bg-slate-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-[10px] font-bold text-white">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-on-surface">마케팅 팀장</p>
              <p className="text-[10px] text-slate-500 truncate">admin@lumiads.ai</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
