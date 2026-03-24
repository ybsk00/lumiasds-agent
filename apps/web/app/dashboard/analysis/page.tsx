'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const TENANT_ID = 'd944536d-76c4-4812-857b-e157912d775d';

type AnalysisMode = 'new' | 'existing';
type Severity = 'high' | 'medium' | 'low';

interface Finding {
  severity: Severity;
  title: string;
  description: string;
  platform: string;
}

interface Opportunity {
  priority: Severity;
  title: string;
  description: string;
  action_type: string;
}

interface AnalysisReport {
  id: string;
  type: string;
  status: string;
  summary: string | null;
  findings: Finding[];
  opportunities: Opportunity[];
  created_at: string;
}

interface NewAdForm {
  companyName: string;
  industry: string;
  mainProduct: string;
  keywords: string;
  websiteUrl: string;
  monthlyBudget: string;
}

interface ExistingAdForm {
  platforms: string[];
  startDate: string;
  endDate: string;
}

const severityConfig: Record<Severity, { borderColor: string; badgeColor: string; badgeText: string }> = {
  high: { borderColor: 'border-l-destructive', badgeColor: 'bg-destructive/10', badgeText: 'text-destructive' },
  medium: { borderColor: 'border-l-amber-500', badgeColor: 'bg-amber-500/10', badgeText: 'text-amber-600' },
  low: { borderColor: 'border-l-blue-500', badgeColor: 'bg-blue-500/10', badgeText: 'text-blue-600' },
};

const severityLabel: Record<Severity, string> = { high: 'CRITICAL', medium: 'WARNING', low: 'INFO' };

const INDUSTRIES = [
  '병원/의료',
  '법률',
  '이커머스/쇼핑몰',
  '교육',
  '뷰티/화장품',
  '음식/외식',
  'IT/테크',
  '부동산',
  '기타',
];

const PLATFORMS = [
  { id: 'naver', label: '네이버 검색광고', icon: 'search' },
  { id: 'meta', label: '메타(Facebook/Instagram)', icon: 'share' },
  { id: 'google', label: '구글 Ads', icon: 'ads_click' },
];

const PROGRESS_STEPS_NEW = [
  '키워드 검색량 조회 중...',
  '블로그 노출도 분석 중...',
  '경쟁 분석 중...',
  'AI 분석 보고서 생성 중...',
];

const PROGRESS_STEPS_EXISTING = [
  '플랫폼 데이터 수집 중...',
  '성과 지표 분석 중...',
  '벤치마크 비교 중...',
  'AI 분석 보고서 생성 중...',
];

export default function AnalysisPage() {
  const [mode, setMode] = useState<AnalysisMode>('new');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [pastReports, setPastReports] = useState<AnalysisReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // New ad form
  const [newForm, setNewForm] = useState<NewAdForm>({
    companyName: '',
    industry: '',
    mainProduct: '',
    keywords: '',
    websiteUrl: '',
    monthlyBudget: '',
  });

  // Existing ad form
  const [existingForm, setExistingForm] = useState<ExistingAdForm>({
    platforms: [],
    startDate: '',
    endDate: '',
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch past reports on mount
  useEffect(() => {
    fetchPastReports();
  }, []);

  const fetchPastReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/analysis/reports', {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      if (res.ok) {
        const data = await res.json();
        setPastReports(Array.isArray(data) ? data : data.reports ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingReports(false);
    }
  };

  const startProgressAnimation = (steps: string[]) => {
    setProgressStep(0);
    let step = 0;
    progressIntervalRef.current = setInterval(() => {
      step++;
      if (step < steps.length) {
        setProgressStep(step);
      } else {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 3000);
  };

  const stopProgressAnimation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleNewAnalysis = async () => {
    if (!newForm.companyName.trim() || !newForm.mainProduct.trim() || !newForm.keywords.trim()) {
      setError('업체명, 주요 상품/서비스, 주요 키워드는 필수 입력입니다.');
      return;
    }
    setError(null);
    setLoading(true);
    startProgressAnimation(PROGRESS_STEPS_NEW);

    try {
      const res = await fetch('/api/analysis/market-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({
          companyName: newForm.companyName.trim(),
          industry: newForm.industry || '기타',
          mainProduct: newForm.mainProduct.trim(),
          keywords: newForm.keywords.split(',').map((k) => k.trim()).filter(Boolean),
          websiteUrl: newForm.websiteUrl.trim() || undefined,
          monthlyBudget: newForm.monthlyBudget.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `서버 오류 (${res.status})`);
      }

      const report: AnalysisReport = await res.json();
      setSelectedReport(report);
      setPastReports((prev) => [report, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      stopProgressAnimation();
      setLoading(false);
    }
  };

  const handleExistingAnalysis = async () => {
    if (existingForm.platforms.length === 0) {
      setError('최소 하나의 플랫폼을 선택해주세요.');
      return;
    }
    if (!existingForm.startDate || !existingForm.endDate) {
      setError('분석 기간을 설정해주세요.');
      return;
    }
    setError(null);
    setLoading(true);
    startProgressAnimation(PROGRESS_STEPS_EXISTING);

    try {
      const formData = new FormData();
      formData.append('platforms', JSON.stringify(existingForm.platforms));
      formData.append('dateRange', JSON.stringify({ start: existingForm.startDate, end: existingForm.endDate }));
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      const res = await fetch('/api/analysis/collect', {
        method: 'POST',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `서버 오류 (${res.status})`);
      }

      const report: AnalysisReport = await res.json();
      setSelectedReport(report);
      setPastReports((prev) => [report, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      stopProgressAnimation();
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setExistingForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files?.length) return;
    setUploadedFile(files[0]);
  };

  const progressSteps = mode === 'new' ? PROGRESS_STEPS_NEW : PROGRESS_STEPS_EXISTING;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-on-surface">데이터 분석</h2>
        <p className="text-on-surface-variant mt-1">광고 데이터를 분석하여 문제점과 개선 기회를 도출합니다</p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => { setMode('new'); setError(null); }}
          className={cn(
            'bg-surface-container-lowest rounded-xl p-6 text-left transition-all duration-200 ghost-border',
            mode === 'new'
              ? 'ring-2 ring-primary border-primary'
              : 'hover:bg-surface-container-low',
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              mode === 'new' ? 'bg-primary/10' : 'bg-surface-container-low',
            )}>
              <span className={cn(
                'material-symbols-outlined text-2xl',
                mode === 'new' ? 'text-primary' : 'text-on-surface-variant',
              )}>explore</span>
            </div>
            <div>
              <h3 className={cn(
                'font-bold text-base',
                mode === 'new' ? 'text-primary' : 'text-on-surface',
              )}>신규 광고 분석</h3>
              <p className="text-sm text-on-surface-variant mt-1">새로운 시장 진입을 위한 키워드 &middot; 경쟁 분석</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => { setMode('existing'); setError(null); }}
          className={cn(
            'bg-surface-container-lowest rounded-xl p-6 text-left transition-all duration-200 ghost-border',
            mode === 'existing'
              ? 'ring-2 ring-primary border-primary'
              : 'hover:bg-surface-container-low',
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              mode === 'existing' ? 'bg-primary/10' : 'bg-surface-container-low',
            )}>
              <span className={cn(
                'material-symbols-outlined text-2xl',
                mode === 'existing' ? 'text-primary' : 'text-on-surface-variant',
              )}>monitoring</span>
            </div>
            <div>
              <h3 className={cn(
                'font-bold text-base',
                mode === 'existing' ? 'text-primary' : 'text-on-surface',
              )}>기존 광고 분석</h3>
              <p className="text-sm text-on-surface-variant mt-1">운영 중인 광고의 성과 분석 및 개선점 도출</p>
            </div>
          </div>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-destructive text-sm">error</span>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Mode 1: New Ad Analysis Form */}
      {mode === 'new' && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow space-y-5">
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">edit_note</span>
            신규 광고 분석 정보 입력
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                업체/브랜드명 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newForm.companyName}
                onChange={(e) => setNewForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="예: 루미브리즈"
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                업종 선택
              </label>
              <select
                value={newForm.industry}
                onChange={(e) => setNewForm((f) => ({ ...f, industry: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              >
                <option value="">업종을 선택하세요</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Main Product */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                주요 상품/서비스 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newForm.mainProduct}
                onChange={(e) => setNewForm((f) => ({ ...f, mainProduct: e.target.value }))}
                placeholder="예: 피부과 레이저 시술"
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                주요 키워드 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newForm.keywords}
                onChange={(e) => setNewForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="쉼표로 구분: 피부과, 레이저, 여드름치료"
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                웹사이트 URL
              </label>
              <input
                type="url"
                value={newForm.websiteUrl}
                onChange={(e) => setNewForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            {/* Monthly Budget */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                월 예상 광고비
              </label>
              <input
                type="text"
                value={newForm.monthlyBudget}
                onChange={(e) => setNewForm((f) => ({ ...f, monthlyBudget: e.target.value }))}
                placeholder="예: 500만원"
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNewAnalysis}
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              {loading ? '분석 중...' : '분석 시작'}
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Existing Ad Analysis Form */}
      {mode === 'existing' && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow space-y-6">
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">tune</span>
            기존 광고 분석 설정
          </h3>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-3">
              분석 플랫폼 선택 <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLATFORMS.map((platform) => {
                const selected = existingForm.platforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl ghost-border transition-all duration-200 text-left',
                      selected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'bg-surface-container-low hover:bg-surface-variant',
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                      selected ? 'bg-primary border-primary' : 'border-on-surface-variant/30',
                    )}>
                      {selected && (
                        <span className="material-symbols-outlined text-white text-xs">check</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'material-symbols-outlined text-lg',
                        selected ? 'text-primary' : 'text-on-surface-variant',
                      )}>{platform.icon}</span>
                      <span className={cn(
                        'text-sm font-medium',
                        selected ? 'text-primary' : 'text-on-surface',
                      )}>{platform.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-3">
              분석 기간 <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={existingForm.startDate}
                onChange={(e) => setExistingForm((f) => ({ ...f, startDate: e.target.value }))}
                className="flex-1 px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
              <span className="text-on-surface-variant text-sm">~</span>
              <input
                type="date"
                value={existingForm.endDate}
                onChange={(e) => setExistingForm((f) => ({ ...f, endDate: e.target.value }))}
                className="flex-1 px-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface ghost-border focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-3">
              추가 데이터 업로드 (선택)
            </label>
            <div
              className={cn(
                'rounded-xl p-6 text-center ghost-border transition-all duration-200 bg-surface-container-low',
                dragOver ? 'ring-2 ring-primary bg-primary/5' : '',
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
            >
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <span className="text-sm text-on-surface font-medium">{uploadedFile.name}</span>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-on-surface-variant hover:text-destructive transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-lowest mb-3">
                    <span className="material-symbols-outlined text-xl text-on-surface-variant">cloud_upload</span>
                  </div>
                  <p className="text-sm text-on-surface font-medium">CSV 또는 엑셀 파일을 드래그하거나 선택하세요</p>
                  <p className="text-xs text-on-surface-variant mt-1">광고 성과 리포트, 키워드 데이터 등</p>
                  <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-xs font-medium rounded-lg cursor-pointer hover:bg-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-xs">upload_file</span>
                    파일 선택
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleExistingAnalysis}
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              {loading ? '분석 중...' : '데이터 수집 + 분석'}
            </button>
          </div>
        </div>
      )}

      {/* Loading / Progress */}
      {loading && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-bold text-on-surface">AnalystAgent 분석 진행 중...</p>
              <p className="text-sm text-on-surface-variant">잠시만 기다려주세요. 분석에 1~2분이 소요될 수 있습니다.</p>
            </div>
          </div>
          <div className="space-y-2 pl-14">
            {progressSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i < progressStep ? (
                  <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                ) : i === progressStep ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-on-surface-variant/20" />
                )}
                <span className={cn(
                  'text-sm',
                  i < progressStep ? 'text-on-surface-variant line-through' : i === progressStep ? 'text-primary font-medium' : 'text-on-surface-variant/50',
                )}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Report Display */}
      {selectedReport && selectedReport.status === 'completed' && !loading && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">description</span>
              분석 보고서
            </h3>
            <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow">
              <span className="material-symbols-outlined text-sm">forum</span>
              이 분석으로 전략 회의 시작
            </button>
          </div>

          {/* Summary */}
          {selectedReport.summary && (
            <div className="bg-surface-container-low p-6 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">분석 요약</h4>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">{selectedReport.summary}</p>
            </div>
          )}

          {/* Findings */}
          {selectedReport.findings?.length > 0 && (
            <div>
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-destructive text-sm">error</span>
                문제점 ({selectedReport.findings.length}건)
              </h4>
              <div className="space-y-3">
                {selectedReport.findings.map((f, i) => {
                  const config = severityConfig[f.severity] ?? severityConfig.low;
                  return (
                    <div key={i} className={cn('bg-surface-container-lowest p-5 rounded-xl ghost-border border-l-4 relative overflow-hidden', config.borderColor)}>
                      <div className={cn('absolute top-0 right-0 p-2', config.badgeColor)}>
                        <span className={cn('text-[10px] font-bold', config.badgeText)}>{severityLabel[f.severity] ?? 'INFO'}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-on-surface-variant font-medium">{f.platform}</span>
                      </div>
                      <h5 className="text-sm font-bold text-on-surface">{f.title}</h5>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {selectedReport.opportunities?.length > 0 && (
            <div>
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-sm">lightbulb</span>
                개선 기회 ({selectedReport.opportunities.length}건)
              </h4>
              <div className="space-y-3">
                {selectedReport.opportunities.map((o, i) => {
                  const config = severityConfig[o.priority] ?? severityConfig.low;
                  return (
                    <div key={i} className="bg-surface-container-lowest p-5 rounded-xl ghost-border flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', config.badgeColor, config.badgeText)}>{severityLabel[o.priority] ?? 'INFO'}</span>
                          <span className="text-[10px] text-on-surface-variant">{o.action_type}</span>
                        </div>
                        <h5 className="text-sm font-bold text-on-surface">{o.title}</h5>
                        <p className="text-xs text-on-surface-variant mt-1">{o.description}</p>
                      </div>
                      <button className="px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-variant transition-colors whitespace-nowrap ml-4">
                        실행
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past Reports */}
      {!loading && (
        <div>
          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">history</span>
            이전 분석 보고서
          </h3>
          {loadingReports ? (
            <div className="bg-surface-container-lowest rounded-xl ghost-border p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant">보고서 목록 불러오는 중...</p>
            </div>
          ) : pastReports.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-4">
                <span className="material-symbols-outlined text-3xl text-slate-400">query_stats</span>
              </div>
              <p className="text-on-surface-variant">아직 분석 보고서가 없습니다.</p>
              <p className="text-sm text-on-surface-variant mt-1">위에서 분석 모드를 선택하고 분석을 실행해보세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={cn(
                    'w-full text-left bg-surface-container-lowest rounded-xl ghost-border p-4 flex items-center justify-between transition-all hover:bg-surface-container-low',
                    selectedReport?.id === report.id ? 'ring-2 ring-primary' : '',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'material-symbols-outlined text-lg',
                      report.status === 'completed' ? 'text-emerald-500' : report.status === 'failed' ? 'text-destructive' : 'text-amber-500',
                    )}>
                      {report.status === 'completed' ? 'check_circle' : report.status === 'failed' ? 'cancel' : 'pending'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {report.type === 'market-research' ? '신규 광고 분석' : report.type === 'existing-analysis' ? '기존 광고 분석' : report.type ?? '분석 보고서'}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(report.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    {report.findings && <span>{report.findings.length}건 발견</span>}
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
