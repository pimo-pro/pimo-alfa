/**
 * Tokens de tema partilhados (ADMIN + BottomInfo).
 * As variáveis CSS vivem em index.css (.theme-dark / .theme-light).
 */
export const surfaceTheme = {
  admin: {
    background: "var(--admin-bg)",
    text: "var(--admin-text)",
    sidebar: "var(--admin-sidebar-bg)",
    card: "var(--admin-card-bg)",
    cardBorder: "var(--admin-card-border)",
  },
  bottomInfo: {
    toolbarHeight: "var(--bottom-info-toolbar-height)",
    panelBackground: "var(--bottom-info-panel-inner-bg)",
  },
} as const;

export type SurfaceTheme = typeof surfaceTheme;
