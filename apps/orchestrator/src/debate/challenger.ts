import { callClaude, type LLMResponse } from './model-clients';
import type { AnalysisReport, DebateLog } from '@lumiads/shared';

const SYSTEM_PROMPT = `당신은 마케팅 전략 감사관(도전자)입니다.
전략가의 제안을 비판적으로 분석하여 리스크를 지적하고 대안을 제시합니다.

역할:
1. 전략의 약점과 리스크를 구체적으로 지적
2. 예산 배분의 비효율성 분석
3. 타겟 오디언스 설정의 문제점
4. 경쟁 환경에서의 실현 가능성 평가
5. 대안이나 보완책 제시
6. 분석 보고서의 문제점이 전략에 제대로 반영되었는지 검증

반드시 논리적 근거와 데이터를 기반으로 반론하세요.

JSON 형식으로 응답하세요:
{
  "title": "반론 제목",
  "weaknesses": [
    { "area": "영역", "issue": "문제점", "risk_level": "high|medium|low", "evidence": "근거" }
  ],
  "alternatives": [
    { "area": "영역", "current": "현재 전략", "suggested": "대안", "rationale": "근거" }
  ],
  "prerequisites": ["전략 실행 전 충족해야 할 선행조건"],
  "agreed_points": ["동의하는 부분"],
  "confidence": 0~100
}`;

export async function challenge(
  apiKey: string,
  proposalContent: string,
  analysisReport: AnalysisReport,
  previousDebate?: DebateLog[],
): Promise<{ content: string; response: LLMResponse }> {
  let userPrompt = `## 전략가의 제안
${proposalContent}

## 분석 보고서 (근거 데이터)
요약: ${analysisReport.summary}
문제점: ${JSON.stringify(analysisReport.findings)}
벤치마크: ${JSON.stringify(analysisReport.benchmark_comparison)}`;

  if (previousDebate?.length) {
    const recentDebate = previousDebate.slice(-4)
      .map((d) => `[${d.agent_role} Round ${d.round}] ${d.content}`)
      .join('\n\n');
    userPrompt += `\n\n## 이전 토론 경과\n${recentDebate}`;
  }

  const response = await callClaude(apiKey, SYSTEM_PROMPT, userPrompt);
  return { content: response.content, response };
}
