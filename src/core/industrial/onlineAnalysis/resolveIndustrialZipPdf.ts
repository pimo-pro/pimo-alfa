import type { ProjectState } from "@/context/projectTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import { shouldUseShellIndustrialPdfs } from "./industrialPdfPolicy";
import {
  getEffectiveRowsForDoc,
  buildIndustrialOnlineAnalysisView,
} from "./buildIndustrialOnlineAnalysisView";
import { buildPdfFromOnlineAnalysisView } from "./buildPdfFromOnlineAnalysisView";

type PdfLike = { output: (_type: string) => ArrayBuffer | Uint8Array };

export type ResolveIndustrialPdfOptions = {
  /** So aplica em modo shell: effective = com overrides; canonical = tabular sem overrides. */
  rowsMode?: "effective" | "canonical";
  showPrices?: boolean;
};

/**
 * Politica PDF binaria (P1):
 * - Qualquer override no projeto ? shell para TODOS os docs
 * - Sem overrides ? classico (fallback) para TODOS os docs
 * Nunca misturar shell + classico no mesmo pacote.
 * CNC/TCN nao passam por aqui. UEE usa whitelist cutlist.
 */
export async function resolveIndustrialZipPdf(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  fallback: () => PdfLike | Promise<PdfLike>,
  options?: ResolveIndustrialPdfOptions
): Promise<PdfLike> {
  if (!shouldUseShellIndustrialPdfs(project)) {
    return fallback();
  }

  const rowsMode = options?.rowsMode ?? "effective";
  const view =
    rowsMode === "canonical"
      ? buildIndustrialOnlineAnalysisView(project, docId, {
          showPrices: options?.showPrices,
          applyOverrides: false,
        })
      : getEffectiveRowsForDoc(project, docId, { showPrices: options?.showPrices });

  return buildPdfFromOnlineAnalysisView(view);
}
