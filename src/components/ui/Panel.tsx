// src/components/ui/Panel.tsx

import { memo, type ReactNode } from "react";
import { MiniHelpTooltip } from "./MiniHelpTooltip";

export interface PanelProps {
  title?: string;
  description?: string;
  /** Texto do Mini‑Tooltip de Ajuda ao lado do título (substitui description equivalente). */
  titleHelpText?: string;
  children?: ReactNode;
  /** Classe CSS opcional para estilização externa. */
  className?: string;
}

const panelRootStyle: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  borderRadius: "var(--radius)",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
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

function PanelComponent({ title, description, titleHelpText, children, className }: PanelProps) {
  return (
    <div style={panelRootStyle} className={className}>
      {title != null && title !== "" && (
        <div style={titleStyle}>
          {titleHelpText ? (
            <span className="section-title-with-help">
              {title}
              <MiniHelpTooltip text={titleHelpText} />
            </span>
          ) : (
            title
          )}
        </div>
      )}
      {description != null && description !== "" && <div style={descriptionStyle}>{description}</div>}
      {children}
    </div>
  );
}

export default memo(PanelComponent);
