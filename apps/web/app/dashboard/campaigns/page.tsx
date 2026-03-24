'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const TENANT_ID = 'd944536d-76c4-4812-857b-e157912d775d';

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';

interface Campaign {
  id: string;
  tenant_id: string;
  strategy_id: string | null;
  platform: string;
  platform_campaign_id: string | null;
  name: string;
  type: string;
  status: CampaignStatus;
  budget_daily: number | null;
  budget_total: number | null;
  start_date: string | null;
  end_date: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-slate-200 text-slate-600' },
  active: { label: '진행 중', color: 'bg-emerald-100 text-emerald-700' },
  paused: { label: '일시중지', color: 'bg-slate-200 text-slate-600' },
  completed: { label: '완료', color: 'bg-blue-100 text-blue-700' },
  failed: { label: '실패', color: 'bg-red-100 text-red-700' },
};

const platformConfig: Record<string, { label: string; icon: string; iconColor: string; bgColor: string }> = {
  naver_search: { label: '네이버 검색', icon: 'ads_click', iconColor: 'text-blue-600', bgColor: 'bg-blue-50' },
  meta: { label: 'Meta Ads', icon: 'social_leaderboard', iconColor: 'text-orange-600', bgColor: 'bg-orange-50' },
  google: { label: 'Google Ads', icon: 'search', iconColor: 'text-red-600', bgColor: 'bg-red-50' },
};

const platformFilterOptions = [
  { value: '', label: '전체 플랫폼' },
  { value: 'naver_search', label: '네이버 검색' },
  { value: 'meta', label: 'Meta Ads' },
  { value: 'google', label: 'Google Ads' },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showNewCampaignInfo, setShowNewCampaignInfo] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (platformFilter) params.set('platform', platformFilter);
      const url = `/api/campaigns${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data: Campaign[] = await res.json();
      setCampaigns(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '캠페인을 불러올 수 없습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [platformFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const toggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    setTogglingId(campaign.id);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`상태 변경 실패: ${res.status}`);
      const updated: Campaign = await res.json();
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCampaign?.id === updated.id) setSelectedCampaign(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '상태 변경에 실패했습니다.';
      alert(message);
    } finally {
      setTogglingId(null);
    }
  };

  const saveModalChanges = async (id: string, budgetDaily: number, status: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ budget_daily: budgetDaily, status }),
      });
      if (!res.ok) throw new Error(`저장 실패: ${res.status}`);
      const updated: Campaign = await res.json();
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedCampaign(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      alert(message);
    }
  };

  // Filtered by search query (platform filter is server-side)
  const filteredCampaigns = campaigns.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.platform_campaign_id && c.platform_campaign_id.toLowerCase().includes(q))
    );
  });

  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalBudgetDaily = campaigns.reduce((a, c) => a + (c.budget_daily || 0), 0);
  const totalBudgetTotal = campaigns.reduce((a, c) => a + (c.budget_total || 0), 0);

  // Platform distribution
  const platformCounts = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.platform] = (acc[c.platform] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">캠페인 관리</h2>
          <p className="text-on-surface-variant mt-1">광고 캠페인 현황을 모니터링하고 상태를 관리합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCampaignInfo(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            새 캠페인 생성
          </button>
        </div>
      </div>

      {/* New Campaign Info Dialog */}
      {showNewCampaignInfo && (
        <div
          className="fixed inset-0 bg-on-surface/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewCampaignInfo(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-xl ambient-shadow-lg p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">AI 기반 캠페인 자동 생성</h3>
                <p className="text-sm text-on-surface-variant">캠페인은 전략 디베이트 흐름에서 자동으로 생성됩니다</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">1</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">데이터 분석</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">AnalystAgent가 현재 광고 성과와 시장 데이터를 분석합니다</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-700">2</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">전략 디베이트</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">4개 AI 에이전트가 최적 전략을 토론하여 도출합니다</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-700">3</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">캠페인 자동 생성</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">승인된 전략에 따라 캠페인이 자동으로 생성 및 등록됩니다</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/dashboard/analysis"
                className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-110 transition-all"
              >
                분석 시작하기
              </a>
              <a
                href="/dashboard/strategy"
                className="px-6 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors"
              >
                전략 디베이트 보기
              </a>
              <button
                onClick={() => setShowNewCampaignInfo(false)}
                className="px-6 py-2.5 text-on-surface-variant text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors ml-auto"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-primary">bolt</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">활성 캠페인 수</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{loading ? '-' : activeCampaigns}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-slate-400 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-slate-500">payments</span>
            <span className="text-xs font-medium text-on-surface-variant">일예산 합계</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">일일 총 예산</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{loading ? '-' : `₩${totalBudgetDaily.toLocaleString()}`}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-tertiary-container/30 group-hover:bg-tertiary-container transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-tertiary">account_balance_wallet</span>
            <span className="text-xs font-medium text-on-surface-variant">총 예산</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">총 예산 합계</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{loading ? '-' : `₩${totalBudgetTotal.toLocaleString()}`}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-200 group-hover:bg-purple-500 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-purple-600">campaign</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">전체 캠페인</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{loading ? '-' : campaigns.length}</h3>
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
        <div className="p-6 border-b border-surface-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold">캠페인 목록</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="캠페인 검색..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              {platformFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-spin mb-4">progress_activity</span>
            <p className="text-sm">캠페인을 불러오는 중...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
            <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchCampaigns}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCampaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <div className="w-20 h-20 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">campaign</span>
            </div>
            <h4 className="text-lg font-bold text-on-surface mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '아직 캠페인이 없습니다'}
            </h4>
            <p className="text-sm text-center max-w-md mb-6">
              {searchQuery
                ? `"${searchQuery}"에 해당하는 캠페인을 찾을 수 없습니다.`
                : '캠페인은 AI 전략 디베이트를 통해 자동으로 생성됩니다. 먼저 데이터 분석을 시작하세요.'}
            </p>
            {!searchQuery && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">분석</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-medium">전략 디베이트</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded font-medium">캠페인 자동 생성</span>
                </div>
                <div className="flex gap-3 mt-2">
                  <a
                    href="/dashboard/analysis"
                    className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all"
                  >
                    분석 시작하기
                  </a>
                  <a
                    href="/dashboard/strategy"
                    className="px-5 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors"
                  >
                    전략 디베이트 보기
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">캠페인</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">플랫폼</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">유형</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">일예산</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">기간</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {filteredCampaigns.map((campaign) => {
                    const pConfig = platformConfig[campaign.platform] || {
                      label: campaign.platform,
                      icon: 'public',
                      iconColor: 'text-slate-600',
                      bgColor: 'bg-slate-50',
                    };
                    const sConfig = statusConfig[campaign.status] || statusConfig.draft;
                    return (
                      <tr
                        key={campaign.id}
                        className={cn(
                          'hover:bg-surface-container-low/50 transition-colors',
                          campaign.status === 'paused' && 'opacity-70',
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${pConfig.bgColor} flex items-center justify-center`}>
                              <span className={`material-symbols-outlined ${pConfig.iconColor}`}>{pConfig.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{campaign.name}</p>
                              {campaign.platform_campaign_id && (
                                <p className="text-[11px] text-on-surface-variant">ID: {campaign.platform_campaign_id}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium">{pConfig.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold', sConfig.color)}>
                            {sConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-on-surface-variant">{campaign.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">
                            {campaign.budget_daily ? `₩${campaign.budget_daily.toLocaleString()}` : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-on-surface-variant">
                            {campaign.start_date
                              ? `${campaign.start_date}${campaign.end_date ? ` ~ ${campaign.end_date}` : ' ~'}`
                              : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {(campaign.status === 'active' || campaign.status === 'paused') && (
                              campaign.status === 'active' ? (
                                <button
                                  className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 disabled:opacity-50"
                                  title="일시정지"
                                  disabled={togglingId === campaign.id}
                                  onClick={() => toggleStatus(campaign)}
                                >
                                  <span className="material-symbols-outlined text-xl">
                                    {togglingId === campaign.id ? 'progress_activity' : 'pause_circle'}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  className="p-1.5 hover:bg-primary/10 rounded transition-colors text-primary disabled:opacity-50"
                                  title="재개"
                                  disabled={togglingId === campaign.id}
                                  onClick={() => toggleStatus(campaign)}
                                >
                                  <span className="material-symbols-outlined text-xl">
                                    {togglingId === campaign.id ? 'progress_activity' : 'play_arrow'}
                                  </span>
                                </button>
                              )
                            )}
                            <button
                              className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500"
                              title="상세"
                              onClick={() => setSelectedCampaign(campaign)}
                            >
                              <span className="material-symbols-outlined text-xl">edit_square</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-surface-variant flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">
                전체 {campaigns.length}개 캠페인{searchQuery ? ` (검색 결과: ${filteredCampaigns.length}개)` : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Workflow Guide & Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-xl flex flex-col justify-center">
          <div className="flex items-center gap-2 text-primary mb-3">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-xs font-bold uppercase tracking-widest">AI 캠페인 워크플로우</span>
          </div>
          <h4 className="text-xl font-bold mb-4">분석 &rarr; 전략 디베이트 &rarr; 캠페인 자동 생성</h4>
          <p className="text-on-surface-variant leading-relaxed mb-6">
            LumiAds는 데이터 분석 결과를 기반으로 4개 AI 에이전트가 전략을 토론하고, 승인된 전략에 따라 네이버/메타/구글 캠페인을 자동으로 생성합니다. 수동 캠페인 생성 없이 AI가 최적의 캠페인을 설계합니다.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard/analysis"
              className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              분석 시작하기
            </a>
            <a
              href="/dashboard/strategy"
              className="px-6 py-3 bg-surface-container-lowest text-on-surface text-sm font-semibold rounded-lg hover:bg-white transition-all"
            >
              전략 디베이트 보기
            </a>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border flex flex-col">
          <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">pie_chart</span>
            플랫폼별 캠페인 수
          </h4>
          {campaigns.length > 0 ? (
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {Object.entries(platformCounts).map(([platform, count]) => {
                const pConfig = platformConfig[platform] || { label: platform, bgColor: 'bg-slate-50' };
                const pct = Math.round((count / campaigns.length) * 100);
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-on-surface-variant">{pConfig.label}</span>
                      <span className="text-xs font-bold">{count}개 ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pConfig.bgColor === 'bg-blue-50' ? 'bg-blue-500' : pConfig.bgColor === 'bg-orange-50' ? 'bg-orange-500' : 'bg-red-500')}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant">
              <p className="text-sm">데이터 없음</p>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onSave={saveModalChanges}
        />
      )}
    </div>
  );
}

function CampaignDetailModal({
  campaign,
  onClose,
  onSave,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSave: (id: string, budgetDaily: number, status: string) => Promise<void>;
}) {
  const [budgetDaily, setBudgetDaily] = useState(campaign.budget_daily || 0);
  const [status, setStatus] = useState(campaign.status);
  const [saving, setSaving] = useState(false);

  const pConfig = platformConfig[campaign.platform] || { label: campaign.platform };

  const handleSave = async () => {
    setSaving(true);
    await onSave(campaign.id, budgetDaily, status);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-on-surface/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-xl ambient-shadow-lg p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-lg">{campaign.name}</h3>
            <p className="text-sm text-on-surface-variant">
              {pConfig.label} | {campaign.type}
              {campaign.platform_campaign_id && ` | ${campaign.platform_campaign_id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: '일예산', value: campaign.budget_daily ? `₩${campaign.budget_daily.toLocaleString()}` : '-' },
            { label: '총 예산', value: campaign.budget_total ? `₩${campaign.budget_total.toLocaleString()}` : '-' },
            { label: '시작일', value: campaign.start_date || '-' },
            { label: '종료일', value: campaign.end_date || '-' },
          ].map((item) => (
            <div key={item.label} className="bg-surface-container-low rounded-lg p-3 text-center">
              <p className="text-xs text-on-surface-variant">{item.label}</p>
              <p className="font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">설정 변경</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant ml-1">일예산 (원)</label>
              <input
                type="number"
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(Number(e.target.value))}
                className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant ml-1">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="active">활성</option>
                <option value="paused">일시정지</option>
                <option value="draft">초안</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
