import type { CSSProperties } from "react";
import { useProject } from "../../../context/useProject";
import { getCurrentProjectUser } from "../../../core/projects/currentUser";
import {
  DEFAULT_DESIGNER_FALLBACK,
  DEFAULT_EMPRESA_EXECUTORA,
} from "../../../core/projects/projectMeta";

/** Campos editaveis sob NOME DE PROJETO (Home). */
export function ProjectNameMetaFields() {
  const { project, actions } = useProject();
  const designerValue =
    project.designer !== undefined && project.designer !== null && project.designer !== ""
      ? project.designer
      : getCurrentProjectUser().ownerName || DEFAULT_DESIGNER_FALLBACK;
  const empresaValue =
    project.empresaExecutora !== undefined && project.empresaExecutora !== null
      ? project.empresaExecutora
      : DEFAULT_EMPRESA_EXECUTORA;
  const materiaisValue = project.materiaisProjeto ?? "";

  const fieldStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 8,
  };
  const labelStyle: CSSProperties = {
    fontSize: 11,
    color: "var(--text-muted)",
  };

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Designer</span>
        <input
          type="text"
          value={designerValue}
          onChange={(e) => actions.setProjectDesigner(e.target.value)}
          placeholder={DEFAULT_DESIGNER_FALLBACK}
          className="input input-sm"
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Empresa executora</span>
        <input
          type="text"
          value={empresaValue}
          onChange={(e) => actions.setEmpresaExecutora(e.target.value)}
          placeholder={DEFAULT_EMPRESA_EXECUTORA}
          className="input input-sm"
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Materiais</span>
        <input
          type="text"
          value={materiaisValue}
          onChange={(e) => actions.setMateriaisProjeto(e.target.value)}
          placeholder=""
          className="input input-sm"
        />
      </div>
    </>
  );
}
