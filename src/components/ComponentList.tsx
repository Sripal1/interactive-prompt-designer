import { useState } from 'react';
import { useComponents } from '@/store/components';
import { useSession } from '@/store/session';
import { COMPONENT_KINDS, type ComponentKind } from '@/prompt/schema';
import { ComponentCard } from './ComponentCard';
import { estimateTokens } from '@/lib/tokens';
import { renderPromptStats } from '@/prompt/render';

export function ComponentList() {
  const { components, addComponent } = useComponents();
  const addEvent = useSession((s) => s.addEvent);
  const stats = renderPromptStats(components);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <div>
          <h2 className="text-sm font-semibold">Your prompt</h2>
          <p className="text-[11px] text-muted-fg mt-0.5">
            Tap any card to edit. Changes are reflected in the final prompt live.
          </p>
        </div>
        <div className="text-[10px] text-muted-fg font-mono">
          {stats.filledSections}/{stats.totalSections} · ~{estimateTokens(stats.rendered)} tok
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
        {components.map((c) => (
          <ComponentCard
            key={c.id}
            component={c}
            onEdit={(len) =>
              addEvent({
                kind: 'edit',
                t: Date.now(),
                componentKind: c.kind,
                deltaChars: len - c.body.length,
              })
            }
          />
        ))}

        <AddComponentMenu onAdd={addComponent} />
      </div>
    </div>
  );
}

function AddComponentMenu({ onAdd }: { onAdd: (kind: ComponentKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-1">
      {!open ? (
        <button className="btn-outline !text-xs w-full" onClick={() => setOpen(true)}>
          + Add another component
        </button>
      ) : (
        <div className="card p-2.5 anim-in-soft">
          <div className="text-[11px] text-muted-fg mb-2 px-1">Add component</div>
          <div className="grid grid-cols-2 gap-1.5">
            {COMPONENT_KINDS.map((k) => (
              <button
                key={k}
                className="btn-ghost !justify-start !text-xs capitalize"
                onClick={() => {
                  onAdd(k);
                  setOpen(false);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <button className="btn-ghost w-full !text-[11px] text-muted-fg mt-1" onClick={() => setOpen(false)}>
            cancel
          </button>
        </div>
      )}
    </div>
  );
}
