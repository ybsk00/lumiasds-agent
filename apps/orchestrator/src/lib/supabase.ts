import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role 클라이언트 (RLS 바이패스 — 내부 서버 전용)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 테넌트 컨텍스트가 설정된 클라이언트 생성
export function createTenantClient(tenantId: string): SupabaseClient {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-tenant-id': tenantId,
      },
    },
  });
  return client;
}

// 테넌트 컨텍스트를 RLS에 주입하는 SQL 실행
export async function setTenantContext(client: SupabaseClient, tenantId: string) {
  await client.rpc('set_tenant_context', { tenant_id: tenantId });
}
