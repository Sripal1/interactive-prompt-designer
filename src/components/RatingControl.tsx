import { cn } from '@/lib/cn';
import type { Rating } from '@/store/session';

interface Props {
  value: Rating | undefined;
  onChange: (next: Rating | undefined) => void;
  /** When true, buttons are always visible. Otherwise they fade in on hover of
   *  the enclosing group (parent must have `group` class). */
  alwaysVisible?: boolean;
  className?: string;
}

/**
 * Minimal thumbs-up / thumbs-down selector. Hidden until hovered (via the
 * Tailwind `group-hover` pattern on the parent), so it does not pull attention
 * away from the actual output. Once a rating is chosen, it stays visible so
 * the user can see their own choice at a glance.
 *
 * Clicking the active side again clears the rating (acts like a toggle).
 */
export function RatingControl({ value, onChange, alwaysVisible, className }: Props) {
  const toggle = (next: Rating) => {
    onChange(value === next ? undefined : next);
  };

  const rated = value !== undefined;
  const visible = alwaysVisible || rated;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 transition-opacity duration-150',
        !visible && 'opacity-0 group-hover:opacity-100',
        className,
      )}
      aria-label="Rate this response"
    >
      <IconButton
        active={value === 'up'}
        onClick={() => toggle('up')}
        label="Good response"
        kind="up"
      />
      <IconButton
        active={value === 'down'}
        onClick={() => toggle('down')}
        label="Bad response"
        kind="down"
      />
    </div>
  );
}

function IconButton({
  active,
  onClick,
  label,
  kind,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  kind: 'up' | 'down';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
        active
          ? kind === 'up'
            ? 'text-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)]'
            : 'text-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.08)]'
          : 'text-muted-fg hover:bg-muted hover:text-fg',
      )}
    >
      {kind === 'up' ? <ThumbUp /> : <ThumbDown />}
    </button>
  );
}

function ThumbUp() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5.5 14V7m0 0L8 2a1.5 1.5 0 012.9.9v3.6h2.7c.9 0 1.6.9 1.3 1.8l-1.2 4.2c-.2.7-.8 1.2-1.5 1.2H5.5zm0-7H3.5A1.5 1.5 0 002 8.5v4A1.5 1.5 0 003.5 14h2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10.5 2v7m0 0L8 14a1.5 1.5 0 01-2.9-.9V9.5H2.4c-.9 0-1.6-.9-1.3-1.8l1.2-4.2C2.5 2.8 3.1 2.3 3.8 2.3H10.5zm0 7h2A1.5 1.5 0 0014 7.5v-4A1.5 1.5 0 0012.5 2h-2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
