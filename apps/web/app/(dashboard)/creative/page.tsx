'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type CreativeStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active';

interface MockCreative {
  id: string;
  platform: string;
  type: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  status: CreativeStatus;
  reviewNote: string | null;
  ctr?: number;
  created_at: string;
}

const statusConfig: Record<CreativeStatus, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-slate-200 text-slate-600' },
  pending_review: { label: '검수 대기', color: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '거부', color: 'bg-red-100 text-red-700' },
  active: { label: '활성', color: 'bg-blue-100 text-blue-700' },
};

const platformConfig: Record<string, { label: string; icon: string; color: string }> = {
  naver_search: { label: '네이버 검색', icon: 'search', color: 'text-green-600' },
  meta: { label: 'Meta', icon: 'social_leaderboard', color: 'text-blue-600' },
  google: { label: 'Google', icon: 'ads_click', color: 'text-red-600' },
};

export default function CreativePage() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedCreative, setSelectedCreative] = useState<MockCreative | null>(null);

  const [creatives] = useState<MockCreative[]>([
    { id: '1', platform: 'naver_search', type: 'text', headline: '비타민C 세럼 2주 체험', description: '순도 99% 비타민C로 맑은 피부를 경험하세요. 2주 만족 보장.', imageUrl: null, status: 'approved', reviewNote: null, ctr: 4.2, created_at: '2026-03-20' },
    { id: '2', platform: 'meta', type: 'image', headline: '피부톤 개선의 비밀', description: '피부과 전문의 추천 비타민C 세럼', imageUrl: null, status: 'active', reviewNote: null, ctr: 1.8, created_at: '2026-03-20' },
    { id: '3', platform: 'meta', type: 'image', headline: '지금 시작하는 투명 피부', description: '첫 구매 20% 할인 + 무료배송', imageUrl: null, status: 'pending_review', reviewNote: '"첫 구매 할인" — 기간 명시 필요', created_at: '2026-03-21' },
    { id: '4', platform: 'google', type: 'text', headline: '비타민C 세럼 추천', description: '순도 99% 고농축 비타민C 세럼. 2주 만족 보장. 지금 구매하기.', imageUrl: null, status: 'draft', reviewNote: null, created_at: '2026-03-21' },
    { id: '5', platform: 'naver_search', type: 'text', headline: '비타민C 세럼 효과 후기', description: '실제 사용자 93%가 만족한 피부톤 개선 효과', imageUrl: null, status: 'rejected', reviewNote: '"93% 만족" — 근거 자료 필요', created_at: '2026-03-21' },
  ]);

  const filtered = filter === 'all' ? creatives : creatives.filter((c) => c.platform === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">소재 관리</h2>
          <p className="text-on-surface-variant mt-1">AI가 생성한 광고 소재를 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow">
          <span className="material-symbols-outlined text-sm">add</span>
          소재 생성
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {[{ value: 'all', label: '전체' }, { value: 'naver_search', label: '네이버' }, { value: 'meta', label: 'Meta' }, { value: 'google', label: 'Google' }].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-all duration-200',
              filter === f.value
                ? 'bg-primary text-white font-medium ambient-shadow'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 소재 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((creative) => {
          const pConfig = platformConfig[creative.platform];
          return (
            <div
              key={creative.id}
              className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden cursor-pointer hover:ambient-shadow transition-all duration-200 group"
              onClick={() => setSelectedCreative(creative)}
            >
              {/* 이미지/텍스트 영역 */}
              {creative.type === 'image' ? (
                <div className="h-44 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center relative">
                  <span className="material-symbols-outlined text-5xl text-slate-300">image</span>
                  <div className="absolute top-3 right-3">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', statusConfig[creative.status].color)}>{statusConfig[creative.status].label}</span>
                  </div>
                </div>
              ) : (
                <div className="h-44 bg-surface-container-low p-5 flex flex-col justify-center relative">
                  <p className="font-bold text-on-surface">{creative.headline}</p>
                  <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{creative.description}</p>
                  <div className="absolute top-3 right-3">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', statusConfig[creative.status].color)}>{statusConfig[creative.status].label}</span>
                  </div>
                </div>
              )}

              {/* 정보 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('material-symbols-outlined text-[16px]', pConfig.color)}>{pConfig.icon}</span>
                    <span className="text-xs text-on-surface-variant font-medium">{pConfig.label}</span>
                  </div>
                  {creative.ctr && (
                    <span className="text-xs font-bold text-primary">CTR {creative.ctr}%</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-on-surface truncate">{creative.headline}</p>
                {creative.reviewNote && (
                  <div className="mt-2 p-2 bg-error-container/30 rounded flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-destructive text-sm mt-0.5">warning</span>
                    <p className="text-[11px] text-destructive leading-relaxed">{creative.reviewNote}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 소재 상세 모달 */}
      {selectedCreative && (
        <div className="fixed inset-0 bg-on-surface/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedCreative(null)}>
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">소재 상세</h3>
              <button onClick={() => setSelectedCreative(null)} className="w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={cn('material-symbols-outlined text-[16px]', platformConfig[selectedCreative.platform].color)}>{platformConfig[selectedCreative.platform].icon}</span>
                  <span className="text-xs text-on-surface-variant">{platformConfig[selectedCreative.platform].label}</span>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded', statusConfig[selectedCreative.status].color)}>
                  {statusConfig[selectedCreative.status].label}
                </span>
              </div>

              <div className="bg-surface-container-low rounded-lg p-4">
                <p className="text-[11px] text-on-surface-variant mb-1">제목</p>
                <p className="font-bold text-on-surface">{selectedCreative.headline}</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-4">
                <p className="text-[11px] text-on-surface-variant mb-1">설명</p>
                <p className="text-sm text-on-surface">{selectedCreative.description}</p>
              </div>

              {selectedCreative.reviewNote && (
                <div className="p-4 bg-error-container/30 rounded-lg flex gap-2">
                  <span className="material-symbols-outlined text-destructive">warning</span>
                  <p className="text-sm text-destructive">{selectedCreative.reviewNote}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>승인
                </button>
                <button className="flex-1 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">edit</span>수정
                </button>
                <button className="flex-1 py-2.5 bg-error-container text-destructive text-sm font-bold rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">block</span>거부
                </button>
                <button className="flex-1 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">refresh</span>재생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
