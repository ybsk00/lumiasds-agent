'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MockTenant {
  id: string;
  name: string;
  initial: string;
  initialColor: string;
  initialBg: string;
  industry: string;
  plan: string;
  planColor: string;
  activeCampaigns: number;
  monthlyCost: string;
  apiKeys: { naver: 'connected' | 'disconnected' | 'warning'; meta: 'connected' | 'disconnected' | 'warning'; google: 'connected' | 'disconnected' | 'warning' };
}

const apiStatusIcon: Record<string, { icon: string; color: string; fill: boolean }> = {
  connected: { icon: 'check_circle', color: 'text-green-500', fill: true },
  disconnected: { icon: 'cancel', color: 'text-slate-300', fill: false },
  warning: { icon: 'warning', color: 'text-yellow-500', fill: false },
};

export default function TenantsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const tenants: MockTenant[] = [
    { id: '1', name: '네이버 브랜드관', initial: 'N', initialColor: 'text-blue-600', initialBg: 'bg-blue-50 border-blue-100', industry: '이커머스', plan: 'Enterprise', planColor: 'text-primary', activeCampaigns: 42, monthlyCost: '12,450,000', apiKeys: { naver: 'connected', meta: 'disconnected', google: 'connected' } },
    { id: '2', name: '카카오 게임즈', initial: 'K', initialColor: 'text-purple-600', initialBg: 'bg-purple-50 border-purple-100', industry: '게임', plan: 'Growth', planColor: 'text-secondary', activeCampaigns: 18, monthlyCost: '4,200,000', apiKeys: { naver: 'disconnected', meta: 'connected', google: 'warning' } },
    { id: '3', name: '배달의민족', initial: 'B', initialColor: 'text-orange-600', initialBg: 'bg-orange-50 border-orange-100', industry: 'F&B', plan: 'Enterprise', planColor: 'text-primary', activeCampaigns: 124, monthlyCost: '85,900,000', apiKeys: { naver: 'connected', meta: 'connected', google: 'connected' } },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">테넌트 관리</h2>
          <p className="text-on-surface-variant text-sm mt-1">광고주 계정 및 권한을 관리합니다.</p>
        </div>
      </div>

      {/* Registration Form */}
      <section className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow">
        <div className="flex items-center justify-between mb-6 cursor-pointer group" onClick={() => setShowCreateForm(!showCreateForm)}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <h3 className="text-lg font-semibold">신규 광고주 정보 입력</h3>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
            {showCreateForm ? 'expand_less' : 'expand_more'}
          </span>
        </div>
        {showCreateForm && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant ml-1">광고주 이름</label>
                <input className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="예: (주) 루미애즈" type="text" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant ml-1">업종</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none">
                  <option>업종을 선택하세요</option>
                  <option>이커머스</option>
                  <option>금융/보험</option>
                  <option>게임</option>
                  <option>교육</option>
                  <option>F&B</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant ml-1">플랜</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none">
                  <option>플랜 선택</option>
                  <option>Starter (Free)</option>
                  <option>Growth (Monthly)</option>
                  <option>Enterprise (Custom)</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowCreateForm(false)} className="px-6 py-2 text-sm font-medium text-on-surface-variant bg-surface-container-high rounded-lg hover:bg-surface-variant transition-colors">취소</button>
              <button className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:brightness-110 ambient-shadow transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add</span>
                등록하기
              </button>
            </div>
          </>
        )}
      </section>

      {/* Tenant Table */}
      <div className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container flex items-center justify-between">
          <h3 className="font-bold text-on-surface">광고주 리스트</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
              <input className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-full text-xs focus:ring-1 focus:ring-primary w-64 outline-none" placeholder="광고주 검색..." type="text" />
            </div>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
              <span className="material-symbols-outlined text-lg">filter_list</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">광고주</th>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">업종</th>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">플랜</th>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">API 연결 상태</th>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">캠페인 수</th>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">비용 (KRW)</th>
                <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded flex items-center justify-center font-bold text-xs border', t.initialBg, t.initialColor)}>{t.initial}</div>
                      <span className="font-semibold text-sm">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant">{t.industry}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('text-sm font-medium', t.planColor)}>{t.plan}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {(['naver', 'meta', 'google'] as const).map((platform) => {
                        const status = apiStatusIcon[t.apiKeys[platform]];
                        return (
                          <div key={platform} className="flex flex-col items-center gap-0.5">
                            <span
                              className={cn('material-symbols-outlined text-[20px]', status.color)}
                              style={status.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                              {status.icon}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400">{platform.toUpperCase()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold tabular-nums">{t.activeCampaigns}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold tabular-nums">{t.monthlyCost}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">more_vert</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border-t-4 border-t-primary ambient-shadow space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined">insights</span>
            <h4 className="font-bold text-sm">운영 인사이트</h4>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            현재 엔터프라이즈 플랜 고객이 전체 매출의 <span className="text-primary font-bold">82%</span>를 차지하고 있습니다.
            신규 등록된 고객의 대다수가 이커머스 업종으로, 해당 카테고리에 최적화된 전략 템플릿 제안이 필요합니다.
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border-t-4 border-t-destructive ambient-shadow space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <span className="material-symbols-outlined">report_problem</span>
            <h4 className="font-bold text-sm">시스템 알림</h4>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            <span className="font-bold text-on-surface">카카오 게임즈</span> 테넌트의 Google API 토큰 만료가 임박했습니다. (D-2)
            원활한 데이터 수집을 위해 계정 관리자에게 재인증을 요청하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
