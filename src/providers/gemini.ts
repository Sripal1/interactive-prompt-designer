import type { ModelProvider, CompletionOptions, ChatMessage, ProviderStreamEvent } from './types';
import { ProviderError } from './types';
import { parseSSE } from '@/lib/streaming';

export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** The one model the app supports. */
export const GEMMA_MODEL = 'gemma-3-27b-it';
export const GEMMA_DISPLAY_NAME = 'Gemma 3 27B';

export function createGeminiProvider(cfg: GeminiConfig): ModelProvider {
  const base = cfg.baseUrl?.replace(/\/$/, '') || DEFAULT_BASE;

  return {
    id: 'gemini',
    label: GEMMA_DISPLAY_NAME,
    async listModels() {
      // Only one supported model in this app. Return [] when no key so the
      // connection status hook can detect "not configured".
      if (!cfg.apiKey) return [];
      // Cheap liveness check: hit a lightweight endpoint to validate the key.
      try {
        const res = await fetch(`${base}/models/${GEMMA_MODEL}?key=${encodeURIComponent(cfg.apiKey)}`);
        return res.ok ? [GEMMA_MODEL] : [];
      } catch {
        return [];
      }
    },
    complete(opts: CompletionOptions) {
      if (!cfg.apiKey) {
        throw new ProviderError(
          'Gemini API key is not set. Open Settings and paste a key.',
          'gemini',
          401,
          'Get a free key at https://aistudio.google.com/app/apikey.',
        );
      }
      return stream(base, cfg.apiKey, opts);
    },
  };
}

function isGemma(model: string): boolean {
  return model.toLowerCase().startsWith('gemma');
}

/**
 * Build the request body. Gemma 3 does NOT support `systemInstruction` or
 * `responseMimeType: application/json` — so when the model is a Gemma, inline
 * any system prompts into the first user message and skip the JSON-mode flag.
 * Meta prompts already instruct the model to emit JSON; the parsers tolerate
 * prose around the JSON object.
 */
function buildBody(opts: CompletionOptions): Record<string, unknown> {
  const systems = opts.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content);
  const rest = opts.messages.filter((m) => m.role !== 'system');
  const gemma = isGemma(opts.model);

  let convo: ChatMessage[] = rest;
  if (gemma && systems.length) {
    const systemText = systems.join('\n\n');
    const firstUserIdx = rest.findIndex((m) => m.role === 'user');
    if (firstUserIdx === -1) {
      convo = [{ role: 'user', content: systemText }, ...rest];
    } else {
      convo = rest.map((m, i) =>
        i === firstUserIdx ? { ...m, content: `${systemText}\n\n${m.content}` } : m,
      );
    }
  }

  const body: Record<string, unknown> = {
    contents: convo.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  };
  if (!gemma && systems.length) {
    body.systemInstruction = { parts: [{ text: systems.join('\n\n') }] };
  }

  const generationConfig: Record<string, unknown> = {};
  if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (!gemma && opts.responseFormat === 'json') {
    generationConfig.responseMimeType = 'application/json';
  }
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

  return body;
}

async function* stream(
  base: string,
  key: string,
  opts: CompletionOptions,
): AsyncIterable<ProviderStreamEvent> {
  const body = buildBody(opts);
  const url =
    `${base}/models/${encodeURIComponent(opts.model)}:streamGenerateContent` +
    `?alt=sse&key=${encodeURIComponent(key)}`;

  const MAX_RETRIES = 3;
  let res!: Response;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      signal: opts.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if ((res.status === 503 || res.status === 429) && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
      continue;
    }
    break;
  }

  if (res.status === 429) {
    throw new ProviderError(
      'Your Gemini API key is rate-limited or out of quota for this model. ' +
        'Wait a minute, or check your free-tier allocation at https://ai.dev/rate-limit.',
      'gemini',
      429,
      'This is a per-key quota issue, not an outage.',
    );
  }
  if (res.status === 503) {
    throw new ProviderError(
      `${GEMMA_DISPLAY_NAME} is overloaded on Google's side right now. Try again in a minute.`,
      'gemini',
      503,
      'Server-side capacity issue — your key is fine.',
    );
  }
  if (!res.ok || !res.body) {
    const text = await safeText(res);
    throw new ProviderError(
      `Request to ${GEMMA_DISPLAY_NAME} failed (${res.status}): ${text.slice(0, 220)}`,
      'gemini',
      res.status,
    );
  }

  let tokensIn: number | undefined;
  let tokensOut: number | undefined;

  for await (const payload of parseSSE(res.body)) {
    let chunk: GeminiChunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      continue;
    }
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (typeof p.text === 'string' && p.text.length > 0) {
        yield { delta: p.text };
      }
    }
    if (chunk.usageMetadata) {
      tokensIn = chunk.usageMetadata.promptTokenCount ?? tokensIn;
      tokensOut = chunk.usageMetadata.candidatesTokenCount ?? tokensOut;
    }
  }
  yield { delta: '', usage: { tokensIn, tokensOut } };
}

interface GeminiChunk {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export type { ChatMessage };
