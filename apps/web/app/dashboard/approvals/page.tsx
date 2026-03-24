'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const TENANT_ID = 'd944536d-76c4-4812-857b-e157912d775d';

type ApprovalType = 'strategy' | 'optimization' | 'budget';

interface StrategyRecord {
  id: string;
  tenant_id: string;
  analysis_report_id: string | null;
  input: {
    business_type?: string;
    product?: string;
    goal?: string;
    monthly_budget?: number;
    target_platforms?: string[];
    landing_url?: string;
    target_audience_hint?: string;
    campaign_period?: { start: string; end: string };
  } | null;
  output: {
    executive_summary?: string;
    channel_allocation?: Record<string, { budget: number; rationale: string }>;
    validation_score?: number;
    warnings?: string[];
    expected_kpi?: { cpc: number; ctr: number; cvr: number; roas: number };
  } | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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
  status: string;
}

const typeConfig: Record<ApprovalType, { label: string; color: string; borderColor: string }> = {
  strategy: { label: '전략 제안', color: 'bg-secondary-container text-on-surface-variant', borderColor: 'border-t-primary-container' },
  optimization: { label: '최적화 수정', color: 'bg-tertiary-fixed text-on-surface-variant', borderColor: 'border-t-tertiary-container' },
  budget: { label: '예산 변경', color: 'bg-emerald-100 text-emerald-700', borderColor: 'border-t-emerald-500' },
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전 생성';
  if (diffMin < 60) return `${diffMin}분 전 생성`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전 생성`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전 생성`;
}

function formatBudget(value: number): string {
  if (value >= 10000) {
    return `₩${(value).toLocaleString()}`;
  }
  return `₩${value.toLocaleString()}`;
}

function mapStrategyToApproval(s: StrategyRecord): PendingApproval {
  const input = s.input || {};
  const output = s.output || {};

  const title = input.product
    ? `${input.product} ${s.status === 'debating' ? '전략 토론 중' : '전략 제안'}`
    : (s.status === 'debating' ? '전략 토론 중' : '전략 제안');

  const summary = output.executive_summary
    || (input.goal ? `마케팅 목표: ${input.goal}` : '전략 검토 대기');

  const changes: { field: string; from: string; to: string }[] = [];
  if (output.channel_allocation) {
    for (const [platform, alloc] of Object.entries(output.channel_allocation)) {
      const platformLabels: Record<string, string> = {
        naver_search: '네이버 검색',
        naver_gfa: '네이버 GFA',
        meta: '메타',
        google: '구글',
        kakao: '카카오',
      };
      changes.push({
        field: `${platformLabels[platform] || platform} 예산`,
        from: '-',
        to: formatBudget(alloc.budget),
      });
    }
  }
  if (input.monthly_budget && changes.length === 0) {
    changes.push({
      field: '월 예산',
      from: '-',
      to: formatBudget(input.monthly_budget),
    });
  }

  const triggerReason = output.warnings && output.warnings.length > 0
    ? output.warnings.join(' ')
    : null;

  return {
    id: s.id,
    type: 'strategy',
    title,
    summary,
    triggerReason,
    validationScore: output.validation_score ?? null,
    changes,
    debateSummary: s.status === 'debating'
      ? [{ role: 'System', color: 'text-secondary', text: 'AI 에이전트 간 디베이트가 진행 중입니다...' }]
      : null,
    created_at: s.created_at,
    timeAgo: formatTimeAgo(s.created_at),
    status: s.status,
  };
}

export default function ApprovalsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/strategy', {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data: StrategyRecord[] = await res.json();

      const pending = data
        .filter((s) => s.status === 'pending_approval' || s.status === 'debating')
        .map(mapStrategyToApproval);

      setApprovals(pending);
      if (pending.length > 0) {
        setExpandedId((prev) => prev ?? pending[0].id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/strategy/${id}/approve`, {
        method: 'POST',
        headers: { 'x-tenant-id': TENANT_ID, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `승인 실패: ${res.status}`);
      }
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '승인 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      // Update strategy status to 'rejected' via approvals reject endpoint
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'x-tenant-id': TENANT_ID, 'Content-Type': 'application/json' },
      });
      // Remove from local list regardless of backend response
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '거부 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-container-low p-6 rounded-xl ghost-border animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface-container-lowest rounded-xl ambient-shadow p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-48 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const avgScore = approvals.length > 0
    ? (approvals.reduce((a, b) => a + (b.validationScore || 0), 0) / approvals.filter((a) => a.validationScore !== null).length)
    : 0;

  const pendingCount = approvals.filter((a) => a.status === 'pending_approval').length;

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-error-container/40 rounded-lg flex items-center gap-3 border border-destructive/10">
          <span className="material-symbols-outlined text-destructive" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <p className="text-sm text-on-surface flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
          <p className="text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">검토 필요</p>
          <h3 className="text-3xl font-bold text-on-surface">{approvals.length}</h3>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
          <p className="text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">평균 검증 점수</p>
          <h3 className="text-3xl font-bold text-on-surface">
            {approvals.length > 0 && avgScore > 0 ? avgScore.toFixed(1) : '-'}
          </h3>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
          <p className="text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">자동 실행 대기</p>
          <h3 className="text-3xl font-bold text-on-surface">{pendingCount}</h3>
        </div>
      </div>

      {/* Approval List */}
      <div className="space-y-4">
        {approvals.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <span className="material-symbols-outlined text-2xl text-slate-400">done_all</span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">승인 대기 항목이 없습니다</p>
            <p className="text-xs text-slate-400">새로운 전략 제안이 생성되면 여기에 표시됩니다.</p>
            <button
              onClick={() => { setLoading(true); fetchApprovals(); }}
              className="mt-4 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              새로고침
            </button>
          </div>
        ) : (
          <>
            {approvals.map((approval) => {
              const tConfig = typeConfig[approval.type];
              const isExpanded = expandedId === approval.id;
              const isDebating = approval.status === 'debating';
              const isActionLoading = actionLoading === approval.id;

              return (
                <div key={approval.id} className={cn('bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden border-t-4 transition-all', tConfig.borderColor, isExpanded ? '' : 'hover:shadow-md')}>
                  {/* Accordion Header */}
                  <div
                    className="p-6 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className={cn('px-3 py-1 text-[11px] font-bold rounded-full', tConfig.color)}>
                          {tConfig.label}
                        </span>
                        {isDebating && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 animate-pulse">
                            토론 중
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-on-surface mb-1">{approval.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {approval.timeAgo}
                          </span>
                          {!isDebating && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              Verifier 검증 완료
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">검증 점수</p>
                        <p className="text-xl font-bold text-primary">
                          {approval.validationScore !== null ? (
                            <>{approval.validationScore}<span className="text-xs text-slate-400">/100</span></>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-6">
                      {/* Summary */}
                      {approval.summary && (
                        <p className="text-sm text-on-surface-variant leading-relaxed">{approval.summary}</p>
                      )}

                      {/* Trigger Reason */}
                      {approval.triggerReason && (
                        <div className="p-4 bg-error-container/40 rounded-lg flex gap-3 border border-destructive/10">
                          <span className="material-symbols-outlined text-destructive" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                          <div>
                            <p className="text-sm font-bold text-on-surface mb-1">주의 사항 (Verifier)</p>
                            <p className="text-xs text-on-surface-variant leading-relaxed">{approval.triggerReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Change Table */}
                      {approval.changes.length > 0 && (
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
                      )}

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
                        {isDebating ? (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            AI 토론이 진행 중입니다. 완료 후 승인할 수 있습니다.
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReject(approval.id)}
                              disabled={isActionLoading}
                              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              거부
                            </button>
                            <button className="px-4 py-2 text-xs font-bold text-on-surface bg-surface-container-high hover:bg-surface-variant rounded-lg transition-colors">
                              수정 후 재토론
                            </button>
                            <button
                              onClick={() => handleApprove(approval.id)}
                              disabled={isActionLoading}
                              className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-lg ambient-shadow transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              {isActionLoading ? (
                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              )}
                              승인 — 자동 실행
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
