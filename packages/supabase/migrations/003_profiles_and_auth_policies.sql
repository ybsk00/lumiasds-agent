-- 사용자 프로필 (Supabase Auth 연동)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id),
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'viewer',  -- admin | editor | viewer
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 프로필: 본인 데이터만 조회/수정
CREATE POLICY profiles_self_read ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_self_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- 현재 사용자의 tenant_id를 반환하는 함수
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- authenticated 사용자가 자신의 tenant 데이터에 접근하는 RLS 정책
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tenant_usage','uploaded_data','analysis_reports','strategies',
    'campaigns','ad_groups','creatives','campaign_metrics',
    'task_logs','debate_logs','telegram_sessions','telegram_notifications'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY auth_tenant_access ON %I FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id())',
      t
    );
  END LOOP;
END
$$;

-- tenants 테이블: authenticated 사용자가 자신의 테넌트만 조회
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self_read ON tenants FOR SELECT TO authenticated USING (id = get_user_tenant_id());

-- benchmarks는 읽기 전용 공개
CREATE POLICY benchmarks_public_read ON benchmarks FOR SELECT USING (true);

-- 초기 테넌트 (루미브리즈)
INSERT INTO tenants (name, industry, plan, status, settings)
VALUES ('루미브리즈', 'ecommerce', 'enterprise', 'active', '{"is_default": true}'::jsonb)
ON CONFLICT DO NOTHING;
