import * as THREE from "three";
import { createGround, createGrid } from "./Environment";
import type { EnvironmentOptions } from "./Environment";

export type SceneOptions = {
  background?: string;
  environment?: EnvironmentOptions;
};

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly root: THREE.Group;
  private ground: THREE.Mesh | null = null;
  private grid: THREE.GridHelper | null = null;
  private reflectionsEnabled = false;
  private reflectionCubeTarget: THREE.WebGLCubeRenderTarget | null = null;
  private reflectionCubeCamera: THREE.CubeCamera | null = null;

  constructor(options: SceneOptions = {}) {
    this.scene = new THREE.Scene();
    if (options.background) {
      this.scene.background = new THREE.Color(options.background);
    }
    this.root = new THREE.Group();
    this.scene.add(this.root);

    const environment = options.environment ?? {};
    this.ground = createGround(environment);
    this.scene.add(this.ground);
    if (environment.showGrid) {
      this.grid = createGrid(environment);
      this.scene.add(this.grid);
    }
  }

  add(object: THREE.Object3D) {
    this.root.add(object);
  }

  setGroundSize(width: number, depth: number) {
    if (!this.ground) return;
    this.ground.geometry.dispose();
    this.ground.geometry = new THREE.PlaneGeometry(width, depth);
  }

  setGroundPosition(x: number, z: number) {
    if (!this.ground) return;
    this.ground.position.set(x, 0, z);
  }

  setBackground(color: string | null) {
    this.scene.background = color ? new THREE.Color(color) : null;
  }

  setGroundAppearance(options: { color?: string; roughness?: number; metalness?: number }) {
    if (!this.ground) return;
    const material = this.ground.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;
    if (options.color) material.color.set(options.color);
    if (typeof options.roughness === "number") material.roughness = options.roughness;
    if (typeof options.metalness === "number") material.metalness = options.metalness;
    material.needsUpdate = true;
  }

  private ensureReflectionProbe(renderer: THREE.WebGLRenderer) {
    if (this.reflectionCubeCamera && this.reflectionCubeTarget) return;
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const size = isWebGL2 ? 256 : 128;
    this.reflectionCubeTarget = new THREE.WebGLCubeRenderTarget(size, {
      type: isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.reflectionCubeCamera = new THREE.CubeCamera(0.1, 200, this.reflectionCubeTarget);
    this.scene.add(this.reflectionCubeCamera);
  }

  private disposeReflectionProbe() {
    if (this.reflectionCubeCamera) {
      this.scene.remove(this.reflectionCubeCamera);
      this.reflectionCubeCamera = null;
    }
    if (this.reflectionCubeTarget) {
      this.reflectionCubeTarget.dispose();
      this.reflectionCubeTarget = null;
    }
  }

  setReflectionsEnabled(enabled: boolean, renderer: THREE.WebGLRenderer) {
    this.reflectionsEnabled = Boolean(enabled);
    if (!this.reflectionsEnabled) {
      this.scene.environment = null;
      this.disposeReflectionProbe();
      return;
    }
    this.ensureReflectionProbe(renderer);
    this.updateReflectionProbe(renderer, { force: true });
  }

  getReflectionsEnabled(): boolean {
    return this.reflectionsEnabled;
  }

  updateReflectionProbe(
    renderer: THREE.WebGLRenderer,
    options?: { center?: { x: number; y: number; z: number }; force?: boolean }
  ) {
    if (!this.reflectionsEnabled) return;
    this.ensureReflectionProbe(renderer);
    if (!this.reflectionCubeCamera || !this.reflectionCubeTarget) return;

    const center = options?.center ?? { x: 0, y: 1.2, z: 0 };
    this.reflectionCubeCamera.position.set(center.x, center.y, center.z);
    this.reflectionCubeCamera.update(renderer, this.scene);
    this.scene.environment = this.reflectionCubeTarget.texture;
    if (options?.force) {
      this.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const mat = node.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) m.needsUpdate = true;
          });
        } else if (mat instanceof THREE.MeshStandardMaterial) {
          mat.needsUpdate = true;
        }
      });
    }
  }

  dispose() {
    this.root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    if (this.grid) {
      if (Array.isArray(this.grid.material)) {
        this.grid.material.forEach((material) => material.dispose());
      } else {
        this.grid.material.dispose();
      }
      this.grid.geometry.dispose();
    }
    if (this.ground) {
      this.ground.geometry.dispose();
      if (Array.isArray(this.ground.material)) {
        this.ground.material.forEach((material) => material.dispose());
      } else {
        this.ground.material.dispose();
      }
    }
    this.disposeReflectionProbe();
  }
}
