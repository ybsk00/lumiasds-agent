import type { Platform } from './strategy';

export interface Campaign {
  id: string;
  tenant_id: string;
  strategy_id: string | null;
  platform: Platform;
  platform_campaign_id: string | null;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  budget_daily: number | null;
  budget_total: number | null;
  start_date: string | null;
  end_date: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type CampaignType = 'SEARCH' | 'DISPLAY' | 'VIDEO' | 'SHOPPING' | 'PERFORMANCE_MAX';
export type CampaignStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'failed';

export interface AdGroup {
  id: string;
  campaign_id: string;
  tenant_id: string;
  platform_adgroup_id: string | null;
  name: string;
  targeting: Record<string, unknown> | null;
  bid_strategy: string | null;
  bid_amount: number | null;
  status: CampaignStatus;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface Creative {
  id: string;
  ad_group_id: string;
  tenant_id: string;
  platform_creative_id: string | null;
  type: CreativeType;
  content: CreativeContent;
  image_urls: string[];
  status: CreativeStatus;
  review_note: string | null;
  performance: Record<string, unknown> | null;
  created_at: string;
}

export type CreativeType = 'text' | 'image' | 'video' | 'carousel';
export type CreativeStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active';

export interface CreativeContent {
  headline?: string;
  description?: string;
  primary_text?: string;
  display_url?: string;
  final_url?: string;
  utm_url?: string;
}

export interface CampaignMetrics {
  id: number;
  campaign_id: string;
  ad_group_id: string | null;
  creative_id: string | null;
  tenant_id: string;
  platform: Platform;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number | null;
  cvr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  raw_data: Record<string, unknown> | null;
  fetched_at: string;
}
