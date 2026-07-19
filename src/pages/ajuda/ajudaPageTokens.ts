/**
 * Tokens de consumidores finais (Help / WhatsNew) — CI-native com fallback Alpha.
 *
 * Sob Pi: `--ci-*` (definidos em index.css + bridge).
 * Sob Alpha: fallbacks `--blue-light` / Tailwind históricos.
 * Overrides Fase 6 (`--accent-button-*`) continuam a ganhar quando definidos.
 */
export const AJUDA_PAGE_TOKENS = {
  bg: "var(--navy,#0f172a)",
  surface: "var(--card-bg,rgba(255,255,255,0.03))",
  border: "var(--card-border,rgba(255,255,255,0.07))",
  text: "var(--text-main,#e2e8f0)",
  muted: "var(--text-muted,#94a3b8)",
  accent: "var(--ci-prussian-600, var(--blue-light,#3b82f6))",
  accentBg:
    "var(--accent-button-bg, color-mix(in srgb, var(--ci-prussian-600, var(--blue-light,#3b82f6)) 10%, transparent))",
  accentBd:
    "var(--accent-button-border, color-mix(in srgb, var(--ci-prussian-600, var(--blue-light,#3b82f6)) 25%, transparent))",
} as const;

/** Tint seguro com CSS vars (evita concatenação hex inválida tipo `var(...)12`). */
export function ciTint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export const ajudaPageFont =
  "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
