import type { Platform, Finding, FindingCategory } from '@lumiads/shared';
import { supabaseAdmin } from '../lib/supabase';
import { runAnalysis } from '../agents/analyst.agent';
import { runDebate } from '../debate/debate-orchestrator';

// ====================================================================
// Optimization Loop — 폐쇄 루프 핵심
//
// 흐름:
//  1. 효율 미달 감지 (규칙 기반)
//  2. AnalystAgent 자동 재호출 → 최신 성과 재분석
//  3. 분석 보고서 → 디베이트 자동 재실행
//  4. 수정 제안 생성 → 웹에서 사람 승인 요청
//  5. 승인 → CampaignAgent가 API로 자동 수정
//
// 트리거:
//  - Cloud Scheduler → 매일 08:00 (성과 수집 후)
//  - 실시간 이상 탐지 (매시간 체크)
// ====================================================================

interface OptimizationRule {
  id: string;
  name: string;
  category: FindingCategory;
  condition: (metrics: AggregatedMetrics, benchmarks: Record<string, number>) => boolean;
  severity: 'high' | 'medium' | 'low';
  description: (metrics: AggregatedMetrics) => string;
}

interface AggregatedMetrics {
  platform: Platform;
  campaignId: string;
  campaignName: string;
  // 현재 기간
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cvr: number;
  roas: number;
  // 이전 기간 (비교용)
  prev_cpc: number;
  prev_ctr: number;
  prev_conversions: number;
  prev_roas: number;
  // 설정
  target_roas: number;
  daily_budget: number;
}

// ---- 효율 판단 규칙 ----

const OPTIMIZATION_RULES: OptimizationRule[] = [
  {
    id: 'roas_underperform',
    name: 'ROAS 목표 미달',
    category: 'roas_underperform',
    severity: 'high',
    condition: (m) => m.roas > 0 && m.roas < m.target_roas * 0.7,
    description: (m) => `ROAS ${m.roas.toFixed(1)}x — 목표(${m.target_roas}x)의 70% 미달. ${m.platform} "${m.campaignName}"`,
  },
  {
    id: 'cpc_spike',
    name: 'CPC 급등',
    category: 'cpc_spike',
    severity: 'high',
    condition: (m) => m.prev_cpc > 0 && m.cpc > m.prev_cpc * 1.3,
    description: (m) => `CPC ${m.prev_cpc.toLocaleString()}원 → ${m.cpc.toLocaleString()}원 (+${Math.round((m.cpc / m.prev_cpc - 1) * 100)}%). ${m.platform} "${m.campaignName}"`,
  },
  {
    id: 'ctr_decline',
    name: 'CTR 하락',
    category: 'ctr_decline',
    severity: 'medium',
    condition: (m) => m.prev_ctr > 0 && m.ctr < m.prev_ctr * 0.7 && m.impressions > 1000,
    description: (m) => `CTR ${m.prev_ctr.toFixed(2)}% → ${m.ctr.toFixed(2)}% (-${Math.round((1 - m.ctr / m.prev_ctr) * 100)}%). ${m.platform} "${m.campaignName}"`,
  },
  {
    id: 'conversion_decline',
    name: '전환 3일 연속 하락',
    category: 'conversion_decline',
    severity: 'high',
    condition: (m) => m.prev_conversions > 0 && m.conversions === 0,
    description: (m) => `전환 0건 발생. 이전 기간 ${m.prev_conversions}건. ${m.platform} "${m.campaignName}"`,
  },
  {
    id: 'budget_pacing',
    name: '예산 소진 과다',
    category: 'budget_pacing',
    severity: 'low',
    condition: (m) => m.daily_budget > 0 && m.cost > m.daily_budget * 0.8,
    description: (m) => `일예산 ${Math.round(m.cost / m.daily_budget * 100)}% 소진. ${m.platform} "${m.campaignName}"`,
  },
  {
    id: 'creative_fatigue',
    name: '소재 피로도',
    category: 'creative_fatigue',
    severity: 'medium',
    condition: (m) => m.prev_ctr > 0 && m.ctr < m.prev_ctr * 0.5 && m.impressions > 5000,
    description: (m) => `CTR 50% 이상 하락 (${m.prev_ctr.toFixed(2)}% → ${m.ctr.toFixed(2)}%). 소재 교체 필요. ${m.platform}`,
  },
];

// ---- 메트릭 집계 ----

async function aggregateMetrics(tenantId: string): Promise<AggregatedMetrics[]> {
  // 최근 7일 vs 이전 7일 비교
  const now = new Date();
  const currentEnd = new Date(now); currentEnd.setDate(now.getDate() - 1);
  const currentStart = new Date(now); currentStart.setDate(now.getDate() - 7);
  const prevEnd = new Date(currentStart); prevEnd.setDate(currentStart.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 6);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // 현재 기간 캠페인별 집계
  const { data: currentMetrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('campaign_id, platform, impressions, clicks, conversions, cost, revenue, ctr, cpc, cvr, roas')
    .eq('tenant_id', tenantId)
    .gte('date', fmt(currentStart))
    .lte('date', fmt(currentEnd));

  // 이전 기간
  const { data: prevMetrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('campaign_id, platform, cpc, ctr, conversions, roas')
    .eq('tenant_id', tenantId)
    .gte('date', fmt(prevStart))
    .lte('date', fmt(prevEnd));

  // 캠페인 정보
  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, platform, budget_daily, config')
    .eq('tenant_id', tenantId)
    .in('status', ['active']);

  if (!campaigns || !currentMetrics) return [];

  const aggregated: AggregatedMetrics[] = [];

  for (const campaign of campaigns) {
    const current = (currentMetrics || []).filter((m) => m.campaign_id === campaign.id);
    const prev = (prevMetrics || []).filter((m) => m.campaign_id === campaign.id);

    if (current.length === 0) continue;

    const sum = (arr: any[], key: string) => arr.reduce((a, m) => a + (Number(m[key]) || 0), 0);
    const avg = (arr: any[], key: string) => {
      const vals = arr.map((m) => Number(m[key])).filter((v) => v > 0);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const totalCost = sum(current, 'cost');
    const totalRevenue = sum(current, 'revenue');

    aggregated.push({
      platform: campaign.platform as Platform,
      campaignId: campaign.id,
      campaignName: campaign.name,
      impressions: sum(current, 'impressions'),
      clicks: sum(current, 'clicks'),
      conversions: sum(current, 'conversions'),
      cost: totalCost,
      revenue: totalRevenue,
      ctr: avg(current, 'ctr'),
      cpc: avg(current, 'cpc'),
      cvr: avg(current, 'cvr'),
      roas: totalCost > 0 ? totalRevenue / totalCost : 0,
      prev_cpc: avg(prev, 'cpc'),
      prev_ctr: avg(prev, 'ctr'),
      prev_conversions: sum(prev, 'conversions'),
      prev_roas: avg(prev, 'roas'),
      target_roas: (campaign.config as any)?.target_roas || 2.0,
      daily_budget: campaign.budget_daily || 0,
    });
  }

  return aggregated;
}

// ---- 효율 판단 실행 ----

interface TriggeredAlert {
  ruleId: string;
  severity: 'high' | 'medium' | 'low';
  category: FindingCategory;
  campaignId: string;
  platform: Platform;
  description: string;
}

async function evaluateRules(tenantId: string): Promise<TriggeredAlert[]> {
  const metrics = await aggregateMetrics(tenantId);
  const alerts: TriggeredAlert[] = [];

  for (const m of metrics) {
    for (const rule of OPTIMIZATION_RULES) {
      if (rule.condition(m, {})) {
        alerts.push({
          ruleId: rule.id,
          severity: rule.severity,
          category: rule.category,
          campaignId: m.campaignId,
          platform: m.platform,
          description: rule.description(m),
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ---- 메인: Optimization Loop 실행 ----

export async function runOptimizationLoop(
  tenantId: string,
  keys: { geminiApiKey: string; anthropicApiKey: string; openaiApiKey: string },
): Promise<{ alerts: TriggeredAlert[]; debateTriggered: boolean; strategyId: string | null }> {

  // 1. 효율 판단
  const alerts = await evaluateRules(tenantId);

  if (alerts.length === 0) {
    return { alerts: [], debateTriggered: false, strategyId: null };
  }

  // 알림 저장
  for (const alert of alerts) {
    await supabaseAdmin.from('task_logs').insert({
      tenant_id: tenantId,
      task_type: 'optimization',
      platform: alert.platform,
      action: 'analyze',
      status: 'completed',
      output: alert,
      completed_at: new Date().toISOString(),
    });
  }

  // 2. high severity가 있으면 재분석 + 재토론 트리거
  const highAlerts = alerts.filter((a) => a.severity === 'high');

  if (highAlerts.length === 0) {
    return { alerts, debateTriggered: false, strategyId: null };
  }

  console.log(`[OptLoop] ${tenantId}: ${highAlerts.length} high alerts — triggering re-analysis`);

  // 3. AnalystAgent 재분석
  const analysisReport = await runAnalysis(
    { tenantId, geminiApiKey: keys.geminiApiKey },
    {
      type: 'triggered',
      dateRange: {
        start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        end: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      },
    },
  );

  // 4. 기존 전략 조회 (가장 최근 approved/completed)
  const { data: latestStrategy } = await supabaseAdmin
    .from('strategies')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['approved', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestStrategy) {
    return { alerts, debateTriggered: false, strategyId: null };
  }

  // 5. 새 전략 레코드 (수정 제안용)
  const { data: newStrategy } = await supabaseAdmin
    .from('strategies')
    .insert({
      tenant_id: tenantId,
      analysis_report_id: analysisReport.id,
      input: {
        ...latestStrategy.input,
        optimization_trigger: true,
        triggered_alerts: highAlerts,
        previous_strategy_id: latestStrategy.id,
      },
      status: 'debating',
    })
    .select()
    .single();

  if (!newStrategy) {
    return { alerts, debateTriggered: false, strategyId: null };
  }

  // 6. 디베이트 자동 재실행 (비동기)
  runDebate(keys, {
    tenantId,
    strategyId: newStrategy.id,
    analysisReport,
    marketingGoal: {
      ...latestStrategy.input,
      context: 'optimization',
      current_issues: highAlerts.map((a) => a.description),
    },
  }).then(async (result) => {
    console.log(`[OptLoop] Debate complete: score ${result.validationScore}, cost $${result.totalCostUsd}`);
    await supabaseAdmin.from('tenant_usage').insert({
      tenant_id: tenantId,
      usage_type: 'debate',
      cost_krw: Math.round(result.totalCostUsd * 1300),
      metadata: { strategy_id: newStrategy.id, trigger: 'optimization_loop' },
    });
  }).catch((err) => {
    console.error('[OptLoop] Debate failed:', err);
    supabaseAdmin.from('strategies').update({ status: 'draft' }).eq('id', newStrategy.id);
  });

  return { alerts, debateTriggered: true, strategyId: newStrategy.id };
}

/** 전체 테넌트 대상 최적화 루프 (스케줄러용) */
export async function runOptimizationLoopForAll(
  keys: { geminiApiKey: string; anthropicApiKey: string; openaiApiKey: string },
): Promise<void> {
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('status', 'active');

  if (!tenants) return;

  for (const tenant of tenants) {
    try {
      const result = await runOptimizationLoop(tenant.id, keys);
      if (result.alerts.length > 0) {
        console.log(`[OptLoop] Tenant ${tenant.id}: ${result.alerts.length} alerts, debate=${result.debateTriggered}`);
      }
    } catch (e) {
      console.error(`[OptLoop] Tenant ${tenant.id} error:`, e);
    }
  }
}
