import type { EncryptedApiKeys } from '../shared';
import { supabaseAdmin } from '../lib/supabase';
import crypto from 'crypto';

// ====================================================================
// API Key Vault — 암호화된 API 키 관리
//
// 저장 시 AES-256-GCM 암호화, 조회 시 복호화
// 키는 tenants.api_keys JSONB 컬럼에 저장
// ====================================================================

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'lumiads-default-key-change-in-prod!!';
const ALGORITHM = 'aes-256-gcm';

function getKeyBuffer(): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, 'lumiads-salt', 32);
}

/** 문자열 암호화 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getKeyBuffer();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/** 문자열 복호화 */
function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const key = getKeyBuffer();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/** API 키 값들을 암호화 (중첩 객체 지원) */
function encryptKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > 0) {
      result[key] = encrypt(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = encryptKeys(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** API 키 값들을 복호화 */
function decryptKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.includes(':')) {
      try {
        result[key] = decrypt(value);
      } catch {
        result[key] = value; // 복호화 실패 시 원본 반환
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = decryptKeys(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ---- 공개 API ----

/** 테넌트의 API 키 저장 (암호화) */
export async function saveApiKeys(
  tenantId: string,
  platform: string,
  keys: Record<string, string>,
): Promise<void> {
  // 기존 키 조회
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  const existing = (tenant?.api_keys || {}) as Record<string, any>;
  const encrypted = encryptKeys(keys);

  const updated = { ...existing, [platform]: encrypted };

  await supabaseAdmin
    .from('tenants')
    .update({ api_keys: updated, updated_at: new Date().toISOString() })
    .eq('id', tenantId);
}

/** 테넌트의 API 키 조회 (복호화) */
export async function getApiKeys(tenantId: string, platform?: string): Promise<Record<string, any>> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  if (!tenant?.api_keys) return {};

  const allKeys = decryptKeys(tenant.api_keys as Record<string, any>);

  if (platform) return allKeys[platform] || {};
  return allKeys;
}

/** 특정 플랫폼 키 삭제 */
export async function deleteApiKeys(tenantId: string, platform: string): Promise<void> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  if (!tenant?.api_keys) return;

  const existing = { ...(tenant.api_keys as Record<string, any>) };
  delete existing[platform];

  await supabaseAdmin
    .from('tenants')
    .update({ api_keys: existing, updated_at: new Date().toISOString() })
    .eq('id', tenantId);
}

/** API 키 존재 여부만 확인 (값은 마스킹) */
export async function getApiKeyStatus(tenantId: string): Promise<Record<string, boolean>> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('api_keys')
    .eq('id', tenantId)
    .single();

  if (!tenant?.api_keys) return { naver: false, meta: false, google: false };

  const keys = tenant.api_keys as Record<string, any>;
  return {
    naver: !!keys.naver,
    meta: !!keys.meta,
    google: !!keys.google,
    kakao: !!keys.kakao,
  };
}
