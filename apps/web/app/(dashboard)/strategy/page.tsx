'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type AgentRole = 'strategist' | 'challenger' | 'mediator' | 'validator';
type StrategyStatus = 'idle' | 'input' | 'debating' | 'completed';

interface DebateMessage {
  id: string;
  round: number;
  agent_role: AgentRole;
  content: string;
  confidence?: number;
  validation_score?: number;
  timestamp: string;
}

const agentConfig: Record<AgentRole, { label: string; engLabel: string; icon: string; color: string; bgColor: string; borderColor: string; model: string }> = {
  strategist: { label: '전략가', engLabel: 'STRATEGIST', icon: 'smart_toy', color: 'text-primary', bgColor: 'bg-primary', borderColor: 'border-primary', model: 'Gemini Flash' },
  challenger: { label: '도전자', engLabel: 'CHALLENGER', icon: 'security', color: 'text-destructive', bgColor: 'bg-destructive', borderColor: 'border-destructive', model: 'Claude 3.5' },
  mediator: { label: '중재자', engLabel: 'MEDIATOR', icon: 'balance', color: 'text-secondary', bgColor: 'bg-secondary', borderColor: 'border-secondary', model: 'GPT-4o' },
  validator: { label: '검증자', engLabel: 'VERIFIER', icon: 'verified_user', color: 'text-emerald-600', bgColor: 'bg-emerald-600', borderColor: 'border-emerald-600', model: 'Gemini Pro' },
};

export default function StrategyPage() {
  const [status, setStatus] = useState<StrategyStatus>('idle');
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [formData, setFormData] = useState({
    business_type: '',
    product: '',
    goal: 'conversion',
    monthly_budget: '',
    platforms: ['naver_search', 'meta', 'google'] as string[],
    landing_url: '',
    target_audience_hint: '',
  });

  const handleStartDebate = async () => {
    setStatus('debating');
    setShowDebateModal(true);
    setMessages([]);

    const simulateMessages: DebateMessage[] = [
      { id: '1', round: 1, agent_role: 'strategist', confidence: 92, content: `현재 2040 세대를 타겟으로 한 캠페인 효율을 극대화하기 위해, 영상 크리에이티브의 첫 3초를 '문제 해결형' 시퀀스로 전면 교체하는 것을 제안합니다. CPM 대비 전환율이 15% 상승할 것으로 예측됩니다.`, timestamp: '오후 2:14' },
      { id: '2', round: 1, agent_role: 'challenger', confidence: 88, content: '이의가 있습니다. 해당 시퀀스는 기존 브랜드 톤앤매너와 충돌할 위험이 큽니다. 단기 전환율은 오를 수 있으나, 장기적인 브랜드 신뢰도 하락 지표가 8% 관찰됩니다. 보다 부드러운 전환이 필요합니다.', timestamp: '오후 2:15' },
      { id: '3', round: 2, agent_role: 'mediator', confidence: 95, content: `양측의 의견을 종합해 보겠습니다. 전략가의 '문제 해결형' 접근법을 유지하되, 도전자가 우려하는 브랜드 일관성을 지키기 위해 브랜드 전용 폰트와 컬러 팔레트를 첫 프레임부터 노출하는 하이브리드 방식을 제안합니다.`, timestamp: '오후 2:16' },
      { id: '4', round: 2, agent_role: 'validator', confidence: 90, validation_score: 86, content: '중재자의 제안을 시뮬레이션한 결과, 전환율 상승폭은 12%로 유지되면서 브랜드 이탈 위험은 1.5% 수준으로 급감함을 확인했습니다. 광고 정책 가이드라인에도 모두 부합합니다. 해당 전략 승인을 권장합니다.', timestamp: '오후 2:17' },
    ];

    for (let i = 0; i < simulateMessages.length; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      setMessages((prev) => [...prev, simulateMessages[i]]);
      if (simulateMessages[i].validation_score) {
        setValidationScore(simulateMessages[i].validation_score!);
      }
    }
    setStatus('completed');
  };

  const handleApprove = async () => {
    alert('전략이 승인되었습니다! 캠페인 자동 생성을 시작합니다.');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">전략 수립</h2>
          <p className="text-on-surface-variant mt-1">AI 에이전트 디베이트로 최적 광고 전략을 도출합니다</p>
        </div>
        {status === 'idle' && (
          <button
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow"
            onClick={() => setStatus('input')}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            새 전략 회의 시작
          </button>
        )}
      </div>

      {/* 입력 폼 */}
      {status === 'input' && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <h3 className="text-lg font-semibold">마케팅 목표 입력</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: '업종', type: 'select', value: formData.business_type, options: [{ v: '', l: '선택' }, { v: 'ecommerce', l: '이커머스' }, { v: 'medical', l: '의료/병원' }, { v: 'education', l: '교육/학원' }, { v: 'finance', l: '금융' }, { v: 'etc', l: '기타' }], onChange: (v: string) => setFormData({ ...formData, business_type: v }) },
              { label: '제품/서비스명', type: 'text', value: formData.product, placeholder: '예: 비타민C 세럼', onChange: (v: string) => setFormData({ ...formData, product: v }) },
              { label: '월 예산 (원)', type: 'number', value: formData.monthly_budget, placeholder: '5,000,000', onChange: (v: string) => setFormData({ ...formData, monthly_budget: v }) },
              { label: '목표', type: 'select', value: formData.goal, options: [{ v: 'conversion', l: '전환 (구매/가입)' }, { v: 'traffic', l: '트래픽' }, { v: 'awareness', l: '인지도' }, { v: 'leads', l: '리드 수집' }], onChange: (v: string) => setFormData({ ...formData, goal: v }) },
              { label: '랜딩 URL', type: 'text', value: formData.landing_url, placeholder: 'https://example.com', onChange: (v: string) => setFormData({ ...formData, landing_url: v }) },
              { label: '타겟 힌트', type: 'text', value: formData.target_audience_hint, placeholder: '예: 25-45세 여성, 스킨케어 관심', onChange: (v: string) => setFormData({ ...formData, target_audience_hint: v }) },
            ].map((field) => (
              <div key={field.label} className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant ml-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select value={field.value} onChange={(e) => field.onChange(e.target.value)} className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    {field.options!.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant ml-1">플랫폼 선택</label>
            <div className="flex gap-4">
              {[{ value: 'naver_search', label: '네이버 검색' }, { value: 'meta', label: 'Meta' }, { value: 'google', label: 'Google Ads' }].map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.platforms.includes(p.value)}
                    onChange={(e) => {
                      const platforms = e.target.checked ? [...formData.platforms, p.value] : formData.platforms.filter((x) => x !== p.value);
                      setFormData({ ...formData, platforms });
                    }}
                    className="rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleStartDebate} className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">forum</span>
              AI 전략 회의 시작
            </button>
            <button onClick={() => setStatus('idle')} className="px-6 py-3 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 에이전트 상태 바 */}
      {(status === 'debating' || status === 'completed') && !showDebateModal && (
        <div className="bg-surface-container-low p-6 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['strategist', 'challenger', 'mediator', 'validator'] as AgentRole[]).map((role) => {
            const config = agentConfig[role];
            const hasSpoken = messages.some((m) => m.agent_role === role);
            const lastMsg = [...messages].reverse().find((m) => m.agent_role === role);
            return (
              <div key={role} className="flex items-center gap-3">
                <div className="relative">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2', hasSpoken ? `${config.color.replace('text-', 'bg-')}/10 ${config.borderColor}` : 'bg-slate-100 border-slate-200')}>
                    <span className={cn('material-symbols-outlined', hasSpoken ? config.color : 'text-slate-400')} style={{ fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
                  </div>
                  {hasSpoken && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-container-low"></div>}
                </div>
                <div>
                  <p className={cn('text-[10px] font-bold uppercase tracking-wider leading-none mb-1', hasSpoken ? config.color : 'text-slate-400')}>{config.engLabel}</p>
                  <p className="text-sm font-semibold leading-none">{config.label} <span className="text-[10px] font-normal text-on-surface-variant">{config.model}</span></p>
                  {lastMsg?.confidence && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-1 w-12 bg-surface-variant rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', config.bgColor)} style={{ width: `${lastMsg.confidence}%` }}></div>
                      </div>
                      <span className="text-[9px] font-bold text-on-surface-variant">{lastMsg.confidence}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 결과 카드 */}
      {status === 'completed' && !showDebateModal && validationScore && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">전략 회의 완료</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                검증 점수: <span className="font-bold text-primary">{validationScore}/100</span>
                {validationScore >= 80 ? ' — 통과' : ' — 미달 (재토론 필요)'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDebateModal(true)} className="px-4 py-2 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">forum</span>
                토론 보기
              </button>
              <button className="px-4 py-2 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">edit_note</span>
                수정 요청
              </button>
              <button onClick={handleApprove} className="px-6 py-2.5 bg-gradient-to-b from-primary-container to-primary text-white font-bold text-sm rounded-lg ambient-shadow hover:shadow-lg transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">task_alt</span>
                전략 승인 및 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {status === 'idle' && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">psychology_alt</span>
          </div>
          <p className="text-on-surface-variant">아직 전략이 없습니다. '새 전략 회의 시작' 버튼을 눌러 AI 디베이트를 시작하세요.</p>
        </div>
      )}

      {/* 디베이트 모달 */}
      {showDebateModal && (
        <div className="fixed inset-0 bg-on-surface/10 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8">
          <div className="w-full max-w-5xl h-[870px] bg-surface-container-lowest rounded-xl ambient-shadow-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <header className="h-16 px-6 flex items-center justify-between border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-sm">forum</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">AI 에이전트 전략 토론</h2>
              </div>
              <button onClick={() => setShowDebateModal(false)} className="w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            {/* Agent Status Bar */}
            <div className="bg-surface-container-low px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['strategist', 'challenger', 'mediator', 'validator'] as AgentRole[]).map((role) => {
                const config = agentConfig[role];
                const lastMsg = [...messages].reverse().find((m) => m.agent_role === role);
                return (
                  <div key={role} className="flex items-center gap-3">
                    <div className="relative">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2', `${config.color.replace('text-', 'bg-')}/10`, config.borderColor)}>
                        <span className={cn('material-symbols-outlined', config.color)} style={{ fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-container-low"></div>
                    </div>
                    <div>
                      <p className={cn('text-[10px] font-bold uppercase tracking-wider leading-none mb-1', config.color)}>{config.engLabel}</p>
                      <p className="text-sm font-semibold leading-none">{config.label} <span className="text-[10px] font-normal text-on-surface-variant">{config.model}</span></p>
                      {lastMsg?.confidence && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-12 bg-surface-variant rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', config.bgColor)} style={{ width: `${lastMsg.confidence}%` }}></div>
                          </div>
                          <span className="text-[9px] font-bold text-on-surface-variant">{lastMsg.confidence}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-surface-bright">
              {messages.map((msg) => {
                const config = agentConfig[msg.agent_role];
                const isRight = msg.agent_role === 'challenger' || msg.agent_role === 'validator';
                return (
                  <div key={msg.id} className={cn('flex gap-4 max-w-3xl', isRight && 'ml-auto flex-row-reverse')}>
                    <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ambient-shadow', config.bgColor)}>
                      <span className="material-symbols-outlined">{config.icon}</span>
                    </div>
                    <div className={cn('flex flex-col gap-2', isRight && 'items-end')}>
                      <div className={cn('flex items-center gap-2', isRight && 'flex-row-reverse')}>
                        <span className="text-sm font-bold">{config.label}</span>
                        <span className="text-[10px] text-on-surface-variant">{msg.timestamp}</span>
                      </div>
                      <div className={cn(
                        'p-4 rounded-xl ambient-shadow border',
                        isRight ? 'rounded-tr-none text-right' : 'rounded-tl-none',
                        `${config.color.replace('text-', 'bg-')}/5 ${config.borderColor.replace('border-', 'border-')}/10`
                      )}>
                        <p className="leading-relaxed text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {status === 'debating' && (
                <div className="flex items-center gap-3 p-3">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-on-surface-variant">에이전트 토론 진행 중...</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <footer className="p-6 bg-surface-container-lowest border-t border-outline-variant/15 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">history_edu</span>
                  <span className="text-xs">토론 결과 요약: 하이브리드 시각 전략 채택</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">#전환율_최적화</span>
                  <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-bold">#브랜드_안전성</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-4 px-6 bg-surface-container-high text-on-surface font-semibold rounded-lg hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">edit_note</span>
                  수정 요청
                </button>
                <button onClick={() => { handleApprove(); setShowDebateModal(false); }} className="flex-[2] py-4 px-6 bg-gradient-to-b from-primary-container to-primary text-white font-bold rounded-lg ambient-shadow hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">task_alt</span>
                  전략 승인 및 적용
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
