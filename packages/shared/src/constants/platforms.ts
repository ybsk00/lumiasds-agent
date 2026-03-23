import type { Platform } from '../types/strategy';

export const PLATFORMS: Record<Platform, { name: string; label: string }> = {
  naver_search: { name: 'naver_search', label: '네이버 검색광고' },
  naver_gfa: { name: 'naver_gfa', label: '네이버 GFA' },
  meta: { name: 'meta', label: 'Meta (Facebook/Instagram)' },
  google: { name: 'google', label: 'Google Ads' },
  kakao: { name: 'kakao', label: '카카오모먼트' },
};

export const CORE_PLATFORMS: Platform[] = ['naver_search', 'meta', 'google'];

export const APPROVAL_REQUIRED_ACTIONS = [
  'campaign.create',
  'campaign.budget.update',
  'campaign.activate',
  'adgroup.bid.update',
  'creative.submit',
] as const;

export const AUTO_APPROVE_ACTIONS = [
  'campaign.pause',
  'report.fetch',
  'keyword.research',
  'creative.draft',
  'analysis.run',
] as const;
