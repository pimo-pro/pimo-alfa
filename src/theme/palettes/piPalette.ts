import type { TemplatePaletteOverrides } from "./types";
import { applyCiRemapToPalette } from "./ciRemap";

/**
 * Overrides de token do template Pi (Chalk / Iron / Sienna / Prussian).
 *
 * Fase 3 — mapeamento aprovado token-a-token (ver relatório de aprovação).
 * Decisões tomadas pelo utilizador:
 * 1. Superfícies sólidas (flat), sem glassmorphism/blur.
 * 2. --blue-dark / --blue-mid tratados como neutros (escala iron/chalk), sem tingido azul.
 * 3. --door-drawer-accent / --door-drawer-open usam Prussian (leitura de seleção).
 * 4. A barra superior (viewer/top/piece toolbar) acompanha o tema: iron-deep no escuro,
 *    bg-raised (mesma superfície elevada usada em painéis/sidebar) no claro — em vez de
 *    ficar fixa numa única cor como sugeriam os mockups.
 *
 * Cada valor aqui substitui, em runtime, o token equivalente de src/index.css — que
 * continua intacto e é exatamente o que o template Alpha usa.
 *
 * Aplicação CI: `PI_PALETTE_OVERRIDES` = hex/rgba autorados remapeados para
 * `var(--ci-*)` / `color-mix` (ver ciRemap.ts). A tabela hex/rgba em
 * `PI_PALETTE_HEX_OVERRIDES` é só a fonte auditável — o runtime Pi consome CI.
 * Resíduos deliberados (ex. #C8845A, sombras rgba(0,0,0,*)) ficam fora do SSOT.
 */
export const PI_PALETTE_HEX_OVERRIDES: TemplatePaletteOverrides = {
  dark: {
    // Paleta-base
    black: "#131518",
    navy: "#131518",
    "blue-dark": "#0E0F11",
    "blue-mid": "#2C2E30",
    "blue-light": "#1C4A7A",
    primary: "#1C4A7A",
    "text-main": "#F0EDE8",
    "text-muted": "#D8D4CE",
    glass: "rgba(216,212,206,0.06)",
    border: "#2C2E30",

    // Toolbars, seleção, ícones
    "bg-toolbar": "#0E0F11",
    "border-toolbar": "#2C2E30",
    "bg-item-hover": "rgba(216,212,206,0.10)",
    "border-item-hover": "rgba(216,212,206,0.15)",
    "bg-selected": "rgba(28,74,122,0.25)",
    "border-selected": "#1C4A7A",
    "bg-selected-icon": "rgba(28,74,122,0.30)",
    "bg-icon": "rgba(216,212,206,0.05)",
    "border-icon": "rgba(216,212,206,0.12)",
    "bg-icon-hover": "rgba(216,212,206,0.15)",
    "border-icon-hover": "rgba(216,212,206,0.22)",
    "toolbar-border": "#2C2E30",
    "viewer-toolbar-bg": "#131518",
    "top-toolbar-bg": "#131518",
    "viewer-toolbar-shadow": "0 1px 0 rgba(0,0,0,0.35)",
    "viewer-toolbar-inset": "inset 0 -1px 0 rgba(216,212,206,0.08)",
    "viewer-toolbar-icon": "#F0EDE8",
    "viewer-toolbar-hover-bg": "rgba(216,212,206,0.10)",
    "toolbar-pressed-bg": "rgba(28,74,122,0.25)",
    "toolbar-pressed-ring": "#1C4A7A",
    "focus-ring": "rgba(144,184,224,0.5)",
    "scrollbar-track": "rgba(216,212,206,0.05)",
    "scrollbar-thumb": "rgba(216,212,206,0.20)",
    "piece-toolbar-bg": "#131518",

    // Modais, popovers, cards, inputs
    "overlay-backdrop": "rgba(19,21,24,0.55)",
    "modal-bg": "#0A0B0C",
    "modal-border": "#2C2E30",
    "modal-shadow": "0 24px 60px rgba(0,0,0,0.45)",
    "btn-ghost-bg": "rgba(216,212,206,0.06)",
    "btn-ghost-border": "#2C2E30",
    "list-item-bg": "#0E0F11",
    "list-item-border": "#2C2E30",
    "card-bg": "#0A0B0C",
    "card-border": "#2C2E30",
    "input-bg": "#0E0F11",
    "input-border": "#2C2E30",
    "popover-bg": "#0A0B0C",
    "popover-border": "#2C2E30",
    "popover-shadow": "0 18px 40px rgba(0,0,0,0.45)",
    "panel-left-bg": "#0E0F11",
    "panel-left-shadow": "1px 0 0 rgba(0,0,0,0.08)",
    "panel-footer-bg": "#0E0F11",
    "panel-footer-border": "#2C2E30",
    divider: "#2C2E30",

    // Botões (tokens genéricos — unificação real na Fase 4)
    "button-ghost-bg": "rgba(216,212,206,0.06)",
    "button-ghost-border": "#2C2E30",
    "button-ghost-hover": "rgba(216,212,206,0.16)",
    "accent-button-bg": "rgba(28,74,122,0.18)",
    "accent-button-border": "#1C4A7A",

    // Workspace / viewer 3D
    "workspace-gradient-start": "#0E0F11",
    "workspace-gradient-end": "#131518",
    "workspace-footer-bg": "#0E0F11",
    "workspace-footer-border": "#2C2E30",
    "loading-overlay": "rgba(19,21,24,0.35)",
    "spinner-border": "rgba(216,212,206,0.3)",
    "spinner-top": "#1C4A7A",
    snapline: "rgba(28,74,122,0.5)",
    "drag-outline": "rgba(28,74,122,0.6)",
    "door-drawer-bg": "rgba(19,21,24,0.45)",
    "door-drawer-border": "rgba(216,212,206,0.4)",
    "door-drawer-shadow": "0 4px 10px rgba(0,0,0,0.3)",
    "door-drawer-accent": "#1C4A7A",
    "door-drawer-open": "rgba(28,74,122,0.25)",
    "cube-face-border": "#2C2E30",
    "cube-shadow": "rgba(0,0,0,0.3)",
    "panel-resizer-hover": "rgba(216,212,206,0.15)",

    // Status / roadmap
    "status-todo-bg": "rgba(216,212,206,0.12)",
    "status-todo-color": "#D8D4CE",
    "status-todo-border": "rgba(216,212,206,0.30)",
    "status-progress-bg": "rgba(139,74,28,0.20)",
    "status-progress-color": "#C8845A",
    "status-progress-border": "rgba(139,74,28,0.30)",
    "status-done-bg": "rgba(46,92,58,0.20)",
    "status-done-color": "#6dbc88",
    "status-done-border": "rgba(46,92,58,0.30)",
    "roadmap-row-bg": "rgba(216,212,206,0.03)",
    "roadmap-row-border": "rgba(216,212,206,0.08)",
    "roadmap-header-bg": "rgba(216,212,206,0.08)",
    "stat-card-bg": "rgba(216,212,206,0.04)",
    "stat-card-border": "rgba(216,212,206,0.08)",
    "progress-track-bg": "rgba(216,212,206,0.10)",
    "timeline-item-bg": "rgba(216,212,206,0.03)",
    "timeline-item-border": "rgba(216,212,206,0.08)",
    "task-row-bg": "rgba(216,212,206,0.03)",
    "task-row-border": "rgba(216,212,206,0.08)",
    "texture-preview-border": "rgba(216,212,206,0.08)",

    // Painel inferior / Admin
    "bottom-panel-bg": "#0A0B0C",
    "bottom-info-panel-inner-bg": "#131518",
    "admin-bg": "#131518",
    "admin-text": "#F0EDE8",
    "admin-sidebar-bg": "#0E0F11",
    "admin-card-bg": "#0A0B0C",
    "admin-card-border": "#2C2E30",
  },
  light: {
    // Paleta-base
    black: "#F8F6F2",
    navy: "#F0EDE8",
    "blue-dark": "#F8F6F2",
    "blue-mid": "#D8D4CE",
    "blue-light": "#1C4A7A",
    primary: "#1C4A7A",
    "text-main": "#131518",
    "text-muted": "#2C2E30",
    glass: "rgba(19,21,24,0.06)",
    border: "#D8D4CE",

    // Toolbars, seleção, ícones
    "bg-toolbar": "#F0EDE8",
    "border-toolbar": "#D8D4CE",
    "bg-item-hover": "rgba(19,21,24,0.10)",
    "border-item-hover": "rgba(19,21,24,0.15)",
    "bg-selected": "rgba(28,74,122,0.07)",
    "border-selected": "#1C4A7A",
    "bg-selected-icon": "rgba(28,74,122,0.15)",
    "bg-icon": "rgba(19,21,24,0.05)",
    "border-icon": "rgba(19,21,24,0.12)",
    "bg-icon-hover": "rgba(19,21,24,0.15)",
    "border-icon-hover": "rgba(19,21,24,0.22)",
    "toolbar-border": "#D8D4CE",
    "viewer-toolbar-bg": "#F8F6F2",
    "top-toolbar-bg": "#F8F6F2",
    "viewer-toolbar-shadow": "0 1px 0 rgba(0,0,0,0.06)",
    "viewer-toolbar-inset": "inset 0 -1px 0 rgba(19,21,24,0.05)",
    "viewer-toolbar-icon": "#131518",
    "viewer-toolbar-hover-bg": "rgba(19,21,24,0.10)",
    "toolbar-pressed-bg": "rgba(28,74,122,0.25)",
    "toolbar-pressed-ring": "#1C4A7A",
    "focus-ring": "rgba(28,74,122,0.45)",
    "scrollbar-track": "rgba(19,21,24,0.05)",
    "scrollbar-thumb": "rgba(19,21,24,0.20)",
    "piece-toolbar-bg": "#F8F6F2",

    // Modais, popovers, cards, inputs
    "overlay-backdrop": "rgba(19,21,24,0.55)",
    "modal-bg": "#FFFFFF",
    "modal-border": "#D8D4CE",
    "modal-shadow": "0 24px 60px rgba(0,0,0,0.15)",
    "btn-ghost-bg": "rgba(19,21,24,0.04)",
    "btn-ghost-border": "#D8D4CE",
    "list-item-bg": "#F8F6F2",
    "list-item-border": "#D8D4CE",
    "card-bg": "#FFFFFF",
    "card-border": "#D8D4CE",
    "input-bg": "#F8F6F2",
    "input-border": "#D8D4CE",
    "popover-bg": "#FFFFFF",
    "popover-border": "#D8D4CE",
    "popover-shadow": "0 18px 40px rgba(0,0,0,0.12)",
    "panel-left-bg": "#F8F6F2",
    "panel-left-shadow": "1px 0 0 rgba(0,0,0,0.05)",
    "panel-footer-bg": "#F8F6F2",
    "panel-footer-border": "#D8D4CE",
    divider: "#D8D4CE",

    // Botões (tokens genéricos — unificação real na Fase 4)
    "button-ghost-bg": "rgba(19,21,24,0.04)",
    "button-ghost-border": "#D8D4CE",
    "button-ghost-hover": "rgba(19,21,24,0.14)",
    "accent-button-bg": "rgba(28,74,122,0.18)",
    "accent-button-border": "#1C4A7A",

    // Workspace / viewer 3D
    "workspace-gradient-start": "#F8F6F2",
    "workspace-gradient-end": "#F0EDE8",
    "workspace-footer-bg": "#F8F6F2",
    "workspace-footer-border": "#D8D4CE",
    "loading-overlay": "rgba(240,237,232,0.6)",
    "spinner-border": "rgba(19,21,24,0.2)",
    "spinner-top": "#1C4A7A",
    snapline: "rgba(28,74,122,0.5)",
    "drag-outline": "rgba(28,74,122,0.6)",
    "door-drawer-bg": "rgba(240,237,232,0.75)",
    "door-drawer-border": "rgba(19,21,24,0.35)",
    "door-drawer-shadow": "0 4px 10px rgba(0,0,0,0.1)",
    "door-drawer-accent": "#1C4A7A",
    "door-drawer-open": "rgba(28,74,122,0.15)",
    "cube-face-border": "#D8D4CE",
    "cube-shadow": "rgba(0,0,0,0.15)",
    "panel-resizer-hover": "rgba(19,21,24,0.12)",

    // Status / roadmap
    "status-todo-bg": "rgba(19,21,24,0.10)",
    "status-todo-color": "#2C2E30",
    "status-todo-border": "rgba(19,21,24,0.25)",
    "status-progress-bg": "rgba(139,74,28,0.08)",
    "status-progress-color": "#5C2E0C",
    "status-progress-border": "rgba(139,74,28,0.30)",
    "status-done-bg": "rgba(46,92,58,0.08)",
    "status-done-color": "#1a3a22",
    "status-done-border": "rgba(46,92,58,0.30)",
    "roadmap-row-bg": "rgba(19,21,24,0.02)",
    "roadmap-row-border": "rgba(19,21,24,0.06)",
    "roadmap-header-bg": "rgba(19,21,24,0.06)",
    "stat-card-bg": "rgba(19,21,24,0.03)",
    "stat-card-border": "rgba(19,21,24,0.08)",
    "progress-track-bg": "rgba(19,21,24,0.10)",
    "timeline-item-bg": "rgba(19,21,24,0.03)",
    "timeline-item-border": "rgba(19,21,24,0.08)",
    "task-row-bg": "rgba(19,21,24,0.03)",
    "task-row-border": "rgba(19,21,24,0.08)",
    "texture-preview-border": "rgba(19,21,24,0.08)",

    // Painel inferior / Admin
    "bottom-panel-bg": "#FFFFFF",
    "bottom-info-panel-inner-bg": "#F8F6F2",
    "admin-bg": "#F0EDE8",
    "admin-text": "#131518",
    "admin-sidebar-bg": "#F8F6F2",
    "admin-card-bg": "#FFFFFF",
    "admin-card-border": "#D8D4CE",
  },
};

/** Remap Pi runtime: hex SSOT → `var(--ci-*)` (só template Pi; Alpha não lê isto). */
export const PI_PALETTE_OVERRIDES: TemplatePaletteOverrides =
  applyCiRemapToPalette(PI_PALETTE_HEX_OVERRIDES);
