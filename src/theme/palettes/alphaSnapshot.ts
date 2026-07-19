/**
 * Alpha — registo de referência (Fase 2).
 *
 * Este ficheiro NÃO é consumido em runtime. Alpha, na prática, é simplesmente
 * "nenhum override aplicado": a app usa os valores de src/index.css e os 4
 * sistemas de botão exatamente como já existiam antes deste trabalho de temas.
 * A garantia de que Alpha nunca muda vem da arquitetura (Fase 1): o template Pi
 * nunca escreve em index.css, só aplica overrides por cima via inline style em
 * runtime — então index.css continua a ser, sempre, o Alpha.
 *
 * Este registo serve só de prova/memória do estado exato em que o visual foi
 * congelado, para detetar desvios acidentais no futuro.
 */

/** Valores resolvidos de src/index.css no momento do congelamento do Alpha. */
export const ALPHA_TOKEN_SNAPSHOT = {
  dark: {
    black: "#0b0f17",
    navy: "#0f172a",
    "blue-dark": "#1e293b",
    "blue-mid": "#273d63",
    "blue-light": "#3b82f6",
    primary: "#38bdf8",
    "text-main": "#e6e6e6",
    "text-muted": "#94a3b8",
    glass: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    "status-todo-color": "#94a3b8",
    "status-progress-color": "#facc15",
    "status-done-color": "#4ade80",
    "admin-bg": "#1a1a1a",
    "admin-text": "#e6e6e6",
    "admin-sidebar-bg": "#141414",
    "bottom-info-panel-inner-bg": "#111111",
  },
  light: {
    black: "#f8fafc",
    navy: "#f1f5f9",
    "blue-dark": "#e2e8f0",
    "blue-mid": "#cbd5e1",
    "blue-light": "#2563eb",
    primary: "#2563eb",
    "text-main": "#222222",
    "text-muted": "#64748b",
    glass: "rgba(0,0,0,0.06)",
    border: "rgba(0,0,0,0.12)",
    "status-todo-color": "#64748b",
    "status-progress-color": "#ca8a04",
    "status-done-color": "#16a34a",
    "admin-bg": "#f5f5f5",
    "admin-text": "#222222",
    "admin-sidebar-bg": "#ebebeb",
    "bottom-info-panel-inner-bg": "#fafafa",
  },
} as const;

/**
 * Os 4 sistemas de botão do Alpha (catalogados na auditoria anterior),
 * preservados sem alteração. A unificação (Fase 4) é exclusiva do template Pi.
 */
export const ALPHA_BUTTON_SYSTEMS = [
  "1. Classes utilitárias de index.css (.button, .button-ghost, .button-primary, .panel-button, .icon-button, .admin-panel-nav-btn, .viewer-toolbar button, .moveis-*)",
  "2. Componente <Button> (components/ui/Button.tsx + ui.css), estilizado pela camada --ui-button-* injetada por theme/theme.ts",
  "3. Objetos de estilo ad-hoc por arquivo (industrialStyles.ts e ~10 outros *BtnStyle espalhados)",
  "4. Design system próprio do módulo v4 (components/v4/v4.css, .v4-root), estático e alheio ao toggle de tema",
] as const;
