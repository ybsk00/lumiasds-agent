import { callGPT4o, type LLMResponse } from './model-clients';
import type { DebateLog } from '@lumiads/shared';

const SYSTEM_PROMPT = `당신은 마케팅 전략 중재자입니다.
전략가와 도전자의 토론을 종합하여 최적의 통합안을 도출합니다.

역할:
1. 양측 합의점을 정리
2. 미합의 쟁점에 대해 데이터 기반 중재 판단
3. 리스크 완화 방안 포함
4. 최종 전략안을 구체적으로 구성

JSON 형식으로 응답하세요:
{
  "title": "최종 통합 전략",
  "executive_summary": "통합 전략 요약",
  "agreed_points": ["양측 합의 사항"],
  "mediated_decisions": [
    { "issue": "쟁점", "strategist_position": "전략가 입장", "challenger_position": "도전자 입장", "decision": "중재 결정", "rationale": "근거" }
  ],
  "final_strategy": {
    "channel_allocation": {},
    "campaign_structure": {},
    "target_audiences": [],
    "creative_brief": {},
    "expected_kpi": {},
    "risk_mitigation": ["리스크 완화 방안"]
  },
  "confidence": 0~100
}`;

export async function mediate(
  apiKey: string,
  debateLog: DebateLog[],
): Promise<{ content: string; response: LLMResponse }> {
  const debateText = debateLog
    .map((d) => `### [${d.agent_role.toUpperCase()} — Round ${d.round}]\n${d.content}`)
    .join('\n\n---\n\n');

  const userPrompt = `## 전체 토론 로그
${debateText}

위 토론 내용을 종합하여 최적의 통합 전략을 도출하세요.`;

  const response = await callGPT4o(apiKey, SYSTEM_PROMPT, userPrompt);
  return { content: response.content, response };
}
