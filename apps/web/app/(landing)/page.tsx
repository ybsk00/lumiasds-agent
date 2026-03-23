import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-surface text-on-surface">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/50 shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <div className="text-2xl font-bold text-slate-900 tracking-tighter">LumiAds</div>
          <div className="hidden md:flex items-center space-x-8">
            <a className="text-blue-600 font-semibold border-b-2 border-blue-600" href="#features">기능</a>
            <a className="text-slate-600 hover:text-slate-900 transition-colors" href="#debate">AI 에이전트</a>
            <a className="text-slate-600 hover:text-slate-900 transition-colors" href="#optimization">자동화</a>
            <a className="text-slate-600 hover:text-slate-900 transition-colors" href="#cta">문의</a>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-primary transition-all">
              로그인
            </Link>
            <Link href="/login" className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all">
              무료 시작하기
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-surface pt-20 pb-32">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 rounded-full">
                AI Advertising Revolution
              </span>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-on-surface leading-[1.15] mb-8">
                AI 에이전트들의<br />끝없는 토론,<br />
                <span className="text-primary">최적의 광고 전략</span>을 낳다
              </h1>
              <p className="text-xl text-on-surface-variant leading-relaxed mb-10 max-w-lg">
                4개의 서로 다른 AI가 실시간으로 토론하여 당신의 비즈니스를 위한 최상의 퍼포먼스를 도출합니다.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/login" className="px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2">
                  무료로 시작하기
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <a href="#debate" className="px-8 py-4 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-variant transition-all">
                  데모 보기
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
              <div className="relative glass-panel border border-white/40 p-4 rounded-2xl shadow-2xl">
                {/* Dashboard Preview */}
                <div className="bg-slate-900 rounded-xl p-6 text-white min-h-[320px]">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-slate-400 ml-2">LumiAds Dashboard</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1">ROAS</p>
                      <p className="text-lg font-bold text-emerald-400">420%</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1">CTR</p>
                      <p className="text-lg font-bold text-blue-400">2.84%</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1">Conversions</p>
                      <p className="text-lg font-bold text-purple-400">3,241</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {[60, 45, 75, 95, 80, 65, 55].map((h, i) => (
                      <div key={i} className="flex-1 bg-blue-500/30 rounded-t" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
                {/* Floating Badge */}
                <div className="absolute top-8 right-8 bg-white p-3 rounded-lg shadow-lg flex items-center gap-3 animate-bounce">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-slate-800 tracking-tight">검증자 에이전트 승인 완료</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 1: Data Analysis */}
        <section id="features" className="py-24 bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="flex-1">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                </div>
                <h2 className="text-3xl font-bold mb-6">데이터 분석의 새로운 기준</h2>
                <p className="text-lg text-on-surface-variant mb-8 leading-relaxed">
                  3대 주요 플랫폼(네이버, Meta, Google)의 데이터를 통합 수집하고 AI가 심층 분석합니다. 흩어진 데이터를 한곳에서 확인하고 숨겨진 인사이트를 발견하세요.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span className="text-on-surface font-medium">실시간 API 연동 및 데이터 동기화</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span className="text-on-surface font-medium">고객 세그먼트별 구매 패턴 분석</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span className="text-on-surface font-medium">업종별 벤치마크 자동 비교</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-6 rounded-2xl h-48 flex flex-col justify-end">
                  <div className="text-primary font-black text-4xl mb-2">+245%</div>
                  <div className="text-sm font-bold text-on-surface-variant">평균 ROAS 개선율</div>
                </div>
                <div className="bg-primary p-6 rounded-2xl h-64 text-white">
                  <span className="material-symbols-outlined text-4xl mb-4">hub</span>
                  <div className="text-xl font-bold mb-2">통합 대시보드</div>
                  <p className="text-sm opacity-80 leading-snug">모든 플랫폼의 성과를 실시간으로 비교 분석합니다.</p>
                </div>
                <div className="col-span-2 bg-slate-900 p-6 rounded-2xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Weekly Insight</div>
                      <div className="text-lg font-bold">"20대 여성 타겟의 효율이 15% 상승했습니다."</div>
                    </div>
                    <span className="material-symbols-outlined text-blue-400">auto_awesome</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 2: AI Debate */}
        <section id="debate" className="py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold mb-4">AI 전략 회의 (Debate System)</h2>
              <p className="text-on-surface-variant text-lg">단 하나의 AI가 아닌, 4개의 전문 에이전트가 협업합니다.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Strategist */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border-t-4 border-primary shadow-sm hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                  </div>
                  <span className="text-xl font-bold">전략가</span>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  시장 트렌드와 과거 데이터를 분석하여 초기 광고 캠페인 가이드를 수립합니다.
                </p>
                <div className="bg-surface-container-low p-3 rounded-lg text-xs font-mono text-primary">
                  #데이터기반 #방향성설계
                </div>
              </div>
              {/* Challenger */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border-t-4 border-destructive shadow-sm hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-destructive">gavel</span>
                  </div>
                  <span className="text-xl font-bold">도전자</span>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  전략의 허점을 찾고 예상되는 리스크를 제시하여 최악의 시나리오를 방지합니다.
                </p>
                <div className="bg-surface-container-low p-3 rounded-lg text-xs font-mono text-destructive">
                  #리스크검토 #비판적사고
                </div>
              </div>
              {/* Mediator */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border-t-4 border-secondary shadow-sm hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">balance</span>
                  </div>
                  <span className="text-xl font-bold">중재자</span>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  상충되는 의견을 조율하고 가장 효율적인 합의안을 도출하여 균형을 맞춥니다.
                </p>
                <div className="bg-surface-container-low p-3 rounded-lg text-xs font-mono text-secondary">
                  #의사결정 #최적합의
                </div>
              </div>
              {/* Verifier */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border-t-4 border-emerald-600 shadow-sm hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                  </div>
                  <span className="text-xl font-bold">검증자</span>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  최종 전략이 플랫폼 정책 및 광고 가이드를 준수하는지 꼼꼼하게 검증합니다.
                </p>
                <div className="bg-surface-container-low p-3 rounded-lg text-xs font-mono text-emerald-700">
                  #정책준수 #최종승인
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 3: Campaign Management */}
        <section id="optimization" className="py-24 bg-surface-container-lowest overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                  <div className="bg-surface-container-low rounded-xl p-6 min-h-[300px]">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-primary">campaign</span>
                      <span className="font-bold">캠페인 성과 추이</span>
                    </div>
                    <div className="space-y-4">
                      {[
                        { platform: '네이버', badge: 'N', color: 'bg-green-500', roas: '382%', spend: '₩4.2M' },
                        { platform: 'Meta', badge: 'M', color: 'bg-blue-600', roas: '510%', spend: '₩5.1M' },
                        { platform: 'Google', badge: 'G', color: 'bg-red-500', roas: '295%', spend: '₩3.1M' },
                      ].map((p) => (
                        <div key={p.platform} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${p.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>{p.badge}</div>
                            <span className="text-sm font-semibold">{p.platform}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-500">{p.spend}</span>
                            <span className="text-sm font-bold text-primary">{p.roas}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -z-10 -top-10 -left-10 w-full h-full border-2 border-dashed border-primary/20 rounded-2xl"></div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl font-bold mb-6">성과 기반 자동 최적화</h2>
                <p className="text-lg text-on-surface-variant mb-10 leading-relaxed">
                  더 이상 밤새 광고 성과를 모니터링할 필요가 없습니다. LumiAds AI가 성과를 실시간으로 추적하고 예산 배분부터 소재 교체까지 자동으로 실행합니다.
                </p>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">스마트 예산 스케줄링</h4>
                      <p className="text-on-surface-variant text-sm">성과가 좋은 시간대와 타겟에 예산을 자동으로 집중 투입합니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">auto_fix_high</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">AI 소재 크리에이터</h4>
                      <p className="text-on-surface-variant text-sm">토론 결과를 바탕으로 광고 문구와 이미지를 자동 생성 및 변형합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="bg-primary p-12 lg:p-16 rounded-[2rem] text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-20 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 relative z-10">지금 바로 AI 마케팅 팀을 고용하세요</h2>
              <p className="text-lg opacity-90 mb-10 relative z-10">첫 14일간 모든 기능을 무료로 체험해보실 수 있습니다.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <Link href="/login" className="px-10 py-4 bg-white text-primary font-black rounded-xl hover:bg-surface-bright transition-all">
                  무료로 시작하기
                </Link>
                <button className="px-10 py-4 border border-white/40 text-white font-bold rounded-xl hover:bg-white/10 transition-all">
                  도입 문의하기
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 w-full py-12 border-t border-slate-200 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="text-xl font-black text-slate-900 mb-4">LumiAds</div>
            <p className="mb-4 max-w-xs leading-relaxed">AI 에이전트 협업 시스템 기반의 차세대 퍼포먼스 마케팅 플랫폼</p>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 mb-4">제품</h5>
            <ul className="space-y-2">
              <li><a className="hover:text-blue-500 transition-colors" href="#features">주요 기능</a></li>
              <li><a className="hover:text-blue-500 transition-colors" href="#debate">AI 에이전트</a></li>
              <li><a className="hover:text-blue-500 transition-colors" href="#cta">요금제</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 mb-4">고객지원</h5>
            <ul className="space-y-2">
              <li><a className="hover:text-blue-500 transition-colors" href="#">헬프 센터</a></li>
              <li><a className="hover:text-blue-500 transition-colors" href="#">블로그</a></li>
              <li><a className="hover:text-blue-500 transition-colors" href="#">문의하기</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 mb-4">법적 고지</h5>
            <ul className="space-y-2">
              <li><a className="hover:text-blue-500 transition-colors" href="#">개인정보처리방침</a></li>
              <li><a className="hover:text-blue-500 transition-colors" href="#">이용약관</a></li>
              <li><a className="hover:text-blue-500 transition-colors" href="#">데이터 보안</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>&copy; 2026 LumiAds. 모든 권리 보유.</div>
          <div className="flex gap-6">
            <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">language</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">share</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
