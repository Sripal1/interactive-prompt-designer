import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  defaultComponents,
  makeComponent,
  type ComponentKind,
  type ExamplePair,
  type PromptComponent,
} from '@/prompt/schema';

export interface ComponentsState {
  components: PromptComponent[];
  setBody: (id: string, body: string) => void;
  setLabel: (id: string, label: string) => void;
  toggleEnabled: (id: string) => void;
  remove: (id: string) => void;
  addComponent: (kind: ComponentKind) => void;
  move: (id: string, direction: -1 | 1) => void;
  addExample: (id: string) => void;
  updateExample: (id: string, exampleId: string, patch: Partial<ExamplePair>) => void;
  removeExample: (id: string, exampleId: string) => void;
  resetToDefaults: () => void;
}

export const useComponents = create<ComponentsState>()(
  persist(
    (set) => ({
      components: defaultComponents(),

      setBody: (id, body) =>
        set((s) => ({
          components: s.components.map((c) => (c.id === id ? { ...c, body } : c)),
        })),

      setLabel: (id, label) =>
        set((s) => ({
          components: s.components.map((c) => (c.id === id ? { ...c, label } : c)),
        })),

      toggleEnabled: (id) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, enabled: !c.enabled } : c,
          ),
        })),

      remove: (id) =>
        set((s) => ({ components: s.components.filter((c) => c.id !== id) })),

      addComponent: (kind) =>
        set((s) => ({ components: [...s.components, makeComponent(kind)] })),

      move: (id, direction) =>
        set((s) => {
          const idx = s.components.findIndex((c) => c.id === id);
          if (idx === -1) return s;
          const target = idx + direction;
          if (target < 0 || target >= s.components.length) return s;
          const next = [...s.components];
          const [removed] = next.splice(idx, 1);
          next.splice(target, 0, removed);
          return { components: next };
        }),

      addExample: (id) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id
              ? {
                  ...c,
                  examples: [
                    ...(c.examples ?? []),
                    { id: nanoid(6), input: '', output: '' },
                  ],
                }
              : c,
          ),
        })),

      updateExample: (id, exampleId, patch) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id
              ? {
                  ...c,
                  examples: (c.examples ?? []).map((e) =>
                    e.id === exampleId ? { ...e, ...patch } : e,
                  ),
                }
              : c,
          ),
        })),

      removeExample: (id, exampleId) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id
              ? { ...c, examples: (c.examples ?? []).filter((e) => e.id !== exampleId) }
              : c,
          ),
        })),

      resetToDefaults: () => set({ components: defaultComponents() }),
    }),
    { name: 'interactive-prompt-designer:components', version: 2 },
  ),
);
