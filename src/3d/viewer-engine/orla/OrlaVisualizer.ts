import * as THREE from "three";
import type { OrlaPreset, OrlaSideId, PieceOrlaConfig } from "../../../core/orla/orlaTypes";
import { findOrlaPreset } from "../../../core/orla/orlaPresets";
import { loadTextureAsync } from "../materials/textureCache";

export type OrlaVisualPieceConfig = {
  pieceId: string;
  panelType?: string;
  config: PieceOrlaConfig;
};

export type OrlaVisualBoxConfig = {
  boxId: string;
  pieces: OrlaVisualPieceConfig[];
  presets: OrlaPreset[];
};

export type OrlaVisualBridge = {
  getBoxOrlaConfig: (_boxId: string) => OrlaVisualBoxConfig | null;
};

const ORLA_SURFACE_OFFSET_M = 0.0001;
const ORLA_MIN_DIMENSION_M = 0.0001;
const ORLA_DEFAULT_OPACITY = 0.98;
const ORLA_PROFILE_HEIGHT_M = 0.023;
const ORLA_PROFILE_DEPTH_M = 0.008;

type OrlaSurfaceDef = {
  side: OrlaSideId;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

/**
 * Visualização de Orla V1 por Surface Overlay.
 *
 * Cada orla é um mesh independente aplicado apenas sobre a aresta,
 * sem alterar medidas reais da peça/box. O mesh acompanha a peça porque
 * é filho direto do painel correspondente.
 */
export class OrlaVisualizer {
  private bridge: OrlaVisualBridge | null = null;

  bindBridge(bridge: OrlaVisualBridge | null): void {
    this.bridge = bridge;
  }

  syncBoxRoot(boxId: string, root: THREE.Object3D): void {
    const bridge = this.bridge;
    if (!bridge) {
      this.clearOrlaBands(root);
      return;
    }

    const cfg = bridge.getBoxOrlaConfig(boxId);
    if (!cfg) {
      this.clearOrlaBands(root);
      return;
    }

    const expectedKeys = new Set<string>();

    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const panelType = node.userData?.panelType as string | undefined;
      const pieceId = node.userData?.panelId as string | undefined;
      if (!panelType || !pieceId) return;
      const pieceCfg = cfg.pieces.find((p) => p.pieceId === pieceId);
      if (!pieceCfg) return;
      this.syncSurfacesForPanel(node, pieceId, pieceCfg.config, cfg.presets, expectedKeys);
    });

    this.clearStaleOrlaBands(root, expectedKeys);
  }

  clearOrlaBands(root: THREE.Object3D): void {
    root.traverse((node) => {
      const toRemove: THREE.Object3D[] = [];
      node.children.forEach((child) => {
        if (child.userData?.isOrlaBand === true) toRemove.push(child);
      });
      for (const child of toRemove) {
        node.remove(child);
        this.disposeOrlaObject(child);
      }
    });
  }

  dispose(): void {
    this.bridge = null;
  }

  private syncSurfacesForPanel(
    mesh: THREE.Mesh,
    pieceId: string,
    pieceConfig: PieceOrlaConfig,
    presets: OrlaPreset[],
    expectedKeys: Set<string>
  ): void {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return;

    const surfaceDefs = this.getSurfaceDefs(bb);

    for (const def of surfaceDefs) {
      const sideConfig = pieceConfig.sides[def.side];
      if (!sideConfig?.enabled || !sideConfig.presetId) continue;
      const preset = findOrlaPreset(presets, sideConfig.presetId);
      if (!preset) continue;

      const key = `${pieceId}:${def.side}`;
      expectedKeys.add(key);

      const existing = mesh.children.find(
        (child) => child.userData?.isOrlaBand === true && child.userData?.orlaKey === key
      );

      if (existing instanceof THREE.Mesh) {
        this.updateSurfaceMesh(existing, def, preset, pieceId, key);
      } else {
        mesh.add(this.createSurfaceMesh(def, preset, pieceId, key));
      }
    }
  }

  private getSurfaceDefs(bb: THREE.Box3): OrlaSurfaceDef[] {
    const size = new THREE.Vector3();
    bb.getSize(size);
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const t = ORLA_SURFACE_OFFSET_M;
    const profileHeight = Math.min(ORLA_PROFILE_HEIGHT_M, Math.max(ORLA_MIN_DIMENSION_M, size.y));
    const profileDepth = Math.min(ORLA_PROFILE_DEPTH_M, Math.max(ORLA_MIN_DIMENSION_M, size.z));

    return [
      {
        side: "front",
        width: size.x,
        height: profileHeight,
        depth: t,
        x: cx,
        y: bb.max.y - profileHeight / 2,
        z: bb.max.z + t / 2,
      },
      {
        side: "back",
        width: size.x,
        height: profileHeight,
        depth: t,
        x: cx,
        y: bb.max.y - profileHeight / 2,
        z: bb.min.z - t / 2,
      },
      {
        side: "left",
        width: t,
        height: size.y,
        depth: profileDepth,
        x: bb.min.x - t / 2,
        y: cy,
        z: bb.max.z - profileDepth / 2,
      },
      {
        side: "right",
        width: t,
        height: size.y,
        depth: profileDepth,
        x: bb.max.x + t / 2,
        y: cy,
        z: bb.max.z - profileDepth / 2,
      },
    ];
  }

  private createSurfaceMesh(
    def: OrlaSurfaceDef,
    preset: OrlaPreset,
    pieceId: string,
    key: string
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.createGeometry(def), this.createMaterial(preset));
    this.applySurfaceMetadata(mesh, def, preset, pieceId, key);
    return mesh;
  }

  private updateSurfaceMesh(
    mesh: THREE.Mesh,
    def: OrlaSurfaceDef,
    preset: OrlaPreset,
    pieceId: string,
    key: string
  ): void {
    const currentPresetId = mesh.userData?.presetId;
    const currentSizeKey = mesh.userData?.sizeKey;
    const nextSizeKey = this.getSizeKey(def);

    if (currentSizeKey !== nextSizeKey) {
      mesh.geometry.dispose();
      mesh.geometry = this.createGeometry(def);
    }

    if (currentPresetId !== preset.id) {
      if (mesh.material instanceof THREE.Material) mesh.material.dispose();
      mesh.material = this.createMaterial(preset);
    } else if (mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material.color.set(preset.cor);
      mesh.material.opacity = ORLA_DEFAULT_OPACITY;
      mesh.material.needsUpdate = true;
    }

    this.applySurfaceMetadata(mesh, def, preset, pieceId, key);
  }

  private createGeometry(def: OrlaSurfaceDef): THREE.BoxGeometry {
    return new THREE.BoxGeometry(
      Math.max(ORLA_MIN_DIMENSION_M, def.width),
      Math.max(ORLA_MIN_DIMENSION_M, def.height),
      Math.max(ORLA_MIN_DIMENSION_M, def.depth)
    );
  }

  private createMaterial(preset: OrlaPreset): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(preset.cor),
      transparent: true,
      opacity: ORLA_DEFAULT_OPACITY,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    if (preset.texturaUrl && preset.texturaUrl.trim().length > 0) {
      void loadTextureAsync(preset.texturaUrl.trim()).then((texture) => {
        if (!texture) return;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        material.map = texture;
        material.needsUpdate = true;
      });
    }

    return material;
  }

  private applySurfaceMetadata(
    mesh: THREE.Mesh,
    def: OrlaSurfaceDef,
    preset: OrlaPreset,
    pieceId: string,
    key: string
  ): void {
    mesh.position.set(def.x, def.y, def.z);
    mesh.renderOrder = 10;
    mesh.userData.isOrlaBand = true;
    mesh.userData.isOrlaSurfaceOverlay = true;
    mesh.userData.orlaKey = key;
    mesh.userData.orlaSide = def.side;
    mesh.userData.pieceId = pieceId;
    mesh.userData.presetId = preset.id;
    mesh.userData.sizeKey = this.getSizeKey(def);
  }

  private getSizeKey(def: OrlaSurfaceDef): string {
    return [
      def.side,
      def.width.toFixed(6),
      def.height.toFixed(6),
      def.depth.toFixed(6),
      def.x.toFixed(6),
      def.y.toFixed(6),
      def.z.toFixed(6),
    ].join(":");
  }

  private clearStaleOrlaBands(root: THREE.Object3D, expectedKeys: Set<string>): void {
    root.traverse((node) => {
      const toRemove: THREE.Object3D[] = [];
      node.children.forEach((child) => {
        if (child.userData?.isOrlaBand !== true) return;
        const key = child.userData?.orlaKey;
        if (typeof key !== "string" || !expectedKeys.has(key)) toRemove.push(child);
      });
      for (const child of toRemove) {
        node.remove(child);
        this.disposeOrlaObject(child);
      }
    });
  }

  private disposeOrlaObject(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else if (object.material instanceof THREE.Material) object.material.dispose();
    }
  }
}
