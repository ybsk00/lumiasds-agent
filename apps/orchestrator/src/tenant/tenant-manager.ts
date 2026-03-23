import type { Tenant, Industry, TenantPlan } from '../shared';
import { supabaseAdmin } from '../lib/supabase';
import { getDefaultRules } from './compliance';

// ====================================================================
// Tenant Manager — 고객(광고주) 등록 / 조회 / 수정
// ====================================================================

interface CreateTenantInput {
  name: string;
  industry: Industry;
  plan?: TenantPlan;
  ga4PropertyId?: string;
  settings?: Record<string, unknown>;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const complianceRules = getDefaultRules(input.industry);

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .insert({
      name: input.name,
      industry: input.industry,
      compliance_rules: complianceRules,
      plan: input.plan || 'basic',
      ga4_property_id: input.ga4PropertyId || null,
      settings: input.settings || {},
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Tenant creation failed: ${error.message}`);
  return data as Tenant;
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  return data as Tenant | null;
}

export async function listTenants(status?: string): Promise<Tenant[]> {
  let query = supabaseAdmin.from('tenants').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return (data || []) as Tenant[];
}

export async function updateTenant(
  tenantId: string,
  updates: Partial<Pick<Tenant, 'name' | 'industry' | 'compliance_rules' | 'ga4_property_id' | 'settings' | 'plan' | 'status'>>,
): Promise<Tenant> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select()
    .single();

  if (error) throw new Error(`Tenant update failed: ${error.message}`);
  return data as Tenant;
}

/** 테넌트에 Supabase Auth 사용자 연결 */
export async function linkUserToTenant(userId: string, tenantId: string, role: 'admin' | 'member' = 'member') {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { tenant_id: tenantId, role },
  });
  if (error) throw new Error(`User link failed: ${error.message}`);
}

/** 테넌트의 활성 캠페인 수 조회 */
export async function getTenantStats(tenantId: string) {
  const { count: campaignCount } = await supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  const { count: strategyCount } = await supabaseAdmin
    .from('strategies')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const { data: usageData } = await supabaseAdmin
    .from('tenant_usage')
    .select('cost_krw')
    .eq('tenant_id', tenantId)
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

  const monthlyCost = (usageData || []).reduce((a, u) => a + (u.cost_krw || 0), 0);

  return {
    activeCampaigns: campaignCount || 0,
    totalStrategies: strategyCount || 0,
    monthlyAiCost: monthlyCost,
  };
}
