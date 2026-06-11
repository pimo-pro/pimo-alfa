import * as THREE from "three";
import { computeMountFrameM, faceOffsetsFromPositionM, resolveMountSlot } from "../../../core/remate/remateMountFrame";
import { getRemateEnvelopeBoundsM } from "../../../core/remate/rematePlacement";
import { collectRemateSnapTargets } from "./remateSnapTargets";
import type { RemateSnapTargetKind } from "./remateSnapTargets";
import {
  deltaForFlushAlign,
  flushHasOverlap,
  remateFeaturePlaneDeltaWorld,
  remateRodapeContinuityDelta,
  rodapeRemateContinuityDelta,
} from "./smartAlignSnapRules";
import type {
  ExplicitAlignMode,
  SmartAlignSnapContext,
  SmartSnapEntity,
  UnifiedSnapResult,
} from "./smartAlignSnapTypes";
import { computeSnapCandidates, applySnapTransform, findBestSnapForEntity } from "./smartSnapEngine";
import { pickBestSnapCandidate } from "./smartAlignSnapPriority";
import type { SmartAlignSnapHistory } from "./smartAlignSnapHistory";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import type { BoxAabb } from "./smartSnappingTypes";

const _box3 = new THREE.Box3();
const _localBox = new THREE.Box3();
const _invBox = new THREE.Matrix4();
const _boxMatrix = new THREE.Matrix4();
const _corner = new THREE.Vector3();

function centerDistanceSq(a: BoxAabb, b: BoxAabb): number {
  const dx = a.center.x - b.center.x;
  const dy = a.center.y - b.center.y;
  const dz = a.center.z - b.center.z;
  return dx * dx + dy * dy + dz * dz;
}

function autoBalanceDelta(moving: BoxAabb, other: BoxAabb): THREE.Vector3 {
  const pairs: Array<{ gap: number; axis: "x" | "y" | "z" }> = [
    { gap: other.max.x - moving.max.x, axis: "x" },
    { gap: other.min.x - moving.min.x, axis: "x" },
    { gap: other.max.y - moving.max.y, axis: "y" },
    { gap: other.min.y - moving.min.y, axis: "y" },
    { gap: other.max.z - moving.max.z, axis: "z" },
    { gap: other.min.z - moving.min.z, axis: "z" },
  ];
  let best = pairs[0]!;
  for (const p of pairs) {
    if (Math.abs(p.gap) < Math.abs(best.gap)) best = p;
  }
  const delta = new THREE.Vector3();
  delta[best.axis] = best.gap;
  return delta;
}

function expandWorldAabbToBoxLocal(worldBox: THREE.Box3, boxMesh: THREE.Object3D, out: THREE.Box3): void {
  out.makeEmpty();
  boxMesh.updateMatrixWorld(true);
  _invBox.copy(boxMesh.matrixWorld).invert();
  const { min, max } = worldBox;
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        _corner.set(x, y, z).applyMatrix4(_invBox);
        out.expandByPoint(_corner);
      }
    }
  }
}

export type SmartAlignEngineDeps = {
  getSelectedEntity: () => SmartSnapEntity | null;
  listEntities: () => SmartSnapEntity[];
  buildContext: () => SmartAlignSnapContext;
  onAlignmentApplied: (entity: SmartSnapEntity) => void;
  isEnabled: () => boolean;
  isAutoBalanceEnabled: () => boolean;
  history?: SmartAlignSnapHistory;
};

export class SmartAlignEngine {
  private readonly deps: SmartAlignEngineDeps;

  constructor(deps: SmartAlignEngineDeps) {
    this.deps = deps;
  }

  applyRepeatLastAlignment(): boolean {
    const mode = this.deps.history?.getRepeatMode();
    if (!mode || mode === "magnetic") return false;
    return this.applyExplicitAlignment(mode);
  }

  applyInverseAlignment(): boolean {
    const mode = this.deps.history?.getInverseMode();
    if (!mode) return false;
    return this.applyExplicitAlignment(mode);
  }

  applyExplicitAlignment(mode: ExplicitAlignMode): boolean {
    if (!this.deps.isEnabled()) return false;

    const selected = this.deps.getSelectedEntity();
    if (!selected) return false;

    if (mode === "alignDoor" || mode === "alignDrawer") {
      return this.alignRemateToBoxFeature(
        selected,
        mode === "alignDoor" ? "DOOR_FRONT" : "DRAWER_FRONT"
      );
    }

    if (mode === "continueLine") {
      return this.applyContinueLine(selected);
    }

    const ctx = this.deps.buildContext();
    const others = this.deps.listEntities().filter((e) => !(e.kind === selected.kind && e.id === selected.id));
    if (!others.length) return false;

    const movingAabb = ctx.getWorldAabb(selected.mesh);
    let nearest = others[0]!;
    let bestDist = centerDistanceSq(movingAabb, ctx.getWorldAabb(nearest.mesh));
    for (let i = 1; i < others.length; i += 1) {
      const d = centerDistanceSq(movingAabb, ctx.getWorldAabb(others[i]!.mesh));
      if (d < bestDist) {
        bestDist = d;
        nearest = others[i]!;
      }
    }

    const otherAabb = ctx.getWorldAabb(nearest.mesh);

    if (selected.kind === "remate" && nearest.kind === "box") {
      return this.alignRemateToBoxExplicit(selected, nearest, mode, ctx);
    }

    const delta =
      mode === "auto"
        ? autoBalanceDelta(movingAabb, otherAabb)
        : deltaForFlushAlign(movingAabb, otherAabb, mode);

    if (!delta || delta.lengthSq() < 1e-12) return false;
    if (!flushHasOverlap(movingAabb, otherAabb, mode)) return false;

    selected.mesh.position.add(delta);
    this.recordExplicitHistory(mode, "flush");
    this.deps.onAlignmentApplied(selected);
    return true;
  }

  applyAutoBalanceIfEnabled(selected: SmartSnapEntity, ctx?: SmartAlignSnapContext): UnifiedSnapResult {
    if (!this.deps.isEnabled() || !this.deps.isAutoBalanceEnabled()) return { applied: false };

    const context = ctx ?? this.deps.buildContext();
    const others = this.deps.listEntities().filter((e) => !(e.kind === selected.kind && e.id === selected.id));
    if (!others.length) return { applied: false };

    const movingAabb = context.getWorldAabb(selected.mesh);
    let nearest = others[0]!;
    let bestDist = centerDistanceSq(movingAabb, context.getWorldAabb(nearest.mesh));
    for (let i = 1; i < others.length; i += 1) {
      const d = centerDistanceSq(movingAabb, context.getWorldAabb(others[i]!.mesh));
      if (d < bestDist) {
        bestDist = d;
        nearest = others[i]!;
      }
    }

    const best = findBestSnapForEntity(selected, context, others);
    if (!best) {
      const delta = autoBalanceDelta(movingAabb, context.getWorldAabb(nearest.mesh));
      if (delta.lengthSq() < 1e-12) return { applied: false };
      if (Math.sqrt(delta.lengthSq()) > context.captureRadiusM) return { applied: false };
      selected.mesh.position.add(delta.multiplyScalar(context.magnetStrength));
      return { applied: true, candidateKind: "auto_balance" };
    }

    applySnapTransform(selected, best, "magnetic", context.magnetStrength, context.captureRadiusM);
    return {
      applied: true,
      candidateKind: best.kind,
      targetId: best.targetId,
      targetKind: best.targetKind,
      delta: best.delta.clone(),
    };
  }

  private alignRemateToBoxExplicit(
    remate: SmartSnapEntity,
    boxEntity: SmartSnapEntity,
    mode: ExplicitAlignMode,
    ctx: SmartAlignSnapContext
  ): boolean {
    const boxEntry = ctx.boxes.get(boxEntity.id);
    const boxConfig = ctx.getBoxConfig(boxEntity.id);
    const piece = ctx.rematePieces.find((p) => p.id === remate.id);
    if (!boxEntry || !boxConfig || !piece) return false;

    if (mode === "alignDoor" || mode === "alignDrawer") {
      return this.alignRemateToBoxFeature(
        remate,
        mode === "alignDoor" ? "DOOR_FRONT" : "DRAWER_FRONT"
      );
    }

    const candidates = computeSnapCandidates(remate, boxEntity, ctx);
    const structuralKinds: Record<string, string> = {
      front: "BOX_FRENTE",
      flushFront: "BOX_FRENTE",
      back: "BOX_TRAS",
      flushBack: "BOX_TRAS",
      left: "BOX_ESQ",
      flushLeft: "BOX_ESQ",
      right: "BOX_DIR",
      flushRight: "BOX_DIR",
      top: "BOX_CIMA",
      bottom: "BOX_FUNDO",
    };
    const preferKind = structuralKinds[mode];
    const filtered = preferKind ? candidates.filter((c) => c.kind === preferKind) : candidates;
    const pool = filtered.length ? filtered : candidates;

    if (!pool.length) {
      const movingAabb = ctx.getWorldAabb(remate.mesh);
      const otherAabb = ctx.getWorldAabb(boxEntry.mesh);
      const delta = mode === "auto" ? autoBalanceDelta(movingAabb, otherAabb) : deltaForFlushAlign(movingAabb, otherAabb, mode);
      if (!delta || delta.lengthSq() < 1e-12) return false;
      remate.mesh.position.add(delta);
      this.recordExplicitHistory(mode, mode);
      this.deps.onAlignmentApplied(remate);
      return true;
    }

    const best = pickBestSnapCandidate(pool, { captureRadiusM: ctx.captureRadiusM }) ?? pool[0]!;
    applySnapTransform(remate, best, "immediate", 1, ctx.captureRadiusM);
    this.recordExplicitHistory(mode, best.kind);
    this.deps.onAlignmentApplied(remate);
    return true;
  }

  private alignRemateToBoxFeature(remate: SmartSnapEntity, featureKind: RemateSnapTargetKind): boolean {
    if (remate.kind !== "remate") return false;
    const ctx = this.deps.buildContext();
    const boxId = remate.parentBoxId;
    if (!boxId) return false;

    const boxEntry = ctx.boxes.get(boxId);
    const boxConfig = ctx.getBoxConfig(boxId);
    if (!boxEntry || !boxConfig) return false;

    boxEntry.mesh.updateMatrixWorld(true);
    _boxMatrix.copy(boxEntry.mesh.matrixWorld);

    setBox3FromObjectExcludingLayoutProxy(_box3, remate.mesh);
    expandWorldAabbToBoxLocal(_box3, boxEntry.mesh, _localBox);

    const targets = collectRemateSnapTargets({
      boxMesh: boxEntry.mesh,
      widthM: boxConfig.widthM,
      heightM: boxConfig.heightM,
      depthM: boxConfig.depthM,
      boxMeta: boxConfig.box ?? null,
    }).filter((p) => p.kind === featureKind);

    if (!targets.length) return false;

    const plane = targets[0]!;
    const deltaWorld = remateFeaturePlaneDeltaWorld({
      remateLocalBox: _localBox,
      plane,
      boxMatrixWorld: _boxMatrix,
    });
    if (deltaWorld.lengthSq() < 1e-12) return false;

    remate.mesh.position.add(deltaWorld);
    this.recordExplicitHistory(featureKind === "DOOR_FRONT" ? "alignDoor" : "alignDrawer", featureKind);
    this.persistRemateFaceOffsets(remate, ctx);
    this.deps.onAlignmentApplied(remate);
    return true;
  }

  private applyContinueLine(selected: SmartSnapEntity): boolean {
    const ctx = this.deps.buildContext();
    const all = this.deps.listEntities();

    let remate: SmartSnapEntity | null = selected.kind === "remate" ? selected : null;
    let rodape: SmartSnapEntity | null = selected.kind === "rodape" ? selected : null;

    if (remate) {
      rodape =
        all.find((e) => e.kind === "rodape" && e.parentBoxId === remate!.parentBoxId) ?? null;
    } else if (rodape) {
      remate =
        all.find((e) => e.kind === "remate" && e.parentBoxId === rodape!.parentBoxId) ?? null;
    }

    if (!remate || !rodape) return false;

    const remateAabb = ctx.getWorldAabb(remate.mesh);
    const rodapeAabb = ctx.getWorldAabb(rodape.mesh);
    const { delta } =
      selected.kind === "remate"
        ? remateRodapeContinuityDelta(remateAabb, rodapeAabb)
        : rodapeRemateContinuityDelta(rodapeAabb, remateAabb);
    if (delta.lengthSq() < 1e-12) return false;

    selected.mesh.position.add(delta);
    this.recordExplicitHistory("continueLine", "visual_continuity");
    if (selected.kind === "remate") this.persistRemateFaceOffsets(selected, ctx);
    this.deps.onAlignmentApplied(selected);
    return true;
  }

  private recordExplicitHistory(mode: ExplicitAlignMode, kind: string): void {
    this.deps.history?.record({ mode, kind });
  }

  private persistRemateFaceOffsets(remate: SmartSnapEntity, ctx: SmartAlignSnapContext): void {
    if (!remate.parentBoxId) return;
    const piece = ctx.rematePieces.find((p) => p.id === remate.id);
    const boxConfig = ctx.getBoxConfig(remate.parentBoxId);
    const boxEntry = ctx.boxes.get(remate.parentBoxId);
    if (!piece || !boxConfig || !boxEntry) return;

    boxEntry.mesh.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(boxEntry.mesh.matrixWorld).invert();
    const local = remate.mesh.position.clone().applyMatrix4(inv);
    const position = { xMm: local.x * 1000, yMm: local.y * 1000, zMm: local.z * 1000 };

    const bounds = getRemateEnvelopeBoundsM(
      boxConfig.widthM,
      boxConfig.heightM,
      boxConfig.depthM,
      boxConfig.box ?? null
    );
    const slot = piece.mountSlot ?? resolveMountSlot(piece);
    const frame = computeMountFrameM(bounds, slot);
    void faceOffsetsFromPositionM(frame, position, piece.faceOffsets?.rotationSnapIndex);
  }
}
