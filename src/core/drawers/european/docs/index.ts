/**
 * european/docs — Full Industrial Documentation Generator (Modelo B, Fase 11).
 * Camada somente-leitura por cima do resultado industrial — não altera pipeline.
 */

export {
  buildEuropeanIndustrialMetadata,
  type EuropeanIndustrialMetadata,
  type EuropeanIndustrialPieceMeta,
} from "./industrialMetadata";

export {
  buildFichaTecnica,
  type EuropeanFichaTecnica,
} from "./fichaTecnicaBuilder";

export {
  buildMultiPagePdf,
  type EuropeanMultiPagePdf,
  type EuropeanDocsPdfPage,
} from "./pdfMultiPageBuilder";

export {
  buildDocsReport,
  formatDocsReportText,
  type EuropeanDocsReport,
  type EuropeanDocsStatus,
} from "./docsReport";

export {
  sectionHeader,
  textBlock,
  keyValueBlock,
  tableBlock,
  fmtMm,
  fmtM2,
  type DocsSection,
  type DocsSectionBlock,
} from "./technicalSections";

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";
import { buildEuropeanIndustrialMetadata } from "./industrialMetadata";
import { buildFichaTecnica } from "./fichaTecnicaBuilder";
import { buildMultiPagePdf } from "./pdfMultiPageBuilder";
import { buildDocsReport, type EuropeanDocsReport } from "./docsReport";
import type { EuropeanFichaTecnica } from "./fichaTecnicaBuilder";
import type { EuropeanMultiPagePdf } from "./pdfMultiPageBuilder";
import type { EuropeanIndustrialMetadata } from "./industrialMetadata";

export type EuropeanIndustrialDocs = {
  metadata: EuropeanIndustrialMetadata;
  fichaTecnica: EuropeanFichaTecnica;
  multiPagePdf: EuropeanMultiPagePdf;
  report: EuropeanDocsReport;
};

/**
 * Agrega metadata + ficha + PDF multi-página + relatério (somente leitura).
 */
export function buildEuropeanIndustrialDocs(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanIndustrialDocs {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const metadata = buildEuropeanIndustrialMetadata(result, box);
    const fichaTecnica = buildFichaTecnica(result, box);
    const multiPagePdf = buildMultiPagePdf(result, box, fichaTecnica);

    const woodPieces = metadata.pieces.filter((p) => p.funcao !== "corpo" || p.codigo);
    for (const p of woodPieces) {
      if (!p.codigo || p.codigo === "—") {
        warnings.push(`Peça sem código industrial: ${p.nome}`);
      }
      if (!p.material || p.material === "—") {
        warnings.push(`Peça sem material: ${p.nome || p.codigo}`);
      }
    }
    if (!result.valid) {
      warnings.push("Resultado industrial marcado como invalid — documentação gerada a partir do estado disponível.");
    }

    const report = buildDocsReport({
      sectionsGenerated: fichaTecnica.sections.map((s) => s.id),
      piecesDocumented: metadata.pieces.length,
      holesDocumented: result.holes.length,
      logicalPages: multiPagePdf.pages.length,
      warnings,
      errors,
    });

    return { metadata, fichaTecnica, multiPagePdf, report };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    const emptyMeta = buildEuropeanIndustrialMetadata(result, box);
    const report = buildDocsReport({
      sectionsGenerated: [],
      piecesDocumented: 0,
      holesDocumented: 0,
      logicalPages: 0,
      warnings,
      errors,
    });
    return {
      metadata: emptyMeta,
      fichaTecnica: {
        title: "Ficha Técnica — erro",
        generatedAt: new Date().toISOString(),
        metadata: emptyMeta,
        sections: [],
      },
      multiPagePdf: {
        title: "PDF docs — erro",
        kind: "european-docs-multipage",
        pages: [],
        existingPdfTitle: result.pdf?.title ?? "…",
        existingPdfPieceRows: 0,
        existingPdfHoleRows: 0,
      },
      report,
    };
  }
}
