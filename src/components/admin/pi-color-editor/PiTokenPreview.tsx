import type { CSSProperties } from "react";

const swatchStyle = (color: string | undefined): CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--card-border)",
  background: color && color.trim() ? color : "var(--card-bg)",
  backgroundImage:
    !color || !color.trim()
      ? "linear-gradient(45deg, var(--border) 25%, transparent 25%), linear-gradient(-45deg, var(--border) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--border) 75%), linear-gradient(-45deg, transparent 75%, var(--border) 75%)"
      : undefined,
  backgroundSize: !color || !color.trim() ? "8px 8px" : undefined,
  backgroundPosition: !color || !color.trim() ? "0 0, 0 4px, 4px -4px, -4px 0" : undefined,
  flexShrink: 0,
});

export default function PiTokenPreview({
  token,
  value,
  compact,
}: {
  token: string;
  value: string | undefined;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        title={value ?? "(sem valor)"}
        style={{
          ...swatchStyle(value),
          width: 16,
          height: 16,
          borderRadius: 4,
          display: "inline-block",
          verticalAlign: "middle",
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={swatchStyle(value)} aria-hidden />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>--{token}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            wordBreak: "break-all",
          }}
        >
          {value ?? "(herda / vazio)"}
        </div>
      </div>
    </div>
  );
}
