/**
 * pdfMultiPageBuilder.ts — Estrutura PDF multi-páginas em memória (camada adicional).
 * NÃO substitui o PDF industrial existente (result.pdf).
 */

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";
import { buildFichaTecnica, type EuropeanFichaTecnica } from "./fichaTecnicaBuilder";
import {
  fmtMm,
  keyValueBlock,
  sectionHeader,
  tableBlock,
  textBlock,
  type DocsSection,
} from "./technicalSections";

export type EuropeanDocsPdfPage = {
  pageNumber: number;
  title: string;
  sections: DocsSection[];
};

export type EuropeanMultiPagePdf = {
  title: string;
  /** Camada adicional — não substitui result.pdf */
  kind: "european-docs-multipage";
  pages: EuropeanDocsPdfPage[];
  /** Referência leve ao PDF SSOT existente (somente leitura). */
  existingPdfTitle: string;
  existingPdfPieceRows: number;
  existingPdfHoleRows: number;
};

function holesByPiece(result: EuropeanDrawerResult): Array<{ peca: string; count: number }> {
  const map = new Map<string, number>();
  for (const h of result.holes) {
    const key = h.pieceRef || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([peca, count]) => ({ peca, count }))
    .sort((a, b) => a.peca.localeCompare(b.peca));
}

/**
 * Constrói estrutura multi-página a partir da ficha + pdf existente.
 */
export function buildMultiPagePdf(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput,
  ficha?: EuropeanFichaTecnica
): EuropeanMultiPagePdf {
  const fichaTecnica = ficha ?? buildFichaTecnica(result, box);
  const meta = fichaTecnica.metadata;
  const geo = result.geometry;

  const page1: EuropeanDocsPdfPage = {
    pageNumber: 1,
    title: "Resumo industrial",
    sections: [
      sectionHeader("resumo", "Resumo industrial", [
        keyValueBlock([
          { label: "Modelo", value: meta.modelDisplayName },
          { label: "Corrediça", value: `${meta.runnerFamily} · ${fmtMm(meta.runnerLengthMm)}` },
          { label: "Nº gavetas", value: String(meta.drawerCount) },
          { label: "Altura", value: fmtMm(meta.heightUsedMm) },
          {
            label: "Corpo W×H×D",
            value: `${fmtMm(geo.externalWidthMm)} × ${fmtMm(geo.usefulHeightMm)} × ${fmtMm(geo.bodyDepthMm)}`,
          },
          ...(meta.box
            ? [
                {
                  label: "Caixa W×H×D",
                  value: `${fmtMm(meta.box.widthMm)} × ${fmtMm(meta.box.heightMm)} × ${fmtMm(meta.box.depthMm)}`,
                },
              ]
            : []),
        ]),
      ]),
    ],
  };

  const page2: EuropeanDocsPdfPage = {
    pageNumber: 2,
    title: "Tabela de peças",
    sections: [
      sectionHeader("pecas", "Tabela de peças", [
        tableBlock(
          ["Nome", "Código", "Material", "Espessura", "Qty"],
          meta.pieces.map((p) => [
            p.nome,
            p.codigo || "—",
            p.material,
            fmtMm(p.espessuraMm),
            String(p.quantidade),
          ])
        ),
      ]),
    ],
  };

  const byPiece = holesByPiece(result);
  const safetyHoleNotes =
    result.safetyReport?.warnings
      ?.filter((w) => w.code.includes("HOLE") || w.gate === "drilling")
      .map((w) => `${w.code}: ${w.message}${w.piece ? ` (${w.piece})` : ""}`) ?? [];

  const page3: EuropeanDocsPdfPage = {
    pageNumber: 3,
    title: "Furos e drilling",
    sections: [
      sectionHeader("furos", "Resumo de furos por peça", [
        tableBlock(
          ["Peça", "Nº furos"],
          byPiece.map((r) => [r.peca, String(r.count)])
        ),
        keyValueBlock([{ label: "Total furos", value: String(result.holes.length) }]),
        textBlock(
          safetyHoleNotes.length ? safetyHoleNotes : ["Sem observações de drilling no safetyReport."],
          "Observações"
        ),
      ]),
    ],
  };

  const notes: string[] = [];
  if (result.safetyReport) {
    notes.push(`Safety status: ${result.safetyReport.status} (${result.safetyReport.totalDurationMs.toFixed(2)} ms)`);
    for (const w of result.safetyReport.warnings) {
      notes.push(`[safety/${w.gate}] ${w.message}`);
    }
    for (const e of result.safetyReport.errors) {
      notes.push(`[safety-error/${e.gate}] ${e.message}`);
    }
  }
  notes.push("Consistência: códigos industriais documentados a partir do cutlist pós-enforce.");
  notes.push("Robustez: camada transparente — docs não alteram sanitização nem resultados.");
  for (const w of result.warnings ?? []) notes.push(w);

  const page4: EuropeanDocsPdfPage = {
    pageNumber: 4,
    title: "Observações e notas",
    sections: [
      sectionHeader("notas", "Observações e notas", [
        textBlock(notes.length ? notes : ["Sem notas."]),
      ]),
    ],
  };

  return {
    title: `PDF Multi-páginas (docs) — ${meta.modelDisplayName}`,
    kind: "european-docs-multipage",
    pages: [page1, page2, page3, page4],
    existingPdfTitle: result.pdf?.title ?? "—",
    existingPdfPieceRows: result.pdf?.pieceRows?.length ?? 0,
    existingPdfHoleRows: result.pdf?.holeRows?.length ?? 0,
  };
}
