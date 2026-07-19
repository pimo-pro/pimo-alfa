import type { CSSProperties } from "react";
import type { PiPaletteLayerId } from "../../../theme/palettes/piTokenOverridesApi";
import { LAYER_LABELS } from "./piTokenEditorShared";

const badgeStyle = (layer: PiPaletteLayerId | "none"): CSSProperties => {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    userOverrides: {
      bg: "var(--bg-selected, color-mix(in srgb, var(--ci-prussian-600, #3b82f6) 15%, transparent))",
      fg: "var(--ci-prussian-600, var(--blue-light, #3b82f6))",
      bd: "var(--border-selected, color-mix(in srgb, var(--ci-prussian-600, #3b82f6) 35%, transparent))",
    },
    ciSsotBridge: {
      bg: "var(--status-progress-bg, color-mix(in srgb, var(--ci-sienna-400, #facc15) 12%, transparent))",
      fg: "var(--status-progress-color, var(--ci-sienna-400, #facc15))",
      bd: "var(--status-progress-border, color-mix(in srgb, var(--ci-sienna-400, #facc15) 35%, transparent))",
    },
    piPalette: {
      bg: "var(--button-ghost-bg)",
      fg: "var(--text-muted)",
      bd: "var(--card-border)",
    },
    none: {
      bg: "transparent",
      fg: "var(--text-muted)",
      bd: "var(--card-border)",
    },
  };
  const t = tones[layer] ?? tones.none;
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    background: t.bg,
    color: t.fg,
    border: `1px solid ${t.bd}`,
    whiteSpace: "nowrap",
  };
};

export default function PiTokenSourceBadge({
  layer,
}: {
  layer: PiPaletteLayerId | "none";
}) {
  return <span style={badgeStyle(layer)}>{LAYER_LABELS[layer]}</span>;
}
