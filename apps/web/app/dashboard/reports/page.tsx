'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Period = 'today' | 'week' | 'month';

interface PlatformKPI {
  platform: string;
  label: string;
  badge: string;
  badgeColor: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
  status: string;
  statusColor: string;
}

interface DailyData {
  date: string;
  cost: number;
  conversions: number;
  roas: number;
}

interface Insight {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel: string;
  actionIcon: string;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('week');

  const platformKPIs: PlatformKPI[] = [
    { platform: 'naver_search', label: '네이버', badge: 'N', badgeColor: 'bg-green-500', impressions: 87600, clicks: 3420, conversions: 126, cost: 2185000, revenue: 6930000, ctr: 3.9, cpc: 639, roas: 3.17, status: '점검필요', statusColor: 'bg-amber-100 text-amber-700' },
    { platform: 'meta', label: 'Meta', badge: 'M', badgeColor: 'bg-blue-600', impressions: 316500, clicks: 4340, conversions: 84, cost: 1825000, revenue: 3780000, ctr: 1.37, cpc: 421, roas: 2.07, status: '양호', statusColor: 'bg-green-100 text-green-700' },
    { platform: 'google', label: 'Google', badge: 'G', badgeColor: 'bg-red-500', impressions: 62300, clicks: 1470, conversions: 35, cost: 640000, revenue: 1540000, ctr: 2.36, cpc: 435, roas: 2.41, status: '안정', statusColor: 'bg-blue-100 text-blue-700' },
  ];

  const totalKPI = platformKPIs.reduce(
    (acc, p) => ({
      impressions: acc.impressions + p.impressions,
      clicks: acc.clicks + p.clicks,
      conversions: acc.conversions + p.conversions,
      cost: acc.cost + p.cost,
      revenue: acc.revenue + p.revenue,
    }),
    { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 },
  );
  const totalROAS = totalKPI.cost > 0 ? (totalKPI.revenue / totalKPI.cost) * 100 : 0;
  const totalCTR = totalKPI.impressions > 0 ? (totalKPI.clicks / totalKPI.impressions) * 100 : 0;
  const avgCPC = totalKPI.clicks > 0 ? totalKPI.cost / totalKPI.clicks : 0;

  const dailyData: DailyData[] = [
    { date: '03.17', cost: 580000, conversions: 28, roas: 2.6 },
    { date: '03.18', cost: 640000, conversions: 35, roas: 2.9 },
    { date: '03.19', cost: 720000, conversions: 42, roas: 3.1 },
    { date: '03.20', cost: 690000, conversions: 38, roas: 2.8 },
    { date: '03.21', cost: 750000, conversions: 45, roas: 3.2 },
    { date: '03.22', cost: 680000, conversions: 33, roas: 2.5 },
    { date: '03.23', cost: 590000, conversions: 24, roas: 2.1 },
  ];

  const insights: Insight[] = [
    { severity: 'high', title: '메타 스토리 예산 확대 권장', description: '스토리 지면의 ROAS가 타 지면 대비 1.5배 높게 측정되고 있습니다. 효율 극대화를 위한 예산 재배분이 필요합니다.', actionLabel: '예산재배분', actionIcon: 'account_balance_wallet' },
    { severity: 'high', title: '네이버 소재 교체 필요', description: '네이버 검색광고의 CTR이 최근 3일간 40% 이상 하락했습니다. 신규 소재로의 교체를 권장합니다.', actionLabel: '소재재생성', actionIcon: 'draw' },
    { severity: 'medium', title: '구글 디스플레이 타겟 최적화', description: '20-30대 남성 유입 비중이 증가하고 있습니다. 연령대 타겟팅 조정을 통해 도달률 향상이 가능합니다.', actionLabel: '상세 분석 보기', actionIcon: 'analytics' },
  ];

  const maxConversions = Math.max(...dailyData.map((d) => d.conversions));

  const severityConfig: Record<string, { borderColor: string; badgeColor: string; badgeText: string; btnStyle: string }> = {
    high: { borderColor: 'border-l-destructive', badgeColor: 'bg-destructive/10', badgeText: 'text-destructive', btnStyle: 'bg-destructive text-white hover:brightness-110' },
    medium: { borderColor: 'border-l-amber-500', badgeColor: 'bg-amber-500/10', badgeText: 'text-amber-600', btnStyle: 'bg-surface-container-high text-on-surface hover:bg-surface-variant' },
    low: { borderColor: 'border-l-blue-500', badgeColor: 'bg-blue-500/10', badgeText: 'text-blue-600', btnStyle: 'bg-surface-container-high text-on-surface hover:bg-surface-variant' },
  };
  const severityLabel: Record<string, string> = { high: 'CRITICAL', medium: 'STABLE', low: 'INFO' };

  return (
    <div className="space-y-8">
      {/* KPI 요약 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: '총 지출', value: `₩${totalKPI.cost.toLocaleString()}`, change: '+12.5% 전주 대비', positive: true, borderColor: 'border-l-primary' },
          { label: '평균 CTR', value: `${totalCTR.toFixed(2)}%`, change: '-0.4% 전주 대비', positive: false, borderColor: 'border-l-secondary' },
          { label: '평균 CPC', value: `₩${Math.round(avgCPC).toLocaleString()}`, change: '₩24 절감', positive: true, borderColor: 'border-l-tertiary' },
          { label: '총 전환', value: totalKPI.conversions.toLocaleString(), change: '+15.2% 전주 대비', positive: true, borderColor: 'border-l-primary-container' },
          { label: '평균 ROAS', value: `${Math.round(totalROAS)}%`, change: '+32% 전주 대비', positive: true, borderColor: 'border-l-emerald-500' },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-surface-container-lowest p-6 rounded-xl border-l-4 ${kpi.borderColor} ghost-border`}>
            <p className="text-[11px] font-bold text-slate-500 mb-2">{kpi.label}</p>
            <h3 className="text-2xl font-bold text-on-surface">{kpi.value}</h3>
            <p className={cn('text-xs mt-2 flex items-center gap-1', kpi.positive ? 'text-green-600' : 'text-red-600')}>
              <span className="material-symbols-outlined text-sm">{kpi.positive ? 'trending_up' : 'trending_down'}</span>
              {kpi.change}
            </p>
          </div>
        ))}
      </section>

      {/* 트렌드 + AI 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 일별 전환 트렌드 */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-on-surface">일별 전환 트렌드</h3>
              <p className="text-xs text-slate-500">최근 7일간의 성과 추이</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-primary rounded-sm"></span>
              <span className="text-xs font-medium">전환수</span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {dailyData.map((d, i) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">{d.conversions}</span>
                <div
                  className="w-full bg-primary/20 hover:bg-primary transition-colors duration-200 rounded-t-sm cursor-pointer"
                  style={{ height: `${(d.conversions / maxConversions) * 100}%` }}
                />
                <span className="text-[10px] text-slate-500 font-bold">{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI 인사이트 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h3 className="text-lg font-bold">AI 인사이트</h3>
          </div>
          {insights.map((insight, i) => {
            const config = severityConfig[insight.severity];
            return (
              <div key={i} className={`bg-surface-container-lowest p-5 rounded-xl border-l-4 ${config.borderColor} relative overflow-hidden ghost-border`}>
                <div className={`absolute top-0 right-0 p-2 ${config.badgeColor}`}>
                  <span className={`text-[10px] font-bold ${config.badgeText}`}>{severityLabel[insight.severity]}</span>
                </div>
                <h4 className="text-sm font-bold mb-1 text-on-surface">{insight.title}</h4>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">{insight.description}</p>
                <button className={`w-full py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${config.btnStyle}`}>
                  <span className="material-symbols-outlined text-sm">{insight.actionIcon}</span>
                  {insight.actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 매체별 성과 비교 */}
      <section className="bg-surface-container-lowest rounded-xl overflow-hidden ambient-shadow">
        <div className="p-6 border-b border-surface-container">
          <h3 className="text-lg font-bold text-on-surface">매체별 성과 비교</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">매체</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">지출액</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CTR (%)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CPC</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">전환수</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ROAS (%)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {platformKPIs.map((p) => (
                <tr key={p.platform} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${p.badgeColor} flex items-center justify-center text-white text-[10px] font-bold`}>{p.badge}</div>
                      <span className="text-sm font-semibold">{p.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">₩{p.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium">{p.ctr}%</td>
                  <td className="px-6 py-4 text-sm font-medium">₩{p.cpc.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium">{p.conversions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">{Math.round(p.roas * 100)}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.statusColor}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
