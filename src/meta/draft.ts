import type { ModelProvider, ChatMessage } from '@/providers/types';
import type { ComponentKind } from '@/prompt/schema';

export interface PlannedQuestion {
  q: string;
  field: Exclude<ComponentKind, 'custom'>;
  placeholder?: string;
}

const PLAN_SYSTEM = `You help beginners turn a rough idea into a high-quality prompt.

Given ONLY the user's one-line goal, ask 2-3 short questions whose answers would most
improve the eventual output. Favor questions about:
  - the intended audience (who is this for?)
  - concrete material the assistant needs (text to summarize, code, a situation, etc.)
  - desired length or shape
  - hard requirements (things to avoid or include)

Rules:
- At most 3 questions. Fewer is fine.
- Each question under 14 words, friendly and specific to the goal.
- Never ask for things a model can infer.
- Never ask about model settings, temperature, provider, etc.
- "field" is which component the answer should populate:
    role | task | context | constraints | examples | format

Output STRICT JSON only, no prose:
{ "questions": [ { "q": "...", "field": "context", "placeholder": "..." } ] }`;

export async function planClarifying(
  provider: ModelProvider,
  model: string,
  goal: string,
): Promise<PlannedQuestion[]> {
  const messages: ChatMessage[] = [
    { role: 'system', content: PLAN_SYSTEM },
    { role: 'user', content: `Goal: ${goal.trim()}` },
  ];
  const text = await collect(provider, model, messages, 0.3, 'json');
  return parsePlan(text);
}

export function parsePlan(text: string): PlannedQuestion[] {
  const json = extractJson(text);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as { questions?: PlannedQuestion[] };
    const qs = parsed.questions ?? [];
    return qs
      .filter(
        (q): q is PlannedQuestion =>
          typeof q?.q === 'string' && typeof q?.field === 'string',
      )
      .slice(0, 3);
  } catch {
    return [];
  }
}

// -------- Draft full component bodies from the goal + user answers ----------

export interface DraftedComponents {
  role: string;
  task: string;
  context: string;
  constraints: string;
  examples: string;
  format: string;
}

const DRAFT_SYSTEM = `You turn a user's rough goal and their answers to clarifying
questions into a clean, structured prompt.

Return a JSON object filling each component. Each field is a string (may be empty if
the component genuinely does not apply).

Rules:
- Write concrete, ready-to-use content — not placeholders, not meta commentary.
- "role": a short persona. "You are a ..." style.
- "task": one verb-first instruction. One task only.
- "context": paste through any material the user provided in answers. If they
  referenced material they haven't pasted yet (like "a paper"), write a TODO line
  they can fill in: "[paste the paper text here]".
- "constraints": 2-4 bullet items, one per line, starting with "- ".
- "examples": usually empty unless the user gave specific examples.
- "format": describe the output shape they want.
- Keep each field under ~80 words.
- Do NOT wrap in code fences. Output strict JSON only.

Schema:
{
  "role": "...",
  "task": "...",
  "context": "...",
  "constraints": "- ...\\n- ...",
  "examples": "",
  "format": "..."
}`;

export async function draftPrompt(
  provider: ModelProvider,
  model: string,
  goal: string,
  answers: Array<{ q: string; a: string; field: string }>,
): Promise<DraftedComponents> {
  const qa = answers
    .filter((x) => x.a.trim())
    .map((x) => `Q (${x.field}): ${x.q}\nA: ${x.a.trim()}`)
    .join('\n\n');

  const user = `Goal: ${goal.trim()}\n\n${qa || '(no additional answers)'}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: DRAFT_SYSTEM },
    { role: 'user', content: user },
  ];
  const text = await collect(provider, model, messages, 0.4, 'json');
  return parseDraft(text);
}

export function parseDraft(text: string): DraftedComponents {
  const empty: DraftedComponents = {
    role: '',
    task: '',
    context: '',
    constraints: '',
    examples: '',
    format: '',
  };
  const json = extractJson(text);
  if (!json) return empty;
  try {
    const parsed = JSON.parse(json) as Partial<DraftedComponents>;
    return {
      role: String(parsed.role ?? ''),
      task: String(parsed.task ?? ''),
      context: String(parsed.context ?? ''),
      constraints: String(parsed.constraints ?? ''),
      examples: String(parsed.examples ?? ''),
      format: String(parsed.format ?? ''),
    };
  } catch {
    return empty;
  }
}

// -------- shared helpers ----------------------------------------------------

async function collect(
  provider: ModelProvider,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  responseFormat: 'text' | 'json',
): Promise<string> {
  let out = '';
  for await (const evt of provider.complete({
    model,
    messages,
    temperature,
    responseFormat,
  })) {
    out += evt.delta;
  }
  return out;
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced) return fenced[1];
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return null;
}
