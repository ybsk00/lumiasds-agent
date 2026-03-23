import { callGemini, type LLMResponse } from './model-clients';
import type { AnalysisReport, BenchmarkMetric } from '@lumiads/shared';

const SYSTEM_PROMPT = `당신은 마케팅 전략 검증 전문가(검증자)입니다.
중재자가 도출한 최종 전략의 실현 가능성을 데이터 기반으로 검증합니다.

검증 항목:
1. 예산 적정성 — 플랫폼별 최소 학습 예산 충족 여부
   - 네이버 검색: 일예산 최소 3만원
   - 메타: 일예산 최소 $20 (약 26,000원)
   - 구글: 일예산 최소 $10 (약 13,000원)
2. 업종 벤치마크 대비 기대 성과의 현실성
3. 타겟 규모 적정성 (너무 넓거나 좁지 않은지)
4. 기술적 선행조건 (API 키, 전환 추적 설치 등)
5. 예상 ROI 계산

JSON 형식으로 응답하세요:
{
  "title": "검증 결과",
  "validation_score": 0~100,
  "budget_check": {
    "passed": true|false,
    "details": [{ "platform": "", "daily_budget": 0, "minimum_required": 0, "status": "pass|fail" }]
  },
  "kpi_feasibility": {
    "expected_cpc": 0, "benchmark_cpc": 0,
    "expected_ctr": 0, "benchmark_ctr": 0,
    "expected_roas": 0, "assessment": "realistic|optimistic|pessimistic"
  },
  "prerequisites": ["충족해야 할 선행조건"],
  "warnings": ["경고 사항"],
  "recommendations": ["추가 권장 사항"],
  "estimated_monthly_roi": { "cost": 0, "expected_revenue": 0, "roas": 0 }
}`;

export async function validate(
  apiKey: string,
  finalStrategyContent: string,
  analysisReport: AnalysisReport,
): Promise<{ content: string; response: LLMResponse; score: number }> {
  const userPrompt = `## 최종 전략안
${finalStrategyContent}

## 분석 데이터
요약: ${analysisReport.summary}
벤치마크: ${JSON.stringify(analysisReport.benchmark_comparison)}
문제점: ${JSON.stringify(analysisReport.findings)}

위 전략의 실현 가능성을 검증하세요.`;

  const response = await callGemini(apiKey, 'gemini-2.5-pro', SYSTEM_PROMPT, userPrompt);

  // 검증 점수 파싱
  let score = 0;
  try {
    const parsed = JSON.parse(response.content);
    score = parsed.validation_score || 0;
  } catch {
    score = 50;
  }

  return { content: response.content, response, score };
}
