import { COMPONENT_GLYPH } from '@/prompt/schema';

interface Props {
  kind: keyof typeof COMPONENT_GLYPH;
  size?: 'sm' | 'md';
}

export function ComponentBadge({ kind, size = 'md' }: Props) {
  const g = COMPONENT_GLYPH[kind];
  const dim = size === 'sm' ? 20 : 24;
  return (
    <span
      className="badge shrink-0"
      style={{
        width: dim,
        height: dim,
        backgroundColor: `hsl(var(${g.cssVar}) / 0.15)`,
        color: `hsl(var(${g.cssVar}))`,
      }}
      aria-hidden
    >
      {g.letter}
    </span>
  );
}
