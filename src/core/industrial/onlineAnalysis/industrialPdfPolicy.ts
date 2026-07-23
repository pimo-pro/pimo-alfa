/**
 * Politica PDF industrial P1 — pacote binario por projeto.
 * Com qualquer override documental ? todos shell.
 * Sem overrides ? todos classico.
 * Nunca misturar shell + classico no mesmo pacote.
 * CNC/TCN/drill/nesting fora de ambito.
 */
import type { ProjectState } from "@/context/projectTypes";
import { anyDocumentHasOverrides } from "./applyIndustrialDocumentOverrides";

export type IndustrialPdfRenderMode = "shell" | "classic";

/** Modo unico para todos os PDFs industriais do projeto. */
export function getIndustrialPdfRenderMode(
  project: ProjectState
): IndustrialPdfRenderMode {
  return anyDocumentHasOverrides(project.industrialDocumentOverrides)
    ? "shell"
    : "classic";
}

export function shouldUseShellIndustrialPdfs(project: ProjectState): boolean {
  return getIndustrialPdfRenderMode(project) === "shell";
}
