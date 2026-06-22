import * as THREE from "three";
import type { PanelMaterialOptions } from "./BoxMaterialApplier";

export type PanelType = "left" | "right" | "top" | "bottom" | "back" | "front";

type PanelFactoryDeps = {
  resolvePanelMaterialOptions: (
    _options: PanelMaterialOptions | null | undefined,
    _panelType: PanelType
  ) => PanelMaterialOptions;
};

export class PanelFactory {
  private readonly deps: PanelFactoryDeps;

  constructor(deps: PanelFactoryDeps) {
    this.deps = deps;
  }

  getThinAxisForPanel(panelType: PanelType): 0 | 1 | 2 {
    if (panelType === "left" || panelType === "right") return 0;
    if (panelType === "top" || panelType === "bottom") return 1;
    return 2;
  }

  /** Faces com material de orla/corte (índice 0). Para front/back, as faces largas visíveis usam faceMaterial (índice 1). */
  getEdgeFaceIndices(panelType: PanelType, thinAxis: 0 | 1 | 2): number[] {
    const thinFaces = thinAxis === 0 ? [0, 1] : thinAxis === 1 ? [2, 3] : [4, 5];
    if (panelType === "front" || panelType === "back") {
      return [0, 1, 2, 3, 4, 5].filter((face) => !thinFaces.includes(face));
    }
    return thinFaces;
  }

  createBoxGeometryWithEdgeGroups(
    width: number,
    height: number,
    depth: number,
    thinAxis: 0 | 1 | 2,
    panelType?: PanelType
  ): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    if (!geometry.attributes.uv2 && geometry.attributes.uv) {
      geometry.setAttribute("uv2", geometry.attributes.uv.clone());
    }
    geometry.clearGroups();
    const edgeFaces = this.getEdgeFaceIndices(panelType ?? "left", thinAxis);
    for (let i = 0; i < 6; i++) {
      const materialIndex = edgeFaces.includes(i) ? 0 : 1;
      geometry.addGroup(i * 6, 6, materialIndex);
    }
    return geometry;
  }

  getPanelDimensionsFromGeometry(panel: THREE.Mesh, panelType: PanelType): {
    width: number;
    height: number;
    thickness: number;
  } {
    const geom = panel.geometry as THREE.BufferGeometry;
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    if (!bb) {
      return { width: 0, height: 0, thickness: 0 };
    }
    const size = new THREE.Vector3();
    bb.getSize(size);
    if (panelType === "left" || panelType === "right") return { width: size.z, height: size.y, thickness: size.x };
    if (panelType === "top" || panelType === "bottom") return { width: size.x, height: size.z, thickness: size.y };
    return { width: size.x, height: size.y, thickness: size.z };
  }

  createPanel(
    width: number,
    height: number,
    depth: number,
    name: string,
    panelType: PanelType,
    options?: PanelMaterialOptions | null
  ): THREE.Mesh {
    const resolved = this.deps.resolvePanelMaterialOptions(options, panelType);
    const isEdgeFace = "edgeMaterial" in resolved;
    const geometry = isEdgeFace
      ? this.createBoxGeometryWithEdgeGroups(
          width,
          height,
          depth,
          this.getThinAxisForPanel(panelType),
          panelType
        )
      : (() => {
          const g = new THREE.BoxGeometry(width, height, depth);
          if (!g.attributes.uv2 && g.attributes.uv) {
            g.setAttribute("uv2", g.attributes.uv.clone());
          }
          return g;
        })();
    const material = isEdgeFace
      ? [resolved.edgeMaterial, resolved.faceMaterial]
      : resolved.singleMaterial;
    const mesh = new THREE.Mesh(geometry, material as THREE.Material);
    mesh.name = name;
    mesh.userData.panelType = panelType;
    mesh.userData.thinAxis = this.getThinAxisForPanel(panelType);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const panelShadowSide = THREE.FrontSide;
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        if (mat instanceof THREE.Material) {
          mat.shadowSide = panelShadowSide;
          mat.needsUpdate = true;
        }
      });
    } else if (mesh.material instanceof THREE.Material) {
      mesh.material.shadowSide = panelShadowSide;
      mesh.material.needsUpdate = true;
    }
    return mesh;
  }

  updatePanelGeometry(panel: THREE.Mesh, width: number, height: number, depth: number): void {
    panel.geometry.dispose();
    const thinAxis = panel.userData.thinAxis as 0 | 1 | 2 | undefined;
    const panelType = panel.userData.panelType as PanelType | undefined;
    const useEdgeGroups = Array.isArray(panel.material) && panel.material.length === 2 && thinAxis !== undefined;
    const geometry = useEdgeGroups
      ? this.createBoxGeometryWithEdgeGroups(width, height, depth, thinAxis, panelType ?? "left")
      : (() => {
          const g = new THREE.BoxGeometry(width, height, depth);
          if (!g.attributes.uv2 && g.attributes.uv) {
            g.setAttribute("uv2", g.attributes.uv.clone());
          }
          return g;
        })();
    panel.geometry = geometry;
  }
}
