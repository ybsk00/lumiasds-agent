import type { Platform, CreativeBrief, Creative, CreativeContent } from '@lumiads/shared';
import { supabaseAdmin } from '../lib/supabase';

// ====================================================================
// CreativeAgent — 카피 + 이미지 자동 생성
//
// 구성:
//  - CopyAgent: 플랫폼별 카피 생성 (글자수 제한, A/B 변형, 검수)
//  - ImageAgent: Nano Banana 2/Pro 이미지 생성
// ====================================================================

// ---- 플랫폼별 카피 제약 조건 ----

const COPY_CONSTRAINTS: Record<string, { headline: number; description: number; primary_text?: number }> = {
  naver_search: { headline: 15, description: 45 },
  naver_gfa: { headline: 25, description: 45 },
  meta: { headline: 40, description: 30, primary_text: 125 },
  google: { headline: 30, description: 90 },
  kakao: { headline: 25, description: 45 },
};

// ---- 카피 검수 규칙 ----

const DEFAULT_BLOCKED_PATTERNS = [
  '최고', '최저', '1위', '국내 유일', '100%', '완벽한', '무조건',
  '반드시', '확실한', '파격', '반값', '최저가 보장',
];

interface CopyGenerateOptions {
  tenantId: string;
  geminiApiKey: string;
  brief: CreativeBrief;
  platforms: Platform[];
  variantCount: number; // A/B 테스트용 변형 수
  complianceRules?: { blocked_patterns?: string[]; required_disclaimers?: Record<string, string> };
}

interface GeneratedCopy {
  platform: Platform;
  variants: CreativeContent[];
  violations: string[];
}

// ---- CopyAgent ----

export async function generateCopy(options: CopyGenerateOptions): Promise<GeneratedCopy[]> {
  const results: GeneratedCopy[] = [];

  for (const platform of options.platforms) {
    const constraints = COPY_CONSTRAINTS[platform] || COPY_CONSTRAINTS.meta;

    const prompt = buildCopyPrompt(options.brief, platform, constraints, options.variantCount);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${options.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
        }),
      },
    );

    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    let variants: CreativeContent[] = [];
    try {
      const parsed = JSON.parse(text);
      variants = Array.isArray(parsed) ? parsed : parsed.variants || [parsed];
    } catch {
      variants = [];
    }

    // 글자수 검증 + 자르기
    variants = variants.map((v) => ({
      headline: v.headline?.slice(0, constraints.headline),
      description: v.description?.slice(0, constraints.description),
      primary_text: v.primary_text?.slice(0, constraints.primary_text || 125),
      display_url: v.display_url,
      final_url: v.final_url,
    }));

    // 카피 검수
    const blockedPatterns = [
      ...DEFAULT_BLOCKED_PATTERNS,
      ...(options.complianceRules?.blocked_patterns || []),
    ];

    const violations: string[] = [];
    for (const variant of variants) {
      const allText = `${variant.headline || ''} ${variant.description || ''} ${variant.primary_text || ''}`;
      for (const pattern of blockedPatterns) {
        if (allText.includes(pattern)) {
          violations.push(`"${pattern}" 표현 사용 — 수정 필요`);
        }
      }
    }

    results.push({ platform, variants, violations });
  }

  return results;
}

function buildCopyPrompt(
  brief: CreativeBrief,
  platform: Platform,
  constraints: { headline: number; description: number; primary_text?: number },
  variantCount: number,
): string {
  const platformName: Record<string, string> = {
    naver_search: '네이버 검색광고',
    naver_gfa: '네이버 GFA',
    meta: 'Meta (Facebook/Instagram)',
    google: 'Google Ads',
    kakao: '카카오모먼트',
  };

  return `당신은 한국 디지털 광고 카피라이터입니다.

## Creative Brief
- 핵심 메시지: ${brief.key_message}
- 톤앤매너: ${brief.tone}
- CTA: ${brief.cta}
- USP: ${brief.usp.join(', ')}
- 비주얼 방향: ${brief.visual_direction}

## 플랫폼: ${platformName[platform] || platform}
## 제약 조건
- headline: 최대 ${constraints.headline}자 (한글 기준)
- description: 최대 ${constraints.description}자
${constraints.primary_text ? `- primary_text: 최대 ${constraints.primary_text}자` : ''}

## 요청
A/B 테스트용 ${variantCount}개 변형을 JSON 배열로 생성하세요.

규칙:
- 한국어로 작성
- 글자수 제한 엄수
- 최상급 표현(최고, 1위 등) 사용 금지
- CTA를 자연스럽게 포함
- 각 변형은 다른 접근 방식 사용 (감성/논리/혜택/공포/사회적증거)

JSON 형식:
[
  { "headline": "...", "description": "...", "primary_text": "..." },
  ...
]`;
}

// ---- ImageAgent ----

interface ImageGenerateOptions {
  tenantId: string;
  geminiApiKey: string;
  brief: CreativeBrief;
  platform: Platform;
  sizes: { width: number; height: number; label: string }[];
  quality: 'standard' | 'high'; // standard = Nano Banana 2, high = Nano Banana Pro
}

interface GeneratedImage {
  platform: Platform;
  size: { width: number; height: number; label: string };
  imageUrl: string;
  quality: string;
}

const PLATFORM_SIZES: Record<string, { width: number; height: number; label: string }[]> = {
  naver_gfa: [
    { width: 1200, height: 628, label: '배너 가로' },
    { width: 1080, height: 1080, label: '정사각' },
  ],
  meta: [
    { width: 1080, height: 1080, label: '피드 정사각' },
    { width: 1080, height: 1350, label: '피드 세로' },
    { width: 1080, height: 1920, label: '스토리' },
  ],
  google: [
    { width: 1200, height: 628, label: '가로형' },
    { width: 1200, height: 1200, label: '정사각' },
  ],
};

export async function generateImages(options: ImageGenerateOptions): Promise<GeneratedImage[]> {
  const sizes = options.sizes.length > 0 ? options.sizes : (PLATFORM_SIZES[options.platform] || PLATFORM_SIZES.meta);
  const results: GeneratedImage[] = [];

  // Gemini Imagen (Nano Banana) API로 이미지 생성
  const model = options.quality === 'high' ? 'imagen-3.0-generate-002' : 'imagen-3.0-generate-001';

  for (const size of sizes) {
    const prompt = buildImagePrompt(options.brief, size);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${options.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: getAspectRatio(size.width, size.height),
            },
          }),
        },
      );

      if (!res.ok) {
        console.error(`Image generation failed for ${size.label}:`, await res.text());
        continue;
      }

      const data = await res.json();
      const imageBytes = data.generatedImages?.[0]?.image?.imageBytes;

      if (imageBytes) {
        // Supabase Storage에 저장
        const fileName = `${options.tenantId}/${Date.now()}_${size.label.replace(/\s/g, '_')}.png`;
        const buffer = Buffer.from(imageBytes, 'base64');

        const { data: uploadData, error } = await supabaseAdmin.storage
          .from('creatives')
          .upload(fileName, buffer, { contentType: 'image/png' });

        if (!error && uploadData) {
          const { data: urlData } = supabaseAdmin.storage.from('creatives').getPublicUrl(fileName);

          results.push({
            platform: options.platform,
            size,
            imageUrl: urlData.publicUrl,
            quality: options.quality,
          });
        }
      }
    } catch (e) {
      console.error(`Image generation error for ${size.label}:`, e);
    }
  }

  return results;
}

function buildImagePrompt(brief: CreativeBrief, size: { width: number; height: number }): string {
  return `Korean digital advertisement banner. ${brief.visual_direction}.
Key message: ${brief.key_message}.
Style: ${brief.tone}. Clean, professional, modern design.
Product highlights: ${brief.usp.join(', ')}.
No text overlays. High quality product photography with clean background.`;
}

function getAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  if (Math.abs(ratio - 4 / 5) < 0.1) return '4:5';
  if (ratio > 1.5) return '16:9';
  if (ratio < 0.7) return '9:16';
  return '1:1';
}

// ---- 통합: 전략 기반 소재 일괄 생성 ----

export async function generateAllCreatives(config: {
  tenantId: string;
  geminiApiKey: string;
  strategyId: string;
  adGroupId: string;
  brief: CreativeBrief;
  platforms: Platform[];
  landingUrl: string;
  complianceRules?: { blocked_patterns?: string[]; required_disclaimers?: Record<string, string> };
}): Promise<Creative[]> {
  const creatives: Creative[] = [];

  // 1. 카피 생성
  const copies = await generateCopy({
    tenantId: config.tenantId,
    geminiApiKey: config.geminiApiKey,
    brief: config.brief,
    platforms: config.platforms,
    variantCount: 3,
    complianceRules: config.complianceRules,
  });

  // 2. 이미지 생성 (디스플레이 플랫폼만)
  const displayPlatforms = config.platforms.filter((p) => p !== 'naver_search');
  const allImages: GeneratedImage[] = [];

  for (const platform of displayPlatforms) {
    const images = await generateImages({
      tenantId: config.tenantId,
      geminiApiKey: config.geminiApiKey,
      brief: config.brief,
      platform,
      sizes: PLATFORM_SIZES[platform] || [],
      quality: 'standard',
    });
    allImages.push(...images);
  }

  // 3. DB에 소재 저장
  for (const copySet of copies) {
    const platformImages = allImages.filter((img) => img.platform === copySet.platform);

    for (const variant of copySet.variants) {
      const { data: creative } = await supabaseAdmin
        .from('creatives')
        .insert({
          ad_group_id: config.adGroupId,
          tenant_id: config.tenantId,
          type: platformImages.length > 0 ? 'image' : 'text',
          content: {
            ...variant,
            final_url: config.landingUrl,
          },
          image_urls: platformImages.map((img) => img.imageUrl),
          status: copySet.violations.length > 0 ? 'pending_review' : 'draft',
          review_note: copySet.violations.length > 0
            ? `검수 위반: ${copySet.violations.join('; ')}`
            : null,
        })
        .select()
        .single();

      if (creative) creatives.push(creative as Creative);
    }
  }

  return creatives;
}
