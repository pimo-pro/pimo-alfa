import { Navigate, useParams } from "react-router-dom";

import {
  isInternalProjectId,
  resolveProjectIdentity,
} from "@/core/projects/projectIdentity";

import RelatorioFinalProjeto from "./RelatorioFinalProjeto";

/**
 * Rota pùblica /relatorio-final/:project
 * Redirect: pimo-* / local-* / UUID ? slug resolvido.
 */
export default function RelatorioFinalRoute() {
  const { project } = useParams<{ project?: string }>();
  const key = (project ?? "").trim();

  if (!key) {
    return <Navigate to="/projects" replace />;
  }

  if (isInternalProjectId(key)) {
    const identity = resolveProjectIdentity(key);
    if (identity?.slug) {
      return <Navigate to={`/relatorio-final/${encodeURIComponent(identity.slug)}`} replace />;
    }
  }

  return <RelatorioFinalProjeto />;
}
