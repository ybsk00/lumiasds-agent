export interface DebateLog {
  id: string;
  strategy_id: string;
  tenant_id: string;
  round: number;
  agent_role: AgentRole;
  agent_model: AgentModel;
  message_type: DebateMessageType;
  title: string | null;
  content: string;
  confidence: number | null;
  data_points: number | null;
  validation_score: number | null;
  warnings: string[] | null;
  token_usage: TokenUsage | null;
  created_at: string;
}

export type AgentRole = 'strategist' | 'challenger' | 'mediator' | 'validator';
export type AgentModel = 'gemini-2.5-flash' | 'claude-sonnet-4' | 'gpt-4o' | 'gemini-2.5-pro';
export type DebateMessageType = 'proposal' | 'challenge' | 'rebuttal' | 'mediation' | 'validation';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface DebateConfig {
  max_rounds: number;
  early_consensus_threshold: number;
  validation_pass_score: number;
  max_retry_on_fail: number;
  timeout_per_agent: number;
}

export const DEFAULT_DEBATE_CONFIG: DebateConfig = {
  max_rounds: 3,
  early_consensus_threshold: 90,
  validation_pass_score: 80,
  max_retry_on_fail: 2,
  timeout_per_agent: 30,
};
