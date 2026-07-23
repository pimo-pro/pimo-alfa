import type { ProjectState } from "@/context/projectTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import { shouldUseShellIndustrialPdfForDoc } from "./industrialPdfPolicy";
import {
  getEffectiveRowsForDoc,
  buildIndustrialOnlineAnalysisView,
} from "./buildIndustrialOnlineAnalysisView";
import { buildPdfFromOnlineAnalysisView } from "./buildPdfFromOnlineAnalysisView";

/** Documento PDF industrial (jsPDF classico ou shell). */
export type IndustrialPdfDoc = {
  output: (_type: string) => ArrayBuffer | Uint8Array;
  save: (_name: string) => void;
};

export type ResolveIndustrialPdfOptions = {
  /** So aplica em modo shell: effective = com overrides; canonical = tabular sem overrides. */
  rowsMode?: "effective" | "canonical";
  showPrices?: boolean;
};

/**
 * Resolve PDF industrial (P1 + P2):
 * - P1: com override no projeto ? shell; sem override ? classico
 * - P2: ferragens_totais (e docs de apresentacao classica) ? SEMPRE classico
 * CNC/TCN nao passam por aqui. UEE usa whitelist cutlist.
 */
export async function resolveIndustrialZipPdf(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  fallback: () => IndustrialPdfDoc | Promise<IndustrialPdfDoc>,
  options?: ResolveIndustrialPdfOptions
): Promise<IndustrialPdfDoc> {
  if (!shouldUseShellIndustrialPdfForDoc(project, docId)) {
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
