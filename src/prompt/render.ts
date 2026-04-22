import type { PromptComponent } from './schema';

const HEADING: Partial<Record<PromptComponent['kind'], string>> = {
  role: 'Role',
  task: 'Task',
  context: 'Context',
  constraints: 'Constraints',
  examples: 'Examples',
  format: 'Output format',
};

function renderConstraints(body: string): string {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';
  const normalized = lines.map((l) => (l.startsWith('-') || l.startsWith('•') ? l : `- ${l}`));
  return normalized.join('\n');
}

function renderExamples(c: PromptComponent): string {
  const pairs = c.examples ?? [];
  if (pairs.length === 0 && !c.body.trim()) return '';
  const rendered = pairs
    .map((p, i) => `Example ${i + 1}:\nInput: ${p.input.trim()}\nOutput: ${p.output.trim()}`)
    .join('\n\n');
  const freeText = c.body.trim();
  return [rendered, freeText].filter(Boolean).join('\n\n');
}

function sectionFor(c: PromptComponent): string | null {
  if (!c.enabled) return null;

  if (c.kind === 'examples') {
    const body = renderExamples(c);
    if (!body) return null;
    return `# Examples\n${body}`;
  }

  const body = c.kind === 'constraints' ? renderConstraints(c.body) : c.body.trim();
  if (!body) return null;

  const heading = c.kind === 'custom' ? c.label.trim() || 'Notes' : HEADING[c.kind] ?? c.label;
  return `# ${heading}\n${body}`;
}

/**
 * Compose the component list into the final prompt string sent to the model.
 *
 * The ordering follows the list order the user arranged. Empty / disabled components
 * are skipped so they leave no trace in the rendered output.
 */
export function renderPrompt(components: PromptComponent[]): string {
  return components
    .map(sectionFor)
    .filter((s): s is string => s !== null)
    .join('\n\n');
}

export function renderPromptStats(components: PromptComponent[]): {
  rendered: string;
  chars: number;
  filledSections: number;
  totalSections: number;
} {
  const rendered = renderPrompt(components);
  const filledSections = components.filter((c) => sectionFor(c) !== null).length;
  return {
    rendered,
    chars: rendered.length,
    filledSections,
    totalSections: components.filter((c) => c.enabled).length,
  };
}
