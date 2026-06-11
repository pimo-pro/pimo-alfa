import type { WorkspaceBox } from "../../../core/types";
import { getCostRules } from "./rulesRuntime";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import type { ProjectRodape } from "../../../core/rodape/rodapeTypes";
import { findNearestWallId } from "../autoLayout/autoLayoutRoomGeometry";
import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type {
  CostCategoryBreakdown,
  CostChangeInput,
  CostDesignEstimate,
  CostImpactEstimate,
  CostModuleBreakdown,
  CostScanContext,
  CostScanResult,
  CostStyleEstimate,
  CostVariationEstimate,
  CostWallBreakdown,
} from "./costTypes";
import { getCostWeights, getScoringRules } from "./rulesRuntime";
import type { DesignVariantId, VariationKind } from "./intelligentDesignerTypes";
import { listStyleProfiles } from "./styleProfileEngine";

const WALL_LABELS = ["Frente", "Direita", "Fundo", "Esquerda"];

function boxVolumeM3(box: WorkspaceBox): number {
  const w = Math.max(1, box.dimensoes?.largura ?? 600) / 1000;
  const h = Math.max(1, box.dimensoes?.altura ?? 720) / 1000;
  const d = Math.max(1, box.dimensoes?.profundidade ?? 600) / 1000;
  return w * h * d;
}

type HoleCountByType = Record<
  "dobradica" | "corredica" | "puxador" | "cavilha" | "parafuso" | "minifix" | "prateleira",
  number
>;

function doorCount(box: WorkspaceBox): number {
  if (!box.portaTipo || box.portaTipo === "sem_porta") return 0;
  return box.portaTipo === "porta_dupla" ? 2 : 1;
}

function estimateHolesByType(box: WorkspaceBox): HoleCountByType {
  const doors = doorCount(box);
  const drawers = box.gavetas ?? 0;
  const shelves = box.prateleiras ?? 0;
  return {
    dobradica: doors * 4,
    corredica: drawers * 8,
    puxador: doors + drawers,
    cavilha: 4 + drawers * 2,
    parafuso: 8 + doors * 2,
    minifix: drawers > 0 ? 4 : 0,
    prateleira: shelves * 4,
  };
}

function estimateModulePieceCount(box: WorkspaceBox): number {
  const shelves = box.prateleiras ?? 0;
  const doors = doorCount(box);
  const drawers = box.gavetas ?? 0;
  const structural = 5 + (box.costaAtiva === false ? 0 : 1);
  return structural + shelves + doors + drawers;
}

function holeCostForBox(box: WorkspaceBox): number {
  const rules = getCostRules();
  const byType = estimateHolesByType(box);
  const typed =
    byType.dobradica * rules.priceHoleDobradica +
    byType.corredica * rules.priceHoleCorredica +
    byType.puxador * rules.priceHolePuxador +
    byType.cavilha * rules.priceHoleCavilha +
    byType.parafuso * rules.priceHoleParafuso +
    byType.minifix * rules.priceHoleMinifix +
    byType.prateleira * rules.priceHolePrateleira;
  const holeCount = Object.values(byType).reduce((s, n) => s + n, 0);
  const perCount =
    holeCount * (rules.extraCostPerHole + rules.costPerHole) * rules.holeCountMultiplier;
  return typed + perCount;
}

function modulePieceCostForBox(box: WorkspaceBox): number {
  const rules = getCostRules();
  const count = estimateModulePieceCount(box);
  return count * (rules.costPerModulePiece + rules.costPerPiece) * rules.modulePieceMultiplier;
}

function moduleComplexity(box: WorkspaceBox): number {
  const doors = doorCount(box);
  const drawers = box.gavetas ?? 0;
  const shelves = box.prateleiras ?? 0;
  return (
    doors * getCostWeights().doorUnit +
    drawers * getCostWeights().drawerUnit +
    shelves * getCostWeights().shelfUnit +
    holeCostForBox(box) +
    modulePieceCostForBox(box)
  );
}

/**
 * Intelligent Cost Estimator — estimativa heurística somente leitura.
 */
export class CostEstimatorEngine {
  scanProject(context: CostScanContext): CostScanResult {
    const boxes = context.boxes.filter((b) => !b.locked);
    const rematesByBox = groupRematesByBox(context.remates);
    const rodapesByBox = groupRodapesByBox(context.rodapes);

    let volumeTotal = 0;
    let complexityTotal = 0;
    let remateTotal = 0;
    let rodapeTotal = 0;
    let symmetryAdj = 0;
    let continuityAdj = 0;

    const moduleBreakdown: CostModuleBreakdown[] = [];

    for (const box of boxes) {
      const vol = boxVolumeM3(box) * getCostWeights().volumePerM3;
      const complexity = moduleComplexity(box);
      const remateShare = (rematesByBox.get(box.id)?.length ?? 0) * getCostWeights().remateUnit;
      const rodapeShare = (rodapesByBox.get(box.id)?.length ?? 0) * getCostWeights().rodapeUnit;
      const relativeCost = vol + complexity + remateShare + rodapeShare;

      volumeTotal += vol;
      complexityTotal += complexity;
      remateTotal += remateShare;
      rodapeTotal += rodapeShare;

      moduleBreakdown.push({
        boxId: box.id,
        label: box.nome || box.id,
        relativeCost: round2(relativeCost),
        volumeShare: round2(vol),
        complexityShare: round2(complexity),
        remateShare: round2(remateShare),
        rodapeShare: round2(rodapeShare),
      });
    }

    symmetryAdj = this.estimateSymmetryAdjustment(boxes);
    continuityAdj = this.estimateContinuityAdjustment(boxes, rodapesByBox);

    const categoryBreakdown = this.buildCategoryBreakdown(
      volumeTotal,
      complexityTotal,
      remateTotal,
      rodapeTotal,
      symmetryAdj,
      continuityAdj
    );

    const totalRelativeCost = round2(
      volumeTotal + complexityTotal + remateTotal + rodapeTotal + symmetryAdj + continuityAdj
    );
    const economyScore = this.computeEconomyScore(totalRelativeCost, boxes.length);
    const wallBreakdown = this.buildWallBreakdown(boxes, moduleBreakdown, context);
    const recommendations = this.buildRecommendations(moduleBreakdown, boxes.length, economyScore);

    return {
      totalRelativeCost,
      economyScore,
      moduleBreakdown: moduleBreakdown.sort((a, b) => b.relativeCost - a.relativeCost),
      wallBreakdown,
      categoryBreakdown,
      recommendations,
      scannedAt: Date.now(),
    };
  }

  estimatePlanCost(plan: AutoLayoutPlan, baseScan: CostScanResult, multiplier = 1): number {
    const cloneFactor = 1 + plan.cloneBoxes.length * 0.35;
    const moveFactor = 1 + plan.moveBoxes.length * 0.02;
    return round2(baseScan.totalRelativeCost * cloneFactor * moveFactor * multiplier);
  }

  estimateDesignCost(designId: DesignVariantId, baseCost: number): CostDesignEstimate {
    const mult = getCostWeights().designMultipliers[designId];
    const relativeCost = round2(baseCost * mult);
    const labels: Record<DesignVariantId, string> = {
      A: "Design A — Funcional",
      B: "Design B — Minimalista",
      C: "Design C — Otimizado",
    };
    return {
      designId,
      label: labels[designId],
      relativeCost,
      economyScore: this.computeEconomyScore(relativeCost, 3),
    };
  }

  estimateStyleCosts(baseCost: number): CostStyleEstimate[] {
    return listStyleProfiles().map((profile) => {
      const mult = getCostWeights().styleMultipliers[profile.id];
      const relativeCost = round2(baseCost * mult * (1 + profile.moduleCountDelta * 0.08));
      return {
        styleId: profile.id,
        label: profile.label,
        relativeCost,
        economyScore: this.computeEconomyScore(relativeCost, 4),
      };
    });
  }

  estimateVariationCost(kind: VariationKind, baseCost: number): CostVariationEstimate {
    const mult = getCostWeights().variationMultipliers[kind];
    const relativeCost = round2(baseCost * mult);
    const labels: Record<VariationKind, string> = {
      moreFreeSpace: "Mais espaço livre",
      moreStorage: "Mais armazenamento",
      moreSymmetry: "Mais simetria",
      moreDepth: "Mais profundidade",
    };
    return {
      kind,
      label: labels[kind],
      relativeCost,
      economyScore: this.computeEconomyScore(relativeCost, 3),
    };
  }

  estimateChangeImpact(scan: CostScanResult, change: CostChangeInput): CostImpactEstimate {
    let delta = 0;
    const parts: string[] = [];

    if (change.depthDeltaMm) {
      const impact = (change.depthDeltaMm / 600) * scan.categoryBreakdown.find((c) => c.category === "volume")!.relativeCost * 0.4;
      delta += impact;
      parts.push(`profundidade ${change.depthDeltaMm > 0 ? "+" : ""}${change.depthDeltaMm} mm`);
    }
    if (change.heightDeltaMm) {
      const impact = (change.heightDeltaMm / 720) * scan.categoryBreakdown.find((c) => c.category === "volume")!.relativeCost * 0.35;
      delta += impact;
      parts.push(`altura ${change.heightDeltaMm > 0 ? "+" : ""}${change.heightDeltaMm} mm`);
    }
    if (change.moduleCountDelta) {
      const perModule = scan.moduleBreakdown.length
        ? scan.totalRelativeCost / scan.moduleBreakdown.length
        : 50;
      delta += change.moduleCountDelta * perModule;
      parts.push(`${change.moduleCountDelta > 0 ? "+" : ""}${change.moduleCountDelta} módulo(s)`);
    }
    if (change.remateCountDelta) {
      delta += change.remateCountDelta * getCostWeights().remateUnit;
      parts.push(`${change.remateCountDelta > 0 ? "+" : ""}${change.remateCountDelta} remate(s)`);
    }
    if (change.rodapeCountDelta) {
      delta += change.rodapeCountDelta * getCostWeights().rodapeUnit;
      parts.push(`${change.rodapeCountDelta > 0 ? "+" : ""}${change.rodapeCountDelta} rodapé(s)`);
    }

    const projectedCost = round2(Math.max(0, scan.totalRelativeCost + delta));
    const deltaPercent = scan.totalRelativeCost > 0 ? round2((delta / scan.totalRelativeCost) * 100) : 0;
    const economyBefore = scan.economyScore;
    const economyAfter = this.computeEconomyScore(projectedCost, scan.moduleBreakdown.length);

    return {
      currentCost: scan.totalRelativeCost,
      projectedCost,
      deltaCost: round2(delta),
      deltaPercent,
      economyScoreDelta: economyAfter - economyBefore,
      summary: parts.length
        ? `Impacto estimado (${parts.join(", ")}): ${delta >= 0 ? "+" : ""}${round2(delta)} un. (${deltaPercent}%).`
        : "Sem alterações especificadas.",
    };
  }

  computeEconomyScore(totalRelativeCost: number, moduleCount: number): number {
    const baseline = Math.max(80, moduleCount * 55);
    const ratio = totalRelativeCost / baseline;
    return Math.max(0, Math.min(100, Math.round(100 - (ratio - 0.85) * 55)));
  }

  private estimateSymmetryAdjustment(boxes: WorkspaceBox[]): number {
    if (boxes.length < 2) return 0;
    const xs = boxes.map((b) => b.posicaoX_mm);
    const spread = Math.max(...xs) - Math.min(...xs);
    const center = (Math.max(...xs) + Math.min(...xs)) / 2;
    let imbalance = 0;
    for (const x of xs) imbalance += Math.abs(x - center);
    const norm = spread > 0 ? imbalance / (spread * boxes.length) : 0;
    return norm < 0.15 ? getCostWeights().symmetryBonus : 0;
  }

  private estimateContinuityAdjustment(
    boxes: WorkspaceBox[],
    rodapesByBox: Map<string, ProjectRodape[]>
  ): number {
    const lowers = boxes.filter((b) => b.cabinetType !== "upper");
    if (!lowers.length) return 0;
    const withRodape = lowers.filter((b) => (rodapesByBox.get(b.id)?.length ?? 0) > 0).length;
    const ratio = withRodape / lowers.length;
    return ratio >= 0.8 ? getCostWeights().continuityBonus : 0;
  }

  private buildCategoryBreakdown(
    volume: number,
    complexity: number,
    remates: number,
    rodapes: number,
    symmetry: number,
    continuity: number
  ): CostCategoryBreakdown[] {
    const raw = [
      { category: "volume" as const, relativeCost: volume },
      { category: "complexity" as const, relativeCost: complexity },
      { category: "remates" as const, relativeCost: remates },
      { category: "rodapes" as const, relativeCost: rodapes },
      { category: "symmetry" as const, relativeCost: Math.max(0, symmetry) },
      { category: "continuity" as const, relativeCost: Math.max(0, continuity) },
    ];
    const total = raw.reduce((s, c) => s + c.relativeCost, 0) || 1;
    return raw.map((c) => ({
      ...c,
      relativeCost: round2(c.relativeCost),
      percent: round2((c.relativeCost / total) * 100),
    }));
  }

  private buildWallBreakdown(
    boxes: WorkspaceBox[],
    modules: CostModuleBreakdown[],
    context: CostScanContext
  ): CostWallBreakdown[] {
    const byWall = new Map<number, { cost: number; count: number }>();
    for (const box of boxes) {
      const wallId =
        context.bounds != null
          ? findNearestWallId(box, context.bounds, context.wallOffsetMm ?? 50)
          : Math.round((box.posicaoX_mm ?? 0) / 1000) % 4;
      const mod = modules.find((m) => m.boxId === box.id);
      const entry = byWall.get(wallId) ?? { cost: 0, count: 0 };
      entry.cost += mod?.relativeCost ?? 0;
      entry.count += 1;
      byWall.set(wallId, entry);
    }
    return [...byWall.entries()]
      .map(([wallId, data]) => ({
        wallId,
        wallLabel: WALL_LABELS[wallId] ?? `Parede ${wallId}`,
        relativeCost: round2(data.cost),
        moduleCount: data.count,
      }))
      .sort((a, b) => b.relativeCost - a.relativeCost);
  }

  private buildRecommendations(
    modules: CostModuleBreakdown[],
    moduleCount: number,
    economyScore: number
  ): string[] {
    const recs: string[] = [];
    if (economyScore < getScoringRules().economyMinScore) {
      recs.push("Considere Design B ou estilo Minimalista para reduzir custo relativo.");
    }
    if (moduleCount > 6) {
      recs.push("Menos módulos na parede principal pode reduzir ~15–25% do custo.");
    }
    const top = modules[0];
    if (top && top.complexityShare > top.volumeShare * 1.5) {
      recs.push(`Módulo «${top.label}» tem alta complexidade — avalie portas/gavetas.`);
    }
    if (top && top.remateShare > 30) {
      recs.push("Remates representam parcela significativa — simplifique acabamentos.");
    }
    if (economyScore >= 80) {
      recs.push("Layout já é económico — versão premium pode usar estilo Luxo ou Design C.");
    }
    return recs;
  }
}

function groupRematesByBox(remates: RematePiece[]): Map<string, RematePiece[]> {
  const map = new Map<string, RematePiece[]>();
  for (const r of remates) {
    if (!r.parentBoxId) continue;
    const list = map.get(r.parentBoxId) ?? [];
    list.push(r);
    map.set(r.parentBoxId, list);
  }
  return map;
}

function groupRodapesByBox(rodapes: ProjectRodape[]): Map<string, ProjectRodape[]> {
  const map = new Map<string, ProjectRodape[]>();
  for (const r of rodapes) {
    const list = map.get(r.parentBoxId) ?? [];
    list.push(r);
    map.set(r.parentBoxId, list);
  }
  return map;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
