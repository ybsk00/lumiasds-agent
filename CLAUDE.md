# LumiAds — AI 마케팅 자동화 오케스트레이터

## 프로젝트 개요
네이버+메타+구글 3대 광고 플랫폼을 API로 자동화하는 SaaS. 4개 AI 에이전트(전략가/도전자/중재자/검증자) 디베이트로 최적 전략 도출 → 사람 승인 → 자동 광고 등록 → 효율 측정 → 미달 시 재분석·재토론 (폐쇄 루프).

## 기술 스택
- **Monorepo**: Turborepo
- **Frontend**: Next.js 15 (App Router) + shadcn/ui + Tailwind CSS
- **Backend**: Hono (Node.js/TypeScript) on Cloud Run
- **DB**: Supabase (PostgreSQL + pgvector) — 멀티테넌트 (tenant_id + RLS)
- **AI**: Gemini 2.5 Flash/Pro, Claude Sonnet 4, GPT-4o
- **Image Gen**: Gemini Imagen (Nano Banana 2/Pro)
- **Ad Platforms**: 네이버 검색광고 API, Meta Marketing API, Google Ads API

## 프로젝트 구조
```
lumiads/
├── apps/web/              # Next.js 15 (메인 인터페이스)
├── apps/orchestrator/     # Hono 백엔드 (Cloud Run)
│   ├── src/agents/        # AnalystAgent, CreativeAgent, CampaignAgent, ReportAgent
│   ├── src/debate/        # 4개 AI 에이전트 디베이트 엔진
│   ├── src/platforms/     # 네이버/메타/구글 API 클라이언트
│   ├── src/orchestrator/  # optimization-loop (폐쇄 루프)
│   └── src/tenant/        # 멀티테넌트 관리
├── packages/shared/       # 공통 타입/상수
└── packages/supabase/     # DB 마이그레이션
```

## 핵심 원칙
1. **Web First** — 모든 기능은 웹에서 완결. 텔레그램은 보조 알림.
2. **분석 먼저, 디베이트 다음** — AnalystAgent가 문제점 도출 후 디베이트 진행.
3. **멀티테넌트** — 모든 테이블에 tenant_id, RLS 적용. 납품형 구조.
4. **Human-in-the-Loop** — 전략/수정 제안은 사람 승인 후 실행.
5. **API First** — 3대 플랫폼 모두 공식 API. browser-use는 불가 작업만.

## 주요 명령어
```bash
npm run dev          # 전체 dev 서버 (turbo)
npm run build        # 전체 빌드
```

## 환경변수
`.env.example` 참고 — Supabase, Gemini, Claude, OpenAI, 네이버/메타/구글 API 키
