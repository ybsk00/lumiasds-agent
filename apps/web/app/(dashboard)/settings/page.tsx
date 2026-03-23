'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async (section: string) => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="space-y-8">
      <header className="mb-2">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">API 키 관리</h2>
        <p className="text-on-surface-variant text-sm mt-1 max-w-2xl leading-relaxed">
          AI 엔진 및 주요 광고 플랫폼의 API를 연결하여 LumiAds의 자동화 기능을 활성화하세요. 모든 키는 안전하게 암호화되어 관리됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* AI 엔진 설정 */}
        <section className="md:col-span-5 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">psychology</span>
            <h3 className="text-lg font-bold tracking-tight">AI 엔진 설정</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border flex flex-col gap-6 ambient-shadow">
            {[
              { name: 'Google Gemini', connected: true, placeholder: 'API Key 입력' },
              { name: 'Anthropic Claude', connected: false, placeholder: 'sk-ant-api03-...' },
              { name: 'OpenAI GPT-4o', connected: true, placeholder: 'sk-...' },
            ].map((engine) => (
              <div key={engine.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-on-surface">{engine.name}</label>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${engine.connected ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    {engine.connected ? '연결됨' : '미연결'}
                  </span>
                </div>
                <input
                  className="w-full px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder={engine.placeholder}
                  type="password"
                  defaultValue={engine.connected ? '••••••••••••••••' : ''}
                />
              </div>
            ))}
            <button
              onClick={() => handleSave('ai')}
              className="mt-2 w-full py-3 bg-primary-container text-white font-bold text-sm rounded-lg hover:brightness-110 transition-all ambient-shadow"
            >
              AI 엔진 정보 저장
            </button>
          </div>
        </section>

        {/* 광고 플랫폼 연동 */}
        <section className="md:col-span-7 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">ads_click</span>
            <h3 className="text-lg font-bold tracking-tight">광고 플랫폼 연동</h3>
          </div>
          <div className="space-y-4">
            {/* 네이버 */}
            <div className="bg-surface-container-lowest p-8 rounded-xl ghost-border border-t-4 border-t-green-500 ambient-shadow">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-lg">N</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">네이버 검색광고</h4>
                    <p className="text-[11px] text-on-surface-variant font-medium">Search & Performance Advertising</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">연결 테스트</button>
                  <button onClick={() => handleSave('naver')} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all">저장</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">API Key</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="API 액세스 키" type="text" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Secret Key</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="••••••••" type="password" />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Customer ID</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="광고주 계정 ID" type="text" />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="bg-surface-container-lowest p-8 rounded-xl ghost-border border-t-4 border-t-blue-600 ambient-shadow">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">M</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Meta 광고 (Facebook/Instagram)</h4>
                    <p className="text-[11px] text-on-surface-variant font-medium">Social Performance Marketing</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">연결 테스트</button>
                  <button onClick={() => handleSave('meta')} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all">저장</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Access Token</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="EAAI..." type="password" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Ad Account ID</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="act_..." type="text" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">App Secret</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="••••••••" type="password" />
                </div>
              </div>
            </div>

            {/* Google Ads */}
            <div className="bg-surface-container-lowest p-8 rounded-xl ghost-border border-t-4 border-t-amber-400 ambient-shadow">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-lg">G</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Google Ads</h4>
                    <p className="text-[11px] text-on-surface-variant font-medium">Search & Display Marketing</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">연결 테스트</button>
                  <button onClick={() => handleSave('google')} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all">저장</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Developer Token</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Dev Token" type="text" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Client ID</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="OAuth Client ID" type="text" />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">Refresh Token</label>
                  <input className="px-4 py-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="1//..." type="password" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-surface-variant flex items-center justify-between text-on-surface-variant text-[11px]">
        <div className="flex gap-6">
          <span className="hover:text-primary transition-colors cursor-pointer">개인정보처리방침</span>
          <span className="hover:text-primary transition-colors cursor-pointer">이용약관</span>
          <span className="hover:text-primary transition-colors cursor-pointer">API 가이드</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <span>상기 정보는 AES-256 방식으로 암호화되어 안전하게 보관됩니다.</span>
        </div>
      </footer>
    </div>
  );
}
