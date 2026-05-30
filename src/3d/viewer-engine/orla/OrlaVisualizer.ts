import * as THREE from "three";
import type { OrlaPreset, OrlaSideId, PieceOrlaConfig } from "../../../core/orla/orlaTypes";
import { findOrlaPreset } from "../../../core/orla/orlaPresets";

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

const ORLA_VISUAL_THICKNESS_M = 0.0008;

/**
 * Visualização de orla V1 — faixas finas nas bordas (sem alterar espessura da peça).
 */
export class OrlaVisualizer {
  private bridge: OrlaVisualBridge | null = null;

  bindBridge(bridge: OrlaVisualBridge | null): void {
    this.bridge = bridge;
  }

  syncBoxRoot(boxId: string, root: THREE.Object3D): void {
    this.clearOrlaBands(root);
    const bridge = this.bridge;
    if (!bridge) return;
    const cfg = bridge.getBoxOrlaConfig(boxId);
    if (!cfg) return;

    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const panelType = node.userData?.panelType as string | undefined;
      const pieceId = node.userData?.panelId as string | undefined;
      if (!panelType || !pieceId) return;
      const pieceCfg = cfg.pieces.find((p) => p.pieceId === pieceId);
      if (!pieceCfg) return;
      this.applyBandsToPanel(node, pieceCfg.config, cfg.presets);
    });
  }

  clearOrlaBands(root: THREE.Object3D): void {
    root.traverse((node) => {
      const toRemove: THREE.Object3D[] = [];
      node.children.forEach((child) => {
        if (child.userData?.isOrlaBand === true) toRemove.push(child);
      });
      for (const child of toRemove) {
        node.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      }
    });
  }

  dispose(): void {
    this.bridge = null;
  }

  private applyBandsToPanel(
    mesh: THREE.Mesh,
    pieceConfig: PieceOrlaConfig,
    presets: OrlaPreset[]
  ): void {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return;
    const size = new THREE.Vector3();
    bb.getSize(size);
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    const t = ORLA_VISUAL_THICKNESS_M;

    const sideDefs: Array<{ side: OrlaSideId; w: number; h: number; d: number; x: number; y: number; z: number }> = [
      { side: "front", w: size.x, h: t, d: t, x: cx, y: cy, z: bb.max.z + t / 2 },
      { side: "back", w: size.x, h: t, d: t, x: cx, y: cy, z: bb.min.z - t / 2 },
      { side: "left", w: t, h: size.y, d: t, x: bb.min.x - t / 2, y: cy, z: cz },
      { side: "right", w: t, h: size.y, d: t, x: bb.max.x + t / 2, y: cy, z: cz },
    ];

    for (const def of sideDefs) {
      const sc = pieceConfig.sides[def.side];
      if (!sc?.enabled || !sc.presetId) continue;
      const preset = findOrlaPreset(presets, sc.presetId);
      if (!preset) continue;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(preset.cor),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const geo = new THREE.BoxGeometry(Math.max(t, def.w), Math.max(t, def.h), Math.max(t, def.d));
      const band = new THREE.Mesh(geo, mat);
      band.position.set(def.x, def.y, def.z);
      band.userData.isOrlaBand = true;
      band.userData.orlaSide = def.side;
      band.raycast = () => null;
      mesh.add(band);
    }
  }
}
