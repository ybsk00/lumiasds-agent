import { GoogleAdsApi, Customer, enums, resources, services } from 'google-ads-api';

interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string; // 하이픈 없는 10자리
}

function getCustomer(creds: GoogleAdsCredentials): Customer {
  const client = new GoogleAdsApi({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    developer_token: creds.developerToken,
  });

  return client.Customer({
    customer_id: creds.customerId,
    refresh_token: creds.refreshToken,
  });
}

// === 캠페인 ===
export async function listCampaigns(creds: GoogleAdsCredentials) {
  const customer = getCustomer(creds);
  return customer.query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           campaign_budget.amount_micros, campaign.start_date, campaign.end_date
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);
}

export async function createCampaign(creds: GoogleAdsCredentials, data: {
  name: string;
  advertisingChannelType: string;
  status?: string;
  budgetAmountMicros: number;
  biddingStrategyType?: string;
}) {
  const customer = getCustomer(creds);

  // 먼저 예산 생성
  const budgetResult = await customer.campaignBudgets.create([{
    name: `${data.name}_budget`,
    amount_micros: data.budgetAmountMicros,
    delivery_method: enums.BudgetDeliveryMethod.STANDARD,
  }]);
  const budgetResourceName = budgetResult.results[0].resource_name;

  // 캠페인 생성
  return customer.campaigns.create([{
    name: data.name,
    advertising_channel_type: data.advertisingChannelType as any,
    status: (data.status || 'PAUSED') as any,
    campaign_budget: budgetResourceName,
    bidding_strategy_type: (data.biddingStrategyType || 'MAXIMIZE_CONVERSIONS') as any,
  }]);
}

export async function updateCampaign(creds: GoogleAdsCredentials, resourceName: string, data: Record<string, unknown>) {
  const customer = getCustomer(creds);
  return customer.campaigns.update([{
    resource_name: resourceName,
    ...data,
  } as any]);
}

// === 광고그룹 ===
export async function listAdGroups(creds: GoogleAdsCredentials, campaignId: string) {
  const customer = getCustomer(creds);
  return customer.query(`
    SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros
    FROM ad_group
    WHERE campaign.id = ${campaignId}
    AND ad_group.status != 'REMOVED'
  `);
}

export async function createAdGroup(creds: GoogleAdsCredentials, data: {
  campaignResourceName: string;
  name: string;
  cpcBidMicros?: number;
  status?: string;
}) {
  const customer = getCustomer(creds);
  return customer.adGroups.create([{
    campaign: data.campaignResourceName,
    name: data.name,
    cpc_bid_micros: data.cpcBidMicros,
    status: (data.status || 'ENABLED') as any,
  }]);
}

// === 키워드 ===
export async function addKeywords(creds: GoogleAdsCredentials, adGroupResourceName: string, keywords: { text: string; matchType: string }[]) {
  const customer = getCustomer(creds);
  return customer.adGroupCriteria.create(keywords.map((kw) => ({
    ad_group: adGroupResourceName,
    keyword: {
      text: kw.text,
      match_type: kw.matchType as any, // BROAD | PHRASE | EXACT
    },
    status: enums.AdGroupCriterionStatus.ENABLED,
  })));
}

// === 반응형 검색광고 ===
export async function createResponsiveSearchAd(creds: GoogleAdsCredentials, data: {
  adGroupResourceName: string;
  headlines: string[]; // 최대 15개
  descriptions: string[]; // 최대 4개
  finalUrls: string[];
}) {
  const customer = getCustomer(creds);
  return customer.adGroupAds.create([{
    ad_group: data.adGroupResourceName,
    ad: {
      responsive_search_ad: {
        headlines: data.headlines.map((text) => ({ text })),
        descriptions: data.descriptions.map((text) => ({ text })),
      },
      final_urls: data.finalUrls,
    },
    status: enums.AdGroupAdStatus.ENABLED,
  }]);
}

// === 리포트 ===
export async function getCampaignMetrics(creds: GoogleAdsCredentials, dateRange: { start: string; end: string }) {
  const customer = getCustomer(creds);
  return customer.query(`
    SELECT campaign.id, campaign.name,
           metrics.impressions, metrics.clicks, metrics.conversions,
           metrics.cost_micros, metrics.ctr, metrics.average_cpc,
           metrics.conversions_from_interactions_rate
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
    AND campaign.status != 'REMOVED'
  `);
}

export async function getAdGroupMetrics(creds: GoogleAdsCredentials, campaignId: string, dateRange: { start: string; end: string }) {
  const customer = getCustomer(creds);
  return customer.query(`
    SELECT ad_group.id, ad_group.name,
           metrics.impressions, metrics.clicks, metrics.conversions,
           metrics.cost_micros, metrics.ctr, metrics.average_cpc
    FROM ad_group
    WHERE campaign.id = ${campaignId}
    AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
    AND ad_group.status != 'REMOVED'
  `);
}

// === 전환 추적 ===
export async function createConversionAction(creds: GoogleAdsCredentials, data: {
  name: string;
  type: string;
  category: string;
}) {
  const customer = getCustomer(creds);
  return customer.conversionActions.create([{
    name: data.name,
    type: data.type as any,
    category: data.category as any,
    status: enums.ConversionActionStatus.ENABLED,
  }]);
}

// === 연결 테스트 ===
export async function testConnection(creds: GoogleAdsCredentials): Promise<{ success: boolean; message: string }> {
  try {
    const customer = getCustomer(creds);
    const result = await customer.query('SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1');
    const name = result[0]?.customer?.descriptive_name || result[0]?.customer?.id;
    return { success: true, message: `Connected (${name})` };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// 클라이언트 팩토리 (기존 인터페이스 유지)
export function createGoogleAdsClient(creds: GoogleAdsCredentials) {
  return {
    campaigns: {
      list: () => listCampaigns(creds),
      create: (data: Parameters<typeof createCampaign>[1]) => createCampaign(creds, data),
      update: (resourceName: string, data: Record<string, unknown>) => updateCampaign(creds, resourceName, data),
      metrics: (dateRange: { start: string; end: string }) => getCampaignMetrics(creds, dateRange),
    },
    adGroups: {
      list: (campaignId: string) => listAdGroups(creds, campaignId),
      create: (data: Parameters<typeof createAdGroup>[1]) => createAdGroup(creds, data),
      metrics: (campaignId: string, dateRange: { start: string; end: string }) => getAdGroupMetrics(creds, campaignId, dateRange),
    },
    keywords: {
      add: (adGroupResourceName: string, keywords: { text: string; matchType: string }[]) => addKeywords(creds, adGroupResourceName, keywords),
    },
    ads: {
      createResponsiveSearch: (data: Parameters<typeof createResponsiveSearchAd>[1]) => createResponsiveSearchAd(creds, data),
    },
    conversions: {
      create: (data: Parameters<typeof createConversionAction>[1]) => createConversionAction(creds, data),
    },
    test: () => testConnection(creds),
    reports: {
      query: (query: string) => {
        const customer = getCustomer(creds);
        return customer.query(query);
      },
    },
  };
}
