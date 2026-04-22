import type { ModelProvider } from './types';
import { createGeminiProvider, GEMMA_MODEL, GEMMA_DISPLAY_NAME } from './gemini';

export interface ProviderSettings {
  geminiKey: string;
  geminiBaseUrl?: string;
}

export function makeProvider(s: ProviderSettings): ModelProvider {
  return createGeminiProvider({ apiKey: s.geminiKey, baseUrl: s.geminiBaseUrl });
}

export { GEMMA_MODEL, GEMMA_DISPLAY_NAME };
