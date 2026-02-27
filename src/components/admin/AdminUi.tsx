/* eslint-disable react-refresh/only-export-components */

import type { CSSProperties, ReactNode } from "react";

export const adminPageShellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minHeight: 0,
};

export const adminPageTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "var(--text-main)",
  margin: 0,
  lineHeight: 1.2,
};

export const adminPageSubtitleStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  margin: 0,
};

export const adminLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "inline-block",
};

export const adminFieldErrorStyle: CSSProperties = {
  fontSize: 11,
  color: "#fca5a5",
  marginTop: 4,
};

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={adminPageTitleStyle}>{title}</h1>
        {subtitle ? <p style={adminPageSubtitleStyle}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

export function AdminStickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        padding: "10px 12px",
        borderRadius: "var(--radius)",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "color-mix(in srgb, var(--navy) 86%, black)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}
