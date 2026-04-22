import { useMemo } from 'react';
import { useComponents } from '@/store/components';
import { renderPromptStats } from '@/prompt/render';
import { estimateTokens } from '@/lib/tokens';

export function RenderedPromptPane() {
  const { components } = useComponents();
  const { rendered, chars, filledSections, totalSections } = useMemo(
    () => renderPromptStats(components),
    [components],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-muted-fg font-sans">
        <span>
          {filledSections}/{totalSections} sections filled · {chars} chars · ~
          {estimateTokens(rendered)} tokens
        </span>
        <button
          className="btn-ghost !text-xs"
          onClick={() => navigator.clipboard.writeText(rendered)}
        >
          Copy
        </button>
      </div>
      {rendered ? (
        <pre className="whitespace-pre-wrap">{rendered}</pre>
      ) : (
        <p className="text-muted-fg font-sans text-sm">
          Nothing rendered yet — add some content to a component.
        </p>
      )}
    </div>
  );
}
