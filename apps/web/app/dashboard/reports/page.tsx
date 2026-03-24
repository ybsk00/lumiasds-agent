'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type Period = 'week' | 'month';

const TENANT_ID = 'd944536d-76c4-4812-857b-e157912d775d';

interface DashboardKPI {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number;
  roas: number;
}

interface MetricRow {
  id: string;
  platform: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
}

interface PlatformSummary {
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
}

interface DailyData {
  date: string;
  cost: number;
  conversions: number;
  roas: number;
}

const PLATFORM_META: Record<string, { label: string; badge: string; badgeColor: string }> = {
  naver_search: { label: '네이버', badge: 'N', badgeColor: 'bg-green-500' },
  naver: { label: '네이버', badge: 'N', badgeColor: 'bg-green-500' },
  meta: { label: 'Meta', badge: 'M', badgeColor: 'bg-blue-600' },
  google: { label: 'Google', badge: 'G', badgeColor: 'bg-red-500' },
};

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const daysBack = period === 'week' ? 7 : 30;
  const startDate = new Date(now.getTime() - daysBack * 86400000);
  const start = startDate.toISOString().split('T')[0];
  return { start, end };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardKPI, setDashboardKPI] = useState<DashboardKPI>({
    impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0, ctr: 0, roas: 0,
  });
  const [platformSummaries, setPlatformSummaries] = useState<PlatformSummary[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { start, end } = getDateRange(period);
    const headers = { 'x-tenant-id': TENANT_ID };

    try {
      const [dashRes, metricsRes] = await Promise.all([
        fetch('/api/reports/dashboard', { headers }),
        fetch(`/api/reports/metrics?start=${start}&end=${end}`, { headers }),
      ]);

      if (!dashRes.ok) throw new Error(`Dashboard API error: ${dashRes.status}`);
      if (!metricsRes.ok) throw new Error(`Metrics API error: ${metricsRes.status}`);

      const dashData: DashboardKPI = await dashRes.json();
      const metricsData: MetricRow[] = await metricsRes.json();

      setDashboardKPI(dashData);

      // Aggregate by platform
      const platformMap = new Map<string, { impressions: number; clicks: number; conversions: number; cost: number; revenue: number }>();
      for (const row of metricsData) {
        const key = row.platform;
        const existing = platformMap.get(key) || { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 };
        platformMap.set(key, {
          impressions: existing.impressions + (row.impressions || 0),
          clicks: existing.clicks + (row.clicks || 0),
          conversions: existing.conversions + (row.conversions || 0),
          cost: existing.cost + (row.cost || 0),
          revenue: existing.revenue + (row.revenue || 0),
        });
      }

      const summaries: PlatformSummary[] = [];
      for (const [platform, totals] of platformMap.entries()) {
        const meta = PLATFORM_META[platform] || { label: platform, badge: platform[0]?.toUpperCase() || '?', badgeColor: 'bg-gray-500' };
        summaries.push({
          platform,
          ...meta,
          ...totals,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          cpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
          roas: totals.cost > 0 ? totals.revenue / totals.cost : 0,
        });
      }
      setPlatformSummaries(summaries);

      // Aggregate by date for daily trend
      const dateMap = new Map<string, { cost: number; conversions: number; revenue: number }>();
      for (const row of metricsData) {
        const d = row.date;
        const existing = dateMap.get(d) || { cost: 0, conversions: 0, revenue: 0 };
        dateMap.set(d, {
          cost: existing.cost + (row.cost || 0),
          conversions: existing.conversions + (row.conversions || 0),
          revenue: existing.revenue + (row.revenue || 0),
        });
      }

      const daily: DailyData[] = Array.from(dateMap.entries())
        .map(([date, vals]) => ({
          date,
          cost: vals.cost,
          conversions: vals.conversions,
          roas: vals.cost > 0 ? vals.revenue / vals.cost : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyData(daily);
    } catch (err: any) {
      console.error('Failed to fetch report data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCTR = dashboardKPI.ctr;
  const totalROAS = dashboardKPI.roas;
  const avgCPC = dashboardKPI.clicks > 0 ? dashboardKPI.cost / dashboardKPI.clicks : 0;

  const maxConversions = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.conversions), 1) : 1;

  return (
    <div className="space-y-8">
      {/* Period Filter */}
      <div className="flex items-center gap-3">
        {(['week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-2 text-sm font-bold rounded-lg transition-all',
              period === p
                ? 'bg-primary text-white'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-variant',
            )}
          >
            {p === 'week' ? '주간' : '월간'}
          </button>
        ))}
        {loading && (
          <span className="text-xs text-slate-500 ml-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            로딩 중...
          </span>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: '총 지출', value: `₩${dashboardKPI.cost.toLocaleString()}`, borderColor: 'border-l-primary' },
          { label: '평균 CTR', value: `${totalCTR.toFixed(2)}%`, borderColor: 'border-l-secondary' },
          { label: '평균 CPC', value: `₩${Math.round(avgCPC).toLocaleString()}`, borderColor: 'border-l-tertiary' },
          { label: '총 전환', value: dashboardKPI.conversions.toLocaleString(), borderColor: 'border-l-primary-container' },
          { label: '평균 ROAS', value: `${(totalROAS * 100).toFixed(0)}%`, borderColor: 'border-l-emerald-500' },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-surface-container-lowest p-6 rounded-xl border-l-4 ${kpi.borderColor} ghost-border`}>
            <p className="text-[11px] font-bold text-slate-500 mb-2">{kpi.label}</p>
            <h3 className="text-2xl font-bold text-on-surface">{kpi.value}</h3>
          </div>
        ))}
      </section>

      {/* Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-on-surface">일별 전환 트렌드</h3>
              <p className="text-xs text-slate-500">
                {period === 'week' ? '최근 7일간' : '최근 30일간'}의 성과 추이
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-primary rounded-sm"></span>
              <span className="text-xs font-medium">전환수</span>
            </div>
          </div>
          {dailyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block">bar_chart</span>
                데이터가 없습니다
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-4 px-4">
              {dailyData.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">{d.conversions}</span>
                  <div
                    className="w-full bg-primary/20 hover:bg-primary transition-colors duration-200 rounded-t-sm cursor-pointer"
                    style={{ height: `${(d.conversions / maxConversions) * 100}%`, minHeight: d.conversions > 0 ? '4px' : '0px' }}
                  />
                  <span className="text-[10px] text-slate-500 font-bold">{formatDate(d.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-primary">monitoring</span>
            <h3 className="text-lg font-bold">성과 요약</h3>
          </div>
          {platformSummaries.length === 0 && !loading ? (
            <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border text-center text-slate-400 text-sm">
              <span className="material-symbols-outlined text-3xl mb-2 block">info</span>
              플랫폼 데이터가 없습니다
            </div>
          ) : (
            platformSummaries.map((p) => (
              <div key={p.platform} className="bg-surface-container-lowest p-5 rounded-xl ghost-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${p.badgeColor} flex items-center justify-center text-white text-[10px] font-bold`}>
                    {p.badge}
                  </div>
                  <span className="text-sm font-semibold">{p.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">지출</span>
                    <p className="font-bold">₩{p.cost.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">ROAS</span>
                    <p className="font-bold text-primary">{(p.roas * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-slate-500">전환</span>
                    <p className="font-bold">{p.conversions.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">CTR</span>
                    <p className="font-bold">{p.ctr.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Platform Performance Table */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {platformSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {loading ? '데이터를 불러오는 중...' : '매체별 데이터가 없습니다'}
                  </td>
                </tr>
              ) : (
                platformSummaries.map((p) => (
                  <tr key={p.platform} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${p.badgeColor} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {p.badge}
                        </div>
                        <span className="text-sm font-semibold">{p.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">₩{p.cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.ctr.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-sm font-medium">₩{Math.round(p.cpc).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.conversions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">{(p.roas * 100).toFixed(0)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
