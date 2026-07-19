import type { CSSProperties } from 'react';

/** Estilos partilhados — espelham PieceMainView. */
export const industrialPanelStyle: CSSProperties = {
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 8,
  background: 'var(--panel-bg, rgba(15, 23, 42, 0.4))',
  padding: 16,
  minHeight: 0,
};

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
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#94a3b8',
};

export const industrialListItemStyle: CSSProperties = {
  listStyle: 'none',
  padding: '6px 8px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  fontSize: 12,
};

export function industrialBtnStyle(active = false): CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 'var(--pi-btn-radius, 6px)',
    border: '1px solid var(--border, #334155)',
    background: active ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.04)',
    color: 'var(--text-main, #f8fafc)',
    cursor: 'pointer',
  };
}

export const industrialActionBtnStyle: CSSProperties = {
  padding: '5px 8px',
  fontSize: 11,
  borderRadius: 'var(--pi-btn-radius, 6px)',
  border: '1px solid var(--border, #334155)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-main, #f8fafc)',
  cursor: 'pointer',
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
};
