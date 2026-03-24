-- 회원가입 시 profiles 자동 생성 트리거
-- 기본 테넌트(루미브리즈)에 자동 연결

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- 기본 테넌트 조회 (루미브리즈)
  SELECT id INTO default_tenant_id
  FROM tenants
  WHERE settings->>'is_default' = 'true'
  LIMIT 1;

  INSERT INTO profiles (id, tenant_id, email, full_name, role)
  VALUES (
    NEW.id,
    default_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'editor'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- profiles INSERT 정책 추가 (트리거용)
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (true);
