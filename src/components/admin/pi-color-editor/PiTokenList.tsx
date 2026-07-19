import type { CSSProperties } from "react";
import { THEME_TOKEN_GROUPS } from "../../../theme/palettes/tokenList";
import type { ThemeMode } from "../../../theme/palettes/piTokenOverridesApi";
import PiTokenPreview from "./PiTokenPreview";
import PiTokenSourceBadge from "./PiTokenSourceBadge";
import { describeTokenSource } from "./piTokenEditorShared";

const rowStyle = (active: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  padding: "7px 10px",
  border: "none",
  borderBottom: "1px solid var(--card-border)",
  background: active ? "var(--toolbar-pressed-bg)" : "transparent",
  color: "var(--text-main)",
  cursor: "pointer",
  fontSize: 12,
});

export default function PiTokenList({
  mode,
  selectedToken,
  onSelect,
  query,
  onlyOverridden,
}: {
  mode: ThemeMode;
  selectedToken: string | null;
  onSelect: (token: string) => void;
  query: string;
  onlyOverridden: boolean;
}) {
  const q = query.trim().toLowerCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {THEME_TOKEN_GROUPS.map((group) => {
        const tokens = group.tokens.filter((token) => {
          const source = describeTokenSource(mode, token);
          if (onlyOverridden && source.layer !== "userOverrides") return false;
          if (!q) return true;
          return token.toLowerCase().includes(q) || group.group.toLowerCase().includes(q);
        });
        if (tokens.length === 0) return null;

        return (
          <div key={group.group}>
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                padding: "8px 10px 4px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                background: "var(--card-bg)",
                borderBottom: "1px solid var(--card-border)",
              }}
            >
              {group.group}
            </div>
            {tokens.map((token) => {
              const source = describeTokenSource(mode, token);
              const active = selectedToken === token;
              return (
                <button
                  key={token}
                  type="button"
                  style={rowStyle(active)}
                  onClick={() => onSelect(token)}
                  aria-pressed={active}
                >
                  <PiTokenPreview token={token} value={source.value} compact />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {token}
                  </span>
                  <PiTokenSourceBadge layer={source.layer} />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
