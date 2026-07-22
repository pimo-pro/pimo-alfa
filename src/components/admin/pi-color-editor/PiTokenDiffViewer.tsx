import type { CSSProperties } from "react";
import {
  clearAllPiTokenOverrides,
  clearPiTokenOverridesForMode,
  type ThemeMode,
} from "../../../theme/palettes/piTokenOverridesApi";
import PiTokenPreview from "./PiTokenPreview";
import PiTokenResetButton from "./PiTokenResetButton";
import { baselineTokenValue, usePiTokenEditorSnapshot } from "./piTokenEditorShared";

const shell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid var(--card-border)",
  fontSize: 11,
};

export default function PiTokenDiffViewer({ mode }: { mode: ThemeMode }) {
  const { overridden, layers } = usePiTokenEditorSnapshot(mode);

  if (overridden.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Sem overrides de utilizador neste modo. Os valores váo da paleta Pi
        {Object.keys(layers.ciSsotBridge).length > 0 ? " / SSOT" : ""}.
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)" }}>
          Diff de overrides ({overridden.length})
        </span>
        <button
          type="button"
          onClick={() => clearPiTokenOverridesForMode(mode)}
          style={{
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: "var(--radius)",
            border: "1px solid var(--button-ghost-border)",
            background: "var(--button-ghost-bg)",
            color: "var(--text-main)",
          }}
        >
          Limpar modo {mode}
        </button>
        <button
          type="button"
          onClick={() => clearAllPiTokenOverrides()}
          style={{
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: "var(--radius)",
            border: "1px solid var(--status-todo-border, var(--card-border))",
            background: "var(--status-todo-bg, var(--button-ghost-bg))",
            color: "var(--status-todo-color, var(--text-main))",
          }}
        >
          Limpar dark + light
        </button>
      </div>

      <div style={{ ...row, fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--card-border)" }}>
        <span>Token</span>
        <span>Baseline</span>
        <span>Override</span>
        <span />
      </div>

      {overridden.map((token) => {
        const base = baselineTokenValue(mode, token);
        const override = layers.userOverrides[token];
        return (
          <div key={token} style={row}>
            <code style={{ color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis" }}>
              --{token}
            </code>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <PiTokenPreview token={token} value={base} compact />
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={base}
              >
                {base ?? "—"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <PiTokenPreview token={token} value={override} compact />
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  color: "var(--text-main)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={override}
              >
                {override ?? "—"}
              </span>
            </div>
            <PiTokenResetButton mode={mode} token={token} label="—" />
          </div>
        );
      })}
    </div>
  );
}
