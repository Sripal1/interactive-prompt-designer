import { useSettings } from '@/store/settings';

/**
 * Read build-time defaults from Vite env vars and apply them to settings if the
 * field is still empty. Useful for local dev. Vite embeds `VITE_*` vars in the
 * JS bundle, so do not ship a private key in a public deploy.
 */
export function applyEnvDefaults(): void {
  const env = import.meta.env as Record<string, string | undefined>;
  const s = useSettings.getState();
  const patch: Partial<ReturnType<typeof useSettings.getState>> = {};

  const maybe = (field: keyof typeof s, envKey: string) => {
    const val = env[envKey];
    if (val && !s[field]) (patch as Record<string, unknown>)[field] = val;
  };

  maybe('geminiKey', 'VITE_GEMINI_API_KEY');
  maybe('geminiBaseUrl', 'VITE_GEMINI_BASE_URL');

  if (Object.keys(patch).length > 0) {
    useSettings.setState(patch);
  }
}
