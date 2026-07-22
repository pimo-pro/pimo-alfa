import { useState, type CSSProperties } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useThemeTemplate } from "../../context/ThemeTemplateContext";
import { AdminPageHeader } from "./AdminUi";
import PiTokenDiffViewer from "./pi-color-editor/PiTokenDiffViewer";
import PiTokenEditor from "./pi-color-editor/PiTokenEditor";
import PiTokenList from "./pi-color-editor/PiTokenList";
import { usePiTokenEditorSnapshot } from "./pi-color-editor/piTokenEditorShared";

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "14px 16px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--card-border)",
  background: "var(--card-bg)",
  minHeight: 0,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: 12,
  borderRadius: "var(--radius)",
  border: "1px solid var(--input-border, var(--card-border))",
  background: "var(--input-bg, var(--card-bg))",
  color: "var(--text-main)",
};

/**
 * Editor de overrides de tokens Pi (Fase 6 UI).
 * Só — utilizável com template=pi — Alpha não passa pela API de overrides.
 */
export default function AdminPiColorEditorPage() {
  const { template } = useThemeTemplate();
  const { theme } = useTheme();
  const mode = theme;
  const { overridden, revision } = usePiTokenEditorSnapshot(mode);

  const [selectedToken, setSelectedToken] = useState<string | null>("blue-light");
  const [query, setQuery] = useState("");
  const [onlyOverridden, setOnlyOverridden] = useState(false);

  if (template !== "pi") {
    return (
      <div style={panelStyle}>
        <AdminPageHeader
          title="Editor de cores Pi"
          subtitle="Disponível apenas com o template Pi ativo. O Alpha usa exclusivamente index.css e não aceita overrides."
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Ative o template <strong style={{ color: "var(--text-main)" }}>Pi</strong> em Temas (Aparéncia)
          para editar tokens. Nada — alterado no Alpha nem no industrial.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-pi-color-editor="" data-revision={revision}>
      <AdminPageHeader
        title="Editor de cores Pi"
        subtitle="Overrides por token sobre a paleta Pi (storage pimo-pi-token-overrides). Sem escalas --ci-* — a camada SSOT permanece vazia."
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <span>
          Modo: <strong style={{ color: "var(--text-main)" }}>{mode === "dark" ? "Escuro" : "Claro"}</strong>
        </span>
        <span>—</span>
        <span>
          Overrides neste modo:{" "}
          <strong style={{ color: "var(--text-main)" }}>{overridden.length}</strong>
        </span>
        <span style={{ fontSize: 11, opacity: 0.85 }}>
          (alterar claro/escuro no cabeçalho para editar o outro modo)
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) minmax(280px, 1.1fr)",
          gap: 12,
          alignItems: "stretch",
          minHeight: 420,
        }}
      >
        <div style={{ ...panelStyle, maxHeight: 520, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar tokensó"
              style={inputStyle}
              aria-label="Filtrar tokens"
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={onlyOverridden}
                onChange={(e) => setOnlyOverridden(e.target.checked)}
              />
              Só overrides
            </label>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}>
            <PiTokenList
              mode={mode}
              selectedToken={selectedToken}
              onSelect={setSelectedToken}
              query={query}
              onlyOverridden={onlyOverridden}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Editar token</div>
          <PiTokenEditor mode={mode} token={selectedToken} />
        </div>
      </div>

      <div style={panelStyle}>
        <PiTokenDiffViewer mode={mode} />
      </div>
    </div>
  );
}
