import type {
  AnalysisReport,
  AnalysisType,
  Finding,
  FindingCategory,
  Opportunity,
  BenchmarkComparison,
  BenchmarkMetric,
  InputSource,
  Platform,
  CampaignMetrics,
} from '../shared';
import { supabaseAdmin } from '../lib/supabase';

// ====================================================================
// AnalystAgent — 분석 에이전트 (디베이트 전 핵심)
//
// 역할:
//  1. 데이터 수집 (API 자동 수집 + CSV/엑셀 수동 업로드)
//  2. 성과 분석 (KPI 트렌드, 소재별 비교, 채널별 효율)
//  3. 경쟁사/업종 벤치마크 비교
//  4. 문제점 도출 + 개선 기회 식별
//  5. 분석 보고서 생성 → 디베이트 입력으로 전달
// ====================================================================

interface AnalystConfig {
  tenantId: string;
  geminiApiKey: string;
}

// ---- 데이터 수집 ----

/** 3개 플랫폼 API에서 기존 캠페인 성과 데이터 일괄 수집 */
export async function fetchPlatformData(
  tenantId: string,
  dateRange: { start: string; end: string },
): Promise<CampaignMetrics[]> {
  // 테넌트의 API 키 조회
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  if (!tenant?.api_keys) return [];

  const allMetrics: CampaignMetrics[] = [];
  const apiKeys = tenant.api_keys as Record<string, any>;

  // 네이버 성과 수집
  if (apiKeys.naver) {
    try {
      const { createNaverSearchAdsClient } = await import('../platforms/naver/search-ads');
      const client = createNaverSearchAdsClient({
        apiKey: apiKeys.naver.api_key,
        secretKey: apiKeys.naver.secret_key,
        customerId: apiKeys.naver.customer_id,
      });
      const report = await client.reports.request({
        reportTp: 'AD',
        statDt: dateRange.start.replace(/-/g, ''),
        edDt: dateRange.end.replace(/-/g, ''),
      });
      // 리포트 데이터를 CampaignMetrics 형태로 변환
      if (report) {
        // TODO: 리포트 다운로드 + 파싱 후 메트릭 변환
      }
    } catch (e) {
      console.error('Naver data fetch error:', e);
    }
  }

  // 메타 성과 수집
  if (apiKeys.meta) {
    try {
      const { createMetaMarketingClient } = await import('../platforms/meta/marketing-api');
      const client = createMetaMarketingClient({
        accessToken: apiKeys.meta.access_token,
        adAccountId: apiKeys.meta.ad_account_id,
      });
      const insights = await client.insights.get(`act_${apiKeys.meta.ad_account_id}`, {
        time_range: { since: dateRange.start, until: dateRange.end },
        fields: 'campaign_id,campaign_name,impressions,clicks,spend,actions,cpc,ctr,cpm',
        level: 'campaign',
      });
      if (insights?.data) {
        for (const row of insights.data) {
          const conversions = row.actions?.find((a: any) => a.action_type === 'offsite_conversion')?.value || 0;
          allMetrics.push({
            id: 0,
            campaign_id: row.campaign_id,
            ad_group_id: null,
            creative_id: null,
            tenant_id: tenantId,
            platform: 'meta' as Platform,
            date: dateRange.end,
            impressions: parseInt(row.impressions || '0'),
            clicks: parseInt(row.clicks || '0'),
            conversions: parseInt(conversions),
            cost: Math.round(parseFloat(row.spend || '0') * 1300), // USD → KRW 근사
            revenue: 0,
            ctr: parseFloat(row.ctr || '0'),
            cvr: null,
            cpc: Math.round(parseFloat(row.cpc || '0') * 1300),
            cpa: null,
            roas: null,
            raw_data: row,
            fetched_at: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('Meta data fetch error:', e);
    }
  }

  // 구글 성과 수집
  if (apiKeys.google) {
    try {
      const { createGoogleAdsClient } = await import('../platforms/google/ads-api');
      const client = createGoogleAdsClient({
        developerToken: apiKeys.google.developer_token,
        clientId: apiKeys.google.client_id,
        clientSecret: apiKeys.google.client_secret,
        refreshToken: apiKeys.google.refresh_token,
        customerId: apiKeys.google.customer_id,
      });
      const results = await client.campaigns.metrics(dateRange);
      for (const row of results as any[]) {
        const campaign = row.campaign;
        const metrics = row.metrics;
        allMetrics.push({
          id: 0,
          campaign_id: campaign?.id?.toString() || '',
          ad_group_id: null,
          creative_id: null,
          tenant_id: tenantId,
          platform: 'google' as Platform,
          date: dateRange.end,
          impressions: parseInt(metrics?.impressions || '0'),
          clicks: parseInt(metrics?.clicks || '0'),
          conversions: Math.round(parseFloat(metrics?.conversions || '0')),
          cost: Math.round(parseInt(metrics?.cost_micros || '0') / 1000000 * 1300),
          revenue: 0,
          ctr: parseFloat(metrics?.ctr || '0'),
          cvr: parseFloat(metrics?.conversions_from_interactions_rate || '0'),
          cpc: Math.round(parseInt(metrics?.average_cpc || '0') / 1000000 * 1300),
          cpa: null,
          roas: null,
          raw_data: row,
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Google data fetch error:', e);
    }
  }

  // 수집된 메트릭을 DB에 저장
  if (allMetrics.length > 0) {
    await supabaseAdmin.from('campaign_metrics').upsert(
      allMetrics.map(({ id, ...rest }) => rest),
      { onConflict: 'campaign_id,ad_group_id,creative_id,date' },
    );
  }

  return allMetrics;
}

/** CSV 파일 파싱 → 구조화된 데이터 */
export function parseCSV(csvContent: string): Record<string, unknown>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const val = values[idx] || '';
      row[header] = isNaN(Number(val)) ? val : Number(val);
    });
    rows.push(row);
  }

  return rows;
}

// ---- 성과 분석 ----

/** Gemini API로 성과 데이터 분석 */
async function analyzeWithGemini(
  apiKey: string,
  metrics: CampaignMetrics[],
  benchmarks: BenchmarkMetric[],
  industry: string,
): Promise<{ findings: Finding[]; opportunities: Opportunity[]; summary: string }> {
  const prompt = buildAnalysisPrompt(metrics, benchmarks, industry);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    return JSON.parse(text);
  } catch {
    return { findings: [], opportunities: [], summary: text };
  }
}

function buildAnalysisPrompt(
  metrics: CampaignMetrics[],
  benchmarks: BenchmarkMetric[],
  industry: string,
): string {
  const metricsJson = JSON.stringify(
    metrics.map(({ raw_data, ...rest }) => rest).slice(0, 50), // 최대 50개
    null,
    2,
  );
  const benchmarkJson = JSON.stringify(benchmarks, null, 2);

  return `당신은 한국 디지털 마케팅 분석 전문가입니다.

## 업종: ${industry}

## 광고 성과 데이터
${metricsJson}

## 업종 벤치마크
${benchmarkJson}

## 분석 요청
위 데이터를 분석하여 다음 JSON 형식으로 결과를 반환하세요:

{
  "summary": "전체 분석 요약 (2~3문장)",
  "findings": [
    {
      "severity": "high|medium|low",
      "category": "cost_efficiency|creative_fatigue|audience_saturation|budget_pacing|conversion_decline|cpc_spike|ctr_decline|roas_underperform",
      "platform": "naver_search|meta|google|all",
      "title": "문제점 제목",
      "description": "상세 설명",
      "metric_current": 현재값,
      "metric_benchmark": 벤치마크값,
      "metric_type": "cpc|ctr|cvr|roas|cpa"
    }
  ],
  "opportunities": [
    {
      "priority": "high|medium|low",
      "title": "개선 기회 제목",
      "description": "상세 설명",
      "expected_impact": "예상 개선 효과",
      "action_type": "budget_reallocation|creative_refresh|targeting_adjustment|bid_optimization|new_channel"
    }
  ]
}

규칙:
- 한국 시장 기준으로 분석
- 비용은 원(KRW) 단위
- 문제점은 심각도순 정렬 (high → medium → low)
- 벤치마크 대비 비교 시 구체적 수치 포함
- 데이터가 부족한 경우 벤치마크 기반 추정치 사용`;
}

// ---- 벤치마크 조회 ----

async function fetchBenchmarks(industry: string): Promise<BenchmarkMetric[]> {
  const { data } = await supabaseAdmin
    .from('benchmarks')
    .select('*')
    .eq('industry', industry)
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    return getDefaultBenchmarks(industry);
  }

  return data.map((b) => ({
    metric_type: b.metric_type,
    platform: b.platform as Platform,
    current_value: 0,
    benchmark_value: Number(b.value),
    percentile: 50,
    status: 'at' as const,
  }));
}

/** 벤치마크 데이터가 없을 때 업종별 기본값 */
function getDefaultBenchmarks(industry: string): BenchmarkMetric[] {
  const defaults: Record<string, Record<string, number>> = {
    ecommerce: { cpc_naver: 500, ctr_naver: 3.5, cvr_naver: 2.0, cpc_meta: 800, ctr_meta: 1.2, cvr_meta: 1.5, cpc_google: 600, ctr_google: 2.5, cvr_google: 1.8 },
    medical: { cpc_naver: 2000, ctr_naver: 4.0, cvr_naver: 3.0, cpc_meta: 1500, ctr_meta: 0.8, cvr_meta: 2.0, cpc_google: 1800, ctr_google: 3.0, cvr_google: 2.5 },
    education: { cpc_naver: 800, ctr_naver: 3.0, cvr_naver: 2.5, cpc_meta: 600, ctr_meta: 1.0, cvr_meta: 1.2, cpc_google: 700, ctr_google: 2.0, cvr_google: 1.5 },
  };

  const industryDefaults = defaults[industry] || defaults.ecommerce;
  const metrics: BenchmarkMetric[] = [];

  const platforms: { key: string; platform: Platform }[] = [
    { key: 'naver', platform: 'naver_search' },
    { key: 'meta', platform: 'meta' },
    { key: 'google', platform: 'google' },
  ];

  for (const { key, platform } of platforms) {
    for (const metricType of ['cpc', 'ctr', 'cvr']) {
      const value = industryDefaults[`${metricType}_${key}`] || 0;
      metrics.push({
        metric_type: metricType,
        platform,
        current_value: 0,
        benchmark_value: value,
        percentile: 50,
        status: 'at',
      });
    }
  }

  return metrics;
}

// ---- 벤치마크 비교 계산 ----

function compareToBenchmarks(
  metrics: CampaignMetrics[],
  benchmarks: BenchmarkMetric[],
): BenchmarkComparison {
  const comparison: BenchmarkMetric[] = [];

  // 플랫폼별 평균 계산
  const platformAverages: Record<string, { cpc: number[]; ctr: number[]; cvr: number[] }> = {};

  for (const m of metrics) {
    if (!platformAverages[m.platform]) {
      platformAverages[m.platform] = { cpc: [], ctr: [], cvr: [] };
    }
    if (m.cpc) platformAverages[m.platform].cpc.push(m.cpc);
    if (m.ctr) platformAverages[m.platform].ctr.push(m.ctr);
    if (m.cvr) platformAverages[m.platform].cvr.push(m.cvr);
  }

  for (const bm of benchmarks) {
    const avgData = platformAverages[bm.platform];
    if (!avgData) continue;

    const metricValues = avgData[bm.metric_type as keyof typeof avgData] || [];
    if (metricValues.length === 0) continue;

    const avg = metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
    const diff = avg - bm.benchmark_value;

    let status: 'above' | 'at' | 'below';
    // CPC는 낮을수록 좋고, CTR/CVR은 높을수록 좋음
    if (bm.metric_type === 'cpc') {
      status = diff < -bm.benchmark_value * 0.1 ? 'above' : diff > bm.benchmark_value * 0.1 ? 'below' : 'at';
    } else {
      status = diff > bm.benchmark_value * 0.1 ? 'above' : diff < -bm.benchmark_value * 0.1 ? 'below' : 'at';
    }

    comparison.push({
      ...bm,
      current_value: Math.round(avg * 100) / 100,
      status,
      percentile: Math.round(Math.min(100, Math.max(0, 50 + (diff / bm.benchmark_value) * 50))),
    });
  }

  return {
    industry: '',
    metrics: comparison,
  };
}

// ---- 메인 분석 실행 ----

export async function runAnalysis(config: AnalystConfig, options: {
  type: AnalysisType;
  dateRange?: { start: string; end: string };
  uploadedDataIds?: string[];
}): Promise<AnalysisReport> {
  // 1. 테넌트 정보 조회
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', config.tenantId)
    .single();

  if (!tenant) throw new Error('Tenant not found');

  const industry = tenant.industry;

  // 2. 분석 보고서 레코드 생성 (analyzing 상태)
  const inputSources: InputSource[] = [];
  const { data: report } = await supabaseAdmin
    .from('analysis_reports')
    .insert({
      tenant_id: config.tenantId,
      type: options.type,
      status: 'analyzing',
      input_sources: inputSources,
    })
    .select()
    .single();

  if (!report) throw new Error('Failed to create analysis report');

  try {
    // 3. 데이터 수집
    let metrics: CampaignMetrics[] = [];

    // API 자동 수집
    if (options.dateRange) {
      metrics = await fetchPlatformData(config.tenantId, options.dateRange);
      inputSources.push({ type: 'api_fetch', date_range: options.dateRange });
    }

    // 수동 업로드 데이터 병합
    if (options.uploadedDataIds?.length) {
      const { data: uploads } = await supabaseAdmin
        .from('uploaded_data')
        .select('parsed_data')
        .in('id', options.uploadedDataIds)
        .eq('tenant_id', config.tenantId);

      if (uploads) {
        for (const upload of uploads) {
          if (upload.parsed_data) {
            inputSources.push({ type: 'csv_upload', file_id: upload.id });
            // TODO: parsed_data를 CampaignMetrics 형태로 변환 후 병합
          }
        }
      }
    }

    // 4. 벤치마크 조회
    const benchmarks = await fetchBenchmarks(industry);
    inputSources.push({ type: 'benchmark' });

    // 5. 벤치마크 비교 계산
    const benchmarkComparison = compareToBenchmarks(metrics, benchmarks);
    benchmarkComparison.industry = industry;

    // 6. Gemini로 AI 분석 실행
    let findings: Finding[] = [];
    let opportunities: Opportunity[] = [];
    let summary = '';

    if (metrics.length > 0) {
      const analysis = await analyzeWithGemini(
        config.geminiApiKey,
        metrics,
        benchmarkComparison.metrics,
        industry,
      );
      findings = analysis.findings;
      opportunities = analysis.opportunities;
      summary = analysis.summary;
    } else {
      // 신규 고객 — 데이터 없음, 벤치마크 기반 가상 보고서
      summary = `[업종 벤치마크 기반 초기 분석] ${industry} 업종의 평균 지표를 기반으로 초기 전략을 수립합니다. 실제 광고 데이터가 축적되면 더 정확한 분석이 가능합니다.`;
      findings = [{
        severity: 'low',
        category: 'roas_underperform',
        platform: 'all',
        title: '신규 캠페인 — 데이터 없음',
        description: `현재 수집된 광고 성과 데이터가 없습니다. ${industry} 업종 벤치마크를 기반으로 초기 전략을 수립합니다.`,
        metric_current: null,
        metric_benchmark: null,
        metric_type: null,
      }];
      opportunities = [{
        priority: 'high',
        title: '테스트 캠페인 실행 권장',
        description: '소규모 예산으로 3개 플랫폼 테스트 캠페인을 실행하여 실제 데이터를 수집한 후 본격적인 전략을 수립합니다.',
        expected_impact: '1~2주 내 실제 CPC/CTR/CVR 데이터 확보',
        action_type: 'new_channel',
      }];
    }

    // 7. 분석 보고서 업데이트 (completed)
    await supabaseAdmin
      .from('analysis_reports')
      .update({
        status: 'completed',
        input_sources: inputSources,
        summary,
        findings,
        opportunities,
        benchmark_comparison: benchmarkComparison,
        raw_analysis: { metrics_count: metrics.length, benchmarks_count: benchmarks.length },
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    return {
      ...report,
      status: 'completed',
      input_sources: inputSources,
      summary,
      findings,
      opportunities,
      benchmark_comparison: benchmarkComparison,
      raw_analysis: { metrics_count: metrics.length },
    } as AnalysisReport;
  } catch (error) {
    // 실패 시 상태 업데이트
    await supabaseAdmin
      .from('analysis_reports')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', report.id);
    throw error;
  }
}
