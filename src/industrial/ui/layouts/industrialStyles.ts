import type { CSSProperties } from 'react';

/** Classe para hover / focus-visible / disabled / press nos controlos industriais. */
export const INDUSTRIAL_CONTROL_CLASS = 'pimo-ind-ctrl';
export const INDUSTRIAL_PANEL_MOTION_CLASS = 'pimo-ind-panel-enter';
export const INDUSTRIAL_CANVAS_MOTION_CLASS = 'pimo-ind-canvas-enter';
export const INDUSTRIAL_HINT_MOTION_CLASS = 'pimo-ind-hint-enter';
export const INDUSTRIAL_LIST_ITEM_CLASS = 'pimo-ind-list-item';
export const INDUSTRIAL_VISION_ACTIVE_CLASS = 'pimo-ind-vision-active';
export const INDUSTRIAL_VISION_SECONDARY_CLASS = 'pimo-ind-vision-secondary';

const INDUSTRIAL_INTERACTION_CSS = `
@keyframes pimo-ind-panel-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pimo-ind-canvas-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes pimo-ind-hint-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pimo-ind-list-in {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

.${INDUSTRIAL_CONTROL_CLASS} {
  transition: all 140ms ease-out;
}
.${INDUSTRIAL_CONTROL_CLASS}:hover:not(:disabled) {
  box-shadow: inset 0 0 0 999px rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}
.${INDUSTRIAL_CONTROL_CLASS}:active:not(:disabled) {
  transform: scale(0.98);
}
.${INDUSTRIAL_CONTROL_CLASS}:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.55);
  outline-offset: 2px;
  transform: scale(1.02);
}
.${INDUSTRIAL_CONTROL_CLASS}:disabled {
  opacity: 0.4;
  cursor: default;
  transform: none;
}

.${INDUSTRIAL_CONTROL_CLASS}[data-active="true"] {
  transform: translateX(2px) translateY(-2px);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.45);
  transition: all 140ms ease-out;
}
.${INDUSTRIAL_CONTROL_CLASS}[data-active="true"]:hover:not(:disabled) {
  transform: translateX(2px) translateY(-2px);
}
.${INDUSTRIAL_CONTROL_CLASS}[data-active="true"]:active:not(:disabled) {
  transform: translateX(2px) scale(0.98);
}

.${INDUSTRIAL_PANEL_MOTION_CLASS} {
  animation: pimo-ind-panel-in 180ms ease-out both;
}
.${INDUSTRIAL_CANVAS_MOTION_CLASS} {
  animation: pimo-ind-canvas-in 220ms ease-out both;
}
.${INDUSTRIAL_HINT_MOTION_CLASS} {
  animation: pimo-ind-hint-in 220ms ease-out both;
  animation-delay: 80ms;
}
.${INDUSTRIAL_LIST_ITEM_CLASS} {
  animation: pimo-ind-list-in 160ms ease-out both;
  transition: all 140ms ease-out;
  min-height: 28px;
}
.${INDUSTRIAL_LIST_ITEM_CLASS}:hover {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.45);
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}
.${INDUSTRIAL_LIST_ITEM_CLASS}:focus-within {
  transform: scale(1.02);
  outline: 2px solid rgba(59, 130, 246, 0.55);
}
.${INDUSTRIAL_LIST_ITEM_CLASS}[data-active="true"] {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.45);
  outline: 2px solid rgba(59, 130, 246, 0.55);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
  border-left: 2px solid rgba(59, 130, 246, 0.45);
}

.${INDUSTRIAL_VISION_ACTIVE_CLASS} {
  background: rgba(255, 255, 255, 0.06);
  border-left: 2px solid rgba(59, 130, 246, 0.45);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.45);
  transition: all 140ms ease-out;
  transform: translateY(-2px);
}
.${INDUSTRIAL_VISION_SECONDARY_CLASS} {
  opacity: 0.85;
  transition: all 140ms ease-out;
}
`;

export function ensureIndustrialInteractionStyles(): void {
  if (typeof document === 'undefined') return;
  const id = 'pimo-industrial-interaction-styles';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = INDUSTRIAL_INTERACTION_CSS;
}

if (typeof document !== 'undefined') {
  ensureIndustrialInteractionStyles();
}

/** Estilos partilhados — espelham PieceMainView (tema escuro / Operador). */
export const industrialPanelStyle: CSSProperties = {
  border: '1px solid var(--border, #334155)',
  borderRadius: 8,
  background: 'var(--panel-bg, rgba(15, 23, 42, 0.4))',
  padding: 16,
  minHeight: 0,
  boxShadow: '0 0 0 1px #334155, 0 6px 18px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)',
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  transition: 'all 140ms ease-out',
};

/** Painéis Ordens/Estações — fundo claro + texto escuro (#1e1e1e). */
export const industrialPanelStyleLight: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#ffffff',
  padding: 16,
  minHeight: 0,
  color: '#1e1e1e',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
  transition: 'all 140ms ease-out',
};

export const industrialLightText = '#1e1e1e';
export const industrialLightMuted = '#475569';
export const industrialLightBorder = '#cbd5e1';
export const industrialLightSurface = '#f8fafc';

export const industrialCanvasShellStyle: CSSProperties = {
  position: 'relative',
  minHeight: 480,
  height: 'calc(100vh - 240px)',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid var(--border, #334155)',
  background: '#020617',
};

export const industrialSectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#a3b2c2',
  lineHeight: 1.5,
};

/** Títulos de secção — Ordens/Estações (fundo claro). */
export const industrialSectionTitleStyleLight: CSSProperties = {
  ...industrialSectionTitleStyle,
  color: '#475569',
};

export const industrialListItemStyle: CSSProperties = {
  listStyle: 'none',
  padding: '6px 6px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  fontSize: 12,
  border: '1px solid transparent',
  minHeight: 28,
  color: '#f1f5f9',
  lineHeight: 1.5,
  transition: 'all 140ms ease-out',
};

export const industrialListItemStyleLight: CSSProperties = {
  ...industrialListItemStyle,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#1e1e1e',
};

export function industrialBtnStyle(active = false): CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 'var(--pi-btn-radius, 6px)',
    border: '1px solid var(--border, #334155)',
    background: active ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.04)',
    color: 'var(--text-main, #f1f5f9)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 140ms ease-out',
    lineHeight: 1.5,
    ...(active
      ? {
          boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
          transform: 'translateY(-2px)',
        }
      : {}),
  };
}

export function industrialBtnStyleLight(active = false): CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 'var(--pi-btn-radius, 6px)',
    border: '1px solid #cbd5e1',
    background: active ? 'rgba(37, 99, 235, 0.12)' : '#f8fafc',
    color: '#1e1e1e',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 140ms ease-out',
    lineHeight: 1.5,
    ...(active
      ? {
          boxShadow: '0 0 0 2px rgba(37,99,235,0.35)',
          transform: 'translateY(-2px)',
        }
      : {}),
  };
}

export const industrialActionBtnStyle: CSSProperties = {
  padding: '5px 8px',
  fontSize: 11,
  borderRadius: 'var(--pi-btn-radius, 6px)',
  border: '1px solid var(--border, #334155)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-main, #f1f5f9)',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 140ms ease-out',
  lineHeight: 1.5,
};

export const industrialActionBtnStyleLight: CSSProperties = {
  ...industrialActionBtnStyle,
  border: '1px solid #cbd5e1',
  background: '#f1f5f9',
  color: '#1e1e1e',
};

/** "Confirmar" mantem o verde semantico no Pi (--pi-btn-confirm-bg) — nao vira Prussian. */
export const industrialConfirmBtnStyle: CSSProperties = {
  padding: '10px 18px',
  borderRadius: 'var(--pi-btn-radius, 6px)',
  border: 'none',
  background: 'var(--pi-btn-confirm-bg, #16a34a)',
  color: 'var(--pi-btn-on-accent-text, #fff)',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 140ms ease-out',
  lineHeight: 1.5,
};

/** Profundidade perceptiva industrial (F5 + F6). */
export const industrialPanelDepthStyle: CSSProperties = {
  boxShadow: '0 0 0 1px #334155, 0 6px 18px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)',
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  transition: 'all 140ms ease-out',
};

/** Realce de secção activa (Vision Tracking). */
export const industrialVisionActiveStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  borderLeft: '2px solid rgba(59,130,246,0.45)',
  boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
  transition: 'all 140ms ease-out',
  transform: 'translateY(-2px)',
  borderRadius: 6,
  padding: '8px 10px',
};

/** Secção secundária (fluxo visual). */
export const industrialVisionSecondaryStyle: CSSProperties = {
  opacity: 0.85,
  transition: 'all 140ms ease-out',
};
