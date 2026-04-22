import { useEffect, useRef, useState } from 'react';
import { useSettings, MODEL_ID } from '@/store/settings';
import { makeProvider, GEMMA_DISPLAY_NAME } from '@/providers/registry';

export type ConnectionStatus =
  | { kind: 'needs-key'; providerLabel: string; model: string }
  | { kind: 'checking'; providerLabel: string; model: string }
  | { kind: 'ready'; providerLabel: string; model: string }
  | { kind: 'error'; providerLabel: string; model: string; message: string };

/**
 * Lightweight ping of the provider to answer "is this thing actually set up
 * and responding?" Single source of truth for all the UI surfaces that ask
 * whether the user can run prompts.
 */
export function useConnectionStatus(): ConnectionStatus {
  const geminiKey = useSettings((s) => s.geminiKey);
  const geminiBaseUrl = useSettings((s) => s.geminiBaseUrl);

  const [status, setStatus] = useState<ConnectionStatus>(() =>
    geminiKey
      ? { kind: 'checking', providerLabel: GEMMA_DISPLAY_NAME, model: MODEL_ID }
      : { kind: 'needs-key', providerLabel: GEMMA_DISPLAY_NAME, model: MODEL_ID },
  );

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!geminiKey) {
      setStatus({ kind: 'needs-key', providerLabel: GEMMA_DISPLAY_NAME, model: MODEL_ID });
      return;
    }
    setStatus({ kind: 'checking', providerLabel: GEMMA_DISPLAY_NAME, model: MODEL_ID });

    if (timerRef.current) window.clearTimeout(timerRef.current);
    const handle = window.setTimeout(async () => {
      try {
        const p = makeProvider({ geminiKey, geminiBaseUrl });
        const models = await p.listModels();
        if (models.length === 0) {
          setStatus({
            kind: 'error',
            providerLabel: GEMMA_DISPLAY_NAME,
            model: MODEL_ID,
            message: 'The key did not authenticate. Double-check it and try again.',
          });
        } else {
          setStatus({
            kind: 'ready',
            providerLabel: GEMMA_DISPLAY_NAME,
            model: MODEL_ID,
          });
        }
      } catch (err) {
        setStatus({
          kind: 'error',
          providerLabel: GEMMA_DISPLAY_NAME,
          model: MODEL_ID,
          message: (err as Error).message ?? 'Unknown error',
        });
      }
    }, 500);
    timerRef.current = handle as unknown as number;

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [geminiKey, geminiBaseUrl]);

  return status;
}
