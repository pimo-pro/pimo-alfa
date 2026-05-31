import * as THREE from "three";
import type { OrlaPreset, PieceOrlaConfig } from "../../../core/orla/orlaTypes";
import { findOrlaPreset } from "../../../core/orla/orlaPresets";
import { loadTextureAsync } from "../materials/textureCache";
import {
  getActiveOrlaVisualRules,
  getOrlaEdgesForVisualRule,
  resolveDomainSideForVisualEdge,
  resolveGeometryPanelType,
  resolveOrlaVisualRuleKey,
  type OrlaVisualEdgeId,
} from "./orlaVisualRules";

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

const ORLA_MIN_DIMENSION_M = 0.0001;
const ORLA_DEFAULT_OPACITY = 0.98;
const ORLA_DEFAULT_BAND_WIDTH_M = 0.023;
const ORLA_DEFAULT_THICKNESS_M = 0.0008;

type OrlaEdgeDef = {
  edgeId: OrlaVisualEdgeId;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

/**
 * Visualização de Orla — fitas por aresta, filtradas por tipo de peça e regras em SystemSettings.
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

    const rules = getActiveOrlaVisualRules();
    const expectedKeys = new Set<string>();

    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const pieceId = node.userData?.panelId as string | undefined;
      if (!pieceId) return;
      const ruleKey = resolveOrlaVisualRuleKey(node);
      if (!ruleKey) return;
      const pieceCfg = cfg.pieces.find((p) => p.pieceId === pieceId);
      if (!pieceCfg) return;
      const geometryPanelType = resolveGeometryPanelType(node);
      this.syncEdgesForPanel(
        node,
        pieceId,
        geometryPanelType,
        ruleKey,
        pieceCfg.config,
        cfg.presets,
        rules,
        expectedKeys
      );
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

  private syncEdgesForPanel(
    mesh: THREE.Mesh,
    pieceId: string,
    geometryPanelType: string,
    ruleKey: string,
    pieceConfig: PieceOrlaConfig,
    presets: OrlaPreset[],
    rules: ReturnType<typeof getActiveOrlaVisualRules>,
    expectedKeys: Set<string>
  ): void {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return;

    const edgesToApply = getOrlaEdgesForVisualRule(ruleKey, rules);
    if (edgesToApply.length === 0) return;

    for (const visualEdge of edgesToApply) {
      const domainSide = resolveDomainSideForVisualEdge(geometryPanelType, visualEdge);
      const sideConfig = pieceConfig.sides[domainSide];
      if (!sideConfig?.enabled || !sideConfig.presetId) continue;
      const preset = findOrlaPreset(presets, sideConfig.presetId);
      if (!preset) continue;

      const presetEdgeDefMap = this.buildEdgeDefMap(bb, geometryPanelType, preset);
      const presetDef = presetEdgeDefMap[visualEdge];
      if (!presetDef) continue;

      const key = `${pieceId}:${visualEdge}`;
      expectedKeys.add(key);

      const existing = mesh.children.find(
        (child) => child.userData?.isOrlaBand === true && child.userData?.orlaKey === key
      );

      if (existing instanceof THREE.Mesh) {
        this.updateEdgeMesh(existing, presetDef, preset, pieceId, key, visualEdge);
      } else {
        mesh.add(this.createEdgeMesh(presetDef, preset, pieceId, key, visualEdge));
      }
    }
  }

  private getBandWidthM(preset: OrlaPreset | null): number {
    const fromPreset =
      preset && preset.larguraMm > 0 ? preset.larguraMm / 1000 : ORLA_DEFAULT_BAND_WIDTH_M;
    return Math.max(ORLA_MIN_DIMENSION_M, fromPreset);
  }

  private getThicknessM(preset: OrlaPreset | null): number {
    const fromPreset =
      preset && preset.espessuraMm > 0 ? preset.espessuraMm / 1000 : ORLA_DEFAULT_THICKNESS_M;
    return Math.max(ORLA_MIN_DIMENSION_M, fromPreset);
  }

  private buildEdgeDefMap(
    bb: THREE.Box3,
    panelType: string,
    preset: OrlaPreset | null
  ): Partial<Record<OrlaVisualEdgeId, OrlaEdgeDef>> {
    const bw = this.getBandWidthM(preset);
    const t = this.getThicknessM(preset);
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    const sx = Math.max(ORLA_MIN_DIMENSION_M, bb.max.x - bb.min.x);
    const sy = Math.max(ORLA_MIN_DIMENSION_M, bb.max.y - bb.min.y);
    const sz = Math.max(ORLA_MIN_DIMENSION_M, bb.max.z - bb.min.z);

    switch (panelType) {
      case "bottom":
        return {
          front: { edgeId: "front", width: sx, height: bw, depth: t, x: cx, y: bb.min.y + bw / 2, z: bb.max.z + t / 2 },
          back: { edgeId: "back", width: sx, height: bw, depth: t, x: cx, y: bb.min.y + bw / 2, z: bb.min.z - t / 2 },
          left: { edgeId: "left", width: t, height: bw, depth: sz, x: bb.min.x - t / 2, y: bb.min.y + bw / 2, z: cz },
          right: { edgeId: "right", width: t, height: bw, depth: sz, x: bb.max.x + t / 2, y: bb.min.y + bw / 2, z: cz },
          top: { edgeId: "top", width: sx, height: bw, depth: t, x: cx, y: bb.min.y + bw / 2, z: bb.max.z + t / 2 },
          bottom: { edgeId: "bottom", width: sx, height: bw, depth: t, x: cx, y: bb.min.y + bw / 2, z: bb.min.z - t / 2 },
        };
      case "left":
        return {
          front: { edgeId: "front", width: t, height: sy, depth: bw, x: bb.min.x - t / 2, y: cy, z: bb.max.z + bw / 2 },
          back: { edgeId: "back", width: t, height: sy, depth: bw, x: bb.min.x - t / 2, y: cy, z: bb.min.z - bw / 2 },
          top: { edgeId: "top", width: t, height: bw, depth: sz, x: bb.min.x - t / 2, y: bb.max.y + bw / 2, z: cz },
          bottom: { edgeId: "bottom", width: t, height: bw, depth: sz, x: bb.min.x - t / 2, y: bb.min.y - bw / 2, z: cz },
          left: { edgeId: "left", width: t, height: bw, depth: sz, x: bb.min.x - t / 2, y: bb.min.y - bw / 2, z: cz },
          right: { edgeId: "right", width: t, height: bw, depth: sz, x: bb.min.x - t / 2, y: bb.max.y + bw / 2, z: cz },
        };
      case "right":
        return {
          front: { edgeId: "front", width: t, height: sy, depth: bw, x: bb.max.x + t / 2, y: cy, z: bb.max.z + bw / 2 },
          back: { edgeId: "back", width: t, height: sy, depth: bw, x: bb.max.x + t / 2, y: cy, z: bb.min.z - bw / 2 },
          top: { edgeId: "top", width: t, height: bw, depth: sz, x: bb.max.x + t / 2, y: bb.max.y + bw / 2, z: cz },
          bottom: { edgeId: "bottom", width: t, height: bw, depth: sz, x: bb.max.x + t / 2, y: bb.min.y - bw / 2, z: cz },
          left: { edgeId: "left", width: t, height: bw, depth: sz, x: bb.max.x + t / 2, y: bb.min.y - bw / 2, z: cz },
          right: { edgeId: "right", width: t, height: bw, depth: sz, x: bb.max.x + t / 2, y: bb.max.y + bw / 2, z: cz },
        };
      case "back":
        return {
          top: { edgeId: "top", width: sx, height: bw, depth: t, x: cx, y: bb.max.y + bw / 2, z: bb.min.z - t / 2 },
          bottom: { edgeId: "bottom", width: sx, height: bw, depth: t, x: cx, y: bb.min.y - bw / 2, z: bb.min.z - t / 2 },
          left: { edgeId: "left", width: bw, height: sy, depth: t, x: bb.min.x - bw / 2, y: cy, z: bb.min.z - t / 2 },
          right: { edgeId: "right", width: bw, height: sy, depth: t, x: bb.max.x + bw / 2, y: cy, z: bb.min.z - t / 2 },
          front: { edgeId: "front", width: sx, height: bw, depth: t, x: cx, y: bb.max.y + bw / 2, z: bb.min.z - t / 2 },
          back: { edgeId: "back", width: sx, height: bw, depth: t, x: cx, y: bb.min.y - bw / 2, z: bb.min.z - t / 2 },
        };
      case "front":
        return {
          top: { edgeId: "top", width: sx, height: bw, depth: t, x: cx, y: bb.max.y + bw / 2, z: bb.max.z + t / 2 },
          bottom: { edgeId: "bottom", width: sx, height: bw, depth: t, x: cx, y: bb.min.y - bw / 2, z: bb.max.z + t / 2 },
          left: { edgeId: "left", width: bw, height: sy, depth: t, x: bb.min.x - bw / 2, y: cy, z: bb.max.z + t / 2 },
          right: { edgeId: "right", width: bw, height: sy, depth: t, x: bb.max.x + bw / 2, y: cy, z: bb.max.z + t / 2 },
          front: { edgeId: "front", width: sx, height: bw, depth: t, x: cx, y: bb.max.y + bw / 2, z: bb.max.z + t / 2 },
          back: { edgeId: "back", width: sx, height: bw, depth: t, x: cx, y: bb.min.y - bw / 2, z: bb.max.z + t / 2 },
        };
      case "top":
      default:
        return {
          top: { edgeId: "top", width: sx, height: bw, depth: t, x: cx, y: bb.max.y - bw / 2, z: bb.max.z + t / 2 },
          bottom: { edgeId: "bottom", width: sx, height: bw, depth: t, x: cx, y: bb.max.y - bw / 2, z: bb.min.z - t / 2 },
          left: { edgeId: "left", width: t, height: bw, depth: sz, x: bb.min.x - t / 2, y: bb.max.y - bw / 2, z: cz },
          right: { edgeId: "right", width: t, height: bw, depth: sz, x: bb.max.x + t / 2, y: bb.max.y - bw / 2, z: cz },
          front: { edgeId: "front", width: sx, height: bw, depth: t, x: cx, y: bb.max.y - bw / 2, z: bb.max.z + t / 2 },
          back: { edgeId: "back", width: sx, height: bw, depth: t, x: cx, y: bb.max.y - bw / 2, z: bb.min.z - t / 2 },
        };
    }
  }

  private createEdgeMesh(
    def: OrlaEdgeDef,
    preset: OrlaPreset,
    pieceId: string,
    key: string,
    visualEdge: OrlaVisualEdgeId
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.createGeometry(def), this.createMaterial(preset));
    this.applyEdgeMetadata(mesh, def, preset, pieceId, key, visualEdge);
    return mesh;
  }

  private updateEdgeMesh(
    mesh: THREE.Mesh,
    def: OrlaEdgeDef,
    preset: OrlaPreset,
    pieceId: string,
    key: string,
    visualEdge: OrlaVisualEdgeId
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

    this.applyEdgeMetadata(mesh, def, preset, pieceId, key, visualEdge);
  }

  private createGeometry(def: OrlaEdgeDef): THREE.BoxGeometry {
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

  private applyEdgeMetadata(
    mesh: THREE.Mesh,
    def: OrlaEdgeDef,
    preset: OrlaPreset,
    pieceId: string,
    key: string,
    visualEdge: OrlaVisualEdgeId
  ): void {
    mesh.position.set(def.x, def.y, def.z);
    mesh.renderOrder = 10;
    mesh.userData.isOrlaBand = true;
    mesh.userData.isOrlaEdgeOverlay = true;
    mesh.userData.orlaKey = key;
    mesh.userData.orlaVisualEdge = visualEdge;
    mesh.userData.pieceId = pieceId;
    mesh.userData.presetId = preset.id;
    mesh.userData.sizeKey = this.getSizeKey(def);
  }

  private getSizeKey(def: OrlaEdgeDef): string {
    return [
      def.edgeId,
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
