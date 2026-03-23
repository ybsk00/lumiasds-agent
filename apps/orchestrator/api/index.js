import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  credentials: true,
}));

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// Health
app.get('/health', (c) => c.json({ status: 'ok', service: 'lumiads-orchestrator' }));

// Tenants list (admin)
app.get('/admin/tenants', async (c) => {
  const db = getSupabase();
  const { data, error } = await db
    .from('tenants')
    .select('id, name, industry, plan, status, created_at')
    .order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// Dashboard KPIs
app.get('/api/reports/dashboard', async (c) => {
  const tenantId = c.req.header('x-tenant-id');
  if (!tenantId) return c.json({ error: 'x-tenant-id header required' }, 400);

  const db = getSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const { data: metrics } = await db
    .from('campaign_metrics')
    .select('platform, impressions, clicks, conversions, cost, revenue')
    .eq('tenant_id', tenantId)
    .gte('date', thirtyDaysAgo);

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

// Campaigns list
app.get('/api/campaigns', async (c) => {
  const tenantId = c.req.header('x-tenant-id');
  if (!tenantId) return c.json({ error: 'x-tenant-id header required' }, 400);

  const db = getSupabase();
  const { data } = await db
    .from('campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return c.json(data || []);
});

// Approvals
app.get('/api/approvals', async (c) => {
  const tenantId = c.req.header('x-tenant-id');
  if (!tenantId) return c.json({ error: 'x-tenant-id header required' }, 400);

  const db = getSupabase();
  const { data: strategies } = await db
    .from('strategies')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });

  return c.json({ strategies: strategies || [], tasks: [] });
});

// Benchmarks
app.get('/api/benchmarks', async (c) => {
  const db = getSupabase();
  const { data } = await db.from('benchmarks').select('*');
  return c.json(data || []);
});

export default handle(app);

export const config = {
  maxDuration: 60,
};
