/**
 * Catálogo de todos os tokens de tema definidos em src/index.css
 * (blocos `.theme-dark` / `.theme-light`), agrupados por área.
 *
 * Usado por:
 * - src/theme/palettes/piPalette.ts — mapeamento Alpha → Pi (Fase 3)
 * - futura UI de edição de tokens (Fase 6) — para saber o que é editável e como agrupar
 *
 * Esta lista não define valores, só nomes e agrupamento — os valores continuam
 * a viver em index.css (Alpha) ou em piPalette.ts (overrides do Pi).
 */

export interface TokenGroupDef {
  group: string;
  tokens: string[];
}

export const THEME_TOKEN_GROUPS: TokenGroupDef[] = [
  {
    group: "Paleta-base",
    tokens: [
      "black",
      "navy",
      "blue-dark",
      "blue-mid",
      "blue-light",
      "primary",
      "text-main",
      "text-muted",
      "glass",
      "border",
    ],
  },
  {
    group: "Toolbars, seleção, ícones",
    tokens: [
      "bg-toolbar",
      "border-toolbar",
      "bg-item-hover",
      "border-item-hover",
      "bg-selected",
      "border-selected",
      "bg-selected-icon",
      "bg-icon",
      "border-icon",
      "bg-icon-hover",
      "border-icon-hover",
      "toolbar-border",
      "viewer-toolbar-bg",
      "top-toolbar-bg",
      "viewer-toolbar-shadow",
      "viewer-toolbar-inset",
      "viewer-toolbar-icon",
      "viewer-toolbar-hover-bg",
      "toolbar-pressed-bg",
      "toolbar-pressed-ring",
      "focus-ring",
      "scrollbar-track",
      "scrollbar-thumb",
      "piece-toolbar-bg",
    ],
  },
  {
    group: "Modais, popovers, cards, inputs",
    tokens: [
      "overlay-backdrop",
      "modal-bg",
      "modal-border",
      "modal-shadow",
      "btn-ghost-bg",
      "btn-ghost-border",
      "list-item-bg",
      "list-item-border",
      "card-bg",
      "card-border",
      "input-bg",
      "input-border",
      "popover-bg",
      "popover-border",
      "popover-shadow",
      "panel-left-bg",
      "panel-left-shadow",
      "panel-footer-bg",
      "panel-footer-border",
      "divider",
    ],
  },
  {
    group: "Botões",
    tokens: ["button-ghost-bg", "button-ghost-border", "button-ghost-hover", "accent-button-bg", "accent-button-border"],
  },
  {
    group: "Workspace / viewer 3D",
    tokens: [
      "workspace-gradient-start",
      "workspace-gradient-end",
      "workspace-footer-bg",
      "workspace-footer-border",
      "loading-overlay",
      "spinner-border",
      "spinner-top",
      "snapline",
      "drag-outline",
      "door-drawer-bg",
      "door-drawer-border",
      "door-drawer-shadow",
      "door-drawer-accent",
      "door-drawer-open",
      "cube-face-border",
      "cube-shadow",
      "panel-resizer-hover",
    ],
  },
  {
    group: "Status / roadmap",
    tokens: [
      "status-todo-bg",
      "status-todo-color",
      "status-todo-border",
      "status-progress-bg",
      "status-progress-color",
      "status-progress-border",
      "status-done-bg",
      "status-done-color",
      "status-done-border",
      "roadmap-row-bg",
      "roadmap-row-border",
      "roadmap-header-bg",
      "stat-card-bg",
      "stat-card-border",
      "progress-track-bg",
      "timeline-item-bg",
      "timeline-item-border",
      "task-row-bg",
      "task-row-border",
      "texture-preview-border",
    ],
  },
  {
    group: "Painel inferior (bottom-info)",
    tokens: ["bottom-panel-bg", "bottom-info-panel-inner-bg"],
  },
  {
    group: "Admin",
    tokens: ["admin-bg", "admin-text", "admin-sidebar-bg", "admin-card-bg", "admin-card-border"],
  },
];

/** Lista plana de todos os nomes de token (sem o prefixo `--`). */
export const ALL_THEME_TOKENS: string[] = THEME_TOKEN_GROUPS.flatMap((g) => g.tokens);

/**
 * Tokens fixos definidos em src/theme/theme.ts (camada `--ui-*`), fora de index.css.
 * Hoje não variam entre claro/escuro (ex.: danger é sempre #dc2626) — candidatos a
 * ganhar variante Pi própria na Fase 3.
 */
export const JS_LAYER_TOKENS = ["danger", "success", "primaryText"] as const;
