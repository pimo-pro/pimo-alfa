import * as THREE from "three";

/** Cor pedida para multi-seleção (blue-500). */
const MULTI_OUTLINE_COLOR = 0x3b82f6;

/** Contorno simples seleção: ligeiramente mais escuro que o default do ViewerTools (0x38bdf8). */
const SINGLE_OUTLINE_COLOR_DARKER = 0x2563eb;

const DEFAULT_HOVER_COLOR = 0x7dd3fc;
const WALL_INTERSECT_COLOR = 0xef4444;

export type ViewerCoreRuntime = {
  sceneManager?: { scene: THREE.Scene };
  boxes?: Map<string, { mesh: THREE.Object3D }>;
  selectionOutlineMaterial?: THREE.LineBasicMaterial;
  setOutlineTarget?: (_mesh: THREE.Object3D | null, _opacity: number, _colorHex: number) => void;
  refreshOutlineTarget?: () => void;
  viewerState?: {
    getSelectedBox?: () => string | null;
    getHoveredBox?: () => string | null;
  };
  boxesIntersectingWalls?: Set<string>;
};

type CoreGetter = () => ViewerCoreRuntime | null;

/**
 * Contornos extra para multi-seleção + ajuste fino do material do outline nativo (sem alterar ViewerCore.ts).
 * Usa propriedades existentes na instância em runtime (acesso por duck typing).
 */
export class MultiSelectionOutlineBridge {
  private helpers: THREE.BoxHelper[] = [];

  private sharedMultiMaterial: THREE.LineBasicMaterial | null = null;

  private nativeOutlineSuppressed = false;

  private lastSingleStyleKey: string | null = null;
  private readonly coreGetter: CoreGetter;

  constructor(coreGetter?: CoreGetter) {
    this.coreGetter = coreGetter ?? this.getCoreFromWindow;
  }

  private getCoreFromWindow(): ViewerCoreRuntime | null {
    if (typeof window === "undefined") return null;
    const core = window.viewerCore as ViewerCoreRuntime | undefined;
    return core ?? null;
  }

  dispose(): void {
    this.clearHelpers();
    if (this.sharedMultiMaterial) {
      this.sharedMultiMaterial.dispose();
      this.sharedMultiMaterial = null;
    }
    this.nativeOutlineSuppressed = false;
    this.lastSingleStyleKey = null;
  }

  /**
   * @param multiIds ids válidos em multi-seleção (já filtrados)
   * @param selectedWorkspaceBoxId id principal no projeto (pode estar vazio)
   */
  sync(multiIds: string[], selectedWorkspaceBoxId: string): void {
    const core = this.coreGetter();
    const scene = core?.sceneManager?.scene;
    const boxes = core?.boxes;
    if (!core || !scene || !boxes) {
      this.clearHelpers();
      return;
    }

    const validMulti = multiIds.filter((id, i, a) => a.indexOf(id) === i);
    const isMulti = validMulti.length > 1;

    if (isMulti) {
      this.applyMultiOutlines(scene, boxes, validMulti, core);
      this.lastSingleStyleKey = null;
      return;
    }

    this.clearHelpers();
    this.restoreNativeOutlineIfNeeded(core);

    this.applySingleOutlineAccent(core, selectedWorkspaceBoxId);
  }

  private applyMultiOutlines(
    scene: THREE.Scene,
    boxes: Map<string, { mesh: THREE.Object3D }>,
    validMulti: string[],
    core: ViewerCoreRuntime
  ): void {
    if (!this.sharedMultiMaterial) {
      this.sharedMultiMaterial = new THREE.LineBasicMaterial({
        color: MULTI_OUTLINE_COLOR,
        linewidth: 1,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
      });
    }

    if (typeof core.setOutlineTarget === "function") {
      core.setOutlineTarget(null, 0, 0);
      this.nativeOutlineSuppressed = true;
    }

    while (this.helpers.length < validMulti.length) {
      const h = new THREE.BoxHelper(new THREE.Object3D(), MULTI_OUTLINE_COLOR);
      const oldMat = h.material as THREE.Material;
      oldMat.dispose();
      h.material = this.sharedMultiMaterial;
      h.visible = true;
      scene.add(h);
      this.helpers.push(h);
    }

    while (this.helpers.length > validMulti.length) {
      const h = this.helpers.pop();
      if (h) {
        scene.remove(h);
        h.geometry.dispose();
        const mat = h.material;
        if (mat !== this.sharedMultiMaterial && mat instanceof THREE.Material) {
          mat.dispose();
        }
      }
    }

    validMulti.forEach((id, i) => {
      const entry = boxes.get(id);
      const h = this.helpers[i];
      if (!entry?.mesh || !h) return;
      entry.mesh.updateMatrixWorld(true);
      h.visible = true;
      h.update(entry.mesh);
    });
  }

  private restoreNativeOutlineIfNeeded(core: ViewerCoreRuntime): void {
    if (this.nativeOutlineSuppressed && typeof core.refreshOutlineTarget === "function") {
      core.refreshOutlineTarget();
    }
    this.nativeOutlineSuppressed = false;
  }

  private applySingleOutlineAccent(core: ViewerCoreRuntime, fallbackSelectedId: string): void {
    const mat = core.selectionOutlineMaterial;
    if (!mat) return;

    const selected =
      core.viewerState?.getSelectedBox?.() ?? (fallbackSelectedId.trim() ? fallbackSelectedId : null);
    const hovered = core.viewerState?.getHoveredBox?.() ?? null;
    const outlineTargetId = selected ?? hovered;

    if (!outlineTargetId) {
      this.lastSingleStyleKey = null;
      if (typeof core.refreshOutlineTarget === "function") {
        core.refreshOutlineTarget();
      }
      return;
    }

    const isSelected = Boolean(selected && outlineTargetId === selected);
    const intersectsWall = core.boxesIntersectingWalls?.has(outlineTargetId) ?? false;

    let colorHex: number;
    let opacity: number;
    if (intersectsWall) {
      colorHex = WALL_INTERSECT_COLOR;
      opacity = 0.95;
    } else if (isSelected) {
      colorHex = SINGLE_OUTLINE_COLOR_DARKER;
      opacity = 0.98;
    } else {
      colorHex = DEFAULT_HOVER_COLOR;
      opacity = 0.55;
    }

    const key = `${outlineTargetId}|${colorHex}|${opacity}`;
    if (this.lastSingleStyleKey === key) return;
    this.lastSingleStyleKey = key;

    mat.color.setHex(colorHex);
    mat.opacity = opacity;
    mat.needsUpdate = true;
  }

  private clearHelpers(): void {
    for (const h of this.helpers) {
      h.parent?.remove(h);
      h.geometry.dispose();
      const mat = h.material;
      if (mat && mat !== this.sharedMultiMaterial && mat instanceof THREE.Material) {
        mat.dispose();
      }
    }
    this.helpers = [];
  }
}
