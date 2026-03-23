import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { tenantMiddleware, adminMiddleware } from './middleware/tenant';
import { supabaseAdmin } from './lib/supabase';
import { runAnalysis, fetchPlatformData, parseCSV } from './agents/analyst.agent';
import { runDebate } from './debate/debate-orchestrator';
import { executeCampaignCreation } from './agents/campaign.agent';
import { generateAllCreatives } from './agents/creative.agent';
import { collectTenantMetrics, collectAllTenantsMetrics, generateDailyReport } from './agents/report.agent';
import { runOptimizationLoop, runOptimizationLoopForAll } from './orchestrator/optimization-loop';
import { handleWebhook } from './integrations/telegram/bot';

export const app = new Hono();

// 미들웨어
app.use('*', logger());
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'lumiads-orchestrator' }));

// === 테넌트 인증 필요 API ===
const api = new Hono();
api.use('*', tenantMiddleware);

// ---- 분석 ----
api.post('/analysis/upload', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const { fileName, fileType, fileContent, columnMapping } = body;

  let parsedData: Record<string, unknown>[] = [];
  if (fileType === 'csv' && fileContent) {
    parsedData = parseCSV(fileContent);
  }

  const { data, error } = await supabaseAdmin
    .from('uploaded_data')
    .insert({
      tenant_id: tenantId,
      file_name: fileName,
      file_type: fileType,
      file_url: '',
      parsed_data: parsedData,
      column_mapping: columnMapping || null,
      row_count: parsedData.length,
      status: parsedData.length > 0 ? 'parsed' : 'uploaded',
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

api.post('/analysis/run', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const { type, dateRange, uploadedDataIds } = body;

  try {
    const report = await runAnalysis(
      { tenantId, geminiApiKey: process.env.GOOGLE_AI_API_KEY! },
      { type: type || 'initial', dateRange, uploadedDataIds },
    );

    await supabaseAdmin.from('tenant_usage').insert({
      tenant_id: tenantId,
      usage_type: 'analysis',
      metadata: { report_id: report.id },
    });

    return c.json(report);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.get('/analysis/reports', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const { data, error } = await supabaseAdmin
    .from('analysis_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

api.get('/analysis/reports/:id', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const id = c.req.param('id');
  const { data, error } = await supabaseAdmin
    .from('analysis_reports')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// ---- 전략 + 디베이트 ----
api.post('/strategy/debate', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const userId = c.get('userId') as string;
  const body = await c.req.json();
  const { analysisReportId, marketingGoal } = body;

  const { data: report } = await supabaseAdmin
    .from('analysis_reports')
    .select('*')
    .eq('id', analysisReportId)
    .eq('tenant_id', tenantId)
    .single();

  if (!report) return c.json({ error: 'Analysis report not found' }, 404);

  const { data: strategy, error: strategyError } = await supabaseAdmin
    .from('strategies')
    .insert({
      tenant_id: tenantId,
      analysis_report_id: analysisReportId,
      input: marketingGoal,
      status: 'debating',
      created_by: userId,
    })
    .select()
    .single();

  if (strategyError) return c.json({ error: strategyError.message }, 500);

  runDebate(
    {
      geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
    },
    {
      tenantId,
      strategyId: strategy.id,
      analysisReport: report,
      marketingGoal,
    },
  ).then(async (result) => {
    await supabaseAdmin.from('tenant_usage').insert({
      tenant_id: tenantId,
      usage_type: 'debate',
      cost_krw: Math.round(result.totalCostUsd * 1300),
      metadata: { strategy_id: strategy.id, validation_score: result.validationScore },
    });
  }).catch(async (error) => {
    console.error('Debate failed:', error);
    await supabaseAdmin
      .from('strategies')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', strategy.id);
  });

  return c.json({ strategyId: strategy.id, status: 'debating' });
});

api.get('/strategy', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const { data, error } = await supabaseAdmin
    .from('strategies')
    .select('*, debate_logs(count)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

api.get('/strategy/:id', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const id = c.req.param('id');
  const { data: strategy } = await supabaseAdmin
    .from('strategies')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!strategy) return c.json({ error: 'Strategy not found' }, 404);

  const { data: debateLogs } = await supabaseAdmin
    .from('debate_logs')
    .select('*')
    .eq('strategy_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  return c.json({ ...strategy, debate_logs: debateLogs || [] });
});

api.post('/strategy/:id/approve', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const { data, error } = await supabaseAdmin
    .from('strategies')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending_approval')
    .select()
    .single();

  if (error || !data) return c.json({ error: 'Strategy not found or not pending approval' }, 400);

  executeCampaignCreation({
    tenantId,
    strategyId: id,
    geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
  }).then(async (results) => {
    const allSuccess = results.every((r) => r.success);
    console.log(`Campaign creation ${allSuccess ? 'completed' : 'partial'}: ${results.length} platforms`);
    await supabaseAdmin.from('tenant_usage').insert({
      tenant_id: tenantId,
      usage_type: 'campaign_action',
      metadata: { strategy_id: id, results },
    });
  }).catch((err) => {
    console.error('Campaign creation failed:', err);
  });

  await supabaseAdmin.from('task_logs').insert({
    tenant_id: tenantId,
    task_type: 'strategy',
    action: 'approve',
    status: 'completed',
    input: { strategy_id: id },
    approved_by: userId,
    approved_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return c.json(data);
});

// ---- 소재 ----
api.post('/creative/generate', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const { strategyId, adGroupId, brief, platforms, landingUrl } = body;

  try {
    const creatives = await generateAllCreatives({
      tenantId,
      geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
      strategyId,
      adGroupId,
      brief,
      platforms,
      landingUrl,
    });

    await supabaseAdmin.from('tenant_usage').insert({
      tenant_id: tenantId,
      usage_type: 'creative',
      metadata: { count: creatives.length },
    });

    return c.json(creatives);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.get('/creative', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const { data } = await supabaseAdmin
    .from('creatives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return c.json(data || []);
});

// ---- 캠페인 ----
api.get('/campaigns', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const platform = c.req.query('platform');

  let query = supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (platform) query = query.eq('platform', platform);

  const { data } = await query;
  return c.json(data || []);
});

api.post('/campaigns', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const { strategyId } = body;

  if (!strategyId) return c.json({ error: 'strategyId required' }, 400);

  try {
    const results = await executeCampaignCreation({
      tenantId,
      strategyId,
      geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
    });

    return c.json(results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.put('/campaigns/:id', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

api.post('/campaigns/:id/pause', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const id = c.req.param('id');

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ---- 리포트 ----
api.get('/reports/dashboard', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const { data: metrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('platform, impressions, clicks, conversions, cost, revenue')
    .eq('tenant_id', tenantId)
    .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);

  const totals = (metrics || []).reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      conversions: acc.conversions + (m.conversions || 0),
      cost: acc.cost + (m.cost || 0),
      revenue: acc.revenue + (m.revenue || 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 },
  );

  return c.json({
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    roas: totals.cost > 0 ? totals.revenue / totals.cost : 0,
  });
});

api.get('/reports/metrics', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const platform = c.req.query('platform');
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  let query = supabaseAdmin
    .from('campaign_metrics')
    .select('*')
    .eq('tenant_id', tenantId);

  if (platform) query = query.eq('platform', platform);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data } = await query.order('date', { ascending: false }).limit(500);
  return c.json(data || []);
});

// ---- 승인 ----
api.get('/approvals', async (c) => {
  const tenantId = c.get('tenantId') as string;

  const { data: strategies } = await supabaseAdmin
    .from('strategies')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });

  const { data: tasks } = await supabaseAdmin
    .from('task_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'waiting_approval')
    .order('created_at', { ascending: false });

  return c.json({ strategies: strategies || [], tasks: tasks || [] });
});

api.post('/approvals/:id/approve', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const { data } = await supabaseAdmin
    .from('task_logs')
    .update({
      status: 'approved',
      approval_status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  return c.json(data || { error: 'Not found' });
});

api.post('/approvals/:id/reject', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const { data } = await supabaseAdmin
    .from('task_logs')
    .update({
      status: 'rejected',
      approval_status: 'rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  return c.json(data || { error: 'Not found' });
});

// ---- 플랫폼 연결 테스트 ----
api.post('/platforms/test', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const { platform } = body;

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  if (!tenant?.api_keys) return c.json({ error: 'No API keys configured' }, 400);

  const results: Record<string, { success: boolean; message: string }> = {};
  const apiKeys = tenant.api_keys as Record<string, any>;

  if ((!platform || platform === 'naver') && apiKeys.naver) {
    try {
      const { createNaverSearchAdsClient } = await import('./platforms/naver/search-ads');
      const client = createNaverSearchAdsClient(apiKeys.naver);
      await client.campaigns.list();
      results.naver = { success: true, message: 'Connected' };
    } catch (e: any) {
      results.naver = { success: false, message: e.message };
    }
  }

  if ((!platform || platform === 'meta') && apiKeys.meta) {
    try {
      const { createMetaMarketingClient } = await import('./platforms/meta/marketing-api');
      const client = createMetaMarketingClient({
        accessToken: apiKeys.meta.access_token,
        adAccountId: apiKeys.meta.ad_account_id,
      });
      await client.campaigns.list();
      results.meta = { success: true, message: 'Connected' };
    } catch (e: any) {
      results.meta = { success: false, message: e.message };
    }
  }

  if ((!platform || platform === 'google') && apiKeys.google) {
    try {
      const { createGoogleAdsClient } = await import('./platforms/google/ads-api');
      const client = createGoogleAdsClient(apiKeys.google);
      await client.campaigns.list();
      results.google = { success: true, message: 'Connected' };
    } catch (e: any) {
      results.google = { success: false, message: e.message };
    }
  }

  return c.json(results);
});

app.route('/api', api);

// === 관리자 전용 API ===
const admin = new Hono();
admin.use('*', adminMiddleware);

admin.get('/tenants', async (c) => {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, industry, plan, status, created_at')
    .order('created_at', { ascending: false });
  return c.json(data || []);
});

admin.post('/tenants', async (c) => {
  const body = await c.req.json();
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .insert(body)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

admin.put('/tenants/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.route('/admin', admin);

// === 스케줄러 엔드포인트 ===
const scheduler = new Hono();

scheduler.post('/collect-metrics', async (c) => {
  const authHeader = c.req.header('X-Scheduler-Key');
  if (authHeader !== process.env.SCHEDULER_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const results = await collectAllTenantsMetrics(yesterday);
  return c.json({ date: yesterday, results });
});

scheduler.post('/daily-reports', async (c) => {
  const authHeader = c.req.header('X-Scheduler-Key');
  if (authHeader !== process.env.SCHEDULER_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const { data: tenants } = await supabaseAdmin.from('tenants').select('id').eq('status', 'active');

  const reports = [];
  for (const tenant of tenants || []) {
    try {
      const report = await generateDailyReport(tenant.id, yesterday, process.env.GOOGLE_AI_API_KEY!);
      reports.push({ tenantId: tenant.id, ...report });
    } catch (e: any) {
      reports.push({ tenantId: tenant.id, error: e.message });
    }
  }

  return c.json({ date: yesterday, reports });
});

scheduler.post('/optimization-loop', async (c) => {
  const authHeader = c.req.header('X-Scheduler-Key');
  if (authHeader !== process.env.SCHEDULER_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await runOptimizationLoopForAll({
    geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
  });

  return c.json({ status: 'completed' });
});

app.route('/scheduler', scheduler);

// === 텔레그램 Webhook ===
app.post('/webhook/telegram', async (c) => {
  try {
    const update = await c.req.json();
    const result = await handleWebhook(update);
    return c.json({ ok: true, result });
  } catch (e: any) {
    console.error('Telegram webhook error:', e);
    return c.json({ ok: false });
  }
});

// === 추가 테넌트 API ===
api.post('/reports/collect', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const date = body.date || new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    const results = await collectTenantMetrics(tenantId, date);
    return c.json({ date, results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.post('/reports/daily', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();
  const date = body.date || new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    const report = await generateDailyReport(tenantId, date, process.env.GOOGLE_AI_API_KEY!);
    return c.json(report);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.post('/optimization/run', async (c) => {
  const tenantId = c.get('tenantId') as string;

  try {
    const result = await runOptimizationLoop(tenantId, {
      geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
    });
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.get('/notifications', async (c) => {
  const tenantId = c.get('tenantId') as string;

  const { data } = await supabaseAdmin
    .from('task_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('task_type', ['optimization', 'report'])
    .order('created_at', { ascending: false })
    .limit(50);

  return c.json(data || []);
});
