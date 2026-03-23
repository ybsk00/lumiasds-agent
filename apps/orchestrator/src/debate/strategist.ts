import { callGemini, type LLMResponse } from './model-clients';
import type { AnalysisReport, DebateLog } from '@lumiads/shared';

const SYSTEM_PROMPT = `당신은 한국 디지털 마케팅 전략 전문가(전략가)입니다.
분석 보고서와 마케팅 목표를 기반으로 최적의 광고 전략을 수립합니다.

규칙:
1. 네이버 검색광고: 키워드당 예상 CPC/CTR 기반 예산 배분
2. 메타(Facebook/Instagram): Advantage+ 활용 권장, 리타게팅 반드시 포함
3. 구글 Ads: 반응형 검색광고 + Performance Max 고려
4. 예산 배분은 퍼널 단계별 (인지 20% / 고려 30% / 전환 50%) 가이드라인 준수
5. 모든 수치는 한국 시장 벤치마크 기준
6. 분석 보고서의 문제점과 개선 기회를 반드시 반영

JSON 형식으로 응답하세요:
{
  "title": "전략 제안 제목",
  "executive_summary": "전략 요약 (3~5문장)",
  "channel_allocation": { "platform_name": { "budget": 금액, "rationale": "근거" } },
  "campaign_structure": { "platform": { "campaigns": [...] } },
  "target_audiences": [...],
  "creative_brief": { "key_message": "", "tone": "", "cta": "", "usp": [], "visual_direction": "" },
  "expected_kpi": { "cpc": 0, "ctr": 0, "cvr": 0, "roas": 0 },
  "confidence": 0~100,
  "key_insights": ["분석에서 도출한 핵심 인사이트"]
}`;

export async function propose(
  apiKey: string,
  analysisReport: AnalysisReport,
  marketingGoal: Record<string, unknown>,
  previousDebate?: DebateLog[],
): Promise<{ content: string; response: LLMResponse }> {
  let userPrompt = `## 분석 보고서
요약: ${analysisReport.summary}
문제점: ${JSON.stringify(analysisReport.findings)}
개선 기회: ${JSON.stringify(analysisReport.opportunities)}
벤치마크: ${JSON.stringify(analysisReport.benchmark_comparison)}

## 마케팅 목표
${JSON.stringify(marketingGoal, null, 2)}`;

  if (previousDebate?.length) {
    const debateContext = previousDebate
      .map((d) => `[${d.agent_role} Round ${d.round}] ${d.content}`)
      .join('\n\n');
    userPrompt += `\n\n## 이전 토론 내용 (반론을 반영하여 수정된 전략을 제시하세요)\n${debateContext}`;
  }

  const response = await callGemini(apiKey, 'gemini-2.5-flash', SYSTEM_PROMPT, userPrompt);
  return { content: response.content, response };
}
