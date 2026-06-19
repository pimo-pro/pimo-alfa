import * as THREE from "three";
import { mmToM } from "../../../utils/units";
import { resolveMountSlot } from "../../../core/remate/remateMountFrame";
import { applyRemateRotationSnapToMesh } from "../../../core/remate/remateRotationSnap";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { collectRemateSnapTargets, signedDistanceRemateFaceToPlane } from "./remateSnapTargets";
import { collectAdvancedBoxCandidates } from "./smartSnappingBox";
import type { BoxAabb, SnapCandidate } from "./smartSnappingTypes";
import {
  collectBoxCornerCenterDeltas,
  collectBoxPairAlignDeltas,
  collectRemateStructuralExtras,
  collectRodapeBoxSnapDeltas,
  collectRodapeExtendedDeltas,
  remateRodapeContinuityDelta,
} from "./smartAlignSnapRules";
import { pickBestSnapCandidate } from "./smartAlignSnapPriority";
import { collectUnifiedRoomSnapCandidates } from "./smartRoomSnapIntegration";
import type {
  PredictSnapResult,
  SmartAlignSnapContext,
  SmartSnapEntity,
  SmartSnapEntityKind,
  SmartSnapTransformMode,
  UnifiedSnapCandidate,
  UnifiedSnapResult,
} from "./smartAlignSnapTypes";
import {
  getWorldPosition,
  setWorldPosition,
  type DragTransformTarget,
} from "../utils/transformDragSpace";

const _box3 = new THREE.Box3();
const _worldPos = new THREE.Vector3();
const _worldTarget = new THREE.Vector3();
const _deltaWorld = new THREE.Vector3();
const _localBox = new THREE.Box3();
const _corner = new THREE.Vector3();
const _invBox = new THREE.Matrix4();
const _boxMatrix = new THREE.Matrix4();
const _tempCandidates: SnapCandidate[] = [];

function meshToAabb(mesh: THREE.Object3D): BoxAabb {
  mesh.updateMatrixWorld(true);
  setBox3FromObjectExcludingLayoutProxy(_box3, mesh);
  const center = _box3.getCenter(new THREE.Vector3());
  return { min: _box3.min.clone(), max: _box3.max.clone(), center };
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

function pairPriority(a: SmartSnapEntityKind, b: SmartSnapEntityKind): number {
  if (a === "box" && b === "box") return 0;
  if ((a === "remate" && b === "box") || (a === "box" && b === "remate")) return 1;
  if ((a === "rodape" && b === "box") || (a === "box" && b === "rodape")) return 2;
  if ((a === "remate" && b === "rodape") || (a === "rodape" && b === "remate")) return 3;
  return 10;
}

/** Regista candidatos de snap entre duas entidades (API pública). */
export function computeSnapCandidates(
  entityA: SmartSnapEntity,
  entityB: SmartSnapEntity,
  ctx: SmartAlignSnapContext
): UnifiedSnapCandidate[] {
  if (entityA.id === entityB.id && entityA.kind === entityB.kind) return [];

  const basePriority = pairPriority(entityA.kind, entityB.kind);

  if (entityA.kind === "box" && entityB.kind === "box") {
    return collectBoxToBoxCandidates(entityA, entityB, ctx, basePriority);
  }
  if (entityA.kind === "remate" && entityB.kind === "box") {
    return collectRemateToBoxCandidates(entityA, entityB, ctx, basePriority);
  }
  if (entityA.kind === "rodape" && entityB.kind === "box") {
    return collectRodapeToBoxCandidates(entityA, entityB, ctx, basePriority);
  }
  if (
    (entityA.kind === "remate" && entityB.kind === "rodape") ||
    (entityA.kind === "rodape" && entityB.kind === "remate")
  ) {
    return collectRemateRodapeCandidates(entityA, entityB, ctx, basePriority);
  }
  return [];
}

export function findBestSnapForEntity(
  selected: SmartSnapEntity,
  ctx: SmartAlignSnapContext,
  others: SmartSnapEntity[]
): UnifiedSnapCandidate | null {
  const raw: UnifiedSnapCandidate[] = [];
  for (const other of others) {
    raw.push(...computeSnapCandidates(selected, other, ctx));
  }
  if (selected.kind === "box" && ctx.roomBoundsFull) {
    const moving = ctx.getWorldAabb(selected.mesh);
    raw.push(...collectUnifiedRoomSnapCandidates(moving, ctx));
  }
  return pickBestSnapCandidate(raw, {
    captureRadiusM: ctx.captureRadiusM,
    ignoreAutomatic: ctx.explicitModeActive,
  });
}

function collectBoxToBoxCandidates(
  entityA: SmartSnapEntity,
  entityB: SmartSnapEntity,
  ctx: SmartAlignSnapContext,
  basePriority: number
): UnifiedSnapCandidate[] {
  const moving = ctx.getWorldAabb(entityA.mesh);
  const other = ctx.getWorldAabb(entityB.mesh);
  _tempCandidates.length = 0;
  collectAdvancedBoxCandidates(moving, other, ctx.captureRadiusM, _tempCandidates);
  const out: UnifiedSnapCandidate[] = [];
  for (const c of _tempCandidates) {
    out.push({
      delta: c.delta.clone(),
      distanceM: c.distanceM,
      priority: basePriority + c.priority,
      kind: c.kind,
      targetId: entityB.id,
      targetKind: entityB.kind,
    });
  }
  for (const c of collectBoxPairAlignDeltas(moving, other, ctx.captureRadiusM)) {
    out.push({
      delta: c.delta,
      distanceM: c.distanceM,
      priority: basePriority + c.priority,
      kind: c.kind,
      targetId: entityB.id,
      targetKind: entityB.kind,
    });
  }
  for (const c of collectBoxCornerCenterDeltas(moving, other, ctx.captureRadiusM)) {
    out.push({
      delta: c.delta,
      distanceM: c.distanceM,
      priority: basePriority + c.priority,
      kind: c.kind,
      targetId: entityB.id,
      targetKind: entityB.kind,
    });
  }
  return out;
}

function collectRemateToBoxCandidates(
  remate: SmartSnapEntity,
  boxEntity: SmartSnapEntity,
  ctx: SmartAlignSnapContext,
  basePriority: number
): UnifiedSnapCandidate[] {
  const boxEntry = ctx.boxes.get(boxEntity.id);
  const boxConfig = ctx.getBoxConfig(boxEntity.id);
  if (!boxEntry || !boxConfig) return [];

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
  });

  const out: UnifiedSnapCandidate[] = [];
  for (const plane of targets) {
    const signedM = signedDistanceRemateFaceToPlane(_localBox, plane);
    const absM = Math.abs(signedM);
    if (absM > ctx.captureRadiusM) continue;
    const deltaLocal = plane.normalM.clone().multiplyScalar(-signedM);
    const deltaWorld = deltaLocal.transformDirection(_boxMatrix);
    out.push({
      delta: deltaWorld,
      distanceM: absM,
      priority: basePriority + plane.priority,
      kind: plane.kind,
      targetId: boxEntity.id,
      targetKind: "box",
    });
  }

  const piece = ctx.rematePieces.find((p) => p.id === remate.id);
  const mountSlot = piece?.mountSlot ?? (piece ? resolveMountSlot(piece) : undefined);
  const remateAabb = ctx.getWorldAabb(remate.mesh);
  const boxAabb = ctx.getWorldAabb(boxEntry.mesh);
  for (const c of collectRemateStructuralExtras({
    remateAabb,
    boxAabb,
    mountSlot,
    captureM: ctx.captureRadiusM,
  })) {
    out.push({
      delta: c.delta,
      distanceM: c.distanceM,
      priority: basePriority + c.priority,
      kind: c.kind,
      targetId: boxEntity.id,
      targetKind: "box",
    });
  }
  return out;
}

function collectRodapeToBoxCandidates(
  rodape: SmartSnapEntity,
  boxEntity: SmartSnapEntity,
  ctx: SmartAlignSnapContext,
  basePriority: number
): UnifiedSnapCandidate[] {
  const boxEntry = ctx.boxes.get(boxEntity.id);
  const boxConfig = ctx.getBoxConfig(boxEntity.id);
  const rodapeData = ctx.rodapes.find((r) => r.id === rodape.id);
  if (!boxEntry || !boxConfig || !rodapeData) return [];

  const rodapeAabb = ctx.getWorldAabb(rodape.mesh);
  const boxAabb = ctx.getWorldAabb(boxEntry.mesh);
  const snaps = collectRodapeBoxSnapDeltas({
    rodapeAabb,
    meshPosition: rodape.mesh.position,
    rodape: rodapeData,
    boxAabb,
    boxMesh: boxEntry.mesh,
    widthM: boxConfig.widthM,
    heightM: boxConfig.heightM,
    depthM: boxConfig.depthM,
    captureM: ctx.captureRadiusM,
  });

  const out = snaps.map((s) => ({
    delta: s.delta,
    distanceM: s.distanceM,
    priority: basePriority + s.priority,
    kind: s.kind,
    targetId: boxEntity.id,
    targetKind: "box" as const,
  }));

  const siblings = (ctx.allEntities ?? [])
    .filter(
      (e) =>
        e.kind === "rodape" &&
        e.id !== rodape.id &&
        e.parentBoxId === rodapeData.parentBoxId
    )
    .map((e) => ({
      aabb: ctx.getWorldAabb(e.mesh),
      meshPosition: e.mesh.position,
    }));

  for (const c of collectRodapeExtendedDeltas({
    rodapeAabb,
    meshPosition: rodape.mesh.position,
    siblingRodapes: siblings,
    boxAabb,
    roomBounds: ctx.roomBounds ?? null,
    captureM: ctx.captureRadiusM,
  })) {
    out.push({
      delta: c.delta,
      distanceM: c.distanceM,
      priority: basePriority + c.priority,
      kind: c.kind,
      targetId: boxEntity.id,
      targetKind: "box",
    });
  }
  return out;
}

function collectRemateRodapeCandidates(
  entityA: SmartSnapEntity,
  entityB: SmartSnapEntity,
  ctx: SmartAlignSnapContext,
  basePriority: number
): UnifiedSnapCandidate[] {
  const remate = entityA.kind === "remate" ? entityA : entityB;
  const rodape = entityA.kind === "rodape" ? entityA : entityB;
  const remateAabb = ctx.getWorldAabb(remate.mesh);
  const rodapeAabb = ctx.getWorldAabb(rodape.mesh);
  const out: UnifiedSnapCandidate[] = [];

  const continuity = remateRodapeContinuityDelta(remateAabb, rodapeAabb);
  if (continuity.distanceM <= ctx.captureRadiusM * 2) {
    out.push({
      delta: continuity.delta,
      distanceM: continuity.distanceM,
      priority: basePriority,
      kind: "visual_continuity",
      targetId: rodape.id,
      targetKind: "rodape",
    });
  }

  const zFrontGap = rodapeAabb.max.z - remateAabb.max.z;
  if (Math.abs(zFrontGap) <= ctx.captureRadiusM) {
    out.push({
      delta: new THREE.Vector3(0, 0, zFrontGap),
      distanceM: Math.abs(zFrontGap),
      priority: basePriority + 1,
      kind: "depth_front_flush",
      targetId: rodape.id,
      targetKind: "rodape",
    });
  }

  const heightGap = rodapeAabb.max.y - remateAabb.min.y;
  if (Math.abs(heightGap) <= ctx.captureRadiusM) {
    out.push({
      delta: new THREE.Vector3(0, heightGap, 0),
      distanceM: Math.abs(heightGap),
      priority: basePriority + 2,
      kind: "height_above_rodape",
      targetId: rodape.id,
      targetKind: "rodape",
    });
  }

  return out;
}

export function applySnapTransform(
  entity: SmartSnapEntity,
  candidate: UnifiedSnapCandidate,
  mode: SmartSnapTransformMode,
  magnetStrength: number,
  captureRadiusM?: number,
  dragTransform?: DragTransformTarget
): void {
  const drivenObject = dragTransform?.drivenObject ?? entity.mesh;
  const captureM = captureRadiusM ?? mmToM(DEFAULT_UNIFIED_CAPTURE_MM);
  const strength =
    mode === "immediate" ? 1 : smoothMagnetStrength(candidate.distanceM, captureM, magnetStrength);
  const world = getWorldPosition(drivenObject, _worldPos);
  _deltaWorld.copy(candidate.delta).multiplyScalar(strength);
  world.add(_deltaWorld);
  setWorldPosition(drivenObject, world);
}

function resolveDragTransformForEntity(
  entity: SmartSnapEntity,
  resolver?: (logicalMesh: THREE.Object3D) => DragTransformTarget
): DragTransformTarget {
  if (resolver) return resolver(entity.mesh);
  return { drivenObject: entity.mesh, logicalMesh: entity.mesh };
}

function smoothMagnetStrength(distanceM: number, captureM: number, magnet: number): number {
  const t = THREE.MathUtils.clamp(1 - distanceM / captureM, 0, 1);
  return (0.1 + 0.9 * t * t * t) * magnet;
}

const STRUCTURAL_ROTATION_KINDS = new Set(["BOX_CIMA", "BOX_DIR", "BOX_ESQ", "BOX_FRENTE", "BOX_TRAS"]);

function maybeCorrectRemateRotationForStructuralSnap(
  entity: SmartSnapEntity,
  candidate: UnifiedSnapCandidate,
  ctx: SmartAlignSnapContext
): void {
  if (entity.kind !== "remate" || !STRUCTURAL_ROTATION_KINDS.has(candidate.kind)) return;
  const boxId = entity.parentBoxId ?? candidate.targetId;
  const boxEntry = ctx.boxes.get(boxId);
  if (!boxEntry) return;
  applyRemateRotationSnapToMesh(entity.mesh, boxEntry.mesh);
}

export type SmartSnapEngineDeps = {
  listEntities: () => SmartSnapEntity[];
  buildContext: () => SmartAlignSnapContext;
  onSnapApplied?: (result: UnifiedSnapResult) => void;
  resolveDragTransformTarget?: (logicalMesh: THREE.Object3D) => DragTransformTarget;
};

export class SmartSnapEngine {
  private readonly deps: SmartSnapEngineDeps;

  constructor(deps: SmartSnapEngineDeps) {
    this.deps = deps;
  }

  predictSnap(selected: SmartSnapEntity, ctx?: SmartAlignSnapContext): PredictSnapResult {
    const context = ctx ?? this.deps.buildContext();
    const others = this.deps.listEntities().filter((e) => !(e.kind === selected.kind && e.id === selected.id));
    const best = findBestSnapForEntity(selected, context, others);
    if (!best) return { candidate: null, predictivePosition: null };
    const dragTransform = resolveDragTransformForEntity(selected, this.deps.resolveDragTransformTarget);
    const predictivePosition = getWorldPosition(dragTransform.drivenObject, _worldTarget).clone().add(best.delta);
    return { candidate: best, predictivePosition };
  }

  /** Previsão com candidatos extra (ex.: layout sugerido / sala). */
  predictSnapWithExtras(
    selected: SmartSnapEntity,
    extras: UnifiedSnapCandidate[],
    ctx?: SmartAlignSnapContext
  ): PredictSnapResult {
    const context = ctx ?? this.deps.buildContext();
    const others = this.deps.listEntities().filter((e) => !(e.kind === selected.kind && e.id === selected.id));
    const raw: UnifiedSnapCandidate[] = [...extras];
    for (const other of others) {
      raw.push(...computeSnapCandidates(selected, other, context));
    }
    if (selected.kind === "box" && context.roomBoundsFull) {
      raw.push(...collectUnifiedRoomSnapCandidates(context.getWorldAabb(selected.mesh), context));
    }
    const best = pickBestSnapCandidate(raw, {
      captureRadiusM: context.captureRadiusM,
      ignoreAutomatic: context.explicitModeActive,
    });
    if (!best) return { candidate: null, predictivePosition: null };
    const dragTransform = resolveDragTransformForEntity(selected, this.deps.resolveDragTransformTarget);
    return {
      candidate: best,
      predictivePosition: getWorldPosition(dragTransform.drivenObject, _worldTarget).clone().add(best.delta),
    };
  }

  applyUnifiedSnap(selected: SmartSnapEntity, ctx?: SmartAlignSnapContext): UnifiedSnapResult {
    const context = ctx ?? this.deps.buildContext();
    const others = this.deps.listEntities().filter((e) => !(e.kind === selected.kind && e.id === selected.id));
    const best = findBestSnapForEntity(selected, context, others);

    if (!best) return { applied: false };
    maybeCorrectRemateRotationForStructuralSnap(selected, best, context);
    const dragTransform = resolveDragTransformForEntity(selected, this.deps.resolveDragTransformTarget);
    applySnapTransform(
      selected,
      best,
      "magnetic",
      context.magnetStrength,
      context.captureRadiusM,
      dragTransform
    );
    const result: UnifiedSnapResult = {
      applied: true,
      candidateKind: best.kind,
      targetId: best.targetId,
      targetKind: best.targetKind,
      delta: best.delta.clone(),
    };
    this.deps.onSnapApplied?.(result);
    return result;
  }
}

export { meshToAabb };
