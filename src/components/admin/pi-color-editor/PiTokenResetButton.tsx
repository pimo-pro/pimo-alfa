import type { CSSProperties } from "react";
import { clearPiTokenOverride, type ThemeMode } from "../../../theme/palettes/piTokenOverridesApi";

const btnStyle: CSSProperties = {
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: "var(--radius)",
  border: "1px solid var(--button-ghost-border)",
  background: "var(--button-ghost-bg)",
  color: "var(--text-main)",
};

export default function PiTokenResetButton({
  mode,
  token,
  disabled,
  label = "Repor",
}: {
  mode: ThemeMode;
  token: string;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      style={{ ...btnStyle, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      disabled={disabled}
      onClick={() => clearPiTokenOverride(mode, token)}
      title="Remove o override deste token (volta à paleta Pi / SSOT)"
    >
      {label}
    </button>
  );
}
