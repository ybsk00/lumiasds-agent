# LumiAds — AI 마케팅 자동화 오케스트레이터

## 프로젝트 개요
네이버+메타+구글 3대 광고 플랫폼을 API로 자동화하는 SaaS. 4개 AI 에이전트(전략가/도전자/중재자/검증자) 디베이트로 최적 전략 도출 → 사람 승인 → 자동 광고 등록 → 효율 측정 → 미달 시 재분석·재토론 (폐쇄 루프).

## 기술 스택
- **Monorepo**: Turborepo
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + Material 3 디자인 시스템
- **Backend**: Hono → Next.js Route Handler로 통합 (`/api/[...path]/route.ts`)
- **DB**: Supabase (PostgreSQL + pgvector) — 멀티테넌트 (tenant_id + RLS)
- **AI**: Gemini 2.5 Flash/Pro (전략가+검증자+분석), Claude Sonnet 4 (도전자), GPT-4o (중재자)
- **Image Gen**: Gemini Imagen
- **Ad Platforms**: 네이버 검색광고 API, Meta Marketing API, Google Ads API
- **배포**: Vercel (웹+API 통합, Pro 플랜 60초 Function)
- **Git**: https://github.com/ybsk00/lumiasds-agent

## 프로젝트 구조
```
lumiads/
├── apps/web/                    # Next.js 15 (프론트엔드 + API)
│   ├── app/(landing)/page.tsx   # 랜딩(인덱스) 페이지 — 인증 불필요
│   ├── app/(auth)/login/        # 로그인 페이지
│   ├── app/dashboard/           # 대시보드 (인증 필요)
│   │   ├── page.tsx             # 대시보드 홈
│   │   ├── analysis/            # 데이터 분석
│   │   ├── strategy/            # 전략 수립 (AI 디베이트)
│   │   ├── creative/            # 소재 관리
│   │   ├── campaigns/           # 캠페인 관리
│   │   ├── reports/             # 통합 리포트
│   │   ├── approvals/           # 승인 대기
│   │   └── settings/            # 설정 (API키 + 테넌트)
│   └── app/api/[...path]/       # Hono 백엔드 API (통합)
├── apps/orchestrator/           # Hono 원본 (참조용, 배포는 web에 통합)
├── packages/shared/             # 공통 타입/상수
└── packages/supabase/           # DB 마이그레이션 (001~003)
```

## 라우트 구조
- `/` — 랜딩 페이지 (공개)
- `/login` — 로그인 (공개)
- `/dashboard/*` — 대시보드 (인증 필요, middleware에서 체크)
- `/api/*` — 백엔드 API (Hono, 자체 인증)

## DB 테이블 (15개)
tenants, profiles, campaigns, ad_groups, creatives, campaign_metrics, strategies, debate_logs, analysis_reports, uploaded_data, task_logs, tenant_usage, benchmarks, telegram_sessions, telegram_notifications

## 핵심 원칙
1. **Web First** — 모든 기능은 웹에서 완결. 텔레그램은 보조 알림.
2. **분석 먼저, 디베이트 다음** — AnalystAgent가 문제점 도출 후 디베이트 진행.
3. **멀티테넌트** — 모든 테이블에 tenant_id, RLS 적용. 납품형 구조.
4. **Human-in-the-Loop** — 전략/수정 제안은 사람 승인 후 실행.
5. **API First** — 3대 플랫폼 모두 공식 API.
6. **키 보안** — 모든 API 키는 Vercel 환경변수 + .env.local로만 관리. 절대 코드에 하드코딩 금지.

## 주요 명령어
```bash
npm run dev          # 전체 dev 서버 (turbo)
npm run build        # 전체 빌드
```

## 환경변수
`.env.example` 참고. Vercel 환경변수에 등록됨:
- Supabase (URL, Anon Key, Service Role Key)
- Google AI (Gemini) — 전략가+검증자+분석
- Anthropic (Claude) — 도전자
- 네이버 검색광고 (API Key, Secret, Customer ID)
- Meta Marketing (Access Token, Account ID, App ID, Business ID, Page ID)
- ⏳ OpenAI (GPT-4o) — 미등록
- Google Ads (Developer Token, Client ID, Client Secret, Refresh Token, Customer ID) — Basic Access 승인 완료
- ⏳ Meta App Secret — 미입력

## 디자인 시스템
Material 3 "Editorial Intelligence" 컨셉:
- Primary: #0058be, Tonal palette (surface 계층)
- Pretendard + Inter 폰트, Material Symbols Outlined 아이콘
- Ghost border, ambient shadow, glass-panel 유틸리티
- 디자인 참고: `루미에즈디자인/` 폴더 (통합, 캠페인관리, 승인대기, 설정, 테넌트, 디베이트 모달, 인덱스)
