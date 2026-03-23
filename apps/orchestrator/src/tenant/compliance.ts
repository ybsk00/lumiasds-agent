import type { ComplianceRules } from '../shared';
import { supabaseAdmin } from '../lib/supabase';

// ====================================================================
// 업종별 카피 검수 규칙 엔진
//
// - 의료 / 이커머스 / 교육 등 업종별 기본 규칙 제공
// - tenants.compliance_rules JSONB로 고객별 커스텀 가능
// - CopyAgent 생성 후 자동 검수
// ====================================================================

// ---- 업종별 기본 규칙 ----

const INDUSTRY_RULES: Record<string, ComplianceRules> = {
  medical: {
    industry: 'medical',
    blocked_patterns: [
      '최고의 의료진', '1위', '국내 유일', '100% 완치',
      '확실한 효과', '부작용 없는', '무조건', '반드시',
      '파격 할인', '반값', '최저가 보장', '무료 시술',
      '최상의', '완벽한', '기적의', '획기적',
    ],
    required_disclaimers: {
      injection: '주사 부위 부종, 멍, 통증 등의 부작용이 발생할 수 있습니다.',
      laser: '시술 후 홍조, 각질, 색소침착 등이 일시적으로 발생할 수 있습니다.',
      surgery: '수술 후 출혈, 감염, 부종 등의 부작용이 발생할 수 있습니다.',
      dental: '치료 결과는 개인에 따라 차이가 있을 수 있습니다.',
      default: '개인에 따라 효과가 다를 수 있습니다.',
    },
    before_after_rule: '전후 사진 사용 시 부작용 고지 문구 필수',
    price_rule: '할인 표현 시 원래 가격과 할인 가격 동시 표기',
  },

  ecommerce: {
    industry: 'ecommerce',
    blocked_patterns: [
      '업계 최저가', '가짜 카운트다운', '100% 환불',
      '최고의', '1위', '무조건', '반드시',
    ],
    required_disclaimers: {
      health_supplement: '이 제품은 질병의 예방 및 치료를 위한 의약품이 아닙니다.',
      cosmetic_effect: '효과에는 개인차가 있을 수 있습니다.',
      default: '',
    },
    price_rule: '할인가 표시 시 소비자가 기준 명시',
  },

  education: {
    industry: 'education',
    blocked_patterns: [
      '합격 보장', '100% 취업', '무조건 성적 향상',
      '반드시 합격', '국내 1위', '최고',
    ],
    required_disclaimers: {
      default: '학습 효과는 개인에 따라 차이가 있을 수 있습니다.',
    },
  },

  finance: {
    industry: 'finance',
    blocked_patterns: [
      '원금 보장', '확정 수익', '무위험', '100% 수익',
      '최고 수익률', '반드시 이익',
    ],
    required_disclaimers: {
      investment: '투자에는 원금 손실의 위험이 있습니다.',
      loan: '대출 시 과도한 빚은 개인 신용에 영향을 줄 수 있습니다.',
      default: '금융상품에 관한 계약을 체결하기 전에 상품설명서를 반드시 확인하세요.',
    },
  },

  etc: {
    industry: 'etc',
    blocked_patterns: [
      '최고', '1위', '100%', '무조건', '반드시', '완벽',
    ],
    required_disclaimers: {
      default: '',
    },
  },
};

// ---- 규칙 조회 ----

/** 테넌트의 검수 규칙 조회 (커스텀 + 업종 기본 병합) */
export async function getComplianceRules(tenantId: string): Promise<ComplianceRules> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('industry, compliance_rules')
    .eq('id', tenantId)
    .single();

  if (!tenant) throw new Error('Tenant not found');

  const baseRules = INDUSTRY_RULES[tenant.industry] || INDUSTRY_RULES.etc;
  const customRules = tenant.compliance_rules as ComplianceRules | null;

  if (!customRules) return baseRules;

  // 커스텀 규칙과 기본 규칙 병합
  return {
    industry: customRules.industry || baseRules.industry,
    blocked_patterns: [
      ...new Set([...baseRules.blocked_patterns, ...(customRules.blocked_patterns || [])]),
    ],
    required_disclaimers: {
      ...baseRules.required_disclaimers,
      ...customRules.required_disclaimers,
    },
    before_after_rule: customRules.before_after_rule || baseRules.before_after_rule,
    price_rule: customRules.price_rule || baseRules.price_rule,
  };
}

/** 업종 기본 규칙만 조회 */
export function getDefaultRules(industry: string): ComplianceRules {
  return INDUSTRY_RULES[industry] || INDUSTRY_RULES.etc;
}

// ---- 카피 검수 ----

export interface ComplianceCheckResult {
  passed: boolean;
  violations: ComplianceViolation[];
  disclaimersNeeded: string[];
}

export interface ComplianceViolation {
  type: 'blocked_pattern' | 'missing_disclaimer' | 'price_rule';
  pattern: string;
  location: string; // headline | description | primary_text
  suggestion: string;
}

/** 단일 카피 검수 */
export function checkCopy(
  copy: { headline?: string; description?: string; primary_text?: string },
  rules: ComplianceRules,
): ComplianceCheckResult {
  const violations: ComplianceViolation[] = [];
  const disclaimersNeeded: string[] = [];

  const fields = [
    { key: 'headline', text: copy.headline || '' },
    { key: 'description', text: copy.description || '' },
    { key: 'primary_text', text: copy.primary_text || '' },
  ];

  // blocked_patterns 체크
  for (const field of fields) {
    for (const pattern of rules.blocked_patterns) {
      if (field.text.includes(pattern)) {
        violations.push({
          type: 'blocked_pattern',
          pattern,
          location: field.key,
          suggestion: `"${pattern}" 표현을 제거하거나 객관적 근거를 추가하세요.`,
        });
      }
    }
  }

  // 할인/가격 표현 체크
  if (rules.price_rule) {
    const allText = fields.map((f) => f.text).join(' ');
    const pricePatterns = ['할인', '%OFF', '세일', '특가', '반값'];
    for (const p of pricePatterns) {
      if (allText.includes(p) && !allText.includes('원') && !allText.includes('₩')) {
        violations.push({
          type: 'price_rule',
          pattern: p,
          location: 'all',
          suggestion: rules.price_rule,
        });
      }
    }
  }

  // 필수 고지문구 체크 (키워드 기반 감지)
  const allText = fields.map((f) => f.text).join(' ');
  if (rules.required_disclaimers) {
    for (const [category, disclaimer] of Object.entries(rules.required_disclaimers)) {
      if (category === 'default' || !disclaimer) continue;
      const triggers: Record<string, string[]> = {
        injection: ['주사', '필러', '보톡스'],
        laser: ['레이저', '피코', 'IPL'],
        surgery: ['수술', '절개', '리프팅'],
        dental: ['치과', '임플란트', '치아'],
        health_supplement: ['건강기능', '영양제', '보충제'],
        cosmetic_effect: ['효과', '개선', '변화'],
        investment: ['투자', '수익', '배당'],
        loan: ['대출', '금리', '이자'],
      };
      if (triggers[category]?.some((t) => allText.includes(t))) {
        disclaimersNeeded.push(disclaimer);
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    disclaimersNeeded: [...new Set(disclaimersNeeded)],
  };
}

/** 여러 카피 일괄 검수 */
export function checkCopies(
  copies: { headline?: string; description?: string; primary_text?: string }[],
  rules: ComplianceRules,
): { results: ComplianceCheckResult[]; allPassed: boolean } {
  const results = copies.map((copy) => checkCopy(copy, rules));
  return {
    results,
    allPassed: results.every((r) => r.passed),
  };
}
