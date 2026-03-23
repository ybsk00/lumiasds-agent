import { Context, Next } from 'hono';
import { supabaseAdmin } from '../lib/supabase';

// 테넌트 컨텍스트 미들웨어
// 요청의 Authorization 헤더에서 사용자를 확인하고 해당 사용자의 tenant_id를 컨텍스트에 설정
export async function tenantMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  // Supabase Auth에서 사용자 확인
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // 사용자의 tenant_id 조회 (user_metadata에서)
  const tenantId = user.user_metadata?.tenant_id;

  if (!tenantId) {
    return c.json({ error: 'No tenant assigned' }, 403);
  }

  // 컨텍스트에 설정
  c.set('userId', user.id);
  c.set('tenantId', tenantId);
  c.set('userEmail', user.email);

  await next();
}

// 관리자 전용 미들웨어
export async function adminMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email);

  await next();
}
