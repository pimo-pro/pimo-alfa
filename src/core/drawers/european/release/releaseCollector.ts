/**
 * releaseCollector.ts — Coletor de eventos industriais do Modelo B (somente leitura).
 */

import type { EuropeanDrawerResult } from "../types";

export type EuropeanReleaseEventKind =
  | "feature"
  | "improvement"
  | "fix"
  | "internal"
  | "industrial_note"
  | "safety"
  | "component";

export type EuropeanReleaseEvent = {
  id: string;
  kind: EuropeanReleaseEventKind;
  title: string;
  detail?: string;
  component?: string;
  source: string;
};

/** Catálogo estático das fases Modelo B (documental — não altera pipeline). */
export const EUROPEAN_RELEASE_PHASE_CATALOG: EuropeanReleaseEvent[] = [
  {
    id: "phase-consistency",
    kind: "feature",
    title: "Consistência industrial de nomes/códigos (SSOT)",
    detail: "european/consistency — enforceNaming em cutlist/PDF/drilling/viewer",
    component: "consistency",
    source: "catalog",
  },
  {
    id: "phase-safety",
    kind: "feature",
    title: "Industrial Safety Gates & Runtime Guards",
    detail: "european/safety — gates pré/pós pipeline sem auto-correção",
    component: "safety",
    source: "catalog",
  },
  {
    id: "phase-docs",
    kind: "feature",
    title: "Full Industrial Documentation Generator",
    detail: "european/docs — ficha técnica + PDF multi-páginas (estrutura)",
    component: "docs",
    source: "catalog",
  },
  {
    id: "phase-dxf",
    kind: "feature",
    title: "DXF Export + Technical Drawing Mode",
    detail: "european/dxf — contornos, furos, layers e vistas técnicas",
    component: "dxf",
    source: "catalog",
  },
  {
    id: "phase-overlay",
    kind: "feature",
    title: "MC Overlay Advanced",
    detail: "european/overlay — medidas, aberturas, gaps, remates, roda-pé",
    component: "overlay",
    source: "catalog",
  },
  {
    id: "phase-release",
    kind: "feature",
    title: "Release Notes Auto-Generator",
    detail: "european/release — notes industriais automáticas",
    component: "release",
    source: "catalog",
  },
  {
    id: "imp-hettich",
    kind: "improvement",
    title: "Corrediças Hettich 300–600 com corpo = runner ? 10",
    detail: "Folga lateral 7+7; profundidade útil estritamente maior que runner",
    component: "measures",
    source: "catalog",
  },
  {
    id: "imp-robustness",
    kind: "improvement",
    title: "Camada de robustez transparente",
    detail: "european/robustness — sanitização sem alterar regras de negócio",
    component: "robustness",
    source: "catalog",
  },
  {
    id: "fix-hole-dia-zero",
    kind: "fix",
    title: "Safety: —=0 em laterais tratado como aviso (não bloqueio)",
    detail: "Marcadores Modelo A / industriais existentes não invalidam geração válida",
    component: "safety",
    source: "catalog",
  },
  {
    id: "internal-perf",
    kind: "internal",
    title: "Memoização e validateAll no pipeline europeu",
    detail: "european/perf — menos passagens sem mudar resultados",
    component: "perf",
    source: "catalog",
  },
];

/**
 * Recolhe eventos a partir do resultado atual + catálogo de fases.
 */
export function collectEuropeanReleaseEvents(
  result: EuropeanDrawerResult
): EuropeanReleaseEvent[] {
  const events: EuropeanReleaseEvent[] = [...EUROPEAN_RELEASE_PHASE_CATALOG];

  // Componentes presentes no resultado
  const components: Array<{ key: string; present: boolean; label: string }> = [
    { key: "safety", present: Boolean(result.safetyReport), label: "Safety Gates" },
    { key: "docs", present: Boolean(result.docs), label: "Documentação industrial" },
    { key: "dxf", present: Boolean(result.dxf), label: "DXF export" },
    { key: "technical", present: Boolean(result.technical), label: "Desenho técnico" },
    { key: "overlay", present: Boolean(result.overlay), label: "MC Overlay" },
    { key: "consistency", present: result.cutlist.some((i) => Boolean(i.codigo)), label: "Códigos industriais cutlist" },
  ];

  for (const c of components) {
    events.push({
      id: `component-${c.key}`,
      kind: "component",
      title: c.present ? `${c.label} activo` : `${c.label} ausente`,
      detail: c.present ? "Presente neste generateEuropeanDrawer" : "Não anexado neste resultado",
      component: c.key,
      source: "runtime",
    });
  }

  if (result.docs?.report) {
    events.push({
      id: "runtime-docs-status",
      kind: "industrial_note",
      title: `Docs: ${result.docs.report.status}`,
      detail: `${result.docs.report.piecesDocumented} peças — ${result.docs.report.logicalPages} págs`,
      component: "docs",
      source: "runtime",
    });
  }

  if (result.dxf?.report) {
    events.push({
      id: "runtime-dxf-status",
      kind: "industrial_note",
      title: `DXF: ${result.dxf.report.status}`,
      detail: `${result.dxf.report.contourCount} contornos — ${result.dxf.report.holeEntityCount} furos — ${result.dxf.report.viewCount} vistas`,
      component: "dxf",
      source: "runtime",
    });
  }

  if (result.overlay?.report) {
    events.push({
      id: "runtime-overlay-status",
      kind: "industrial_note",
      title: `Overlay: ${result.overlay.report.status}`,
      detail: `${result.overlay.report.aberturaCount} aberturas — ${result.overlay.report.gapCount} gaps`,
      component: "overlay",
      source: "runtime",
    });
  }

  if (result.technical) {
    events.push({
      id: "runtime-technical-views",
      kind: "industrial_note",
      title: `Vistas técnicas: ${result.technical.viewIds.join(", ")}`,
      component: "technical",
      source: "runtime",
    });
  }

  if (result.safetyReport) {
    events.push({
      id: "runtime-safety-status",
      kind: "safety",
      title: `Safety: ${result.safetyReport.status}`,
      detail: `${result.safetyReport.gates.length} gates — ${result.safetyReport.totalDurationMs.toFixed(2)} ms`,
      component: "safety",
      source: "runtime",
    });
    for (const w of result.safetyReport.warnings) {
      events.push({
        id: `safety-warn-${w.gate}-${w.code}-${w.piece ?? "x"}`,
        kind: "safety",
        title: `[${w.gate}/${w.code}] ${w.message}`,
        detail: w.piece,
        component: "safety",
        source: "safetyReport",
      });
    }
    for (const e of result.safetyReport.errors) {
      events.push({
        id: `safety-err-${e.gate}-${e.code}`,
        kind: "safety",
        title: `[ERROR ${e.gate}/${e.code}] ${e.message}`,
        detail: e.piece,
        component: "safety",
        source: "safetyReport",
      });
    }
  }

  for (const w of result.warnings ?? []) {
    events.push({
      id: `result-warn-${events.length}`,
      kind: "industrial_note",
      title: w,
      source: "result.warnings",
    });
  }

  // — Commitsó lógicos — fases documentadas (sem git runtime obrigatério)
  events.push({
    id: "logical-commits",
    kind: "internal",
    title: "Changelog lógico Modelo B (fases consistency?release)",
    detail: "Eventos de catálogo alinhados às fases industriais B — sem alterar src/industrial/**",
    source: "logical-commits",
  });

  return events;
}
