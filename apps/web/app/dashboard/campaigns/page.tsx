'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';

interface MockCampaign {
  id: string;
  platform: string;
  name: string;
  campaignId: string;
  type: string;
  status: CampaignStatus;
  budgetDaily: number;
  spent: number;
  conversions: number;
  roas: number;
  created_at: string;
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

export default function CampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<MockCampaign | null>(null);

  const [campaigns] = useState<MockCampaign[]>([
    { id: '1', platform: 'meta', name: '2024 봄 컬렉션 브랜드 인지도', campaignId: 'CAM-72184', type: 'DISPLAY', status: 'active', budgetDaily: 150000, spent: 2410200, conversions: 42, roas: 3.82, created_at: '2026-03-20' },
    { id: '2', platform: 'google', name: '신규 가입 유도 리마케팅', campaignId: 'CAM-92102', type: 'SEARCH', status: 'active', budgetDaily: 200000, spent: 5120400, conversions: 68, roas: 5.10, created_at: '2026-03-20' },
    { id: '3', platform: 'naver_search', name: '비타민C 세럼 검색광고', campaignId: 'CAM-10523', type: 'SEARCH', status: 'paused', budgetDaily: 50000, spent: 840000, conversions: 12, roas: 2.10, created_at: '2026-03-20' },
    { id: '4', platform: 'meta', name: '신규 앱 설치 캠페인 - 전국', campaignId: 'CAM-11044', type: 'APP_INSTALL', status: 'active', budgetDaily: 300000, spent: 1245000, conversions: 95, roas: 2.95, created_at: '2026-03-18' },
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalSpent = campaigns.reduce((a, c) => a + c.spent, 0);
  const totalConversions = campaigns.reduce((a, c) => a + c.conversions, 0);
  const avgRoas = campaigns.reduce((a, c) => a + c.roas, 0) / campaigns.length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">캠페인 관리</h2>
          <p className="text-on-surface-variant mt-1">실시간 광고 성과 및 예산 집행 현황을 모니터링합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-bright transition-all">
            리포트 다운로드
          </button>
          <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow">
            <span className="material-symbols-outlined text-sm">add</span>
            새 캠페인 생성
          </button>
        </div>
      </div>

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-primary">bolt</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+2 신규</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">활성 캠페인 수</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{activeCampaigns}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-slate-400 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-slate-500">payments</span>
            <span className="text-xs font-medium text-on-surface-variant">이번 달</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">총 지출액</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">₩{totalSpent.toLocaleString()}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-tertiary-container/30 group-hover:bg-tertiary-container transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-tertiary">shopping_cart</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">+12.4%</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">총 전환 수</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{totalConversions}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-200 group-hover:bg-purple-500 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-purple-600">trending_up</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">최상</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">ROAS</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{Math.round(avgRoas * 100)}%</h3>
        </div>
      </div>

      {/* 캠페인 테이블 */}
      <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
        <div className="p-6 border-b border-surface-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold">캠페인 목록</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="캠페인 검색..." type="text" />
            </div>
            <button className="p-2 bg-surface-container-low rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">캠페인</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">플랫폼</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">일예산</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">지출</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">ROAS</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {campaigns.map((campaign) => {
                const pConfig = platformConfig[campaign.platform];
                const sConfig = statusConfig[campaign.status];
                return (
                  <tr key={campaign.id} className={cn('hover:bg-surface-container-low/50 transition-colors', campaign.status === 'paused' && 'opacity-70')}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${pConfig.bgColor} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined ${pConfig.iconColor}`}>{pConfig.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{campaign.name}</p>
                          <p className="text-[11px] text-on-surface-variant">ID: {campaign.campaignId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium">{pConfig.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold', sConfig.color)}>{sConfig.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">₩{campaign.budgetDaily.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">₩{campaign.spent.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn('text-sm font-bold', campaign.status === 'paused' ? 'text-slate-400' : 'text-primary')}>{Math.round(campaign.roas * 100)}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {campaign.status === 'active' ? (
                          <button className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500" title="일시정지">
                            <span className="material-symbols-outlined text-xl">pause_circle</span>
                          </button>
                        ) : (
                          <button className="p-1.5 hover:bg-primary/10 rounded transition-colors text-primary" title="재개">
                            <span className="material-symbols-outlined text-xl">play_arrow</span>
                          </button>
                        )}
                        <button className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500" title="수정" onClick={() => setSelectedCampaign(campaign)}>
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
          <p className="text-xs text-on-surface-variant">전체 {campaigns.length}개의 캠페인 중 1-{campaigns.length} 표시</p>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-xs font-bold">1</button>
          </div>
        </div>
      </div>

      {/* AI 전략 제언 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-xl flex flex-col justify-center">
          <div className="flex items-center gap-2 text-primary mb-3">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-xs font-bold uppercase tracking-widest">AI 전략 제언</span>
          </div>
          <h4 className="text-xl font-bold mb-4">리마케팅 캠페인의 ROAS가 지난 주 대비 14% 상승했습니다.</h4>
          <p className="text-on-surface-variant leading-relaxed mb-6">현재의 긍정적인 추세를 활용하기 위해 일일 예산을 15% 상향 조정하고, 성과가 낮은 브랜드 인지도 캠페인의 예산을 일부 전용할 것을 권장합니다.</p>
          <div className="flex items-center gap-4">
            <button className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all">전략 적용하기</button>
            <button className="px-6 py-3 bg-surface-container-lowest text-on-surface text-sm font-semibold rounded-lg hover:bg-white transition-all">상세 분석 보기</button>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border flex flex-col">
          <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">pie_chart</span>
            플랫폼별 지출 비중
          </h4>
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="relative w-32 h-32 rounded-full border-[12px] border-slate-100 flex items-center justify-center">
              <div className="absolute inset-[-12px] w-32 h-32 rounded-full border-[12px] border-primary border-t-transparent border-r-transparent rotate-45"></div>
              <span className="text-lg font-bold">58%</span>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            {[
              { label: 'Google Ads', color: 'bg-primary', pct: '58%' },
              { label: 'Meta Ads', color: 'bg-slate-300', pct: '32%' },
              { label: '기타', color: 'bg-slate-100', pct: '10%' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                  <span className="text-xs text-on-surface-variant">{item.label}</span>
                </div>
                <span className="text-xs font-bold">{item.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 캠페인 상세 모달 */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-on-surface/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedCampaign(null)}>
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow-lg p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg">{selectedCampaign.name}</h3>
                <p className="text-sm text-on-surface-variant">{platformConfig[selectedCampaign.platform].label} | {selectedCampaign.type}</p>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '일예산', value: `₩${selectedCampaign.budgetDaily.toLocaleString()}` },
                { label: '총 지출', value: `₩${selectedCampaign.spent.toLocaleString()}` },
                { label: '전환', value: selectedCampaign.conversions.toString() },
                { label: 'ROAS', value: `${Math.round(selectedCampaign.roas * 100)}%` },
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
                  <input type="number" defaultValue={selectedCampaign.budgetDaily} className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">상태</label>
                  <select defaultValue={selectedCampaign.status} className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="active">활성</option>
                    <option value="paused">일시정지</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-110 transition-all">저장</button>
                <button onClick={() => setSelectedCampaign(null)} className="px-6 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
