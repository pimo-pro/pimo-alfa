import * as THREE from "three";
import { mmToM } from "../../../utils/units";
import { collectDynamicAlignCandidates } from "./collectDynamicAlignCandidates";
import { getEntityWorldBoxAabb } from "./smartAlignSnapAabb";
import {
  buildDynamicAlignGuides,
  labelForDynamicAlignKind,
} from "./smartAlignSnapGuides";
import { rankSnapCandidates } from "./smartAlignSnapPriority";
import { snapDeltaPenetratesBoxInterior } from "./remateSnapPenetrationGuard";
import type { SmartAlignSnapOverlayState } from "./smartAlignSnapOverlay";
import type {
  SmartAlignSnapContext,
  SmartSnapEntityKind,
  UnifiedSnapCandidate,
  UnifiedSnapResult,
} from "./smartAlignSnapTypes";
import {
  DEFAULT_UNIFIED_CAPTURE_MM,
  DEFAULT_UNIFIED_LERP,
  DEFAULT_UNIFIED_MAGNET,
} from "./smartAlignSnapTypes";

export type SmartAlignSnapEngineDeps = {
  isInternalRulerActive: () => boolean;
};

export type SmartAlignEntityRef = {
  kind: SmartSnapEntityKind;
  id: string;
  parentBoxId?: string;
};

export class SmartAlignSnapEngine {
  private readonly deps: SmartAlignSnapEngineDeps;
  private enabled = true;
  private captureRadiusMm = DEFAULT_UNIFIED_CAPTURE_MM;
  private magnetStrength = DEFAULT_UNIFIED_MAGNET;
  private lerpFactor = DEFAULT_UNIFIED_LERP;
  private overlayState: SmartAlignSnapOverlayState = { visible: false, mode: "reference", guides: [] };
  private lastOverlayKey: string | null = null;

  constructor(deps: SmartAlignSnapEngineDeps) {
    this.deps = deps;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.clearOverlayState();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setCaptureRadius(mm: number): void {
    this.captureRadiusMm = Math.max(1, mm);
  }

  setMagnetStrength(value: number): void {
    this.magnetStrength = THREE.MathUtils.clamp(value, 0, 1);
  }

  setLerpFactor(value: number): void {
    this.lerpFactor = THREE.MathUtils.clamp(value, 0, 1);
  }

  onDragStart(): void {
    this.clearOverlayState();
  }

  onDragEnd(): void {
    this.clearOverlayState();
  }

  getOverlayState(): SmartAlignSnapOverlayState {
    return this.overlayState;
  }

  refreshOverlay(): void {
    if (!this.overlayState.visible) return;
  }

  clearOverlayState(): void {
    this.overlayState = { visible: false, mode: "reference", guides: [] };
    this.lastOverlayKey = null;
  }

  applyDuringTranslate(params: {
    mesh: THREE.Object3D;
    entity: SmartAlignEntityRef;
    ctx: SmartAlignSnapContext;
    isDragging: boolean;
    currentTool: string;
  }): UnifiedSnapResult {
    const { mesh, entity, ctx, isDragging, currentTool } = params;

    if (!this.enabled || !isDragging || currentTool !== "translate") {
      this.clearOverlayState();
      return { applied: false };
    }
    if (this.deps.isInternalRulerActive()) {
      this.clearOverlayState();
      return { applied: false };
    }

    const entities = ctx.allEntities ?? [];
    if (entities.length < 2) {
      this.clearOverlayState();
      return { applied: false };
    }

    const captureM = ctx.captureRadiusM ?? mmToM(this.captureRadiusMm);
    const magnet = ctx.magnetStrength ?? this.magnetStrength;
    const lerp = this.lerpFactor;

    const candidates = collectDynamicAlignCandidates({
      movingMesh: mesh,
      movingKind: entity.kind,
      movingId: entity.id,
      entities,
      captureM,
    });

    const best = this.pickValidCandidate(candidates, captureM, mesh, entity, ctx);
    if (!best) {
      this.clearOverlayState();
      return { applied: false };
    }

    const strength = this.computeSmoothStrength(best.distanceM, captureM, magnet, lerp);
    const appliedDelta = best.delta.clone().multiplyScalar(strength);
    mesh.position.add(appliedDelta);

    const movingAabb = getEntityWorldBoxAabb(mesh, entity.kind);
    const targetEntity = entities.find((e) => e.id === best.targetId && e.kind === best.targetKind);
    const otherAabb = targetEntity
      ? getEntityWorldBoxAabb(targetEntity.mesh, targetEntity.kind)
      : movingAabb;

    const guides = buildDynamicAlignGuides(movingAabb, otherAabb, best.kind);
    const snapPoint = mesh.position.clone();
    const overlayKey = `${best.kind}:${best.targetId}:${best.targetKind}:${best.distanceM.toFixed(4)}`;

    if (this.lastOverlayKey !== overlayKey) {
      this.lastOverlayKey = overlayKey;
      this.overlayState = {
        visible: true,
        mode: "reference",
        guides,
        snapPoint,
        label: labelForDynamicAlignKind(best.kind),
      };
    } else {
      this.overlayState = {
        ...this.overlayState,
        visible: true,
        guides,
        snapPoint,
      };
    }

    return {
      applied: true,
      candidateKind: best.kind,
      targetId: best.targetId,
      targetKind: best.targetKind,
      delta: appliedDelta,
    };
  }

  private pickValidCandidate(
    candidates: UnifiedSnapCandidate[],
    captureM: number,
    mesh: THREE.Object3D,
    entity: SmartAlignEntityRef,
    ctx: SmartAlignSnapContext
  ): UnifiedSnapCandidate | null {
    const ranked = rankSnapCandidates(candidates, { captureRadiusM: captureM });
    for (const candidate of ranked) {
      if (!this.isSnapDeltaAllowed(mesh, entity, candidate.delta, ctx)) continue;
      return candidate;
    }
    return null;
  }

  private isSnapDeltaAllowed(
    mesh: THREE.Object3D,
    entity: SmartAlignEntityRef,
    delta: THREE.Vector3,
    ctx: SmartAlignSnapContext
  ): boolean {
    if (entity.kind !== "remate" && entity.kind !== "rodape") return true;
    const parentBoxId = entity.parentBoxId;
    if (!parentBoxId) return true;
    const entry = ctx.boxes.get(parentBoxId);
    if (!entry) return true;
    return !snapDeltaPenetratesBoxInterior({
      mesh,
      delta,
      boxMesh: entry.mesh,
      widthM: entry.width,
      heightM: entry.height,
      depthM: entry.depth,
    });
  }

  private computeSmoothStrength(
    distanceM: number,
    captureM: number,
    magnet: number,
    lerp: number
  ): number {
    const t = THREE.MathUtils.clamp(1 - distanceM / captureM, 0, 1);
    const ease = t * t;
    return ease * magnet * lerp;
  }
}
