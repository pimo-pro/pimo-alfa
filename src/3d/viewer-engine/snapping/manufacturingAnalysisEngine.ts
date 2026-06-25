import type { WorkspaceBox } from "../../../core/types";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import { resolveRematePieceNomeForRemate } from "../../../core/remate/labels";
import type { ProjectRodape } from "../../../core/rodape/rodapeTypes";
import {
  type ManufacturingConflict,
  type ManufacturingScanContext,
  type ManufacturingScanResult,
  type ManufacturingSuggestion,
} from "./manufacturingTypes";
import { getManufacturingRules, getScoringRules } from "./rulesRuntime";

let conflictSeq = 0;

function nextConflictId(): string {
  conflictSeq += 1;
  return `mfg-conflict-${conflictSeq}`;
}

function boxDepthMm(box: WorkspaceBox): number {
  return Math.max(1, box.dimensoes?.profundidade ?? 600);
}

function boxHeightMm(box: WorkspaceBox): number {
  return Math.max(1, box.dimensoes?.altura ?? 720);
}

function boxCenterZ(box: WorkspaceBox): number {
  return box.posicaoZ_mm ?? 0;
}

function boxFrontZ(box: WorkspaceBox): number {
  const d = boxDepthMm(box);
  return boxCenterZ(box) + d / 2;
}

function boxBottomY(box: WorkspaceBox): number {
  const h = boxHeightMm(box);
  const cy = box.posicaoY_mm ?? h / 2;
  return cy - h / 2;
}

function severityWeight(severity: ManufacturingConflict["severity"]): number {
  switch (severity) {
    case "critical":
      return 18;
    case "warning":
      return 10;
    default:
      return 4;
  }
}

function buildSuggestion(
  fixKind: ManufacturingSuggestion["fixKind"],
  label: string,
  description: string,
  affectedBoxIds: string[]
): ManufacturingSuggestion {
  return {
    id: `mfg-suggest-${fixKind}-${affectedBoxIds.join("-") || "global"}`,
    fixKind,
    label,
    description,
    affectedBoxIds,
  };
}

/**
 * Auto-Manufacturing AI — análise geométrica industrial somente leitura.
 */
export class ManufacturingAnalysisEngine {
  scanProject(context: ManufacturingScanContext): ManufacturingScanResult {
    const conflicts: ManufacturingConflict[] = [];
    const boxes = context.boxes.filter((b) => !b.locked);

    this.checkHeights(boxes, conflicts);
    this.checkDepths(boxes, conflicts);
    this.checkDepthConsistency(boxes, conflicts);
    this.checkRemates(context.remates, boxes, conflicts);
    this.checkRodapes(context.rodapes, boxes, conflicts);
    this.checkDoorClearance(boxes, conflicts);
    this.checkDrawerClearance(boxes, conflicts);
    this.checkOpeningProximity(boxes, context.openings, conflicts);
    this.checkModuleSpacing(boxes, conflicts);

    const suggestions = this.buildSuggestions(conflicts);
    const penalty = conflicts.reduce((sum, c) => sum + severityWeight(c.severity), 0);
    const score = Math.max(0, Math.min(100, 100 - penalty));
    const readyForProduction =
      score >= getScoringRules().productionReadyMinScore &&
      !conflicts.some((c) => c.severity === "critical");

    return {
      score,
      readyForProduction,
      conflicts,
      suggestions,
      scannedAt: Date.now(),
      boxCount: boxes.length,
      remateCount: context.remates.length,
      rodapeCount: context.rodapes.length,
    };
  }

  score(context: ManufacturingScanContext): number {
    return this.scanProject(context).score;
  }

  private checkHeights(boxes: WorkspaceBox[], conflicts: ManufacturingConflict[]): void {
    const t = getManufacturingRules();
    for (const box of boxes) {
      const h = boxHeightMm(box);
      const isUpper = box.cabinetType === "upper";
      const target = isUpper ? t.standardUpperHeightMm : t.standardBaseHeightMm;
      const delta = Math.abs(h - target);
      if (delta <= t.heightToleranceMm) continue;
      conflicts.push({
        id: nextConflictId(),
        kind: "heightNonStandard",
        severity: delta > 40 ? "warning" : "info",
        title: `Altura atípica — ${box.nome || box.id}`,
        detail: `${h} mm (esperado ~${target} mm para ${isUpper ? "superior" : "inferior"}).`,
        boxIds: [box.id],
        suggestedFixId: undefined,
      });
    }
  }

  private checkDepths(boxes: WorkspaceBox[], conflicts: ManufacturingConflict[]): void {
    const t = getManufacturingRules();
    for (const box of boxes) {
      const d = boxDepthMm(box);
      if (d >= t.depthMinMm && d <= t.depthMaxMm) continue;
      conflicts.push({
        id: nextConflictId(),
        kind: "depthOutOfRange",
        severity: d < 450 || d > 700 ? "warning" : "info",
        title: `Profundidade fora do intervalo — ${box.nome || box.id}`,
        detail: `${d} mm (típico ${t.depthMinMm}–${t.depthMaxMm} mm).`,
        boxIds: [box.id],
        suggestedFixId: "depthAlign",
      });
    }
  }

  private checkDepthConsistency(boxes: WorkspaceBox[], conflicts: ManufacturingConflict[]): void {
    if (boxes.length < 2) return;
    const t = getManufacturingRules();
    const byRow = new Map<string, WorkspaceBox[]>();
    for (const box of boxes) {
      const key = `${Math.round(box.posicaoX_mm / 80)}`;
      const row = byRow.get(key) ?? [];
      row.push(box);
      byRow.set(key, row);
    }
    for (const row of byRow.values()) {
      if (row.length < 2) continue;
      const depths = row.map(boxDepthMm);
      const spread = Math.max(...depths) - Math.min(...depths);
      if (spread <= t.depthInconsistencyMm) continue;
      conflicts.push({
        id: nextConflictId(),
        kind: "depthInconsistent",
        severity: "warning",
        title: "Profundidades incoerentes na mesma fila",
        detail: `Variação de ${Math.round(spread)} mm entre módulos adjacentes.`,
        boxIds: row.map((b) => b.id),
        suggestedFixId: "depthAlign",
      });
    }
  }

  private checkRemates(
    remates: RematePiece[],
    boxes: WorkspaceBox[],
    conflicts: ManufacturingConflict[]
  ): void {
    const t = getManufacturingRules();
    const boxNameById: Record<string, string> = {};
    for (const box of boxes) {
      if (box?.id) boxNameById[box.id] = typeof box.nome === "string" ? box.nome : box.id;
    }
    for (const remate of remates) {
      if (remate.placementMode !== "FREE") continue;
      const offsets = remate.faceOffsets;
      if (!offsets) continue;
      const maxOff = Math.max(
        Math.abs(offsets.offsetAlongNormalMm),
        Math.abs(offsets.offsetTangentUMm),
        Math.abs(offsets.offsetTangentVMm)
      );
      if (maxOff <= t.remateOffsetWarnMm) continue;
      conflicts.push({
        id: nextConflictId(),
        kind: "remateMisaligned",
        severity: maxOff > 5 ? "warning" : "info",
        title: `Remate desalinhado — ${resolveRematePieceNomeForRemate(remate, boxNameById) || remate.tipo}`,
        detail: `Offset manual de ${Math.round(maxOff)} mm na face.`,
        boxIds: remate.parentBoxId ? [remate.parentBoxId] : [],
        remateIds: [remate.id],
        suggestedFixId: "remateAlign",
      });
    }
  }

  private checkRodapes(
    rodapes: ProjectRodape[],
    boxes: WorkspaceBox[],
    conflicts: ManufacturingConflict[]
  ): void {
    const t = getManufacturingRules();
    const byParent = new Map<string, ProjectRodape[]>();
    for (const r of rodapes) {
      const list = byParent.get(r.parentBoxId) ?? [];
      list.push(r);
      byParent.set(r.parentBoxId, list);
    }

    const lowers = boxes.filter((b) => b.cabinetType !== "upper");
    for (const box of lowers) {
      if (!byParent.has(box.id) && box.feetEnabled !== false) {
        conflicts.push({
          id: nextConflictId(),
          kind: "rodapeContinuity",
          severity: "info",
          title: `Rodapé em falta — ${box.nome || box.id}`,
          detail: "Módulo inferior sem rodapé associado.",
          boxIds: [box.id],
          suggestedFixId: "rodapeContinuity",
        });
      }
    }

    const sorted = [...rodapes].sort((a, b) => {
      const boxA = boxes.find((x) => x.id === a.parentBoxId);
      const boxB = boxes.find((x) => x.id === b.parentBoxId);
      return (boxA?.posicaoX_mm ?? 0) - (boxB?.posicaoX_mm ?? 0);
    });
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      const boxA = boxes.find((b) => b.id === prev.parentBoxId);
      const boxB = boxes.find((b) => b.id === curr.parentBoxId);
      if (!boxA || !boxB) continue;
      const yA = (prev.transform?.yMm ?? 0) + boxBottomY(boxA);
      const yB = (curr.transform?.yMm ?? 0) + boxBottomY(boxB);
      const gap = Math.abs(yA - yB);
      if (gap <= t.rodapeGapMaxMm) continue;
      conflicts.push({
        id: nextConflictId(),
        kind: "rodapeGap",
        severity: gap > 3 ? "warning" : "info",
        title: "Descontinuidade de rodapé",
        detail: `Gap vertical de ${gap.toFixed(1)} mm entre rodapés adjacentes.`,
        boxIds: [prev.parentBoxId, curr.parentBoxId],
        rodapeIds: [prev.id, curr.id],
        suggestedFixId: "rodapeContinuity",
      });
    }
  }

  private checkDoorClearance(boxes: WorkspaceBox[], conflicts: ManufacturingConflict[]): void {
    const t = getManufacturingRules();
    const withDoors = boxes.filter((b) => b.portaTipo && b.portaTipo !== "sem_porta");
    const sorted = [...withDoors].sort((a, b) => a.posicaoX_mm - b.posicaoX_mm);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]!;
      const b = sorted[i]!;
      const gapX =
        Math.abs(b.posicaoX_mm - a.posicaoX_mm) -
        (Math.max(1, a.dimensoes?.largura ?? 600) + Math.max(1, b.dimensoes?.largura ?? 600)) / 2;
      if (gapX >= t.doorClearanceMinMm) continue;
      conflicts.push({
        id: nextConflictId(),
        kind: "doorClearance",
        severity: gapX < 1 ? "critical" : "warning",
        title: "Folga insuficiente entre portas",
        detail: `Gap estimado ${Math.max(0, gapX).toFixed(1)} mm (mín. ${t.doorClearanceMinMm} mm).`,
        boxIds: [a.id, b.id],
        suggestedFixId: "doorClearance",
      });
    }
  }

  private checkDrawerClearance(boxes: WorkspaceBox[], conflicts: ManufacturingConflict[]): void {
    const t = getManufacturingRules();
    for (const box of boxes) {
      if ((box.gavetas ?? 0) <= 0) continue;
      const neighbors = boxes.filter(
        (o) => o.id !== box.id && Math.hypot(o.posicaoX_mm - box.posicaoX_mm, (o.posicaoZ_mm ?? 0) - boxCenterZ(box)) < 400
      );
      for (const other of neighbors) {
        const frontGap = Math.abs(boxFrontZ(box) - boxFrontZ(other));
        if (frontGap >= t.drawerClearanceMinMm) continue;
        conflicts.push({
          id: nextConflictId(),
          kind: "drawerClearance",
          severity: "info",
          title: `Folga de gaveta apertada — ${box.nome || box.id}`,
          detail: `Proximidade frontal com ${other.nome || other.id}.`,
          boxIds: [box.id, other.id],
          suggestedFixId: "drawerClearance",
        });
      }
    }
  }

  private checkOpeningProximity(
    boxes: WorkspaceBox[],
    openings: ManufacturingScanContext["openings"],
    conflicts: ManufacturingConflict[]
  ): void {
    if (!openings.length) return;
    const t = getManufacturingRules();
    for (const box of boxes) {
      const w = Math.max(1, box.dimensoes?.largura ?? 600);
      const minX = box.posicaoX_mm - w / 2;
      const maxX = box.posicaoX_mm + w / 2;
      const minZ = boxCenterZ(box) - boxDepthMm(box) / 2;
      const maxZ = boxCenterZ(box) + boxDepthMm(box) / 2;
      for (const opening of openings) {
        const overlapX = maxX > opening.minX_mm - t.openingMarginMm && minX < opening.maxX_mm + t.openingMarginMm;
        const overlapZ = maxZ > opening.minZ_mm - t.openingMarginMm && minZ < opening.maxZ_mm + t.openingMarginMm;
        if (!overlapX || !overlapZ) continue;
        conflicts.push({
          id: nextConflictId(),
          kind: "wallOpeningProximity",
          severity: "warning",
          title: `Módulo próximo de abertura — ${box.nome || box.id}`,
          detail: "Posição dentro da zona de segurança da porta/janela.",
          boxIds: [box.id],
          suggestedFixId: "wallClearance",
        });
      }
    }
  }

  private checkModuleSpacing(boxes: WorkspaceBox[], conflicts: ManufacturingConflict[]): void {
    const t = getManufacturingRules();
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const dx = Math.abs(a.posicaoX_mm - b.posicaoX_mm);
        const dz = Math.abs(boxCenterZ(a) - boxCenterZ(b));
        const minDist = (Math.max(1, a.dimensoes?.largura ?? 600) + Math.max(1, b.dimensoes?.largura ?? 600)) / 2;
        if (dx > minDist + 5 || dz > 400) continue;
        const gap = dx - minDist;
        if (gap >= t.moduleMinGapMm) continue;
        conflicts.push({
          id: nextConflictId(),
          kind: "moduleSpacing",
          severity: gap < 0 ? "critical" : "warning",
          title: "Módulos demasiado próximos",
          detail: `Sobreposição ou gap ${Math.max(0, gap).toFixed(1)} mm.`,
          boxIds: [a.id, b.id],
          suggestedFixId: "distributeFlush",
        });
      }
    }
  }

  private buildSuggestions(conflicts: ManufacturingConflict[]): ManufacturingSuggestion[] {
    const byFix = new Map<ManufacturingSuggestion["fixKind"], Set<string>>();
    for (const c of conflicts) {
      if (!c.suggestedFixId) continue;
      const set = byFix.get(c.suggestedFixId) ?? new Set<string>();
      for (const id of c.boxIds) set.add(id);
      byFix.set(c.suggestedFixId, set);
    }

    const labels: Record<ManufacturingSuggestion["fixKind"], { label: string; description: string }> = {
      depthAlign: {
        label: "Alinhar profundidade frontal",
        description: "Flush frontal e profundidade coerente via Smart Snap.",
      },
      rodapeContinuity: {
        label: "Corrigir continuidade de rodapé",
        description: "Alinhar base dos módulos inferiores na mesma linha.",
      },
      remateAlign: {
        label: "Alinhar remates",
        description: "Reposicionar módulos para flush de remates (sem alterar produção).",
      },
      doorClearance: {
        label: "Aumentar folga entre portas",
        description: "Distribuir módulos com espaçamento mínimo seguro.",
      },
      drawerClearance: {
        label: "Corrigir folga de gavetas",
        description: "Afastar módulos com gavetas em conflito frontal.",
      },
      wallClearance: {
        label: "Afastar de aberturas",
        description: "Reposicionar módulos fora da zona de porta/janela.",
      },
      distributeFlush: {
        label: "Distribuir e flush",
        description: "Espaçamento uniforme com alinhamento frontal.",
      },
    };

    const suggestions: ManufacturingSuggestion[] = [];
    for (const [fixKind, boxIds] of byFix) {
      const meta = labels[fixKind];
      suggestions.push(buildSuggestion(fixKind, meta.label, meta.description, [...boxIds]));
    }
    return suggestions;
  }
}
