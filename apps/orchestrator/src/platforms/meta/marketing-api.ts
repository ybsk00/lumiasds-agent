const BASE_URL = 'https://graph.facebook.com/v21.0';

interface MetaCredentials {
  accessToken: string;
  adAccountId: string;  // act_XXXXX 형태
}

async function request<T>(
  credentials: MetaCredentials,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  retries = 3,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('access_token', credentials.accessToken);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url.toString(), options);

      if (!res.ok) {
        const errorBody = await res.text();
        if (attempt < retries && res.status >= 500) continue;
        throw new Error(`Meta API ${res.status}: ${errorBody}`);
      }

      return (await res.json()) as T;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error('Meta API: max retries exceeded');
}

// === 캠페인 ===
export function listCampaigns(creds: MetaCredentials, fields = 'id,name,status,objective,daily_budget,lifetime_budget') {
  return request<any>(creds, 'GET', `/act_${creds.adAccountId}/campaigns?fields=${fields}`);
}

export function createCampaign(creds: MetaCredentials, data: {
  name: string;
  objective: string;
  status?: string;
  special_ad_categories?: string[];
  daily_budget?: number;
  lifetime_budget?: number;
}) {
  return request<any>(creds, 'POST', `/act_${creds.adAccountId}/campaigns`, data);
}

export function updateCampaign(creds: MetaCredentials, campaignId: string, data: Record<string, unknown>) {
  return request<any>(creds, 'POST', `/${campaignId}`, data);
}

// === 광고세트 ===
export function listAdSets(creds: MetaCredentials, campaignId: string) {
  return request<any>(creds, 'GET', `/${campaignId}/adsets?fields=id,name,status,targeting,daily_budget,bid_strategy`);
}

export function createAdSet(creds: MetaCredentials, data: {
  name: string;
  campaign_id: string;
  daily_budget?: number;
  lifetime_budget?: number;
  bid_strategy?: string;
  billing_event: string;
  optimization_goal: string;
  targeting: Record<string, unknown>;
  start_time?: string;
  end_time?: string;
  status?: string;
}) {
  return request<any>(creds, 'POST', `/act_${creds.adAccountId}/adsets`, data);
}

export function updateAdSet(creds: MetaCredentials, adSetId: string, data: Record<string, unknown>) {
  return request<any>(creds, 'POST', `/${adSetId}`, data);
}

// === 광고 ===
export function listAds(creds: MetaCredentials, adSetId: string) {
  return request<any>(creds, 'GET', `/${adSetId}/ads?fields=id,name,status,creative`);
}

export function createAd(creds: MetaCredentials, data: {
  name: string;
  adset_id: string;
  creative: { creative_id: string };
  status?: string;
}) {
  return request<any>(creds, 'POST', `/act_${creds.adAccountId}/ads`, data);
}

// === 이미지 업로드 ===
export function uploadImage(creds: MetaCredentials, imageData: { bytes?: string; filename: string }) {
  return request<any>(creds, 'POST', `/act_${creds.adAccountId}/adimages`, imageData);
}

// === 맞춤 타겟 ===
export function createCustomAudience(creds: MetaCredentials, data: {
  name: string;
  subtype: string;
  description?: string;
  customer_file_source?: string;
}) {
  return request<any>(creds, 'POST', `/act_${creds.adAccountId}/customaudiences`, data);
}

// === 유사 타겟 ===
export function createLookalikeAudience(creds: MetaCredentials, data: {
  name: string;
  origin_audience_id: string;
  lookalike_spec: { country: string; ratio: number };
}) {
  return request<any>(creds, 'POST', `/act_${creds.adAccountId}/customaudiences`, {
    ...data,
    subtype: 'LOOKALIKE',
  });
}

// === 인사이트 ===
export function getInsights(creds: MetaCredentials, objectId: string, params: {
  date_preset?: string;
  time_range?: { since: string; until: string };
  fields?: string;
  level?: string;
  breakdowns?: string;
}) {
  const fields = params.fields || 'impressions,clicks,spend,conversions,cpc,ctr,cpm,actions';
  let path = `/${objectId}/insights?fields=${fields}`;
  if (params.date_preset) path += `&date_preset=${params.date_preset}`;
  if (params.time_range) path += `&time_range=${JSON.stringify(params.time_range)}`;
  if (params.level) path += `&level=${params.level}`;
  if (params.breakdowns) path += `&breakdowns=${params.breakdowns}`;
  return request<any>(creds, 'GET', path);
}

// 클라이언트 팩토리
export function createMetaMarketingClient(creds: MetaCredentials) {
  return {
    campaigns: {
      list: (fields?: string) => listCampaigns(creds, fields),
      create: (data: Parameters<typeof createCampaign>[1]) => createCampaign(creds, data),
      update: (id: string, data: Record<string, unknown>) => updateCampaign(creds, id, data),
    },
    adSets: {
      list: (campaignId: string) => listAdSets(creds, campaignId),
      create: (data: Parameters<typeof createAdSet>[1]) => createAdSet(creds, data),
      update: (id: string, data: Record<string, unknown>) => updateAdSet(creds, id, data),
    },
    ads: {
      list: (adSetId: string) => listAds(creds, adSetId),
      create: (data: Parameters<typeof createAd>[1]) => createAd(creds, data),
    },
    images: {
      upload: (data: Parameters<typeof uploadImage>[1]) => uploadImage(creds, data),
    },
    audiences: {
      createCustom: (data: Parameters<typeof createCustomAudience>[1]) => createCustomAudience(creds, data),
      createLookalike: (data: Parameters<typeof createLookalikeAudience>[1]) => createLookalikeAudience(creds, data),
    },
    insights: {
      get: (objectId: string, params: Parameters<typeof getInsights>[1]) => getInsights(creds, objectId, params),
    },
  };
}
