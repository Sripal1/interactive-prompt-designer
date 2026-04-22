import { diffLines, diffWordsWithSpace, type Change } from 'diff';
import type { ModelProvider, ChatMessage } from '@/providers/types';

export interface DiffHunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function diffOutputs(prev: string, next: string, mode: 'lines' | 'words' = 'words'): DiffHunk[] {
  const changes: Change[] =
    mode === 'lines' ? diffLines(prev, next) : diffWordsWithSpace(prev, next);
  return changes.map((c) => ({
    value: c.value,
    added: c.added,
    removed: c.removed,
  }));
}

const EXPLAIN_SYSTEM = `You are helping a user learn prompting. The user ran two versions
of a prompt and got two different outputs. They want to understand *why* the change to
the prompt caused the observable change in the output.

Respond with ONE sentence (≤ 30 words) explaining the most important causal link
between the prompt change and the output change. Avoid listing what changed — the
user can see that. Focus on the *why*.

Never say "I cannot" or give a preamble. Start with a verb or noun phrase.`;

export async function explainChange(
  provider: ModelProvider,
  model: string,
  args: {
    prevPrompt: string;
    nextPrompt: string;
    prevOutput: string;
    nextOutput: string;
  },
): Promise<string> {
  const user = [
    '--- Previous prompt ---',
    args.prevPrompt.slice(0, 2000),
    '',
    '--- New prompt ---',
    args.nextPrompt.slice(0, 2000),
    '',
    '--- Previous output ---',
    args.prevOutput.slice(0, 2000),
    '',
    '--- New output ---',
    args.nextOutput.slice(0, 2000),
  ].join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: EXPLAIN_SYSTEM },
    { role: 'user', content: user },
  ];

  let text = '';
  for await (const evt of provider.complete({
    model,
    messages,
    temperature: 0.4,
  })) {
    text += evt.delta;
  }
  return text.trim();
}
