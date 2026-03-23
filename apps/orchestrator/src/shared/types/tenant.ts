export interface Tenant {
  id: string;
  name: string;
  industry: Industry;
  compliance_rules: ComplianceRules | null;
  api_keys: EncryptedApiKeys | null;
  telegram_bot_token: string | null;
  telegram_chat_id: number | null;
  ga4_property_id: string | null;
  settings: Record<string, unknown>;
  plan: TenantPlan;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export type Industry = 'medical' | 'ecommerce' | 'education' | 'finance' | 'travel' | 'etc';
export type TenantPlan = 'basic' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'inactive';

export interface EncryptedApiKeys {
  naver?: { api_key: string; secret_key: string; customer_id: string };
  meta?: { app_id: string; app_secret: string; access_token: string; ad_account_id: string };
  google?: {
    developer_token: string;
    client_id: string;
    client_secret: string;
    refresh_token: string;
    customer_id: string;
  };
  kakao?: { rest_api_key: string; access_token: string; ad_account_id: string };
}

export interface ComplianceRules {
  industry: string;
  blocked_patterns: string[];
  required_disclaimers: Record<string, string>;
  before_after_rule?: string;
  price_rule?: string;
}

export interface TenantUsage {
  id: number;
  tenant_id: string;
  usage_type: UsageType;
  usage_count: number;
  cost_krw: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type UsageType = 'api_call' | 'debate' | 'creative' | 'campaign_action' | 'report' | 'analysis';
