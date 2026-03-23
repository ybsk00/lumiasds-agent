-- LumiAds 초기 스키마 — 멀티테넌트 (tenant_id + RLS)
-- pgvector 확장
CREATE EXTENSION IF NOT EXISTS vector;

--------------------------------------------------------------
-- 1. tenants (광고주)
--------------------------------------------------------------
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT NOT NULL,  -- medical | ecommerce | education | etc
    compliance_rules JSONB,
    api_keys JSONB,          -- 암호화된 API 키 세트
    telegram_bot_token TEXT,
    telegram_chat_id BIGINT,
    ga4_property_id TEXT,
    settings JSONB DEFAULT '{}',
    plan TEXT DEFAULT 'basic',   -- basic | pro | enterprise
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 2. tenant_usage (과금용)
--------------------------------------------------------------
CREATE TABLE tenant_usage (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usage_type TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    cost_krw INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 3. uploaded_data (수동 업로드 파일)
--------------------------------------------------------------
CREATE TABLE uploaded_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,       -- csv | xlsx | json
    file_url TEXT NOT NULL,
    parsed_data JSONB,
    column_mapping JSONB,
    row_count INTEGER,
    status TEXT DEFAULT 'uploaded', -- uploaded | parsed | failed
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 4. analysis_reports (분석 보고서)
--------------------------------------------------------------
CREATE TABLE analysis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,             -- initial | periodic | triggered
    status TEXT DEFAULT 'pending',  -- pending | analyzing | completed | failed
    input_sources JSONB NOT NULL DEFAULT '[]',
    summary TEXT,
    findings JSONB DEFAULT '[]',
    opportunities JSONB DEFAULT '[]',
    benchmark_comparison JSONB,
    raw_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 5. strategies (전략)
--------------------------------------------------------------
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    analysis_report_id UUID REFERENCES analysis_reports(id),
    input JSONB NOT NULL,
    output JSONB,
    status TEXT DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 6. campaigns (통합 — 모든 플랫폼)
--------------------------------------------------------------
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES strategies(id),
    platform TEXT NOT NULL,
    platform_campaign_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    budget_daily INTEGER,
    budget_total INTEGER,
    start_date DATE,
    end_date DATE,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 7. ad_groups (광고그룹)
--------------------------------------------------------------
CREATE TABLE ad_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform_adgroup_id TEXT,
    name TEXT NOT NULL,
    targeting JSONB,
    bid_strategy TEXT,
    bid_amount INTEGER,
    status TEXT DEFAULT 'draft',
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 8. creatives (소재)
--------------------------------------------------------------
CREATE TABLE creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform_creative_id TEXT,
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    image_urls TEXT[],
    status TEXT DEFAULT 'draft',
    review_note TEXT,
    performance JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 9. campaign_metrics (성과 메트릭)
--------------------------------------------------------------
CREATE TABLE campaign_metrics (
    id BIGSERIAL PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID REFERENCES ad_groups(id),
    creative_id UUID REFERENCES creatives(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    cost INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    ctr NUMERIC(6,4),
    cvr NUMERIC(6,4),
    cpc INTEGER,
    cpa INTEGER,
    roas NUMERIC(8,2),
    raw_data JSONB,
    fetched_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(campaign_id, ad_group_id, creative_id, date)
);

--------------------------------------------------------------
-- 10. task_logs (작업 로그)
--------------------------------------------------------------
CREATE TABLE task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    platform TEXT,
    action TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    input JSONB,
    output JSONB,
    error TEXT,
    screenshot_url TEXT,
    approval_status TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 11. benchmarks (벤치마크, RAG용)
--------------------------------------------------------------
CREATE TABLE benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry TEXT NOT NULL,
    platform TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value NUMERIC,
    period TEXT,
    source TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 12. debate_logs (토론 로그)
--------------------------------------------------------------
CREATE TABLE debate_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    agent_role TEXT NOT NULL,
    agent_model TEXT NOT NULL,
    message_type TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    confidence INTEGER,
    data_points INTEGER,
    validation_score INTEGER,
    warnings JSONB,
    token_usage JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 13. telegram_sessions
--------------------------------------------------------------
CREATE TABLE telegram_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    user_name TEXT,
    intent TEXT,
    state JSONB DEFAULT '{}',
    step INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 14. telegram_notifications
--------------------------------------------------------------
CREATE TABLE telegram_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    notification_type TEXT NOT NULL,
    content JSONB NOT NULL,
    callback_data TEXT,
    response TEXT,
    responded_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------
-- 인덱스
--------------------------------------------------------------
CREATE INDEX idx_metrics_campaign_date ON campaign_metrics(campaign_id, date);
CREATE INDEX idx_metrics_platform_date ON campaign_metrics(platform, date);
CREATE INDEX idx_metrics_tenant ON campaign_metrics(tenant_id, date);
CREATE INDEX idx_campaigns_platform ON campaigns(platform, status);
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id, status);
CREATE INDEX idx_task_logs_status ON task_logs(status, created_at);
CREATE INDEX idx_task_logs_tenant ON task_logs(tenant_id, created_at);
CREATE INDEX idx_benchmarks_embedding ON benchmarks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_tenant_usage ON tenant_usage(tenant_id, created_at);
CREATE INDEX idx_debate_logs_strategy ON debate_logs(strategy_id, round);
CREATE INDEX idx_analysis_reports_tenant ON analysis_reports(tenant_id, created_at);
CREATE INDEX idx_uploaded_data_tenant ON uploaded_data(tenant_id, created_at);

--------------------------------------------------------------
-- RLS (Row Level Security) — 모든 테넌트 테이블에 적용
--------------------------------------------------------------
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 각 테이블에서 tenant_id가 현재 세션의 테넌트와 일치하는 행만 접근
CREATE POLICY tenant_isolation ON tenant_usage FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON uploaded_data FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON analysis_reports FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON strategies FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON campaigns FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON ad_groups FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON creatives FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON campaign_metrics FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON task_logs FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON debate_logs FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON telegram_sessions FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON telegram_notifications FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
