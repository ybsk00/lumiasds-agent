import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

// ── Supabase ──
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Hono App ──
const app = new Hono().basePath('/api');

app.use('*', cors({ origin: '*', credentials: true }));

// Health
app.get('/health', (c) => c.json({ status: 'ok', service: 'lumiads-orchestrator', ts: new Date().toISOString() }));

// ── 관리자 API ──
app.get('/admin/tenants', async (c) => {
  const db = getSupabase();
  const { data, error } = await db
    .from('tenants')
    .select('id, name, industry, plan, status, settings, created_at')
    .order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post('/admin/tenants', async (c) => {
  const db = getSupabase();
  const body = await c.req.json();
  const { data, error } = await db.from('tenants').insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.put('/admin/tenants/:id', async (c) => {
  const db = getSupabase();
  const id = c.req.param('id');
  const body = await c.req.json();
  const { data, error } = await db
    .from('tenants')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ── 테넌트 헤더에서 tenantId 추출 ──
function getTenantId(c: any): string | null {
  return c.req.header('x-tenant-id') || null;
}

// ── 대시보드 KPI ──
app.get('/reports/dashboard', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const { data: metrics } = await db
    .from('campaign_metrics')
    .select('platform, impressions, clicks, conversions, cost, revenue')
    .eq('tenant_id', tenantId)
    .gte('date', thirtyDaysAgo);

  const totals = (metrics || []).reduce(
    (acc: any, m: any) => ({
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

// ── 캠페인 ──
app.get('/campaigns', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const platform = c.req.query('platform');
  let query = db.from('campaigns').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (platform) query = query.eq('platform', platform);
  const { data } = await query;
  return c.json(data || []);
});

app.post('/campaigns', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const body = await c.req.json();
  const { data, error } = await db.from('campaigns').insert({ ...body, tenant_id: tenantId }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.put('/campaigns/:id', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const body = await c.req.json();
  const { data, error } = await db
    .from('campaigns')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post('/campaigns/:id/pause', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const { data, error } = await db
    .from('campaigns')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ── 분석 ──
app.get('/analysis/reports', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const { data } = await db
    .from('analysis_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return c.json(data || []);
});

app.get('/analysis/reports/:id', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const { data, error } = await db
    .from('analysis_reports')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// ── 전략 ──
app.get('/strategy', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const { data } = await db
    .from('strategies')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return c.json(data || []);
});

app.get('/strategy/:id', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const { data: strategy } = await db.from('strategies').select('*').eq('id', id).eq('tenant_id', tenantId).single();
  if (!strategy) return c.json({ error: 'Not found' }, 404);

  const { data: debateLogs } = await db
    .from('debate_logs')
    .select('*')
    .eq('strategy_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  return c.json({ ...strategy, debate_logs: debateLogs || [] });
});

app.post('/strategy/:id/approve', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const { data, error } = await db
    .from('strategies')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// ── 승인 ──
app.get('/approvals', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const { data: strategies } = await db
    .from('strategies')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });

  const { data: tasks } = await db
    .from('task_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'waiting_approval')
    .order('created_at', { ascending: false });

  return c.json({ strategies: strategies || [], tasks: tasks || [] });
});

app.post('/approvals/:id/approve', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const { data } = await db
    .from('task_logs')
    .update({ status: 'approved', approval_status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  return c.json(data || { error: 'Not found' });
});

app.post('/approvals/:id/reject', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const id = c.req.param('id');
  const { data } = await db
    .from('task_logs')
    .update({ status: 'rejected', approval_status: 'rejected', approved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  return c.json(data || { error: 'Not found' });
});

// ── 소재 ──
app.get('/creative', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const { data } = await db.from('creatives').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  return c.json(data || []);
});

// ── 리포트 메트릭 ──
app.get('/reports/metrics', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const platform = c.req.query('platform');
  const start = c.req.query('start');
  const end = c.req.query('end');

  let query = db.from('campaign_metrics').select('*').eq('tenant_id', tenantId);
  if (platform) query = query.eq('platform', platform);
  if (start) query = query.gte('date', start);
  if (end) query = query.lte('date', end);

  const { data } = await query.order('date', { ascending: false }).limit(500);
  return c.json(data || []);
});

// ── 벤치마크 ──
app.get('/benchmarks', async (c) => {
  const db = getSupabase();
  const industry = c.req.query('industry');
  let query = db.from('benchmarks').select('*');
  if (industry) query = query.eq('industry', industry);
  const { data } = await query;
  return c.json(data || []);
});

// ── 알림 ──
app.get('/notifications', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const { data } = await db
    .from('task_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('task_type', ['optimization', 'report'])
    .order('created_at', { ascending: false })
    .limit(50);
  return c.json(data || []);
});

// ── 설정: API 키 저장 ──
app.put('/settings/api-keys', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const db = getSupabase();
  const body = await c.req.json();
  const { data, error } = await db
    .from('tenants')
    .update({ api_keys: body, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select('id, name')
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ...data, message: 'API keys saved' });
});

// ── Export ──
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;

export const maxDuration = 60;
