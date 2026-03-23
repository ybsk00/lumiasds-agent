export interface Strategy {
  id: string;
  tenant_id: string;
  analysis_report_id: string | null;
  input: StrategyInput;
  output: StrategyOutput | null;
  status: StrategyStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type StrategyStatus = 'draft' | 'debating' | 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'completed';

export interface StrategyInput {
  business_type: string;
  product: string;
  goal: MarketingGoal;
  monthly_budget: number;
  target_platforms: Platform[];
  landing_url: string;
  target_audience_hint: string;
  campaign_period: { start: string; end: string };
}

export type MarketingGoal = 'conversion' | 'traffic' | 'awareness' | 'engagement' | 'leads';
export type Platform = 'naver_search' | 'naver_gfa' | 'meta' | 'google' | 'kakao';

export interface StrategyOutput {
  strategy_id: string;
  executive_summary: string;
  channel_allocation: Record<string, ChannelAllocation>;
  target_audiences: TargetAudience[];
  campaign_structure: Record<string, CampaignStructure>;
  creative_brief: CreativeBrief;
  expected_kpi: ExpectedKPI;
  validation_score: number;
  warnings: string[];
}

export interface ChannelAllocation {
  budget: number;
  rationale: string;
}

export interface TargetAudience {
  platform: Platform;
  name: string;
  age_range: [number, number];
  gender: 'male' | 'female' | 'all';
  interests: string[];
  lookalike_source?: string;
}

export interface CampaignStructure {
  campaigns: CampaignPlan[];
}

export interface CampaignPlan {
  name: string;
  type: string;
  ad_groups: AdGroupPlan[];
}

export interface AdGroupPlan {
  name: string;
  keywords?: string[];
  bid_strategy: string;
  daily_budget: number;
}

export interface CreativeBrief {
  key_message: string;
  tone: string;
  cta: string;
  usp: string[];
  visual_direction: string;
}

export interface ExpectedKPI {
  cpc: number;
  ctr: number;
  cvr: number;
  roas: number;
}
