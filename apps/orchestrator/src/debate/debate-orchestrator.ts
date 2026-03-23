import type { AnalysisReport, DebateLog, DebateConfig, StrategyOutput } from '@lumiads/shared';
import { DEFAULT_DEBATE_CONFIG } from '@lumiads/shared';
import { supabaseAdmin } from '../lib/supabase';
import { propose } from './strategist';
import { challenge } from './challenger';
import { mediate } from './mediator';
import { validate } from './validator';
import { checkEarlyConsensus, checkValidationPass, extractConfidence } from './debate-protocol';

// ====================================================================
// DebateOrchestrator — 4개 AI 에이전트 토론 전체 흐름 관리
//
// 흐름:
//  1. [Round 1~3] 전략가 vs 도전자 토론
//  2. [중재] 중재자가 양측 종합 → 최적안
//  3. [검증] 검증자가 데이터 기반 실현 가능성 검증
//  4. 점수 < 80 → 재토론 / 점수 >= 80 → 최종안 확정
// ====================================================================

interface DebateKeys {
  geminiApiKey: string;
  anthropicApiKey: string;
  openaiApiKey: string;
}

interface DebateInput {
  tenantId: string;
  strategyId: string;
  analysisReport: AnalysisReport;
  marketingGoal: Record<string, unknown>;
  config?: Partial<DebateConfig>;
  previousDebate?: DebateLog[];
  retryCount?: number;
}

interface DebateResult {
  finalStrategy: string;
  validationScore: number;
  debateLog: DebateLog[];
  warnings: string[];
  totalCostUsd: number;
}

export async function runDebate(keys: DebateKeys, input: DebateInput): Promise<DebateResult> {
  const config = { ...DEFAULT_DEBATE_CONFIG, ...input.config };
  const debateLog: DebateLog[] = input.previousDebate || [];
  let totalCostUsd = 0;
  const retryCount = input.retryCount || 0;

  if (retryCount >= config.max_retry_on_fail) {
    throw new Error(`Debate failed after ${config.max_retry_on_fail} retries`);
  }

  // ---- Phase 1: 전략가 vs 도전자 토론 ----

  for (let round = 1; round <= config.max_rounds; round++) {
    // 전략가 제안
    const proposal = await propose(
      keys.geminiApiKey,
      input.analysisReport,
      input.marketingGoal,
      debateLog.length > 0 ? debateLog : undefined,
    );

    const strategistLog = await saveDebateLog({
      strategy_id: input.strategyId,
      tenant_id: input.tenantId,
      round,
      agent_role: 'strategist',
      agent_model: 'gemini-2.5-flash',
      message_type: round === 1 ? 'proposal' : 'rebuttal',
      title: `전략가 — Round ${round}`,
      content: proposal.content,
      confidence: extractConfidence(proposal.content),
      token_usage: proposal.response.tokenUsage,
    });
    debateLog.push(strategistLog);
    totalCostUsd += proposal.response.tokenUsage.cost_usd;

    // Realtime 업데이트 (프론트엔드에서 구독)
    await broadcastDebateUpdate(input.strategyId, strategistLog);

    // 도전자 반론
    const challengeResult = await challenge(
      keys.anthropicApiKey,
      proposal.content,
      input.analysisReport,
      debateLog,
    );

    const challengerLog = await saveDebateLog({
      strategy_id: input.strategyId,
      tenant_id: input.tenantId,
      round,
      agent_role: 'challenger',
      agent_model: 'claude-sonnet-4',
      message_type: 'challenge',
      title: `도전자 — Round ${round}`,
      content: challengeResult.content,
      confidence: extractConfidence(challengeResult.content),
      token_usage: challengeResult.response.tokenUsage,
    });
    debateLog.push(challengerLog);
    totalCostUsd += challengeResult.response.tokenUsage.cost_usd;

    await broadcastDebateUpdate(input.strategyId, challengerLog);

    // 조기 합의 체크
    const sConfidence = extractConfidence(proposal.content);
    const cConfidence = extractConfidence(challengeResult.content);

    if (checkEarlyConsensus(sConfidence, cConfidence, config.early_consensus_threshold)) {
      break;
    }
  }

  // ---- Phase 2: 중재 ----

  const mediationResult = await mediate(keys.openaiApiKey, debateLog);

  const mediatorLog = await saveDebateLog({
    strategy_id: input.strategyId,
    tenant_id: input.tenantId,
    round: 0,
    agent_role: 'mediator',
    agent_model: 'gpt-4o',
    message_type: 'mediation',
    title: '중재자 — 최종 통합안',
    content: mediationResult.content,
    confidence: extractConfidence(mediationResult.content),
    token_usage: mediationResult.response.tokenUsage,
  });
  debateLog.push(mediatorLog);
  totalCostUsd += mediationResult.response.tokenUsage.cost_usd;

  await broadcastDebateUpdate(input.strategyId, mediatorLog);

  // ---- Phase 3: 검증 ----

  const validationResult = await validate(
    keys.geminiApiKey,
    mediationResult.content,
    input.analysisReport,
  );

  const validatorLog = await saveDebateLog({
    strategy_id: input.strategyId,
    tenant_id: input.tenantId,
    round: 0,
    agent_role: 'validator',
    agent_model: 'gemini-2.5-pro',
    message_type: 'validation',
    title: `검증자 — 점수: ${validationResult.score}/100`,
    content: validationResult.content,
    validation_score: validationResult.score,
    token_usage: validationResult.response.tokenUsage,
  });
  debateLog.push(validatorLog);
  totalCostUsd += validationResult.response.tokenUsage.cost_usd;

  await broadcastDebateUpdate(input.strategyId, validatorLog);

  // ---- 검증 결과 판단 ----

  if (!checkValidationPass(validationResult.score, config.validation_pass_score)) {
    // 점수 미달 → 재토론
    return runDebate(keys, {
      ...input,
      previousDebate: debateLog,
      retryCount: retryCount + 1,
    });
  }

  // 검증 통과 → 최종안 확정
  let warnings: string[] = [];
  try {
    const parsed = JSON.parse(validationResult.content);
    warnings = parsed.warnings || [];
  } catch {}

  // 전략 상태 업데이트 → pending_approval
  await supabaseAdmin
    .from('strategies')
    .update({
      output: JSON.parse(mediationResult.content),
      status: 'pending_approval',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.strategyId);

  return {
    finalStrategy: mediationResult.content,
    validationScore: validationResult.score,
    debateLog,
    warnings,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
  };
}

// ---- 헬퍼 함수 ----

async function saveDebateLog(log: Omit<DebateLog, 'id' | 'created_at' | 'data_points' | 'warnings'>): Promise<DebateLog> {
  const { data, error } = await supabaseAdmin
    .from('debate_logs')
    .insert(log)
    .select()
    .single();

  if (error) throw new Error(`Failed to save debate log: ${error.message}`);
  return data as DebateLog;
}

/** Supabase Realtime으로 디베이트 진행 상황 브로드캐스트 */
async function broadcastDebateUpdate(strategyId: string, log: DebateLog) {
  // Supabase Realtime은 테이블 변경을 자동으로 브로드캐스트
  // 프론트엔드에서 debate_logs 테이블을 구독하면 실시간 업데이트를 받음
  // 추가 채널 브로드캐스트가 필요하면 여기에 구현
  console.log(`[Debate] ${log.agent_role} Round ${log.round}: ${log.title}`);
}
