import type { ModelProvider, ChatMessage } from '@/providers/types';
import type { ComponentKind, PromptComponent } from '@/prompt/schema';

export interface ClarifyingQuestion {
  q: string;
  /** Which component category the answer should most likely land in. */
  suggestedComponent: ComponentKind;
}

const CLARIFY_SYSTEM = `You are helping a user write a better prompt.
The user's prompt is decomposed into structured components with these IDs:
  role, task, context, constraints, examples, format

Your job is to look at the user's current draft and ask 1-3 targeted clarifying
questions whose answers would most improve the output quality. Favor questions that
fill gaps (empty or vague components). Avoid stylistic questions like "what tone".
Each question must name the component it belongs to.

Respond with JSON only, matching this schema:
{
  "questions": [
    { "q": string, "suggestedComponent": "role"|"task"|"context"|"constraints"|"examples"|"format" }
  ]
}

Keep questions short (under 20 words). No preamble, no trailing commentary.`;

function summarizeDraft(components: PromptComponent[]): string {
  return components
    .map((c) => `[${c.kind}] ${c.enabled ? c.body.trim().slice(0, 240) || '(empty)' : '(disabled)'}`)
    .join('\n');
}

export async function askClarifying(
  provider: ModelProvider,
  model: string,
  components: PromptComponent[],
): Promise<ClarifyingQuestion[]> {
  const messages: ChatMessage[] = [
    { role: 'system', content: CLARIFY_SYSTEM },
    { role: 'user', content: `Current prompt draft:\n\n${summarizeDraft(components)}` },
  ];

  let text = '';
  for await (const evt of provider.complete({
    model,
    messages,
    temperature: 0.3,
    responseFormat: 'json',
  })) {
    text += evt.delta;
  }

  return parseQuestions(text);
}

export function parseQuestions(text: string): ClarifyingQuestion[] {
  const jsonStr = extractJson(text);
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr) as { questions?: ClarifyingQuestion[] };
    const qs = parsed.questions ?? [];
    return qs
      .filter((q) => typeof q?.q === 'string' && typeof q?.suggestedComponent === 'string')
      .slice(0, 3);
  } catch {
    return [];
  }
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  // Tolerate models that wrap JSON in code fences.
  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced) return fenced[1];
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return null;
}
