/**
 * Metadados editaveis do projeto (designer / empresa / materiais).
 * Usados na Home, seed do Relatorio Final e PDFs industriais.
 */

import type { ProjectState } from "@/context/projectTypes";
import { getCurrentProjectUser } from "./currentUser";

export const DEFAULT_EMPRESA_EXECUTORA = "Carpintaria";
export const DEFAULT_DESIGNER_FALLBACK = "Visitante";

export function resolveProjectDesigner(
  state: Pick<ProjectState, "designer"> | null | undefined,
  ownerNameFallback?: string
): string {
  const stored = state?.designer?.trim();
  if (stored) return stored;
  const owner = (ownerNameFallback ?? "").trim();
  if (owner) return owner;
  return getCurrentProjectUser().ownerName?.trim() || DEFAULT_DESIGNER_FALLBACK;
}

export function resolveEmpresaExecutora(
  state: Pick<ProjectState, "empresaExecutora"> | null | undefined
): string {
  const stored = state?.empresaExecutora?.trim();
  if (stored) return stored;
  return DEFAULT_EMPRESA_EXECUTORA;
}

export function resolveMateriaisProjeto(
  state: Pick<ProjectState, "materiaisProjeto"> | null | undefined
): string {
  return state?.materiaisProjeto?.trim() ?? "";
}
