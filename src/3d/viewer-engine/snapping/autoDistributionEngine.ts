import * as THREE from "three";
import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import { boxCenterOnAxis } from "../autoLayout/autoLayoutRoomGeometry";
import { deltaForFlushAlign } from "./smartAlignSnapRules";
import type { AutoDistributionOptions, SmartLayoutEngineDeps } from "./smartLayoutTypes";
import type { SmartAlignSnapHistory } from "./smartAlignSnapHistory";

/**
 * Distribuição inteligente — espaçamento igual + alinhamento topo/frente/profundidade.
 */
export class AutoDistributionEngine {
  private readonly deps: SmartLayoutEngineDeps;
  private history: SmartAlignSnapHistory | null = null;

  constructor(deps: SmartLayoutEngineDeps) {
    this.deps = deps;
  }

  bindHistory(history: SmartAlignSnapHistory | null): void {
    this.history = history;
  }

  buildPlan(options: AutoDistributionOptions): AutoLayoutPlan | null {
    const bridge = this.deps.getBridge();
    if (!bridge || options.boxIds.length < 2) return null;

    const boxes = bridge.getWorkspaceBoxes().filter((b) => options.boxIds.includes(b.id) && !b.locked);
    if (boxes.length < 2) return null;

    const spreadX =
      Math.max(...boxes.map((b) => b.posicaoX_mm)) - Math.min(...boxes.map((b) => b.posicaoX_mm));
    const spreadZ =
      Math.max(...boxes.map((b) => b.posicaoZ_mm ?? 0)) -
      Math.min(...boxes.map((b) => b.posicaoZ_mm ?? 0));
    const axis: "x" | "z" = spreadX >= spreadZ ? "x" : "z";

    const sorted = [...boxes].sort((a, b) => boxCenterOnAxis(a, axis) - boxCenterOnAxis(b, axis));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const start = boxCenterOnAxis(first, axis);
    const end = boxCenterOnAxis(last, axis);
    const middle = sorted.slice(1, -1);

    const plan: AutoLayoutPlan = { cloneBoxes: [], moveBoxes: [], shelfUpdates: [] };
    if (!middle.length) return plan;

    const step = (end - start) / (sorted.length - 1);
    middle.forEach((box, idx) => {
      const target = start + step * (idx + 1);
      const placement = {
        x_mm: box.posicaoX_mm,
        y_mm: box.posicaoY_mm ?? box.dimensoes.altura / 2,
        z_mm: box.posicaoZ_mm ?? 0,
      };
      if (axis === "x") placement.x_mm = target;
      else placement.z_mm = target;
      plan.moveBoxes.push({ boxId: box.id, placement });
    });

    return plan;
  }

  distribute(options: AutoDistributionOptions): boolean {
    const bridge = this.deps.getBridge();
    const plan = this.buildPlan(options);
    if (!bridge || !plan) return false;
    if (!plan.moveBoxes.length) return false;

    bridge.applyPlan(plan);

    if (!this.deps.isSmartSnapEnabled()) return true;

    const ctx = this.deps.buildSnapContext();
    const referenceId = options.boxIds[0];
    const refEntry = referenceId ? ctx.boxes.get(referenceId) : undefined;
    if (!refEntry) return true;

    const refAabb = ctx.getWorldAabb(refEntry.mesh);

    for (const move of plan.moveBoxes) {
      const entry = ctx.boxes.get(move.boxId);
      if (!entry) continue;
      const movingAabb = ctx.getWorldAabb(entry.mesh);

      if (options.alignTop) {
        const gap = refAabb.max.y - movingAabb.max.y;
        if (Math.abs(gap) > 1e-6) entry.mesh.position.y += gap;
      }
      if (options.alignFront) {
        const delta = deltaForFlushAlign(movingAabb, refAabb, "flushFront");
        if (delta) entry.mesh.position.add(delta);
      }
      if (options.alignDepth) {
        const delta = deltaForFlushAlign(
          ctx.getWorldAabb(entry.mesh),
          refAabb,
          "flushBack"
        );
        if (delta) entry.mesh.position.add(delta);
      }

      if (options.useHistorySpacing && this.history?.getLast()?.kind === "auto_balance") {
        this.deps.refineBoxWithSmartSnap(move.boxId);
      } else {
        this.deps.refineBoxWithSmartSnap(move.boxId);
      }
    }

    return true;
  }
}

export function distributionAxisVector(axis: "x" | "z"): THREE.Vector3 {
  return axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
}
