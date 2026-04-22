import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { PromptComponent } from '@/prompt/schema';
import { COMPONENT_GLYPH } from '@/prompt/schema';
import { useComponents } from '@/store/components';
import { ComponentBadge } from './ComponentBadge';

interface Props {
  component: PromptComponent;
  onEdit: (newLen: number) => void;
  defaultOpen?: boolean;
}

export function ComponentCard({ component, onEdit, defaultOpen }: Props) {
  const {
    setBody,
    setLabel,
    toggleEnabled,
    remove,
    move,
    addExample,
    updateExample,
    removeExample,
  } = useComponents();

  const [open, setOpen] = useState<boolean>(!!defaultOpen || !component.body);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [component.body, open]);

  const isCustom = component.kind === 'custom';
  const isExamples = component.kind === 'examples';
  const isKnown = component.kind !== 'custom';
  const glyphKind = isKnown ? (component.kind as keyof typeof COMPONENT_GLYPH) : 'format';
  const hint = component.hint;

  const preview = isExamples
    ? (component.examples?.length ?? 0) > 0
      ? `${component.examples!.length} example${component.examples!.length > 1 ? 's' : ''}`
      : ''
    : component.body.trim().split('\n').slice(0, 2).join(' · ').slice(0, 140);

  return (
    <div
      className={cn(
        'card transition-all overflow-hidden',
        !component.enabled && 'opacity-60',
        open && 'ring-1 ring-accent/20',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/40 transition"
        aria-expanded={open}
      >
        {isKnown ? <ComponentBadge kind={glyphKind} /> : <DotBadge />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isCustom && open ? (
              <input
                className="input !py-1 !px-2 !text-sm font-medium w-auto flex-1"
                value={component.label}
                onChange={(e) => setLabel(component.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Custom component label"
              />
            ) : (
              <span className="text-sm font-medium tracking-tight">
                {component.label}
              </span>
            )}
            {preview && !open ? (
              <span className="ml-2 truncate text-xs text-muted-fg">{preview}</span>
            ) : null}
            {!component.body && !open && !isExamples ? (
              <span className="ml-2 text-[11px] text-muted-fg italic">empty</span>
            ) : null}
          </div>
        </div>
        <Chevron open={open} />
      </button>

      {open ? (
        <div className="px-3.5 pb-3.5 pt-1 anim-in-soft">
          {hint ? (
            <p className="text-[11px] text-muted-fg mb-2">{hint}</p>
          ) : null}

          {isExamples ? (
            <ExamplesEditor
              component={component}
              onAdd={() => addExample(component.id)}
              onUpdate={(exId, patch) => updateExample(component.id, exId, patch)}
              onRemove={(exId) => removeExample(component.id, exId)}
            />
          ) : (
            <textarea
              ref={taRef}
              className="textarea"
              placeholder={component.placeholder}
              value={component.body}
              onChange={(e) => {
                setBody(component.id, e.target.value);
                onEdit(e.target.value.length);
              }}
              aria-label={`${component.label} body`}
            />
          )}

          <div className="mt-2 flex items-center gap-1 justify-end text-[11px]">
            <button
              className="btn-ghost !text-[11px] !py-1 !px-2"
              onClick={() => move(component.id, -1)}
              title="Move up"
            >
              up
            </button>
            <button
              className="btn-ghost !text-[11px] !py-1 !px-2"
              onClick={() => move(component.id, 1)}
              title="Move down"
            >
              down
            </button>
            <button
              className={cn(
                'btn-ghost !text-[11px] !py-1 !px-2',
                !component.enabled && 'text-muted-fg',
              )}
              onClick={() => toggleEnabled(component.id)}
            >
              {component.enabled ? 'include' : 'skipped'}
            </button>
            <button
              className="btn-ghost !text-[11px] !py-1 !px-2 text-danger/70 hover:text-danger"
              onClick={() => remove(component.id)}
            >
              delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={cn('text-muted-fg transition-transform', open && 'rotate-180')}
      aria-hidden
    >
      <path
        d="M4 6l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function DotBadge() {
  return (
    <span
      className="badge shrink-0"
      style={{
        width: 24,
        height: 24,
        backgroundColor: 'hsl(var(--muted))',
        color: 'hsl(var(--muted-fg))',
      }}
      aria-hidden
    >
      +
    </span>
  );
}

interface ExamplesProps {
  component: PromptComponent;
  onAdd: () => void;
  onUpdate: (exampleId: string, patch: Partial<{ input: string; output: string }>) => void;
  onRemove: (exampleId: string) => void;
}

function ExamplesEditor({ component, onAdd, onUpdate, onRemove }: ExamplesProps) {
  const examples = component.examples ?? [];
  return (
    <div className="space-y-3">
      {examples.length === 0 ? (
        <p className="text-[11px] text-muted-fg italic">
          No examples yet. Two or three input/output pairs lock in the shape you want.
        </p>
      ) : null}
      {examples.map((ex, i) => (
        <div key={ex.id} className="rounded-md border border-border p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-fg">Example {i + 1}</span>
            <button
              className="text-xs text-muted-fg hover:text-danger"
              onClick={() => onRemove(ex.id)}
            >
              remove
            </button>
          </div>
          <label className="block text-[11px] font-medium mb-1">Input</label>
          <textarea
            className="textarea mb-2 min-h-[50px]"
            value={ex.input}
            onChange={(e) => onUpdate(ex.id, { input: e.target.value })}
          />
          <label className="block text-[11px] font-medium mb-1">Output</label>
          <textarea
            className="textarea min-h-[50px]"
            value={ex.output}
            onChange={(e) => onUpdate(ex.id, { output: e.target.value })}
          />
        </div>
      ))}
      <button className="btn-outline !text-xs" onClick={onAdd}>
        + Add example
      </button>
    </div>
  );
}
