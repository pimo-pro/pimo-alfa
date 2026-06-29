/**
 * Modo de trabalho: Workspace Industrial de Design de Modelos.
 * Permite seleccionar peças e inserir furos por clique no viewer 3D.
 */

import * as THREE from "three";
import type { HoleTypeId } from "../../../core/drill/holeCatalog";
import { getHoleTypeById } from "../../../core/drill/holeCatalog";
import type { ViewerDrillMarkersByPanel } from "../../../core/types";
import {
  buildViewerDrillMarkersFromDesign,
  collectIssuePanelIds,
  DesignValidationError,
  findDesignPanel,
  insertDesignHoleWithCavilhaPairing,
  mergeViewerDrillMarkers,
  meshLocalPointToHoleMm,
  resolveHoleFaceFromHit,
  validateIndustrialDesignBox,
} from "../../../core/industrialDesigner";
import type { DesignDrillHole, IndustrialDesignBox } from "../../../core/industrialDesigner/types";
import type { DesignValidationIssue } from "../../../core/industrialDesigner/geometryValidation";
import type { ViewerBoxEntry } from "../types";
import { getMeshFromRaycastObject } from "../raycast/internalRaycastUtils";
import { isInternalSelectableMesh } from "../selection/InternalSelectionResolver";

export type IndustrialDesignPanelHit = {
  boxId: string;
  panelId: string;
  xMm: number;
  yMm: number;
  face: "espessura" | "face";
};

export type IndustrialDesignWorkspaceCallbacks = {
  onPanelSelected?: (panelId: string | null, boxId: string | null) => void;
  onHolePlaced?: (panelId: string, hole: DesignDrillHole, paired?: { panelId: string; hole: DesignDrillHole }) => void;
  onDesignChanged?: (box: IndustrialDesignBox) => void;
  onValidationChanged?: (issues: DesignValidationIssue[]) => void;
  onValidationFailed?: (error: DesignValidationError) => void;
};

export type IndustrialDesignWorkspaceDeps = {
  getBoxEntry: (boxId: string) => ViewerBoxEntry | undefined;
  getBoxMesh: (boxId: string) => THREE.Object3D | null;
  raycastIntersects: (event: { clientX: number; clientY: number }) => THREE.Intersection[];
  updateBoxDrillMarkers: (boxId: string, markers: ViewerDrillMarkersByPanel) => void;
  setPanelRenderingEnabled: (enabled: boolean) => void;
  setValidationHighlightPanels: (boxId: string, panelIds: string[]) => void;
  setSelectionHighlightPanel: (boxId: string, panelId: string | null) => void;
  syncDesignVisuals: (boxId: string) => void;
};

export class IndustrialDesignWorkspaceMode {
  private enabled = false;
  private activeHoleTypeId: HoleTypeId | null = null;
  private designBox: IndustrialDesignBox | null = null;
  private selectedPanelId: string | null = null;
  private targetBoxId: string | null = null;
  private validationIssues: DesignValidationIssue[] = [];
  private callbacks: IndustrialDesignWorkspaceCallbacks = {};
  private readonly deps: IndustrialDesignWorkspaceDeps;

  constructor(deps: IndustrialDesignWorkspaceDeps) {
    this.deps = deps;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getActiveHoleTypeId(): HoleTypeId | null {
    return this.activeHoleTypeId;
  }

  getDesignBox(): IndustrialDesignBox | null {
    return this.designBox;
  }

  getSelectedPanelId(): string | null {
    return this.selectedPanelId;
  }

  getTargetBoxId(): string | null {
    return this.targetBoxId;
  }

  getValidationIssues(): DesignValidationIssue[] {
    return [...this.validationIssues];
  }

  refreshValidation(): DesignValidationIssue[] {
    if (!this.designBox) {
      this.validationIssues = [];
      if (this.targetBoxId) {
        this.deps.setValidationHighlightPanels(this.targetBoxId, []);
      }
      this.callbacks.onValidationChanged?.([]);
      return [];
    }
    this.validationIssues = validateIndustrialDesignBox(this.designBox);
    const errorPanelIds = collectIssuePanelIds(
      this.validationIssues.filter((i) => i.severity === "error")
    );
    if (this.targetBoxId) {
      this.deps.setValidationHighlightPanels(this.targetBoxId, errorPanelIds);
    }
    this.callbacks.onValidationChanged?.(this.validationIssues);
    return this.validationIssues;
  }

  setCallbacks(callbacks: IndustrialDesignWorkspaceCallbacks): void {
    this.callbacks = callbacks;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.deps.setPanelRenderingEnabled(enabled);
    if (!enabled) {
      this.activeHoleTypeId = null;
      this.selectedPanelId = null;
      if (this.targetBoxId) {
        this.deps.setSelectionHighlightPanel(this.targetBoxId, null);
        this.deps.syncDesignVisuals(this.targetBoxId);
      }
    }
  }

  setActiveHoleTypeId(id: HoleTypeId | null): void {
    this.activeHoleTypeId = id;
  }

  setDesignBox(box: IndustrialDesignBox | null, targetBoxId?: string | null): void {
    this.designBox = box;
    this.targetBoxId = targetBoxId ?? box?.id ?? null;
    if (box && this.targetBoxId) {
      this.syncToViewer();
      this.refreshValidation();
      this.deps.syncDesignVisuals(this.targetBoxId);
    } else if (this.targetBoxId) {
      this.deps.setValidationHighlightPanels(this.targetBoxId, []);
      this.deps.setSelectionHighlightPanel(this.targetBoxId, null);
      this.deps.syncDesignVisuals(this.targetBoxId);
    }
    this.callbacks.onDesignChanged?.(box ?? (null as unknown as IndustrialDesignBox));
  }

  selectPanel(panelId: string | null): void {
    this.selectedPanelId = panelId;
    if (this.targetBoxId) {
      this.deps.setSelectionHighlightPanel(this.targetBoxId, panelId);
    }
    this.callbacks.onPanelSelected?.(panelId, this.targetBoxId);
  }

  /** Resolve painel sob o cursor (raycast). */
  resolvePanelHit(event: { clientX: number; clientY: number }): IndustrialDesignPanelHit | null {
    const hits = this.deps.raycastIntersects(event);
    for (const hit of hits) {
      const mesh = getMeshFromRaycastObject(hit.object);
      if (!mesh || !isInternalSelectableMesh(mesh)) continue;

      const boxId = mesh.userData?.boxId as string | undefined;
      if (!boxId) continue;
      if (this.targetBoxId && boxId !== this.targetBoxId) continue;

      const panelId = mesh.userData?.panelId as string | undefined;
      if (!panelId) continue;

      const local = new THREE.Vector3();
      mesh.worldToLocal(local.copy(hit.point));

      const coords = meshLocalPointToHoleMm(local.x, local.y, local.z, {
        panelType: mesh.userData?.panelType,
        width: mesh.userData?.width,
        height: mesh.userData?.height,
        thickness: mesh.userData?.thickness,
      });
      if (!coords) continue;

      const preferredFace = this.activeHoleTypeId
        ? getHoleTypeById(this.activeHoleTypeId).face
        : "face";

      const face = resolveHoleFaceFromHit(coords.isFaceHit, preferredFace);

      return { boxId, panelId, xMm: coords.xMm, yMm: coords.yMm, face };
    }
    return null;
  }

  /**
   * Processa clique no canvas quando o modo está activo.
   * @returns true se o evento foi consumido.
   */
  handlePointerClick(event: { clientX: number; clientY: number }): boolean {
    if (!this.enabled) return false;

    const hit = this.resolvePanelHit(event);
    if (!hit) return false;

    this.selectPanel(hit.panelId);

    if (!this.activeHoleTypeId || !this.designBox) {
      return true;
    }

    const panel = findDesignPanel(this.designBox, hit.panelId);
    if (!panel) {
      // Painel do viewer ainda não mapeado no designBox — aceita clique de selecção apenas.
      return true;
    }

    try {
      const result = insertDesignHoleWithCavilhaPairing(
        this.designBox,
        hit.panelId,
        this.activeHoleTypeId,
        hit.xMm,
        hit.yMm,
        hit.face
      );
      this.designBox = result.box;
      this.syncToViewer();
      this.refreshValidation();
      const paired =
        result.pairedHole && result.pairedPanelId
          ? { panelId: result.pairedPanelId, hole: result.pairedHole }
          : undefined;
      this.callbacks.onHolePlaced?.(hit.panelId, result.hole, paired);
      this.callbacks.onDesignChanged?.(result.box);
      if (this.targetBoxId) {
        this.deps.syncDesignVisuals(this.targetBoxId);
      }
    } catch (err) {
      if (err instanceof DesignValidationError) {
        this.callbacks.onValidationFailed?.(err);
        this.refreshValidation();
        return true;
      }
      throw err;
    }
    return true;
  }

  /** Sincroniza furos do designBox com o viewer 3D. */
  syncToViewer(): void {
    if (!this.targetBoxId || !this.designBox) return;
    const entry = this.deps.getBoxEntry(this.targetBoxId);
    const designMarkers = buildViewerDrillMarkersFromDesign(this.designBox);
    const merged = mergeViewerDrillMarkers(entry?.drillMarkersByPanel, designMarkers);
    this.deps.updateBoxDrillMarkers(this.targetBoxId, merged);
  }
}
