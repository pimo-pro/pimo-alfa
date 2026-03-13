// src/components/ui/Panel.tsx

import { memo, type ReactNode } from "react";

export interface PanelProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  /** Classe CSS opcional para estilização externa. */
  className?: string;
}

const panelRootStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "var(--radius)",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
  backdropFilter: "blur(6px)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text-main)",
};

const descriptionStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
};

function PanelComponent({ title, description, children, className }: PanelProps) {
  return (
    <div style={panelRootStyle} className={className}>
      {title != null && title !== "" && <div style={titleStyle}>{title}</div>}
      {description != null && description !== "" && <div style={descriptionStyle}>{description}</div>}
      {children}
    </div>
  );
}

export default memo(PanelComponent);