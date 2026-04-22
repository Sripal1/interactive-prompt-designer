import { describe, expect, it } from 'vitest';
import { renderPrompt, renderPromptStats } from './render';
import { makeComponent } from './schema';

describe('renderPrompt', () => {
  it('skips empty components', () => {
    const rendered = renderPrompt([
      makeComponent('role', { body: 'You are a helpful assistant.' }),
      makeComponent('task', { body: '' }),
    ]);
    expect(rendered).toBe('# Role\nYou are a helpful assistant.');
  });

  it('skips disabled components even with content', () => {
    const rendered = renderPrompt([
      makeComponent('role', { body: 'X', enabled: false }),
      makeComponent('task', { body: 'Do Y' }),
    ]);
    expect(rendered).not.toContain('Role');
    expect(rendered).toContain('Task');
  });

  it('normalizes constraints into a bullet list', () => {
    const rendered = renderPrompt([
      makeComponent('constraints', { body: '  a\nb  \n- c' }),
    ]);
    expect(rendered.trim()).toBe(`# Constraints\n- a\n- b\n- c`);
  });

  it('renders examples as numbered input/output pairs', () => {
    const rendered = renderPrompt([
      makeComponent('examples', {
        body: '',
        examples: [
          { id: '1', input: 'hi', output: 'hello' },
          { id: '2', input: 'bye', output: 'goodbye' },
        ],
      }),
    ]);
    expect(rendered).toContain('Example 1:');
    expect(rendered).toContain('Example 2:');
    expect(rendered).toContain('hello');
  });

  it('uses custom label as heading for custom components', () => {
    const rendered = renderPrompt([
      makeComponent('custom', { label: 'Tone', body: 'Dry and technical.' }),
    ]);
    expect(rendered).toBe('# Tone\nDry and technical.');
  });

  it('reports stats including filled section count', () => {
    const stats = renderPromptStats([
      makeComponent('role', { body: 'X' }),
      makeComponent('task', { body: '' }),
      makeComponent('context', { body: 'Y' }),
    ]);
    expect(stats.filledSections).toBe(2);
    expect(stats.totalSections).toBe(3);
    expect(stats.chars).toBeGreaterThan(0);
  });
});
