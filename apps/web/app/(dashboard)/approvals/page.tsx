'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type ApprovalType = 'strategy' | 'optimization' | 'budget';

interface PendingApproval {
  id: string;
  type: ApprovalType;
  title: string;
  summary: string;
  triggerReason: string | null;
  validationScore: number | null;
  changes: { field: string; from: string; to: string }[];
  debateSummary: { role: string; color: string; text: string }[] | null;
  created_at: string;
  timeAgo: string;
}

const typeConfig: Record<ApprovalType, { label: string; color: string; borderColor: string }> = {
  strategy: { label: '전략 제안', color: 'bg-secondary-container text-on-surface-variant', borderColor: 'border-t-primary-container' },
  optimization: { label: '최적화 수정', color: 'bg-tertiary-fixed text-on-surface-variant', borderColor: 'border-t-tertiary-container' },
  budget: { label: '예산 변경', color: 'bg-emerald-100 text-emerald-700', borderColor: 'border-t-emerald-500' },
};

export default function ApprovalsPage() {
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const [approvals] = useState<PendingApproval[]>([
    {
      id: '1',
      type: 'optimization',
      title: '메타 광고 최적화 제안',
      summary: 'CPC 급등(+40%) 및 CTR 하락 감지',
      triggerReason: '현재 메타 캠페인의 CPC가 지난 7일 평균 대비 24% 상승했습니다. 타겟 중복률이 40%를 초과하여 효율 저하가 발생하고 있습니다.',
      validationScore: 84,
      changes: [
        { field: '타겟팅', from: '관심사: 뷰티/패션 (광범위)', to: '유사타겟 1% (구매 완료 고객 기반)' },
        { field: '예산 배분', from: '일일 500,000원 (고정)', to: 'CBO (캠페인 예산 최적화) 활성화' },
      ],
      debateSummary: [
        { role: 'Strategist', color: 'text-primary', text: '비효율 세그먼트를 제거하고 유사 타겟으로 전환하여 ROAS 15% 개선을 기대합니다.' },
        { role: 'Challenger', color: 'text-destructive', text: '유사 타겟의 모수가 좁아질 경우 CPM 상승 우려가 있으나, 전환당 비용 관점에서 유리할 것으로 판단됩니다.' },
      ],
      created_at: '2026-03-23T08:30:00Z',
      timeAgo: '15분 전 생성',
    },
    {
      id: '2',
      type: 'strategy',
      title: '비타민C 세럼 신규 전략',
      summary: 'Q4 브랜드 캠페인 연계',
      triggerReason: null,
      validationScore: 88,
      changes: [
        { field: '네이버 일예산', from: '-', to: '₩75,000' },
        { field: '메타 일예산', from: '-', to: '₩66,667' },
        { field: '구글 일예산', from: '-', to: '₩25,000' },
      ],
      debateSummary: null,
      created_at: '2026-03-22T14:00:00Z',
      timeAgo: '2시간 전 생성',
    },
  ]);

  const handleApprove = (id: string) => {
    alert(`승인 완료: ${id}. 자동 실행을 시작합니다.`);
  };

  const handleReject = (id: string) => {
    alert(`거부: ${id}`);
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
          <p className="text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">검토 필요</p>
          <h3 className="text-3xl font-bold text-on-surface">{approvals.length}</h3>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
          <p className="text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">평균 검증 점수</p>
          <h3 className="text-3xl font-bold text-on-surface">
            {(approvals.reduce((a, b) => a + (b.validationScore || 0), 0) / approvals.length).toFixed(1)}
          </h3>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
          <p className="text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">자동 실행 대기</p>
          <h3 className="text-3xl font-bold text-on-surface">1</h3>
        </div>
      </div>

      {/* Approval List */}
      <div className="space-y-4">
        {approvals.map((approval) => {
          const tConfig = typeConfig[approval.type];
          const isExpanded = expandedId === approval.id;

          return (
            <div key={approval.id} className={cn('bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden border-t-4 transition-all', tConfig.borderColor, isExpanded ? '' : 'hover:shadow-md')}>
              {/* Accordion Header */}
              <div
                className="p-6 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : approval.id)}
              >
                <div className="flex items-center gap-6">
                  <span className={cn('px-3 py-1 text-[11px] font-bold rounded-full', tConfig.color)}>
                    {tConfig.label}
                  </span>
                  <div>
                    <h4 className="text-lg font-bold text-on-surface mb-1">{approval.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {approval.timeAgo}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Verifier 검증 완료
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">검증 점수</p>
                    <p className="text-xl font-bold text-primary">{approval.validationScore}<span className="text-xs text-slate-400">/100</span></p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-6">
                  {/* Trigger Reason */}
                  {approval.triggerReason && (
                    <div className="p-4 bg-error-container/40 rounded-lg flex gap-3 border border-destructive/10">
                      <span className="material-symbols-outlined text-destructive" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                      <div>
                        <p className="text-sm font-bold text-on-surface mb-1">수정 필요 감지 (Strategist)</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{approval.triggerReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Change Table */}
                  <div className="bg-surface-container-low rounded-lg p-4">
                    <h5 className="text-xs font-bold text-slate-500 mb-4 px-1">변경 제안 내역</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-400 font-bold uppercase px-2">Before</div>
                        {approval.changes.map((c, i) => (
                          <div key={i} className="bg-white p-3 rounded-md border border-slate-200">
                            <p className="text-[11px] text-slate-400 mb-1">{c.field}</p>
                            <p className="text-xs font-medium">{c.from}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="text-[10px] text-primary font-bold uppercase px-2">After</div>
                        {approval.changes.map((c, i) => (
                          <div key={i} className="bg-primary/5 p-3 rounded-md border border-primary/20">
                            <p className="text-[11px] text-primary/70 mb-1">{c.field}</p>
                            <p className="text-xs font-bold text-primary">{c.to}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Debate Summary */}
                  {approval.debateSummary && (
                    <div className="p-5 border-l-4 border-secondary-container bg-surface-container-low rounded-r-lg">
                      <h5 className="text-xs font-bold text-secondary mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">forum</span> AI 에이전트 토론 요약
                      </h5>
                      <div className="space-y-3">
                        {approval.debateSummary.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <span className={cn('text-[10px] font-bold min-w-[60px]', d.color)}>{d.role}:</span>
                            <p className="text-xs text-slate-600 leading-relaxed">{d.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => handleReject(approval.id)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                      거부
                    </button>
                    <button className="px-4 py-2 text-xs font-bold text-on-surface bg-surface-container-high hover:bg-surface-variant rounded-lg transition-colors">
                      수정 후 재토론
                    </button>
                    <button onClick={() => handleApprove(approval.id)} className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-lg ambient-shadow transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      승인 — 자동 실행
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        <div className="py-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
            <span className="material-symbols-outlined text-slate-400">done_all</span>
          </div>
          <p className="text-sm text-slate-400">모든 중요 승인 사항을 확인했습니다.</p>
        </div>
      </div>
    </div>
  );
}
