import type { CSSProperties } from "react";
import type { PiPaletteLayerId } from "../../../theme/palettes/piTokenOverridesApi";
import { LAYER_LABELS } from "./piTokenEditorShared";

const badgeStyle = (layer: PiPaletteLayerId | "none"): CSSProperties => {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    userOverrides: {
      bg: "var(--bg-selected, rgba(59,130,246,0.15))",
      fg: "var(--blue-light, #3b82f6)",
      bd: "var(--border-selected, rgba(59,130,246,0.35))",
    },
    ciSsotBridge: {
      bg: "var(--status-progress-bg, rgba(250,204,21,0.12))",
      fg: "var(--status-progress-color, #facc15)",
      bd: "var(--status-progress-border, rgba(250,204,21,0.35))",
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
