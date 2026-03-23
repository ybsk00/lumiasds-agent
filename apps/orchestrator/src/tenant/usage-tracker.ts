import type { UsageType } from '@lumiads/shared';
import { supabaseAdmin } from '../lib/supabase';

// ====================================================================
// Usage Tracker — 테넌트별 사용량 트래킹 + 과금
// ====================================================================

interface UsageRecord {
  tenantId: string;
  usageType: UsageType;
  count?: number;
  costKrw?: number;
  metadata?: Record<string, unknown>;
}

/** 사용량 기록 */
export async function trackUsage(record: UsageRecord): Promise<void> {
  await supabaseAdmin.from('tenant_usage').insert({
    tenant_id: record.tenantId,
    usage_type: record.usageType,
    usage_count: record.count || 1,
    cost_krw: record.costKrw || 0,
    metadata: record.metadata || null,
  });
}

/** 기간별 사용량 요약 */
export async function getUsageSummary(
  tenantId: string,
  period: { start: string; end: string },
): Promise<{
  totalCostKrw: number;
  byType: Record<string, { count: number; cost: number }>;
}> {
  const { data } = await supabaseAdmin
    .from('tenant_usage')
    .select('usage_type, usage_count, cost_krw')
    .eq('tenant_id', tenantId)
    .gte('created_at', period.start)
    .lte('created_at', period.end);

  const byType: Record<string, { count: number; cost: number }> = {};
  let totalCostKrw = 0;

  for (const row of data || []) {
    const type = row.usage_type;
    if (!byType[type]) byType[type] = { count: 0, cost: 0 };
    byType[type].count += row.usage_count || 1;
    byType[type].cost += row.cost_krw || 0;
    totalCostKrw += row.cost_krw || 0;
  }

  return { totalCostKrw, byType };
}

/** 월간 사용량 조회 (당월) */
export async function getMonthlyUsage(tenantId: string): Promise<{
  totalCostKrw: number;
  byType: Record<string, { count: number; cost: number }>;
}> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return getUsageSummary(tenantId, { start, end });
}

/** 전체 테넌트 월간 사용량 (관리자용) */
export async function getAllTenantsUsage(): Promise<{ tenantId: string; name: string; totalCostKrw: number }[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabaseAdmin
    .from('tenant_usage')
    .select('tenant_id, cost_krw, tenants(name)')
    .gte('created_at', start);

  const grouped: Record<string, { name: string; cost: number }> = {};
  for (const row of data || []) {
    const id = row.tenant_id;
    if (!grouped[id]) grouped[id] = { name: (row as any).tenants?.name || '', cost: 0 };
    grouped[id].cost += row.cost_krw || 0;
  }

  return Object.entries(grouped).map(([tenantId, v]) => ({
    tenantId,
    name: v.name,
    totalCostKrw: v.cost,
  }));
}
