import crypto from 'crypto';

const BASE_URL = 'https://api.searchad.naver.com';

interface NaverAdCredentials {
  apiKey: string;
  secretKey: string;
  customerId: string;
}

// HMAC-SHA256 서명 생성
function generateSignature(timestamp: string, method: string, path: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function buildHeaders(credentials: NaverAdCredentials, method: string, path: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, method, path, credentials.secretKey);

  return {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-API-KEY': credentials.apiKey,
    'X-Customer': credentials.customerId,
    'X-Signature': signature,
  };
}

async function request<T>(
  credentials: NaverAdCredentials,
  method: string,
  path: string,
  body?: unknown,
  retries = 3,
): Promise<T> {
  const headers = buildHeaders(credentials, method, path);
  const url = `${BASE_URL}${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const errorBody = await res.text();
        if (attempt < retries && res.status >= 500) continue;
        throw new Error(`Naver API ${res.status}: ${errorBody}`);
      }

      return (await res.json()) as T;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error('Naver API: max retries exceeded');
}

// === 캠페인 ===
export function listCampaigns(creds: NaverAdCredentials) {
  return request<any[]>(creds, 'GET', '/ncc/campaigns');
}

export function getCampaign(creds: NaverAdCredentials, campaignId: string) {
  return request<any>(creds, 'GET', `/ncc/campaigns/${campaignId}`);
}

export function createCampaign(creds: NaverAdCredentials, data: {
  name: string;
  campaignTp: string;
  customerId: string;
  dailyBudget?: number;
  deliveryMethod?: string;
}) {
  return request<any>(creds, 'POST', '/ncc/campaigns', data);
}

export function updateCampaign(creds: NaverAdCredentials, campaignId: string, data: Record<string, unknown>) {
  return request<any>(creds, 'PUT', `/ncc/campaigns/${campaignId}`, data);
}

// === 광고그룹 ===
export function listAdGroups(creds: NaverAdCredentials, campaignId: string) {
  return request<any[]>(creds, 'GET', `/ncc/adgroups?nccCampaignId=${campaignId}`);
}

export function createAdGroup(creds: NaverAdCredentials, data: {
  nccCampaignId: string;
  name: string;
  bidAmt?: number;
  targets?: Record<string, unknown>;
}) {
  return request<any>(creds, 'POST', '/ncc/adgroups', data);
}

export function updateAdGroup(creds: NaverAdCredentials, adGroupId: string, data: Record<string, unknown>) {
  return request<any>(creds, 'PUT', `/ncc/adgroups/${adGroupId}`, data);
}

// === 키워드 ===
export function listKeywords(creds: NaverAdCredentials, adGroupId: string) {
  return request<any[]>(creds, 'GET', `/ncc/keywords?nccAdgroupId=${adGroupId}`);
}

export function createKeywords(creds: NaverAdCredentials, adGroupId: string, keywords: { keyword: string; bidAmt?: number }[]) {
  return request<any[]>(creds, 'POST', '/ncc/keywords', keywords.map((kw) => ({
    ...kw,
    nccAdgroupId: adGroupId,
  })));
}

export function updateKeyword(creds: NaverAdCredentials, keywordId: string, data: { bidAmt?: number; useGroupBidAmt?: boolean }) {
  return request<any>(creds, 'PUT', `/ncc/keywords/${keywordId}`, data);
}

// === 소재 ===
export function listAds(creds: NaverAdCredentials, adGroupId: string) {
  return request<any[]>(creds, 'GET', `/ncc/ads?nccAdgroupId=${adGroupId}`);
}

export function createAd(creds: NaverAdCredentials, data: {
  nccAdgroupId: string;
  type: number;
  headline?: string;
  description?: string;
  mobile?: { final?: string };
  pc?: { final?: string };
}) {
  return request<any>(creds, 'POST', '/ncc/ads', data);
}

// === 키워드 도구 ===
export function getKeywordStats(creds: NaverAdCredentials, keywords: string[]) {
  const params = new URLSearchParams();
  params.set('hintKeywords', keywords.join(','));
  params.set('showDetail', '1');
  return request<any>(creds, 'GET', `/keywordstool?${params.toString()}`);
}

// === 리포트 ===
export function requestReport(creds: NaverAdCredentials, data: {
  reportTp: string;
  statDt: string;
  edDt: string;
}) {
  return request<any>(creds, 'POST', '/stat-reports', data);
}

export function downloadReport(creds: NaverAdCredentials, reportId: string) {
  return request<any>(creds, 'GET', `/stat-reports/${reportId}/download`);
}

// 클라이언트 팩토리
export function createNaverSearchAdsClient(creds: NaverAdCredentials) {
  return {
    campaigns: {
      list: () => listCampaigns(creds),
      get: (id: string) => getCampaign(creds, id),
      create: (data: Parameters<typeof createCampaign>[1]) => createCampaign(creds, data),
      update: (id: string, data: Record<string, unknown>) => updateCampaign(creds, id, data),
    },
    adGroups: {
      list: (campaignId: string) => listAdGroups(creds, campaignId),
      create: (data: Parameters<typeof createAdGroup>[1]) => createAdGroup(creds, data),
      update: (id: string, data: Record<string, unknown>) => updateAdGroup(creds, id, data),
    },
    keywords: {
      list: (adGroupId: string) => listKeywords(creds, adGroupId),
      create: (adGroupId: string, keywords: { keyword: string; bidAmt?: number }[]) => createKeywords(creds, adGroupId, keywords),
      update: (id: string, data: { bidAmt?: number }) => updateKeyword(creds, id, data),
      stats: (keywords: string[]) => getKeywordStats(creds, keywords),
    },
    ads: {
      list: (adGroupId: string) => listAds(creds, adGroupId),
      create: (data: Parameters<typeof createAd>[1]) => createAd(creds, data),
    },
    reports: {
      request: (data: Parameters<typeof requestReport>[1]) => requestReport(creds, data),
      download: (id: string) => downloadReport(creds, id),
    },
  };
}
