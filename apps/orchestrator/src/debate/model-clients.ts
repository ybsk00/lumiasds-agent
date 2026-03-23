import type { AgentModel, TokenUsage } from '@lumiads/shared';

export interface LLMResponse {
  content: string;
  tokenUsage: TokenUsage;
}

// ---- Gemini (전략가 + 검증자) ----

export async function callGemini(
  apiKey: string,
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro',
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini ${model} error: ${await res.text()}`);

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};

  return {
    content,
    tokenUsage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: usage.candidatesTokenCount || 0,
      cost_usd: estimateCost(model, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0),
    },
  };
}

// ---- Claude (도전자) ----

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`);

  const data = await res.json();
  const content = data.content?.[0]?.text || '';
  const usage = data.usage || {};

  return {
    content,
    tokenUsage: {
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cost_usd: estimateCost('claude-sonnet-4', usage.input_tokens || 0, usage.output_tokens || 0),
    },
  };
}

// ---- GPT-4o (중재자) ----

export async function callGPT4o(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`GPT-4o error: ${await res.text()}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};

  return {
    content,
    tokenUsage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      cost_usd: estimateCost('gpt-4o', usage.prompt_tokens || 0, usage.completion_tokens || 0),
    },
  };
}

// ---- 비용 추정 ----

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gemini-2.5-flash': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
    'gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
    'claude-sonnet-4': { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    'gpt-4o': { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  };

  const price = pricing[model] || { input: 0, output: 0 };
  return Math.round((inputTokens * price.input + outputTokens * price.output) * 10000) / 10000;
}
