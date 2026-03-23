const BASE_URL = 'https://googleads.googleapis.com/v18';

interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string; // 하이픈 없는 10자리
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

// OAuth 2.0 토큰 갱신
async function getAccessToken(creds: GoogleAdsCredentials): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth error: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedAccessToken.token;
}

function buildHeaders(accessToken: string, creds: GoogleAdsCredentials): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'developer-token': creds.developerToken,
  };
}

// GAQL 쿼리 실행
async function searchStream<T>(creds: GoogleAdsCredentials, query: string, retries = 3): Promise<T[]> {
  const accessToken = await getAccessToken(creds);
  const url = `${BASE_URL}/customers/${creds.customerId}/googleAds:searchStream`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(accessToken, creds),
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        if (attempt < retries && res.status >= 500) continue;
        throw new Error(`Google Ads API ${res.status}: ${errorBody}`);
      }

      const data = (await res.json()) as any[];
      return data.flatMap((batch: any) => batch.results || []) as T[];
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error('Google Ads API: max retries exceeded');
}

// Mutate 요청 (생성/수정/삭제)
async function mutate(
  creds: GoogleAdsCredentials,
  resourceType: string,
  operations: any[],
  retries = 3,
): Promise<any> {
  const accessToken = await getAccessToken(creds);
  const url = `${BASE_URL}/customers/${creds.customerId}/${resourceType}:mutate`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(accessToken, creds),
        body: JSON.stringify({ operations }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        if (attempt < retries && res.status >= 500) continue;
        throw new Error(`Google Ads mutate ${res.status}: ${errorBody}`);
      }

      return await res.json();
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error('Google Ads mutate: max retries exceeded');
}

// === 캠페인 ===
export function listCampaigns(creds: GoogleAdsCredentials) {
  return searchStream(creds, `
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           campaign_budget.amount_micros, campaign.start_date, campaign.end_date
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);
}

export function createCampaign(creds: GoogleAdsCredentials, data: {
  name: string;
  advertisingChannelType: string;
  status?: string;
  budgetAmountMicros: number;
  biddingStrategyType?: string;
}) {
  // 먼저 예산 생성
  return mutate(creds, 'campaignBudgets', [{
    create: {
      name: `${data.name}_budget`,
      amount_micros: data.budgetAmountMicros,
      delivery_method: 'STANDARD',
    },
  }]).then((budgetResult: any) => {
    const budgetResourceName = budgetResult.results[0].resourceName;
    return mutate(creds, 'campaigns', [{
      create: {
        name: data.name,
        advertising_channel_type: data.advertisingChannelType,
        status: data.status || 'PAUSED',
        campaign_budget: budgetResourceName,
        bidding_strategy_type: data.biddingStrategyType || 'MAXIMIZE_CONVERSIONS',
      },
    }]);
  });
}

export function updateCampaign(creds: GoogleAdsCredentials, resourceName: string, data: Record<string, unknown>) {
  return mutate(creds, 'campaigns', [{
    update: { resource_name: resourceName, ...data },
    update_mask: Object.keys(data).join(','),
  }]);
}

// === 광고그룹 ===
export function listAdGroups(creds: GoogleAdsCredentials, campaignId: string) {
  return searchStream(creds, `
    SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros
    FROM ad_group
    WHERE campaign.id = ${campaignId}
    AND ad_group.status != 'REMOVED'
  `);
}

export function createAdGroup(creds: GoogleAdsCredentials, data: {
  campaignResourceName: string;
  name: string;
  cpcBidMicros?: number;
  status?: string;
}) {
  return mutate(creds, 'adGroups', [{
    create: {
      campaign: data.campaignResourceName,
      name: data.name,
      cpc_bid_micros: data.cpcBidMicros,
      status: data.status || 'ENABLED',
    },
  }]);
}

// === 키워드 ===
export function addKeywords(creds: GoogleAdsCredentials, adGroupResourceName: string, keywords: { text: string; matchType: string }[]) {
  return mutate(creds, 'adGroupCriteria', keywords.map((kw) => ({
    create: {
      ad_group: adGroupResourceName,
      keyword: {
        text: kw.text,
        match_type: kw.matchType, // BROAD | PHRASE | EXACT
      },
      status: 'ENABLED',
    },
  })));
}

// === 반응형 검색광고 ===
export function createResponsiveSearchAd(creds: GoogleAdsCredentials, data: {
  adGroupResourceName: string;
  headlines: string[]; // 최대 15개
  descriptions: string[]; // 최대 4개
  finalUrls: string[];
}) {
  return mutate(creds, 'adGroupAds', [{
    create: {
      ad_group: data.adGroupResourceName,
      ad: {
        responsive_search_ad: {
          headlines: data.headlines.map((text) => ({ text })),
          descriptions: data.descriptions.map((text) => ({ text })),
        },
        final_urls: data.finalUrls,
      },
      status: 'ENABLED',
    },
  }]);
}

// === 리포트 ===
export function getCampaignMetrics(creds: GoogleAdsCredentials, dateRange: { start: string; end: string }) {
  return searchStream(creds, `
    SELECT campaign.id, campaign.name,
           metrics.impressions, metrics.clicks, metrics.conversions,
           metrics.cost_micros, metrics.ctr, metrics.average_cpc,
           metrics.conversions_from_interactions_rate
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
    AND campaign.status != 'REMOVED'
  `);
}

export function getAdGroupMetrics(creds: GoogleAdsCredentials, campaignId: string, dateRange: { start: string; end: string }) {
  return searchStream(creds, `
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
export function createConversionAction(creds: GoogleAdsCredentials, data: {
  name: string;
  type: string;
  category: string;
}) {
  return mutate(creds, 'conversionActions', [{
    create: {
      name: data.name,
      type: data.type,
      category: data.category,
      status: 'ENABLED',
    },
  }]);
}

// 클라이언트 팩토리
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
    reports: {
      searchStream: (query: string) => searchStream(creds, query),
    },
  };
}
