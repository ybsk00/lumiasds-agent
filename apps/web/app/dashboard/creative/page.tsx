'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const TENANT_ID = 'd944536d-76c4-4812-857b-e157912d775d';

type CreativeStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active';

interface Creative {
  id: string;
  ad_group_id: string;
  tenant_id: string;
  platform_creative_id: string | null;
  type: string;
  content: {
    headline?: string;
    description?: string;
    [key: string]: unknown;
  };
  image_urls: string[] | null;
  status: CreativeStatus;
  review_note: string | null;
  performance: {
    ctr?: number;
    [key: string]: unknown;
  } | null;
  created_at: string;
  // joined from ad_group -> campaign
  platform?: string;
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
  naver: { label: '네이버', icon: 'search', color: 'text-green-600' },
  meta: { label: 'Meta', icon: 'social_leaderboard', color: 'text-blue-600' },
  google: { label: 'Google', icon: 'ads_click', color: 'text-red-600' },
};

const defaultPlatformConfig = { label: '기타', icon: 'campaign', color: 'text-slate-600' };

export default function CreativePage() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMessage, setShowCreateMessage] = useState(false);

  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/creative', {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      if (!res.ok) {
        throw new Error(`API 오류: ${res.status}`);
      }
      const data = await res.json();
      setCreatives(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '소재 데이터를 불러오는 데 실패했습니다';
      setError(message);
      setCreatives([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  const filtered = filter === 'all'
    ? creatives
    : creatives.filter((c) => {
        const platform = c.platform || '';
        if (filter === 'naver_search') return platform === 'naver_search' || platform === 'naver';
        return platform === filter;
      });

  const getHeadline = (c: Creative) => c.content?.headline || '(제목 없음)';
  const getDescription = (c: Creative) => c.content?.description || '';
  const getCtr = (c: Creative) => c.performance?.ctr ?? null;
  const getPlatformConfig = (platform?: string) => (platform && platformConfig[platform]) || defaultPlatformConfig;
  const getStatus = (status: string): CreativeStatus => {
    if (status in statusConfig) return status as CreativeStatus;
    return 'draft';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">소재 관리</h2>
          <p className="text-on-surface-variant mt-1">AI가 생성한 광고 소재를 관리합니다</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowCreateMessage(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            소재 생성
          </button>
        </div>
      </div>

      {/* 소재 생성 안내 메시지 */}
      {showCreateMessage && (
        <div className="bg-surface-container-low rounded-xl ghost-border p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary mt-0.5">info</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-on-surface">소재는 캠페인 생성 시 자동으로 생성됩니다</p>
            <p className="text-xs text-on-surface-variant mt-1">
              캠페인 관리 페이지에서 새 캠페인을 생성하면, AI가 자동으로 최적화된 광고 소재를 함께 생성합니다.
            </p>
          </div>
          <button
            onClick={() => setShowCreateMessage(false)}
            className="w-8 h-8 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

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

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant mt-4">소재를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-5xl text-destructive mb-4">error</span>
          <p className="text-sm text-destructive font-medium">{error}</p>
          <button
            onClick={fetchCreatives}
            className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">palette</span>
          <p className="text-lg font-semibold text-on-surface">
            {creatives.length === 0 ? '아직 생성된 소재가 없습니다' : '해당 플랫폼의 소재가 없습니다'}
          </p>
          <p className="text-sm text-on-surface-variant mt-2">
            캠페인을 생성하면 AI가 자동으로 광고 소재를 만들어 드립니다
          </p>
        </div>
      )}

      {/* 소재 그리드 */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((creative) => {
            const pConfig = getPlatformConfig(creative.platform);
            const status = getStatus(creative.status);
            const headline = getHeadline(creative);
            const description = getDescription(creative);
            const ctr = getCtr(creative);
            const hasImages = creative.image_urls && creative.image_urls.length > 0;

            return (
              <div
                key={creative.id}
                className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden cursor-pointer hover:ambient-shadow transition-all duration-200 group"
                onClick={() => setSelectedCreative(creative)}
              >
                {/* 이미지/텍스트 영역 */}
                {hasImages || creative.type === 'image' ? (
                  <div className="h-44 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-5xl text-slate-300">image</span>
                    <div className="absolute top-3 right-3">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', statusConfig[status].color)}>{statusConfig[status].label}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 bg-surface-container-low p-5 flex flex-col justify-center relative">
                    <p className="font-bold text-on-surface">{headline}</p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{description}</p>
                    <div className="absolute top-3 right-3">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', statusConfig[status].color)}>{statusConfig[status].label}</span>
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
                    {ctr !== null && (
                      <span className="text-xs font-bold text-primary">CTR {ctr}%</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-on-surface truncate">{headline}</p>
                  {creative.review_note && (
                    <div className="mt-2 p-2 bg-error-container/30 rounded flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-destructive text-sm mt-0.5">warning</span>
                      <p className="text-[11px] text-destructive leading-relaxed">{creative.review_note}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 소재 상세 모달 */}
      {selectedCreative && (() => {
        const pConfig = getPlatformConfig(selectedCreative.platform);
        const status = getStatus(selectedCreative.status);
        const headline = getHeadline(selectedCreative);
        const description = getDescription(selectedCreative);

        return (
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
                    <span className={cn('material-symbols-outlined text-[16px]', pConfig.color)}>{pConfig.icon}</span>
                    <span className="text-xs text-on-surface-variant">{pConfig.label}</span>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded', statusConfig[status].color)}>
                    {statusConfig[status].label}
                  </span>
                </div>

                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-[11px] text-on-surface-variant mb-1">제목</p>
                  <p className="font-bold text-on-surface">{headline}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-[11px] text-on-surface-variant mb-1">설명</p>
                  <p className="text-sm text-on-surface">{description}</p>
                </div>

                {selectedCreative.review_note && (
                  <div className="p-4 bg-error-container/30 rounded-lg flex gap-2">
                    <span className="material-symbols-outlined text-destructive">warning</span>
                    <p className="text-sm text-destructive">{selectedCreative.review_note}</p>
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
        );
      })()}
    </div>
  );
}
