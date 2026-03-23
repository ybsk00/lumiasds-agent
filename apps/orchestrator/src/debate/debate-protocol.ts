import type { DebateConfig } from '@lumiads/shared';
import { DEFAULT_DEBATE_CONFIG } from '@lumiads/shared';

export { DEFAULT_DEBATE_CONFIG };

/** 조기 합의 여부 판단 */
export function checkEarlyConsensus(
  strategistConfidence: number,
  challengerConfidence: number,
  threshold: number = DEFAULT_DEBATE_CONFIG.early_consensus_threshold,
): boolean {
  return strategistConfidence >= threshold && challengerConfidence >= threshold;
}

/** 검증 통과 여부 */
export function checkValidationPass(
  score: number,
  threshold: number = DEFAULT_DEBATE_CONFIG.validation_pass_score,
): boolean {
  return score >= threshold;
}

/** confidence 값 추출 */
export function extractConfidence(content: string): number {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed.confidence === 'number' ? parsed.confidence : 50;
  } catch {
    return 50;
  }
}
