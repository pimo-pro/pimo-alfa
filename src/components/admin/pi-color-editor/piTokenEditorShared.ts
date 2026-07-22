import { useEffect, useReducer } from "react";
import {
  getPiPaletteLayers,
  listOverriddenPiTokens,
  resolvePiPaletteForMode,
  resolvePiTokenSource,
  subscribePiTokenOverrides,
  type ThemeMode,
} from "../../../theme/palettes/piTokenOverridesApi";

/** Re-render quando a API de overrides notifica (storage / setPiTokenOverride). */
export function usePiTokenOverridesRevision(): number {
  const [revision, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribePiTokenOverrides(() => bump()), []);
  return revision;
}

export function usePiTokenEditorSnapshot(mode: ThemeMode) {
  const revision = usePiTokenOverridesRevision();
  const layers = getPiPaletteLayers(mode);
  const resolved = resolvePiPaletteForMode(mode);
  const overridden = listOverriddenPiTokens(mode);
  return { revision, layers, resolved, overridden };
}

export function isCssColorPickerValue(value: string): boolean {
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v);
}

export function baselineTokenValue(mode: ThemeMode, token: string): string | undefined {
  const layers = getPiPaletteLayers(mode);
  return layers.ciSsotBridge[token] ?? layers.piPalette[token];
}

export function describeTokenSource(mode: ThemeMode, token: string) {
  return resolvePiTokenSource(mode, token);
}

export const LAYER_LABELS = {
  piPalette: "Paleta Pi",
  ciSsotBridge: "SSOT",
  userOverrides: "Override",
  none: "—",
} as const;
