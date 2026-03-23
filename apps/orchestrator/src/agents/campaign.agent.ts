import type { Strategy, StrategyOutput, Platform, Campaign } from '@lumiads/shared';
import { supabaseAdmin } from '../lib/supabase';
import { generateAllCreatives } from './creative.agent';
import { createNaverSearchAdsClient } from '../platforms/naver/search-ads';
import { createMetaMarketingClient } from '../platforms/meta/marketing-api';
import { createGoogleAdsClient } from '../platforms/google/ads-api';

// ====================================================================
// CampaignAgent — 전략 승인 → 3대 플랫폼 API로 자동 광고 등록
//
// 파이프라인:
//  1. 전략의 캠페인 구조 파싱
//  2. CreativeAgent → 카피 + 이미지 생성
//  3. UTM URL 자동 생성
//  4. 네이버 API → 캠페인/광고그룹/키워드/소재 생성
//  5. Meta API → 캠페인/광고세트/광고 생성
//  6. Google API → 캠페인/광고그룹/키워드/광고 생성
//  7. 각 단계 → task_logs 기록
// ====================================================================

interface CampaignAgentConfig {
  tenantId: string;
  strategyId: string;
  geminiApiKey: string;
}

interface ExecutionResult {
  success: boolean;
  platform: Platform;
  campaignId: string | null;
  platformCampaignId: string | null;
  error: string | null;
}

// ---- UTM 생성 ----

function generateUTM(baseUrl: string, params: {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}): string {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', params.source);
  url.searchParams.set('utm_medium', params.medium);
  url.searchParams.set('utm_campaign', params.campaign);
  if (params.content) url.searchParams.set('utm_content', params.content);
  return url.toString();
}

const UTM_SOURCES: Record<string, { source: string; medium: string }> = {
  naver_search: { source: 'naver', medium: 'cpc' },
  naver_gfa: { source: 'naver', medium: 'display' },
  meta: { source: 'meta', medium: 'paid_social' },
  google: { source: 'google', medium: 'cpc' },
};

// ---- 메인 실행 ----

export async function executeCampaignCreation(config: CampaignAgentConfig): Promise<ExecutionResult[]> {
  // 1. 전략 조회
  const { data: strategy } = await supabaseAdmin
    .from('strategies')
    .select('*')
    .eq('id', config.strategyId)
    .eq('tenant_id', config.tenantId)
    .single();

  if (!strategy || strategy.status !== 'approved') {
    throw new Error('Strategy not found or not approved');
  }

  const output = strategy.output as StrategyOutput;
  const input = strategy.input;
  if (!output) throw new Error('Strategy has no output');

  // 2. 테넌트 API 키 조회
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys, compliance_rules')
    .eq('id', config.tenantId)
    .single();

  if (!tenant?.api_keys) throw new Error('No API keys configured');
  const apiKeys = tenant.api_keys as Record<string, any>;

  // 3. 전략 상태 → executing
  await supabaseAdmin
    .from('strategies')
    .update({ status: 'executing', updated_at: new Date().toISOString() })
    .eq('id', config.strategyId);

  const results: ExecutionResult[] = [];

  // 4. 플랫폼별 캠페인 생성
  const platforms = Object.keys(output.channel_allocation) as Platform[];

  for (const platform of platforms) {
    const allocation = output.channel_allocation[platform];
    if (!allocation) continue;

    const taskLog = await createTaskLog(config.tenantId, platform, 'campaign', 'create');

    try {
      let result: ExecutionResult;

      switch (platform) {
        case 'naver_search':
          result = await createNaverCampaign(config, apiKeys.naver, output, input);
          break;
        case 'meta':
          result = await createMetaCampaign(config, apiKeys.meta, output, input);
          break;
        case 'google':
          result = await createGoogleCampaign(config, apiKeys.google, output, input);
          break;
        default:
          result = { success: false, platform, campaignId: null, platformCampaignId: null, error: `Unsupported platform: ${platform}` };
      }

      results.push(result);

      // task_log 업데이트
      await supabaseAdmin.from('task_logs').update({
        status: result.success ? 'completed' : 'failed',
        output: result,
        error: result.error,
        completed_at: new Date().toISOString(),
      }).eq('id', taskLog.id);

    } catch (e: any) {
      results.push({ success: false, platform, campaignId: null, platformCampaignId: null, error: e.message });
      await supabaseAdmin.from('task_logs').update({
        status: 'failed',
        error: e.message,
        completed_at: new Date().toISOString(),
      }).eq('id', taskLog.id);
    }
  }

  // 5. 전략 상태 업데이트
  const allSuccess = results.every((r) => r.success);
  await supabaseAdmin
    .from('strategies')
    .update({
      status: allSuccess ? 'completed' : 'executing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', config.strategyId);

  return results;
}

// ---- 네이버 캠페인 생성 ----

async function createNaverCampaign(
  config: CampaignAgentConfig,
  creds: any,
  output: StrategyOutput,
  input: any,
): Promise<ExecutionResult> {
  const client = createNaverSearchAdsClient({
    apiKey: creds.api_key,
    secretKey: creds.secret_key,
    customerId: creds.customer_id,
  });

  // 캠페인 생성
  const naverCampaign = await client.campaigns.create({
    name: `[LA] ${input.product}`,
    campaignTp: 'WEB_SITE',
    customerId: creds.customer_id,
    dailyBudget: Math.round((output.channel_allocation.naver_search?.budget || 0) / 30),
  });

  // DB에 캠페인 저장
  const { data: dbCampaign } = await supabaseAdmin.from('campaigns').insert({
    tenant_id: config.tenantId,
    strategy_id: config.strategyId,
    platform: 'naver_search',
    platform_campaign_id: naverCampaign.nccCampaignId,
    name: `[LA] ${input.product}`,
    type: 'SEARCH',
    status: 'active',
    budget_daily: Math.round((output.channel_allocation.naver_search?.budget || 0) / 30),
    start_date: input.campaign_period?.start,
    end_date: input.campaign_period?.end,
  }).select().single();

  // 광고그룹 + 키워드 + 소재 생성
  const structure = output.campaign_structure?.naver_search;
  if (structure?.campaigns?.[0]?.ad_groups) {
    for (const agPlan of structure.campaigns[0].ad_groups) {
      const adGroup = await client.adGroups.create({
        nccCampaignId: naverCampaign.nccCampaignId,
        name: agPlan.name,
        bidAmt: agPlan.daily_budget ? Math.round(agPlan.daily_budget / 100) : undefined,
      });

      // DB에 광고그룹 저장
      const { data: dbAdGroup } = await supabaseAdmin.from('ad_groups').insert({
        campaign_id: dbCampaign!.id,
        tenant_id: config.tenantId,
        platform_adgroup_id: adGroup.nccAdgroupId,
        name: agPlan.name,
        bid_strategy: agPlan.bid_strategy,
        status: 'active',
      }).select().single();

      // 키워드 추가
      if (agPlan.keywords?.length) {
        await client.keywords.create(adGroup.nccAdgroupId, agPlan.keywords.map((kw) => ({ keyword: kw })));
      }

      // 소재 생성 (CreativeAgent)
      if (dbAdGroup && output.creative_brief) {
        const utmUrl = generateUTM(input.landing_url, {
          ...UTM_SOURCES.naver_search,
          campaign: input.product.replace(/\s/g, '_'),
          content: agPlan.name,
        });

        await generateAllCreatives({
          tenantId: config.tenantId,
          geminiApiKey: config.geminiApiKey,
          strategyId: config.strategyId,
          adGroupId: dbAdGroup.id,
          brief: output.creative_brief,
          platforms: ['naver_search'],
          landingUrl: utmUrl,
        });
      }
    }
  }

  return {
    success: true,
    platform: 'naver_search',
    campaignId: dbCampaign!.id,
    platformCampaignId: naverCampaign.nccCampaignId,
    error: null,
  };
}

// ---- 메타 캠페인 생성 ----

async function createMetaCampaign(
  config: CampaignAgentConfig,
  creds: any,
  output: StrategyOutput,
  input: any,
): Promise<ExecutionResult> {
  const client = createMetaMarketingClient({
    accessToken: creds.access_token,
    adAccountId: creds.ad_account_id,
  });

  const dailyBudget = Math.round((output.channel_allocation.meta?.budget || 0) / 30);

  // 캠페인 생성
  const metaCampaign = await client.campaigns.create({
    name: `[LA] ${input.product}`,
    objective: input.goal === 'conversion' ? 'OUTCOME_SALES' : 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: [],
  });

  // DB 저장
  const { data: dbCampaign } = await supabaseAdmin.from('campaigns').insert({
    tenant_id: config.tenantId,
    strategy_id: config.strategyId,
    platform: 'meta',
    platform_campaign_id: metaCampaign.id,
    name: `[LA] ${input.product}`,
    type: 'DISPLAY',
    status: 'paused',
    budget_daily: dailyBudget,
    start_date: input.campaign_period?.start,
    end_date: input.campaign_period?.end,
  }).select().single();

  // 광고세트 생성
  const targeting = output.target_audiences?.find((t) => t.platform === 'meta');
  const adSet = await client.adSets.create({
    name: `[LA] ${input.product}_core`,
    campaign_id: metaCampaign.id,
    daily_budget: dailyBudget * 100, // cents
    billing_event: 'IMPRESSIONS',
    optimization_goal: input.goal === 'conversion' ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS',
    targeting: {
      age_min: targeting?.age_range?.[0] || 25,
      age_max: targeting?.age_range?.[1] || 45,
      genders: targeting?.gender === 'female' ? [2] : targeting?.gender === 'male' ? [1] : undefined,
      interests: targeting?.interests?.map((i) => ({ name: i })) || [],
    },
    status: 'PAUSED',
  });

  // DB에 광고그룹 저장
  const { data: dbAdGroup } = await supabaseAdmin.from('ad_groups').insert({
    campaign_id: dbCampaign!.id,
    tenant_id: config.tenantId,
    platform_adgroup_id: adSet.id,
    name: `[LA] ${input.product}_core`,
    targeting: targeting || {},
    status: 'paused',
  }).select().single();

  // 소재 생성
  if (dbAdGroup && output.creative_brief) {
    const utmUrl = generateUTM(input.landing_url, {
      ...UTM_SOURCES.meta,
      campaign: input.product.replace(/\s/g, '_'),
    });

    await generateAllCreatives({
      tenantId: config.tenantId,
      geminiApiKey: config.geminiApiKey,
      strategyId: config.strategyId,
      adGroupId: dbAdGroup.id,
      brief: output.creative_brief,
      platforms: ['meta'],
      landingUrl: utmUrl,
    });
  }

  return {
    success: true,
    platform: 'meta',
    campaignId: dbCampaign!.id,
    platformCampaignId: metaCampaign.id,
    error: null,
  };
}

// ---- 구글 캠페인 생성 ----

async function createGoogleCampaign(
  config: CampaignAgentConfig,
  creds: any,
  output: StrategyOutput,
  input: any,
): Promise<ExecutionResult> {
  const client = createGoogleAdsClient({
    developerToken: creds.developer_token,
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
    refreshToken: creds.refresh_token,
    customerId: creds.customer_id,
  });

  const dailyBudget = Math.round((output.channel_allocation.google?.budget || 0) / 30);

  // 캠페인 + 예산 생성
  const googleCampaign = await client.campaigns.create({
    name: `[LA] ${input.product}`,
    advertisingChannelType: 'SEARCH',
    budgetAmountMicros: dailyBudget * 1000000,
    biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
  });

  const campaignResourceName = googleCampaign?.results?.[0]?.resourceName;

  // DB 저장
  const { data: dbCampaign } = await supabaseAdmin.from('campaigns').insert({
    tenant_id: config.tenantId,
    strategy_id: config.strategyId,
    platform: 'google',
    platform_campaign_id: campaignResourceName,
    name: `[LA] ${input.product}`,
    type: 'SEARCH',
    status: 'paused',
    budget_daily: dailyBudget,
    start_date: input.campaign_period?.start,
    end_date: input.campaign_period?.end,
  }).select().single();

  // 광고그룹 생성
  if (campaignResourceName) {
    const adGroupResult = await client.adGroups.create({
      campaignResourceName,
      name: `[LA] ${input.product}_general`,
      cpcBidMicros: 1000000, // 1,000원
    });

    const adGroupResourceName = adGroupResult?.results?.[0]?.resourceName;

    // DB에 광고그룹 저장
    const { data: dbAdGroup } = await supabaseAdmin.from('ad_groups').insert({
      campaign_id: dbCampaign!.id,
      tenant_id: config.tenantId,
      platform_adgroup_id: adGroupResourceName,
      name: `[LA] ${input.product}_general`,
      bid_amount: 1000,
      status: 'paused',
    }).select().single();

    // 키워드 추가
    const googleStructure = output.campaign_structure?.google;
    const keywords = googleStructure?.campaigns?.[0]?.ad_groups?.[0]?.keywords || [];
    if (adGroupResourceName && keywords.length > 0) {
      await client.keywords.add(
        adGroupResourceName,
        keywords.map((kw) => ({ text: kw, matchType: 'BROAD' })),
      );
    }

    // 반응형 검색광고 생성 (카피 활용)
    if (adGroupResourceName && output.creative_brief) {
      const utmUrl = generateUTM(input.landing_url, {
        ...UTM_SOURCES.google,
        campaign: input.product.replace(/\s/g, '_'),
      });

      const brief = output.creative_brief;
      await client.ads.createResponsiveSearch({
        adGroupResourceName,
        headlines: [brief.key_message, brief.cta, ...brief.usp].slice(0, 15),
        descriptions: [brief.key_message, `${brief.usp[0]} | ${brief.cta}`].slice(0, 4),
        finalUrls: [utmUrl],
      });

      // 소재도 DB에 저장
      if (dbAdGroup) {
        await generateAllCreatives({
          tenantId: config.tenantId,
          geminiApiKey: config.geminiApiKey,
          strategyId: config.strategyId,
          adGroupId: dbAdGroup.id,
          brief: output.creative_brief,
          platforms: ['google'],
          landingUrl: utmUrl,
        });
      }
    }
  }

  return {
    success: true,
    platform: 'google',
    campaignId: dbCampaign!.id,
    platformCampaignId: campaignResourceName || null,
    error: null,
  };
}

// ---- 헬퍼 ----

async function createTaskLog(tenantId: string, platform: Platform, taskType: string, action: string) {
  const { data } = await supabaseAdmin.from('task_logs').insert({
    tenant_id: tenantId,
    task_type: taskType,
    platform,
    action,
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single();
  return data!;
}
