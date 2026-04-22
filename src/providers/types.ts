export type ProviderId = 'gemini';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
  /** Request a JSON-shaped response. Providers that don't support this natively
   *  fall back to inlining the instruction in the system prompt. */
  responseFormat?: 'text' | 'json';
}

export interface ProviderStreamEvent {
  /** Token or chunk of output text. May be the empty string for ping events. */
  delta: string;
  /** Optional trailing usage info — populated on the final event if the API returns it. */
  usage?: { tokensIn?: number; tokensOut?: number };
}

export interface ModelProvider {
  id: ProviderId;
  label: string;
  listModels(): Promise<string[]>;
  complete(opts: CompletionOptions): AsyncIterable<ProviderStreamEvent>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderId,
    public readonly status?: number,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
