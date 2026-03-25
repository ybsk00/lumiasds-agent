'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const TENANT_ID = 'd944536d-76c4-4812-857b-e157912d775d';

interface KPI {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number;
  roas: number;
}

interface Campaign {
  id: string;
  platform: string;
  name: string;
  status: string;
  budget_daily: number;
}

interface PlatformStatus {
  naver?: { success: boolean; message: string };
  meta?: { success: boolean; message: string };
  google?: { success: boolean; message: string };
}

export default function DashboardHome() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { 'x-tenant-id': TENANT_ID };

    // 3개 API 병렬 호출
    Promise.all([
      fetch('/api/reports/dashboard', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/campaigns', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/platforms/test', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([kpiData, campaignData, statusData]) => {
      if (kpiData) setKpi(kpiData);
      setCampaigns(Array.isArray(campaignData) ? campaignData : []);
      if (statusData) setPlatformStatus(statusData);
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) => n >= 1000000 ? `₩${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `₩${(n / 1000).toFixed(0)}K` : `₩${n.toLocaleString()}`;

  const kpiCards = [
    { label: '총 지출', value: kpi ? fmt(kpi.cost) : '-', icon: 'payments', color: 'border-l-primary' },
    { label: '평균 CTR', value: kpi ? `${kpi.ctr.toFixed(2)}%` : '-', icon: 'ads_click', color: 'border-l-secondary' },
    { label: '평균 CPC', value: kpi && kpi.clicks > 0 ? fmt(Math.round(kpi.cost / kpi.clicks)) : '-', icon: 'price_change', color: 'border-l-tertiary' },
    { label: '총 전환', value: kpi ? kpi.conversions.toLocaleString() : '-', icon: 'shopping_cart', color: 'border-l-primary-container' },
    { label: 'ROAS', value: kpi ? `${(kpi.roas * 100).toFixed(0)}%` : '-', icon: 'trending_up', color: 'border-l-emerald-500' },
  ];

  const platformRows = [
    { name: '네이버', key: 'naver' as const, badge: 'N', badgeColor: 'bg-green-500' },
    { name: 'Meta', key: 'meta' as const, badge: 'M', badgeColor: 'bg-blue-600' },
    { name: 'Google', key: 'google' as const, badge: 'G', badgeColor: 'bg-red-500' },
  ];

  return (
    <div className="space-y-8">
      {/* KPI 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`bg-surface-container-lowest p-6 rounded-xl border-l-4 ${card.color} ghost-border`}>
            <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">{card.label}</p>
            <h3 className="text-2xl font-bold text-on-surface">
              {loading ? <span className="inline-block w-16 h-7 bg-surface-container animate-pulse rounded" /> : card.value}
            </h3>
          </div>
        ))}
      </section>

      {/* 중앙: 트렌드 + AI 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 일별 트렌드 */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-on-surface">일별 전환 트렌드</h3>
              <p className="text-xs text-slate-500">데이터 수집 후 표시됩니다</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-primary rounded-sm"></span>
              <span className="text-xs font-medium">전환수</span>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">bar_chart</span>
              <p className="text-sm mt-2">API 키를 설정하고 데이터를 수집하세요</p>
            </div>
          </div>
        </div>

        {/* AI 인사이트 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h3 className="text-lg font-bold">AI 인사이트</h3>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border border-l-4 border-l-blue-500">
            <h4 className="text-sm font-bold mb-1 text-on-surface">시작 안내</h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              아래 빠른 시작 메뉴에서 API 키를 설정하고 데이터를 수집하면 AI가 자동으로 인사이트를 생성합니다.
            </p>
            <Link href="/dashboard/settings" className="w-full py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-variant transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">settings</span>
              설정으로 이동
            </Link>
          </div>
        </div>
      </div>

      {/* 빠른 시작 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/analysis" className="bg-surface-container-lowest p-6 rounded-xl ghost-border group hover:ambient-shadow transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <h3 className="font-semibold text-on-surface">데이터 분석 시작</h3>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            기존 광고 데이터를 업로드하거나 API로 수집하여 분석합니다
          </p>
        </Link>
        <Link href="/dashboard/strategy" className="bg-surface-container-lowest p-6 rounded-xl ghost-border group hover:ambient-shadow transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600">insights</span>
            </div>
            <h3 className="font-semibold text-on-surface">AI 전략 회의</h3>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            4개 AI 에이전트가 토론하여 최적 광고 전략을 도출합니다
          </p>
        </Link>
        <Link href="/dashboard/campaigns" className="bg-surface-container-lowest p-6 rounded-xl ghost-border group hover:ambient-shadow transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600">campaign</span>
            </div>
            <h3 className="font-semibold text-on-surface">캠페인 관리</h3>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            네이버/메타/구글 캠페인을 통합 관리하고 실시간 모니터링합니다
          </p>
        </Link>
      </div>

      {/* 플랫폼 현황 */}
      <section className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden">
        <div className="p-6 border-b border-surface-container">
          <h3 className="text-lg font-bold text-on-surface">플랫폼별 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">매체</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">캠페인</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">일예산</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {platformRows.map((p) => {
                const pCampaigns = campaigns.filter(c => c.platform === p.key);
                const totalBudget = pCampaigns.reduce((sum, c) => sum + (c.budget_daily || 0), 0);
                const status = platformStatus?.[p.key];
                const connected = status?.success;
                return (
                  <tr key={p.name} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${p.badgeColor} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {p.badge}
                        </div>
                        <span className="text-sm font-semibold">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{loading ? '-' : pCampaigns.length}</td>
                    <td className="px-6 py-4 text-sm font-medium">{loading ? '-' : totalBudget > 0 ? fmt(totalBudget) : '₩0'}</td>
                    <td className="px-6 py-4">
                      {loading ? (
                        <span className="inline-block w-16 h-5 bg-surface-container animate-pulse rounded-full" />
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {connected ? 'Connected' : status?.message || 'API 키 미설정'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
