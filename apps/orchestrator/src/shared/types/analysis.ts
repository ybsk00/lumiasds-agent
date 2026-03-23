import type { Platform } from './strategy';

export interface AnalysisReport {
  id: string;
  tenant_id: string;
  type: AnalysisType;
  status: AnalysisStatus;
  input_sources: InputSource[];
  summary: string | null;
  findings: Finding[];
  opportunities: Opportunity[];
  benchmark_comparison: BenchmarkComparison | null;
  raw_analysis: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type AnalysisType = 'initial' | 'periodic' | 'triggered';
export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface InputSource {
  type: 'api_fetch' | 'csv_upload' | 'excel_upload' | 'benchmark';
  platform?: Platform;
  file_id?: string;
  date_range?: { start: string; end: string };
}

export interface Finding {
  severity: 'high' | 'medium' | 'low';
  category: FindingCategory;
  platform: Platform | 'all';
  title: string;
  description: string;
  metric_current: number | null;
  metric_benchmark: number | null;
  metric_type: string | null;
}

export type FindingCategory =
  | 'cost_efficiency'
  | 'creative_fatigue'
  | 'audience_saturation'
  | 'budget_pacing'
  | 'conversion_decline'
  | 'cpc_spike'
  | 'ctr_decline'
  | 'roas_underperform';

export interface Opportunity {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expected_impact: string;
  action_type: 'budget_reallocation' | 'creative_refresh' | 'targeting_adjustment' | 'bid_optimization' | 'new_channel';
}

export interface BenchmarkComparison {
  industry: string;
  metrics: BenchmarkMetric[];
}

export interface BenchmarkMetric {
  metric_type: string;
  platform: Platform;
  current_value: number;
  benchmark_value: number;
  percentile: number;
  status: 'above' | 'at' | 'below';
}

export interface UploadedData {
  id: string;
  tenant_id: string;
  file_name: string;
  file_type: 'csv' | 'xlsx' | 'json';
  file_url: string;
  parsed_data: Record<string, unknown> | null;
  column_mapping: Record<string, string> | null;
  row_count: number | null;
  status: 'uploaded' | 'parsed' | 'failed';
  created_at: string;
}

export interface Benchmark {
  id: string;
  industry: string;
  platform: Platform;
  metric_type: string;
  value: number;
  period: string;
  source: string | null;
  created_at: string;
}
