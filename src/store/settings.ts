import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GEMMA_MODEL } from '@/providers/registry';

export interface SettingsState {
  /** The single provider / model is hard-coded. Kept as constants so callers
   *  don't have to know. */
  temperature: number;
  geminiKey: string;
  geminiBaseUrl: string;
  loggingEnabled: boolean;
  consentAcknowledged: boolean;
  hasSeenModelSetupPrompt: boolean;

  setTemperature: (t: number) => void;
  setField: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  clearKey: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      temperature: 0.7,
      geminiKey: '',
      geminiBaseUrl: '',
      loggingEnabled: true,
      consentAcknowledged: false,
      hasSeenModelSetupPrompt: false,

      setTemperature: (temperature) => set({ temperature }),
      setField: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      clearKey: () => set({ geminiKey: '' }),
    }),
    { name: 'interactive-prompt-designer:settings', version: 4 },
  ),
);

/** The one model the app uses. Re-exported here so UI components don't all
 *  reach into providers/. */
export const MODEL_ID = GEMMA_MODEL;
