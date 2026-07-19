import type { CSSProperties } from "react";
import { useThemeTemplate } from "../../context/ThemeTemplateContext";
import { useTheme } from "../../context/ThemeContext";
import { AdminPageHeader, adminPageShellStyle } from "./AdminUi";
import type { ButtonShape, ThemeTemplateId } from "../../theme/palettes/types";
import { BUTTON_SHAPE_LABELS, BUTTON_SHAPE_RADIUS_PX } from "../../theme/palettes/piButtonSystem";

const cardStyle = (active: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "16px 18px",
  borderRadius: "var(--radius)",
  border: active ? "1px solid var(--border-selected)" : "1px solid var(--card-border)",
  background: active ? "var(--toolbar-pressed-bg)" : "var(--card-bg)",
  cursor: "pointer",
  textAlign: "left" as const,
  minWidth: 260,
  flex: "1 1 260px",
});

const SHAPE_OPTIONS: ButtonShape[] = ["square", "soft", "pill"];

const shapeButtonStyle = (active: boolean, shape: ButtonShape): CSSProperties => ({
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: active ? "1px solid var(--border-selected)" : "1px solid var(--button-ghost-border)",
  background: active ? "var(--toolbar-pressed-bg)" : "var(--button-ghost-bg)",
  color: "var(--text-main)",
  borderRadius: BUTTON_SHAPE_RADIUS_PX[shape],
});

const previewButtonStyle = (kind: "primary" | "ghost" | "danger", shape: ButtonShape): CSSProperties => ({
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "default",
  borderRadius: BUTTON_SHAPE_RADIUS_PX[shape],
  border: kind === "ghost" ? "1px solid var(--pi-btn-secondary-border, var(--pi-btn-ghost-border))" : "none",
  background:
    kind === "primary"
      ? "var(--pi-btn-primary-bg)"
      : kind === "danger"
        ? "var(--pi-btn-danger-bg)"
        : "var(--pi-btn-secondary-bg, var(--pi-btn-ghost-bg))",
  color:
    kind === "ghost" ? "var(--pi-btn-secondary-color, var(--text-main))" : "var(--pi-btn-primary-color, var(--pi-btn-on-accent-text))",
});

export default function ThemeTemplatesAdminPage() {
  const { template, setTemplate, templates, buttonShape, setButtonShape } = useThemeTemplate();
  const { theme } = useTheme();
  const isPi = template === "pi";

  return (
    <div style={adminPageShellStyle}>
      <AdminPageHeader
        title="Temas (Aparência)"
        subtitle="Escolha o template de cores e botões usado em todo o projeto. Não confundir com a secção “Templates” do menu Catálogo/Modelos, que guarda modelos de móveis — isto aqui é só aparência visual."
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {templates.map((t) => {
          const active = t.id === template;
          return (
            <button
              key={t.id}
              type="button"
              style={cardStyle(active)}
              onClick={() => setTemplate(t.id as ThemeTemplateId)}
              aria-pressed={active}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>{t.label}</span>
                {active ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "var(--primary)",
                    }}
                  >
                    Ativo
                  </span>
                ) : null}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{t.description}</p>
              {t.id === "pi" ? (
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>
                  Paleta de cores e sistema de botões unificado aplicados (claro e escuro).
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {isPi ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "16px 18px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--card-border)",
            background: "var(--card-bg)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
              Formato dos botões
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Vale para os botões em todo o projeto enquanto o template Pi estiver ativo.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SHAPE_OPTIONS.map((shape) => (
              <button
                key={shape}
                type="button"
                style={shapeButtonStyle(buttonShape === shape, shape)}
                onClick={() => setButtonShape(shape)}
                aria-pressed={buttonShape === shape}
              >
                {BUTTON_SHAPE_LABELS[shape]}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
            <button type="button" style={previewButtonStyle("primary", buttonShape)} disabled>
              Exportar CNC
            </button>
            <button type="button" style={previewButtonStyle("ghost", buttonShape)} disabled>
              Cancelar
            </button>
            <button type="button" style={previewButtonStyle("danger", buttonShape)} disabled>
              Excluir
            </button>
          </div>
        </div>
      ) : null}

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          padding: "10px 12px",
          border: "1px solid var(--card-border)",
          borderRadius: "var(--radius)",
          background: "var(--card-bg)",
        }}
      >
        Modo atual: <strong style={{ color: "var(--text-main)" }}>{theme === "dark" ? "Escuro" : "Claro"}</strong>{" "}
        (alternável no botão de sol/lua do cabeçalho) · Template ativo:{" "}
        <strong style={{ color: "var(--text-main)" }}>{template}</strong>
      </div>
    </div>
  );
}
