/**
 * Barra superior unificada do Workspace (evolução incremental).
 * Contém ações globais do projeto; por agora apenas duplica o fluxo de guardar/gerar design.
 */

import { useProject } from "../../../context/useProject";

export default function UnifiedTopToolbar() {
  const { project, actions } = useProject();

  return (
    <div
      className="unified-top-toolbar"
      role="toolbar"
      aria-label="Ações superiores do projeto"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        padding: "6px 10px",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        className="button button-primary viewer-action-button"
        onClick={() => void actions.gerarESalvarDesign()}
        disabled={project.estaCarregando}
        style={{
          background: "var(--blue-light)",
          opacity: project.estaCarregando ? 0.7 : 1,
          cursor: project.estaCarregando ? "not-allowed" : "pointer",
        }}
      >
        Salvar e Gerar Design
      </button>
    </div>
  );
}
