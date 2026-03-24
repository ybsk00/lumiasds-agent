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

// ── AI 모델 연결 테스트 ──
app.post('/ai/test', async (c) => {
  const results: Record<string, { success: boolean; message: string; model?: string }> = {};

  // Gemini (전략가 + 검증자 + 분석)
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with just "ok"' }] }] }),
        },
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      results.gemini = { success: true, message: 'Connected', model: 'gemini-2.0-flash' };
    } catch (e: any) {
      results.gemini = { success: false, message: e.message };
    }
  } else {
    results.gemini = { success: false, message: 'GOOGLE_AI_API_KEY not set' };
  }

  // Claude (도전자)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Reply with just "ok"' }],
        }),
      });
      if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
      results.claude = { success: true, message: 'Connected', model: 'claude-sonnet-4' };
    } catch (e: any) {
      results.claude = { success: false, message: e.message };
    }
  } else {
    results.claude = { success: false, message: 'ANTHROPIC_API_KEY not set' };
  }

  // GPT-4o (중재자)
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Reply with just "ok"' }],
        }),
      });
      if (!res.ok) throw new Error(`GPT-4o ${res.status}: ${await res.text()}`);
      results.gpt4o = { success: true, message: 'Connected', model: 'gpt-4o' };
    } catch (e: any) {
      results.gpt4o = { success: false, message: e.message };
    }
  } else {
    results.gpt4o = { success: false, message: 'OPENAI_API_KEY not set' };
  }

  return c.json(results);
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

// ── 플랫폼 연결 테스트 ──
app.post('/platforms/test', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json().catch(() => ({}));
  const { platform } = body as { platform?: string };

  const db = getSupabase();
  const { data: tenant } = tenantId
    ? await db.from('tenants').select('api_keys').eq('id', tenantId).single()
    : { data: null };

  const apiKeys = (tenant?.api_keys as Record<string, any>) || {};

  // 환경변수 fallback
  const naverCreds = apiKeys.naver || (process.env.NAVER_ADS_API_KEY ? {
    apiKey: process.env.NAVER_ADS_API_KEY,
    secretKey: process.env.NAVER_ADS_SECRET_KEY,
    customerId: process.env.NAVER_ADS_CUSTOMER_ID,
  } : null);

  const metaCreds = apiKeys.meta || (process.env.META_ADS_ACCESS_TOKEN ? {
    accessToken: process.env.META_ADS_ACCESS_TOKEN,
    adAccountId: process.env.META_ADS_ACCOUNT_ID?.startsWith('act_')
      ? process.env.META_ADS_ACCOUNT_ID
      : `act_${process.env.META_ADS_ACCOUNT_ID}`,
  } : null);

  const googleCreds = apiKeys.google || (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
  } : null);

  const results: Record<string, { success: boolean; message: string }> = {};

  // 네이버 검색광고 테스트 (HMAC-SHA256 인라인)
  if ((!platform || platform === 'naver') && naverCreds) {
    try {
      const crypto = await import('crypto');
      const ts = Date.now().toString();
      const path = '/ncc/campaigns';
      const sig = crypto.createHmac('sha256', naverCreds.secretKey).update(`${ts}.GET.${path}`).digest('base64');
      const res = await fetch(`https://api.searchad.naver.com${path}`, {
        headers: {
          'X-Timestamp': ts, 'X-API-KEY': naverCreds.apiKey,
          'X-Customer': naverCreds.customerId, 'X-Signature': sig,
        },
      });
      if (!res.ok) throw new Error(`Naver API ${res.status}: ${await res.text()}`);
      results.naver = { success: true, message: 'Connected' };
    } catch (e: any) {
      results.naver = { success: false, message: e.message };
    }
  } else if (!platform || platform === 'naver') {
    results.naver = { success: false, message: 'No credentials configured' };
  }

  // 메타 마케팅 API 테스트
  if ((!platform || platform === 'meta') && metaCreds) {
    try {
      const token = metaCreds.accessToken || metaCreds.access_token;
      const accountId = metaCreds.adAccountId || metaCreds.ad_account_id;
      const res = await fetch(`https://graph.facebook.com/v21.0/${accountId}/campaigns?access_token=${token}&fields=id,name&limit=1`);
      if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
      results.meta = { success: true, message: 'Connected' };
    } catch (e: any) {
      results.meta = { success: false, message: e.message };
    }
  } else if (!platform || platform === 'meta') {
    results.meta = { success: false, message: 'No credentials configured' };
  }

  // Google Ads API 테스트
  if ((!platform || platform === 'google') && googleCreds) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: googleCreds.clientId,
          client_secret: googleCreds.clientSecret,
          refresh_token: googleCreds.refreshToken,
        }),
      });
      if (!tokenRes.ok) throw new Error(`Google OAuth ${tokenRes.status}`);
      const { access_token } = (await tokenRes.json()) as { access_token: string };
      const adsRes = await fetch(`https://googleads.googleapis.com/v19/customers:listAccessibleCustomers`, {
        headers: { Authorization: `Bearer ${access_token}`, 'developer-token': googleCreds.developerToken },
      });
      if (!adsRes.ok) throw new Error(`Google Ads API ${adsRes.status}: ${await adsRes.text()}`);
      results.google = { success: true, message: 'Connected' };
    } catch (e: any) {
      results.google = { success: false, message: e.message };
    }
  } else if (!platform || platform === 'google') {
    results.google = { success: false, message: 'No credentials configured (pending approval)' };
  }

  return c.json(results);
});

// ── 분석: 신규 광고 시장조사 ──
app.post('/analysis/market-research', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const body = await c.req.json();
  const { brandName, industry, product, keywords, websiteUrl, monthlyBudget } = body as {
    brandName: string;
    industry: string;
    product: string;
    keywords: string[];
    websiteUrl?: string;
    monthlyBudget?: number;
  };

  if (!brandName || !industry || !product || !keywords?.length) {
    return c.json({ error: 'brandName, industry, product, keywords are required' }, 400);
  }

  const naverClientId = process.env.NAVER_CLIENT_ID;
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET;
  const geminiKey = process.env.GOOGLE_AI_API_KEY;

  if (!naverClientId || !naverClientSecret) {
    return c.json({ error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not configured' }, 500);
  }
  if (!geminiKey) {
    return c.json({ error: 'GOOGLE_AI_API_KEY not configured' }, 500);
  }

  // 1) 키워드별 네이버 블로그 검색 → 브랜드 노출 확인
  const keywordResults: Record<string, { total: number; brandMentions: number; topResults: any[] }> = {};

  for (const keyword of keywords) {
    try {
      const query = encodeURIComponent(keyword);
      const res = await fetch(
        `https://openapi.naver.com/v1/search/blog.json?query=${query}&display=10&sort=sim`,
        {
          headers: {
            'X-Naver-Client-Id': naverClientId,
            'X-Naver-Client-Secret': naverClientSecret,
          },
        },
      );
      if (!res.ok) {
        keywordResults[keyword] = { total: 0, brandMentions: 0, topResults: [] };
        continue;
      }
      const data = (await res.json()) as { total: number; items: any[] };
      const brandLower = brandName.toLowerCase();
      const brandMentions = data.items.filter(
        (item: any) =>
          (item.title || '').toLowerCase().includes(brandLower) ||
          (item.description || '').toLowerCase().includes(brandLower),
      ).length;
      keywordResults[keyword] = {
        total: data.total,
        brandMentions,
        topResults: data.items.slice(0, 5).map((item: any) => ({
          title: item.title?.replace(/<[^>]*>/g, ''),
          link: item.link,
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 100),
        })),
      };
    } catch {
      keywordResults[keyword] = { total: 0, brandMentions: 0, topResults: [] };
    }
  }

  // 2) Gemini AI 분석 리포트 생성
  const prompt = `You are a Korean digital marketing analyst. Analyze the following data and provide a structured marketing analysis report in Korean.

Brand: ${brandName}
Industry: ${industry}
Product: ${product}
Keywords: ${keywords.join(', ')}
${websiteUrl ? `Website: ${websiteUrl}` : ''}
${monthlyBudget ? `Monthly Budget: ${monthlyBudget.toLocaleString()}원` : ''}

Naver Blog Search Results per keyword:
${Object.entries(keywordResults)
  .map(([kw, r]) => `- "${kw}": total ${r.total} results, brand mentions in top 10: ${r.brandMentions}`)
  .join('\n')}

Please return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "summary": "Brief overall assessment in Korean (2-3 sentences)",
  "findings": [
    { "category": "keyword_competition" | "blog_visibility" | "market_position", "title": "Finding title", "description": "Details", "severity": "high" | "medium" | "low" }
  ],
  "opportunities": [
    { "title": "Opportunity title", "description": "Details", "priority": "high" | "medium" | "low", "estimatedCpcRange": "500~1500원" }
  ],
  "blogVisibilityScore": 0-100,
  "keywordAnalysis": [
    { "keyword": "...", "competition": "high" | "medium" | "low", "brandPresence": 0-10, "recommendation": "..." }
  ]
}`;

  let report: any;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    if (!geminiRes.ok) throw new Error(`Gemini API ${geminiRes.status}: ${await geminiRes.text()}`);
    const geminiData = (await geminiRes.json()) as any;
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    report = JSON.parse(cleaned);
  } catch (e: any) {
    return c.json({ error: `AI analysis failed: ${e.message}` }, 500);
  }

  // 3) Supabase에 저장
  const db = getSupabase();
  const { data: saved, error: saveError } = await db
    .from('analysis_reports')
    .insert({
      tenant_id: tenantId,
      report_type: 'market_research',
      data: {
        input: { brandName, industry, product, keywords, websiteUrl, monthlyBudget },
        blogSearchResults: keywordResults,
        aiReport: report,
      },
      summary: report.summary || 'Market research report',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (saveError) return c.json({ error: saveError.message }, 500);

  return c.json(saved);
});

// ── 분석: 기존 광고 데이터 수집·분석 ──
app.post('/analysis/collect', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ error: 'x-tenant-id required' }, 400);

  const body = await c.req.json();
  const { platforms, dateRange } = body as {
    platforms: string[];
    dateRange: { start: string; end: string };
  };

  if (!platforms?.length || !dateRange?.start || !dateRange?.end) {
    return c.json({ error: 'platforms and dateRange (start, end) are required' }, 400);
  }

  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  if (!geminiKey) return c.json({ error: 'GOOGLE_AI_API_KEY not configured' }, 500);

  const db = getSupabase();
  const { data: tenant } = await db.from('tenants').select('api_keys').eq('id', tenantId).single();
  const apiKeys = (tenant?.api_keys as Record<string, any>) || {};

  const collectedData: Record<string, any> = {};

  // 네이버 검색광고 데이터 수집
  if (platforms.includes('naver')) {
    const naverCreds = apiKeys.naver || (process.env.NAVER_ADS_API_KEY ? {
      apiKey: process.env.NAVER_ADS_API_KEY,
      secretKey: process.env.NAVER_ADS_SECRET_KEY,
      customerId: process.env.NAVER_ADS_CUSTOMER_ID,
    } : null);

    if (naverCreds) {
      try {
        const crypto = await import('crypto');
        const ts = Date.now().toString();
        const path = '/ncc/campaigns';
        const sig = crypto.createHmac('sha256', naverCreds.secretKey).update(`${ts}.GET.${path}`).digest('base64');
        const res = await fetch(`https://api.searchad.naver.com${path}`, {
          headers: {
            'X-Timestamp': ts,
            'X-API-KEY': naverCreds.apiKey,
            'X-Customer': naverCreds.customerId,
            'X-Signature': sig,
          },
        });
        if (!res.ok) throw new Error(`Naver API ${res.status}`);
        const campaigns = await res.json();
        collectedData.naver = { campaigns, campaignCount: Array.isArray(campaigns) ? campaigns.length : 0 };
      } catch (e: any) {
        collectedData.naver = { error: e.message, campaigns: [] };
      }
    } else {
      collectedData.naver = { error: 'No Naver Ads credentials configured', campaigns: [] };
    }
  }

  // 메타 마케팅 API 데이터 수집
  if (platforms.includes('meta')) {
    const metaCreds = apiKeys.meta || (process.env.META_ADS_ACCESS_TOKEN ? {
      accessToken: process.env.META_ADS_ACCESS_TOKEN,
      adAccountId: process.env.META_ADS_ACCOUNT_ID?.startsWith('act_')
        ? process.env.META_ADS_ACCOUNT_ID
        : `act_${process.env.META_ADS_ACCOUNT_ID}`,
    } : null);

    if (metaCreds) {
      try {
        const token = metaCreds.accessToken || metaCreds.access_token;
        const accountId = metaCreds.adAccountId || metaCreds.ad_account_id;
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${accountId}/insights?` +
          `access_token=${token}` +
          `&fields=campaign_name,impressions,clicks,spend,actions,cpc,cpm,ctr` +
          `&time_range={"since":"${dateRange.start}","until":"${dateRange.end}"}` +
          `&level=campaign&limit=100`,
        );
        if (!res.ok) throw new Error(`Meta API ${res.status}`);
        const insights = await res.json();
        collectedData.meta = { insights: insights.data || [], totalCampaigns: (insights.data || []).length };
      } catch (e: any) {
        collectedData.meta = { error: e.message, insights: [] };
      }
    } else {
      collectedData.meta = { error: 'No Meta Ads credentials configured', insights: [] };
    }
  }

  // Gemini AI 분석
  const prompt = `You are a Korean digital marketing performance analyst. Analyze the following ad platform data and provide actionable insights in Korean.

Date Range: ${dateRange.start} ~ ${dateRange.end}
Platforms analyzed: ${platforms.join(', ')}

Collected Data:
${JSON.stringify(collectedData, null, 2)}

Please return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "summary": "Overall performance assessment in Korean (2-3 sentences)",
  "findings": [
    { "platform": "naver" | "meta", "category": "performance" | "budget" | "targeting" | "creative", "title": "Finding title", "description": "Details", "severity": "high" | "medium" | "low" }
  ],
  "opportunities": [
    { "title": "Optimization opportunity", "description": "Details", "platform": "naver" | "meta" | "all", "estimatedImpact": "high" | "medium" | "low" }
  ],
  "platformComparison": {
    "bestPerforming": "platform name",
    "recommendation": "Budget allocation recommendation"
  },
  "nextSteps": ["Step 1", "Step 2", "Step 3"]
}`;

  let report: any;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    if (!geminiRes.ok) throw new Error(`Gemini API ${geminiRes.status}: ${await geminiRes.text()}`);
    const geminiData = (await geminiRes.json()) as any;
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    report = JSON.parse(cleaned);
  } catch (e: any) {
    return c.json({ error: `AI analysis failed: ${e.message}` }, 500);
  }

  // Supabase에 저장
  const { data: saved, error: saveError } = await db
    .from('analysis_reports')
    .insert({
      tenant_id: tenantId,
      report_type: 'ad_performance',
      data: {
        input: { platforms, dateRange },
        collectedData,
        aiReport: report,
      },
      summary: report.summary || 'Ad performance analysis report',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (saveError) return c.json({ error: saveError.message }, 500);

  return c.json(saved);
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
