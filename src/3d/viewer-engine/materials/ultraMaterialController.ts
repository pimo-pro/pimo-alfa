import * as THREE from "three";

type UltraMaterialSnapshot = {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  flatShading: boolean;
};

/** Perfil de materiais para ultra performance (flat shading temporário). */
export class UltraMaterialController {
  private ultraMaterialState = new Map<string, UltraMaterialSnapshot>();

  apply(root: THREE.Object3D, flat2Active: boolean, aggressive: boolean): void {
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        if (!this.ultraMaterialState.has(material.uuid)) {
          this.ultraMaterialState.set(material.uuid, {
            roughness: material.roughness,
            metalness: material.metalness,
            envMapIntensity: material.envMapIntensity,
            flatShading: material.flatShading,
          });
        }
        const original = this.ultraMaterialState.get(material.uuid);
        if (!original) return;
        if (!flat2Active) {
          material.roughness = original.roughness;
          material.metalness = original.metalness;
          material.envMapIntensity = original.envMapIntensity;
          material.flatShading = original.flatShading;
          material.needsUpdate = true;
          return;
        }
        material.roughness = aggressive ? 1 : 0.95;
        material.metalness = 0;
        material.envMapIntensity = aggressive ? 0 : 0.06;
        material.flatShading = true;
        material.needsUpdate = true;
      });
    });
    if (!flat2Active) {
      this.ultraMaterialState.clear();
    }
  }
}
