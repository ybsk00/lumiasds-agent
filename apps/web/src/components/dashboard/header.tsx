'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/dashboard/analysis': '데이터 분석',
  '/dashboard/strategy': '전략 수립',
  '/dashboard/creative': '소재 관리',
  '/dashboard/campaigns': '캠페인 관리',
  '/dashboard/reports': '통합 리포트',
  '/dashboard/approvals': '승인 대기 내역',
  '/dashboard/settings': '설정',
  '/dashboard/settings/tenants': '테넌트 관리',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || '대시보드';

  return (
    <header className="h-14 fixed top-0 right-0 left-64 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold text-on-surface tracking-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors duration-200">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="h-6 w-[1px] bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-on-surface">관리자</p>
            <p className="text-[10px] text-slate-500">LumiAds</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-[10px] font-bold text-white">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
