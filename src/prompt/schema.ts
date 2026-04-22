import { z } from 'zod';
import { nanoid } from 'nanoid';

export const COMPONENT_KINDS = [
  'role',
  'task',
  'context',
  'constraints',
  'examples',
  'format',
  'custom',
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const ExamplePairSchema = z.object({
  id: z.string(),
  input: z.string(),
  output: z.string(),
});
export type ExamplePair = z.infer<typeof ExamplePairSchema>;

export const ComponentSchema = z.object({
  id: z.string(),
  kind: z.enum(COMPONENT_KINDS),
  label: z.string(),
  body: z.string(),
  /** Only used when kind === 'examples'. */
  examples: z.array(ExamplePairSchema).optional(),
  enabled: z.boolean(),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
});
export type PromptComponent = z.infer<typeof ComponentSchema>;

/** Single-letter monogram + CSS variable name for each component kind.
 *  Used by the UI to give each card a distinctive, accessible visual ID
 *  without emoji. */
export const COMPONENT_GLYPH: Record<Exclude<ComponentKind, 'custom'>, { letter: string; cssVar: string }> = {
  role:        { letter: 'R', cssVar: '--c-role' },
  task:        { letter: 'T', cssVar: '--c-task' },
  context:     { letter: 'C', cssVar: '--c-context' },
  constraints: { letter: 'X', cssVar: '--c-constraints' },
  examples:    { letter: 'E', cssVar: '--c-examples' },
  format:      { letter: 'F', cssVar: '--c-format' },
};

export const COMPONENT_BLUEPRINTS: Record<
  Exclude<ComponentKind, 'custom'>,
  Pick<PromptComponent, 'label' | 'placeholder' | 'hint'>
> = {
  role: {
    label: 'Role',
    placeholder: 'You are a senior backend engineer reviewing a pull request…',
    hint: 'Who the assistant is pretending to be — shapes tone and priorities.',
  },
  task: {
    label: 'Task',
    placeholder: 'Summarize the key risks introduced by this PR.',
    hint: 'The one thing you want the assistant to do. Start with a verb.',
  },
  context: {
    label: 'Context',
    placeholder: 'The PR touches auth middleware used by 3 services. Logs attached below.',
    hint: 'Background facts the assistant needs but can’t guess — paste the material here.',
  },
  constraints: {
    label: 'Constraints',
    placeholder: '- ≤ 150 words\n- No code blocks\n- Cite specific line numbers',
    hint: 'Hard rules the assistant should follow. Keep them short and explicit.',
  },
  examples: {
    label: 'Examples',
    placeholder: 'Add input/output pairs that show the shape of a good answer.',
    hint: 'Show, don’t tell. 2–3 examples anchor style and format.',
  },
  format: {
    label: 'Format',
    placeholder: 'Markdown bullets grouped by severity (High / Medium / Low).',
    hint: 'The shape you want back — bullets, JSON, paragraph, etc.',
  },
};

export function makeComponent(
  kind: ComponentKind,
  overrides: Partial<PromptComponent> = {},
): PromptComponent {
  if (kind === 'custom') {
    return {
      id: nanoid(8),
      kind,
      label: overrides.label ?? 'Custom',
      body: '',
      enabled: true,
      ...overrides,
    };
  }
  const bp = COMPONENT_BLUEPRINTS[kind];
  return {
    id: nanoid(8),
    kind,
    label: bp.label,
    body: '',
    enabled: true,
    placeholder: bp.placeholder,
    hint: bp.hint,
    ...(kind === 'examples' ? { examples: [] } : {}),
    ...overrides,
  };
}

export function defaultComponents(): PromptComponent[] {
  return [
    makeComponent('role'),
    makeComponent('task'),
    makeComponent('context'),
    makeComponent('constraints'),
    makeComponent('examples'),
    makeComponent('format'),
  ];
}

export const SessionEventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('run'),
    t: z.number(),
    mode: z.enum(['structured', 'chat']),
    promptChars: z.number(),
    tokensIn: z.number().optional(),
    tokensOut: z.number().optional(),
    latencyMs: z.number(),
    provider: z.string(),
    model: z.string(),
  }),
  z.object({
    kind: z.literal('edit'),
    t: z.number(),
    componentKind: z.string(),
    deltaChars: z.number(),
  }),
  z.object({
    kind: z.literal('clarify'),
    t: z.number(),
    questionsShown: z.number(),
    answered: z.number(),
  }),
  z.object({
    kind: z.literal('diff-explain'),
    t: z.number(),
  }),
  z.object({
    kind: z.literal('mark-satisfied'),
    t: z.number(),
    quality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  }),
  z.object({
    kind: z.literal('mode-switch'),
    t: z.number(),
    to: z.enum(['structured', 'chat']),
  }),
]);
export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  taskLabel: z.string().optional(),
  mode: z.enum(['structured', 'chat']),
  provider: z.string(),
  model: z.string(),
  events: z.array(SessionEventSchema),
  finalPrompt: z.string().optional(),
  finalOutput: z.string().optional(),
  selfReportedQuality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});
export type Session = z.infer<typeof SessionSchema>;
