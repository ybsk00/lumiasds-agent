import type { Platform, CampaignMetrics } from '../shared';
import { supabaseAdmin } from '../lib/supabase';
import { createNaverSearchAdsClient } from '../platforms/naver/search-ads';
import { createMetaMarketingClient } from '../platforms/meta/marketing-api';
import { createGoogleAdsClient } from '../platforms/google/ads-api';

// ====================================================================
// ReportAgent — 성과 데이터 자동 수집 + 리포트 생성
//
// 트리거:
//  - Cloud Scheduler → 매일 06:00 / 매시간
//  - 수동 호출 (웹 대시보드)
//
// 흐름:
//  1. 전체 활성 테넌트 조회
//  2. 테넌트별 3개 플랫폼 API 성과 수집
//  3. campaign_metrics 저장
//  4. 일일/주간 리포트 요약 생성 (Gemini)
// ====================================================================

interface CollectionResult {
  tenantId: string;
  platform: Platform;
  metricsCount: number;
  error: string | null;
}

/** 단일 테넌트의 전체 플랫폼 성과 수집 */
export async function collectTenantMetrics(
  tenantId: string,
  date: string, // YYYY-MM-DD
): Promise<CollectionResult[]> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  if (!tenant?.api_keys) return [];
  const apiKeys = tenant.api_keys as Record<string, any>;
  const results: CollectionResult[] = [];

  // 네이버
  if (apiKeys.naver) {
    try {
      const metrics = await collectNaverMetrics(tenantId, apiKeys.naver, date);
      results.push({ tenantId, platform: 'naver_search', metricsCount: metrics.length, error: null });
    } catch (e: any) {
      results.push({ tenantId, platform: 'naver_search', metricsCount: 0, error: e.message });
    }
  }

  // 메타
  if (apiKeys.meta) {
    try {
      const metrics = await collectMetaMetrics(tenantId, apiKeys.meta, date);
      results.push({ tenantId, platform: 'meta', metricsCount: metrics.length, error: null });
    } catch (e: any) {
      results.push({ tenantId, platform: 'meta', metricsCount: 0, error: e.message });
    }
  }

  // 구글
  if (apiKeys.google) {
    try {
      const metrics = await collectGoogleMetrics(tenantId, apiKeys.google, date);
      results.push({ tenantId, platform: 'google', metricsCount: metrics.length, error: null });
    } catch (e: any) {
      results.push({ tenantId, platform: 'google', metricsCount: 0, error: e.message });
    }
  }

  return results;
}

/** 전체 활성 테넌트 일괄 수집 (스케줄러용) */
export async function collectAllTenantsMetrics(date: string): Promise<CollectionResult[]> {
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('status', 'active');

  if (!tenants) return [];

  const allResults: CollectionResult[] = [];
  for (const tenant of tenants) {
    const results = await collectTenantMetrics(tenant.id, date);
    allResults.push(...results);
  }

  return allResults;
}

// ---- 플랫폼별 수집 ----

async function collectNaverMetrics(tenantId: string, creds: any, date: string): Promise<any[]> {
  const client = createNaverSearchAdsClient({
    apiKey: creds.api_key,
    secretKey: creds.secret_key,
    customerId: creds.customer_id,
  });

  // 내부 캠페인 조회
  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, platform_campaign_id')
    .eq('tenant_id', tenantId)
    .eq('platform', 'naver_search')
    .in('status', ['active', 'paused']);

  if (!campaigns?.length) return [];

  const dateCompact = date.replace(/-/g, '');
  const saved: any[] = [];

  for (const campaign of campaigns) {
    if (!campaign.platform_campaign_id) continue;

    try {
      // 리포트 요청
      const report = await client.reports.request({
        reportTp: 'AD',
        statDt: dateCompact,
        edDt: dateCompact,
      });

      // TODO: 리포트 다운로드 + 파싱 → 메트릭 변환
      // 임시로 캠페인 레벨 데이터 저장
      const metrics = {
        campaign_id: campaign.id,
        tenant_id: tenantId,
        platform: 'naver_search',
        date,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0,
        revenue: 0,
      };

      await supabaseAdmin.from('campaign_metrics').upsert(metrics, {
        onConflict: 'campaign_id,ad_group_id,creative_id,date',
      });
      saved.push(metrics);
    } catch (e) {
      console.error(`Naver metrics error for campaign ${campaign.id}:`, e);
    }
  }

  return saved;
}

async function collectMetaMetrics(tenantId: string, creds: any, date: string): Promise<any[]> {
  const client = createMetaMarketingClient({
    accessToken: creds.access_token,
    adAccountId: creds.ad_account_id,
  });

  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, platform_campaign_id')
    .eq('tenant_id', tenantId)
    .eq('platform', 'meta')
    .in('status', ['active', 'paused']);

  if (!campaigns?.length) return [];
  const saved: any[] = [];

  for (const campaign of campaigns) {
    if (!campaign.platform_campaign_id) continue;

    try {
      const insights = await client.insights.get(campaign.platform_campaign_id, {
        time_range: { since: date, until: date },
        fields: 'impressions,clicks,spend,actions,cpc,ctr,cpm',
      });

      if (insights?.data?.[0]) {
        const row = insights.data[0];
        const conversions = row.actions?.find((a: any) =>
          a.action_type === 'offsite_conversion' || a.action_type === 'purchase',
        )?.value || 0;

        const metrics = {
          campaign_id: campaign.id,
          tenant_id: tenantId,
          platform: 'meta',
          date,
          impressions: parseInt(row.impressions || '0'),
          clicks: parseInt(row.clicks || '0'),
          conversions: parseInt(conversions),
          cost: Math.round(parseFloat(row.spend || '0') * 1300),
          revenue: 0,
          ctr: parseFloat(row.ctr || '0'),
          cpc: Math.round(parseFloat(row.cpc || '0') * 1300),
        };

        await supabaseAdmin.from('campaign_metrics').upsert(metrics, {
          onConflict: 'campaign_id,ad_group_id,creative_id,date',
        });
        saved.push(metrics);
      }
    } catch (e) {
      console.error(`Meta metrics error for campaign ${campaign.id}:`, e);
    }
  }

  return saved;
}

async function collectGoogleMetrics(tenantId: string, creds: any, date: string): Promise<any[]> {
  const client = createGoogleAdsClient({
    developerToken: creds.developer_token,
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
    refreshToken: creds.refresh_token,
    customerId: creds.customer_id,
  });

  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, platform_campaign_id')
    .eq('tenant_id', tenantId)
    .eq('platform', 'google')
    .in('status', ['active', 'paused']);

  if (!campaigns?.length) return [];
  const saved: any[] = [];

  try {
    const results = await client.campaigns.metrics({ start: date, end: date });

    for (const row of results as any[]) {
      const campaignId = row.campaign?.id?.toString();
      const dbCampaign = campaigns.find((c) => c.platform_campaign_id?.includes(campaignId));
      if (!dbCampaign) continue;

      const m = row.metrics || {};
      const metrics = {
        campaign_id: dbCampaign.id,
        tenant_id: tenantId,
        platform: 'google',
        date,
        impressions: parseInt(m.impressions || '0'),
        clicks: parseInt(m.clicks || '0'),
        conversions: Math.round(parseFloat(m.conversions || '0')),
        cost: Math.round(parseInt(m.cost_micros || '0') / 1_000_000 * 1300),
        revenue: 0,
        ctr: parseFloat(m.ctr || '0'),
        cpc: Math.round(parseInt(m.average_cpc || '0') / 1_000_000 * 1300),
        cvr: parseFloat(m.conversions_from_interactions_rate || '0'),
      };

      await supabaseAdmin.from('campaign_metrics').upsert(metrics, {
        onConflict: 'campaign_id,ad_group_id,creative_id,date',
      });
      saved.push(metrics);
    }
  } catch (e) {
    console.error('Google metrics collection error:', e);
  }

  return saved;
}

// ---- 리포트 요약 생성 (Gemini) ----

export async function generateDailyReport(
  tenantId: string,
  date: string,
  geminiApiKey: string,
): Promise<{ summary: string; insights: string[]; alerts: string[] }> {
  // 당일 메트릭 조회
  const { data: todayMetrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('date', date);

  // 전일 메트릭 (비교용)
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const { data: yesterdayMetrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('date', yesterday.toISOString().split('T')[0]);

  const prompt = `당신은 한국 디지털 마케팅 리포트 분석가입니다.

## 오늘 (${date}) 성과
${JSON.stringify(todayMetrics || [], null, 2)}

## 어제 성과 (비교용)
${JSON.stringify(yesterdayMetrics || [], null, 2)}

다음 JSON 형식으로 일일 리포트를 작성하세요:
{
  "summary": "전체 성과 요약 (2~3문장, 한국어)",
  "insights": ["AI 인사이트 1", "AI 인사이트 2"],
  "alerts": ["긴급 알림이 필요한 사항 (CPC 급등, 예산 소진 등)"]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      },
    );

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text);
  } catch {
    return {
      summary: `${date} 일일 리포트: 데이터 수집 완료 (${(todayMetrics || []).length}건)`,
      insights: [],
      alerts: [],
    };
  }
}
