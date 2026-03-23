'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
type Severity = 'high' | 'medium' | 'low';

interface MockReport {
  id: string;
  type: string;
  status: AnalysisStatus;
  summary: string | null;
  findings: { severity: Severity; title: string; description: string; platform: string }[];
  opportunities: { priority: Severity; title: string; description: string; action_type: string }[];
  created_at: string;
}

const severityConfig: Record<Severity, { borderColor: string; badgeColor: string; badgeText: string }> = {
  high: { borderColor: 'border-l-destructive', badgeColor: 'bg-destructive/10', badgeText: 'text-destructive' },
  medium: { borderColor: 'border-l-amber-500', badgeColor: 'bg-amber-500/10', badgeText: 'text-amber-600' },
  low: { borderColor: 'border-l-blue-500', badgeColor: 'bg-blue-500/10', badgeText: 'text-blue-600' },
};

const severityLabel: Record<Severity, string> = { high: 'CRITICAL', medium: 'WARNING', low: 'INFO' };

export default function AnalysisPage() {
  const [uploading, setUploading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reports, setReports] = useState<MockReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MockReport | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      alert(`${files[0].name} 업로드 완료. 분석을 시작하세요.`);
    }, 1500);
  };

  const handleApiCollect = async () => {
    setCollecting(true);
    setTimeout(() => setCollecting(false), 2000);
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setTimeout(() => {
      const mockReport: MockReport = {
        id: crypto.randomUUID(),
        type: 'initial',
        status: 'completed',
        summary: '메타 광고 CPC가 업종 평균 대비 40% 높으며, 네이버 브랜드 키워드 CTR이 2주 연속 하락 추세입니다. 구글 전환율은 업종 상위 30% 수준으로 양호합니다.',
        findings: [
          { severity: 'high', title: '메타 CPC 업종 평균 대비 40% 높음', description: '현재 CPC 1,120원 vs 업종 평균 800원. 타겟 범위가 너무 좁거나 소재 피로도가 원인일 수 있습니다.', platform: 'Meta' },
          { severity: 'high', title: '네이버 브랜드 KW CTR 하락 추세', description: '2주간 CTR 4.2% → 3.1%로 지속 하락. 소재 교체 또는 확장소재 추가 필요.', platform: '네이버' },
          { severity: 'medium', title: '메타 스토리 예산 비중 과소', description: '스토리 CTR이 피드 대비 2.3배이나 예산 비중 15%에 불과.', platform: 'Meta' },
          { severity: 'low', title: '구글 일부 키워드 검색량 부족', description: '3개 키워드의 월간 검색량이 100 미만.', platform: 'Google' },
        ],
        opportunities: [
          { priority: 'high', title: '메타 스토리 예산 확대', description: '스토리 예산을 15%→35%로 확대하면 전체 전환 +25% 예상', action_type: 'budget_reallocation' },
          { priority: 'high', title: '네이버 소재 교체', description: 'CTR 하락 소재를 교체하고 확장소재(가격/혜택) 추가', action_type: 'creative_refresh' },
          { priority: 'medium', title: '메타 타겟 확장', description: '유사 타겟 비율을 1%→3%로 확대하여 CPC 절감', action_type: 'targeting_adjustment' },
        ],
        created_at: new Date().toISOString(),
      };
      setReports((prev) => [mockReport, ...prev]);
      setSelectedReport(mockReport);
      setAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">데이터 분석</h2>
          <p className="text-on-surface-variant mt-1">광고 데이터를 분석하여 문제점과 개선 기회를 도출합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleApiCollect} disabled={collecting} className="px-4 py-2 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-surface-variant transition-all disabled:opacity-50">
            {collecting ? '수집 중...' : 'API 데이터 수집'}
          </button>
          <button onClick={handleRunAnalysis} disabled={analyzing} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all ambient-shadow disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">analytics</span>
            {analyzing ? '분석 중...' : '분석 실행'}
          </button>
        </div>
      </div>

      {/* 파일 업로드 */}
      <div
        className={cn(
          'bg-surface-container-lowest rounded-xl p-8 text-center ghost-border transition-all duration-200',
          dragOver ? 'ring-2 ring-primary bg-primary/5' : '',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-container-low mb-4">
          <span className="material-symbols-outlined text-2xl text-slate-400">cloud_upload</span>
        </div>
        <p className="text-on-surface font-medium">CSV 또는 엑셀 파일을 드래그하여 업로드하세요</p>
        <p className="text-sm text-on-surface-variant mt-1">광고 성과 리포트, 블로그 데이터 등</p>
        <label className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg cursor-pointer hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-sm">upload_file</span>
          파일 선택
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
        </label>
        {uploading && <p className="text-sm text-primary mt-3 flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />업로드 중...</p>}
      </div>

      {/* 분석 진행 */}
      {analyzing && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 ambient-shadow">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-bold text-on-surface">AnalystAgent 분석 진행 중...</p>
              <p className="text-sm text-on-surface-variant">성과 데이터 분석 → 벤치마크 비교 → 문제점 도출</p>
            </div>
          </div>
        </div>
      )}

      {/* 분석 보고서 */}
      {selectedReport && selectedReport.status === 'completed' && (
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

          {/* 요약 */}
          <div className="bg-surface-container-low p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">분석 요약</h4>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">{selectedReport.summary}</p>
          </div>

          {/* 문제점 */}
          <div>
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-destructive text-sm">error</span>
              문제점 ({selectedReport.findings.length}건)
            </h4>
            <div className="space-y-3">
              {selectedReport.findings.map((f, i) => {
                const config = severityConfig[f.severity];
                return (
                  <div key={i} className={cn('bg-surface-container-lowest p-5 rounded-xl ghost-border border-l-4 relative overflow-hidden', config.borderColor)}>
                    <div className={cn('absolute top-0 right-0 p-2', config.badgeColor)}>
                      <span className={cn('text-[10px] font-bold', config.badgeText)}>{severityLabel[f.severity]}</span>
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

          {/* 개선 기회 */}
          <div>
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-sm">lightbulb</span>
              개선 기회 ({selectedReport.opportunities.length}건)
            </h4>
            <div className="space-y-3">
              {selectedReport.opportunities.map((o, i) => (
                <div key={i} className="bg-surface-container-lowest p-5 rounded-xl ghost-border flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', severityConfig[o.priority].badgeColor, severityConfig[o.priority].badgeText)}>{severityLabel[o.priority]}</span>
                      <span className="text-[10px] text-on-surface-variant">{o.action_type}</span>
                    </div>
                    <h5 className="text-sm font-bold text-on-surface">{o.title}</h5>
                    <p className="text-xs text-on-surface-variant mt-1">{o.description}</p>
                  </div>
                  <button className="px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-variant transition-colors whitespace-nowrap ml-4">
                    실행
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {reports.length === 0 && !analyzing && (
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">query_stats</span>
          </div>
          <p className="text-on-surface-variant">아직 분석 보고서가 없습니다. 데이터를 업로드하거나 API로 수집한 후 분석을 실행하세요.</p>
        </div>
      )}
    </div>
  );
}
