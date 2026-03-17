import * as THREE from "three";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { applyImageWatermark } from "../../../utils/watermark";
import type {
  ViewerCameraPreset,
  ViewerRenderFormat,
  ViewerRenderOptions,
  ViewerRenderResult,
} from "../../../context/projectTypes";
import type { ViewerBoxEntry } from "../types";

type LightState = {
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.Light;
  ambient: THREE.Light;
  rimLight: THREE.Light;
};

type ViewerRenderExporterDeps = {
  getBoxes: () => Map<string, ViewerBoxEntry>;
  getRenderer: () => THREE.WebGLRenderer;
  getScene: () => THREE.Scene;
  getCamera: () => THREE.PerspectiveCamera;
  getControls: () => { target: THREE.Vector3; update: () => void } | null;
  getLights: () => LightState;
  getGroundVisible: () => boolean;
  setGroundVisible: (_visible: boolean) => void;
  getGridVisible: () => boolean;
  setGridVisible: (_visible: boolean) => void;
  getRoomGroup: () => THREE.Group;
  getRoomWalls: () => Array<{ mesh: THREE.Mesh }>;
  getSelectionOutline: () => THREE.BoxHelper | null;
  getWallSelectionOutline: () => THREE.BoxHelper | null;
  getDimensionsOverlayGroup: () => THREE.Group | null;
  getWallGizmoGroup: () => THREE.Group | null;
  ensureShowcaseComposer: () => void;
  ensureMainComposer: () => void;
  getShowcaseComposer: () => EffectComposer | null;
  getMainComposer: () => EffectComposer | null;
  getShowcaseBloomPass: () => UnrealBloomPass | null;
  getMainBloomPass: () => UnrealBloomPass | null;
  updateShowcaseComposerSize: () => void;
  updateMainComposerSize: () => void;
  updateCanvasSize: () => void;
};

export class ViewerRenderExporter {
  private readonly deps: ViewerRenderExporterDeps;

  constructor(deps: ViewerRenderExporterDeps) {
    this.deps = deps;
  }

  async renderScene(options: ViewerRenderOptions): Promise<ViewerRenderResult | null> {
    const sizeMap: Record<ViewerRenderOptions["size"], [number, number]> = {
      small: [1280, 720],
      medium: [1600, 900],
      large: [1920, 1080],
      "4k": [3840, 2160],
    };
    const [width, height] = sizeMap[options.size] ?? sizeMap.medium;
    const preset: ViewerCameraPreset = options.preset ?? "current";
    const applyWatermark = options.watermark ?? false;
    const format: ViewerRenderFormat = options.format ?? "png";
    const isolatedProject = options.background === "project-transparent";
    const transparentBackground = options.background === "transparent" || isolatedProject;
    const advancedRealism = Boolean(options.advancedRealism && options.mode !== "lines");
    const qualityBase = Math.max(0.1, Math.min(options.quality ?? 0.92, 1));
    const quality = format === "jpg" ? (advancedRealism ? Math.max(qualityBase, 0.97) : qualityBase) : 1;
    const shadowBase = THREE.MathUtils.clamp(options.shadowIntensity ?? 1, 0, 1);
    const shadowFactor = advancedRealism ? Math.max(shadowBase, 0.86) : shadowBase;
    const supersampleScale = advancedRealism ? 1.5 : 1;
    const renderWidth = Math.max(1, Math.round(width * supersampleScale));
    const renderHeight = Math.max(1, Math.round(height * supersampleScale));
    const renderer = this.deps.getRenderer();
    const scene = this.deps.getScene();
    const camera = this.deps.getCamera();
    const controls = this.deps.getControls();
    const boxes = this.deps.getBoxes();
    const lights = this.deps.getLights();

    const originalCameraPosition = camera.position.clone();
    const originalCameraQuaternion = camera.quaternion.clone();
    const originalCameraZoom = camera.zoom;
    const originalControlsTarget = controls ? controls.target.clone() : null;

    const originalLightState = {
      key: lights.keyLight.intensity,
      fill: lights.fillLight.intensity,
      ambient: lights.ambient.intensity,
      rim: lights.rimLight.intensity,
      castShadow: lights.keyLight.castShadow,
      shadowRadius: lights.keyLight.shadow.radius,
    };
    const originalRendererState = {
      toneMappingExposure: renderer.toneMappingExposure,
      shadowEnabled: renderer.shadowMap.enabled,
      shadowType: renderer.shadowMap.type,
    };

    const originalGroundVisible = this.deps.getGroundVisible();
    const originalGridVisible = this.deps.getGridVisible();
    const roomGroup = this.deps.getRoomGroup();
    const originalRoomBuilderVisible = roomGroup.visible;
    const roomWalls = this.deps.getRoomWalls();
    const originalRoomWallVisibility = roomWalls.map((wall) => ({
      mesh: wall.mesh,
      visible: wall.mesh.visible,
    }));
    const selectionOutline = this.deps.getSelectionOutline();
    const wallSelectionOutline = this.deps.getWallSelectionOutline();
    const dimensionsOverlayGroup = this.deps.getDimensionsOverlayGroup();
    const wallGizmoGroup = this.deps.getWallGizmoGroup();
    const originalOverlayVisibility = {
      selectionOutline: selectionOutline?.visible ?? false,
      wallSelectionOutline: wallSelectionOutline?.visible ?? false,
      dimensionsOverlay: dimensionsOverlayGroup?.visible ?? false,
      wallGizmo: wallGizmoGroup?.visible ?? false,
    };

    const applyPresetCamera = () => {
      if (preset === "current") return;
      if (boxes.size === 0) return;

      const boundingBox = new THREE.Box3();
      const centerVec = new THREE.Vector3();
      const sizeVec = new THREE.Vector3();
      boundingBox.makeEmpty();
      boxes.forEach((entry) => {
        boundingBox.expandByObject(entry.mesh);
      });
      if (boundingBox.isEmpty()) return;
      boundingBox.getCenter(centerVec);
      boundingBox.getSize(sizeVec);
      const center = centerVec.clone();
      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 1);
      const distance = maxDim * 1.8;

      const offsets: Record<ViewerCameraPreset, THREE.Vector3> = {
        current: new THREE.Vector3().copy(camera.position),
        front: new THREE.Vector3(0, maxDim * 0.35, distance),
        top: new THREE.Vector3(0, distance, 0.001),
        iso1: new THREE.Vector3(distance * 0.9, distance * 0.7, distance * 0.9),
        iso2: new THREE.Vector3(-distance * 0.75, distance * 0.65, distance * 0.9),
      };

      const offset = offsets[preset] ?? offsets.current;
      camera.position.set(center.x + offset.x, center.y + offset.y, center.z + offset.z);
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      if (controls) {
        controls.target.copy(center);
        controls.update();
      }
    };

    const applyShadowIntensity = () => {
      const eased = 0.55 + shadowFactor * 0.45;
      const photoExposure = 1.22;
      if (advancedRealism) {
        lights.keyLight.intensity = originalLightState.key * (eased * 1.25);
        lights.fillLight.intensity = originalLightState.fill * (0.85 + shadowFactor * 0.3);
        lights.ambient.intensity = originalLightState.ambient * (0.95 + shadowFactor * 0.15);
        lights.rimLight.intensity = originalLightState.rim * (0.9 + shadowFactor * 0.25);
        lights.keyLight.castShadow = true;
        lights.keyLight.shadow.radius = Math.max(4, originalLightState.shadowRadius * 1.6);
        lights.keyLight.shadow.bias = -0.0001;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMappingExposure = Math.max(originalRendererState.toneMappingExposure, photoExposure);
      } else {
        lights.keyLight.intensity = originalLightState.key * (eased * 1.12);
        lights.fillLight.intensity = originalLightState.fill * (0.75 + shadowFactor * 0.4);
        lights.ambient.intensity = originalLightState.ambient * (0.85 + shadowFactor * 0.25);
        lights.rimLight.intensity = originalLightState.rim * (0.65 + shadowFactor * 0.5);
        lights.keyLight.castShadow = shadowFactor > 0.15 ? originalLightState.castShadow : false;
        lights.keyLight.shadow.radius = Math.max(
          3,
          originalLightState.shadowRadius * (0.7 + shadowFactor * 0.6)
        );
        renderer.toneMappingExposure = Math.max(originalRendererState.toneMappingExposure, 1.12);
      }
    };

    const applyIsolatedProjectMode = () => {
      if (!isolatedProject) return;
      this.deps.setGroundVisible(false);
      this.deps.setGridVisible(false);
      roomGroup.visible = false;
      roomWalls.forEach((wall) => {
        wall.mesh.visible = false;
      });
      if (selectionOutline) selectionOutline.visible = false;
      if (wallSelectionOutline) wallSelectionOutline.visible = false;
      if (dimensionsOverlayGroup) dimensionsOverlayGroup.visible = false;
      if (wallGizmoGroup) wallGizmoGroup.visible = false;
      renderer.shadowMap.enabled = false;
    };

    applyPresetCamera();
    applyShadowIntensity();
    applyIsolatedProjectMode();

    const prevPixelRatio = renderer.getPixelRatio();
    const prevRenderTarget = renderer.getRenderTarget();
    const prevRendererSize = renderer.getSize(new THREE.Vector2());
    const prevClearColor = renderer.getClearColor(new THREE.Color()).clone();
    const prevClearAlpha = renderer.getClearAlpha();
    const prevBackground = scene.background;
    const prevEnvironment = scene.environment;

    const renderTarget = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
    });

    const swappedMaterials: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }> = [];
    let linesMaterial: THREE.MeshBasicMaterial | null = null;

    try {
      renderer.setPixelRatio(1);

      if (transparentBackground) {
        renderer.setClearColor(0x000000, 0);
        scene.background = null;
      } else if (options.background === "white") {
        renderer.setClearColor(0xffffff, 1);
        scene.background = new THREE.Color(0xffffff);
      }

      if (options.mode === "lines") {
        linesMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true });
        boxes.forEach((entry) => {
          entry.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              swappedMaterials.push({ mesh: child, material: child.material });
              child.material = linesMaterial!;
            }
          });
        });
        scene.environment = null;
      }

      let exportCanvas: HTMLCanvasElement;
      const canUseLiveComposer = options.mode === "pbr" && !transparentBackground;
      if (canUseLiveComposer) {
        renderer.setRenderTarget(null);
        renderer.setSize(renderWidth, renderHeight, false);
        camera.aspect = renderWidth / Math.max(1, renderHeight);
        camera.updateProjectionMatrix();
        this.deps.updateShowcaseComposerSize();
        this.deps.updateMainComposerSize();

        if (advancedRealism) {
          this.deps.ensureShowcaseComposer();
          const bloomPass = this.deps.getShowcaseBloomPass();
          if (bloomPass) {
            bloomPass.strength = 0.16;
            bloomPass.radius = 0.34;
            bloomPass.threshold = 0.88;
          }
          this.deps.getShowcaseComposer()?.render();
        } else {
          this.deps.ensureMainComposer();
          const mainBloomPass = this.deps.getMainBloomPass();
          if (mainBloomPass) {
            mainBloomPass.strength = 0.06;
            mainBloomPass.radius = 0.4;
            mainBloomPass.threshold = 0.86;
          }
          this.deps.getMainComposer()?.render();
        }

        const snapCanvas = renderer.domElement;
        const offscreen = document.createElement("canvas");
        offscreen.width = renderWidth;
        offscreen.height = renderHeight;
        const offscreenCtx = offscreen.getContext("2d");
        if (!offscreenCtx) return null;
        offscreenCtx.drawImage(snapCanvas, 0, 0, renderWidth, renderHeight);
        exportCanvas = offscreen;
      } else {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);

        const buffer = new Uint8Array(renderWidth * renderHeight * 4);
        renderer.readRenderTargetPixels(renderTarget, 0, 0, renderWidth, renderHeight, buffer);

        const canvas = document.createElement("canvas");
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        const context = canvas.getContext("2d");
        if (!context) return null;
        const imageData = context.createImageData(renderWidth, renderHeight);
        for (let y = 0; y < renderHeight; y++) {
          const srcOffset = (renderHeight - y - 1) * renderWidth * 4;
          const dstOffset = y * renderWidth * 4;
          imageData.data.set(buffer.subarray(srcOffset, srcOffset + renderWidth * 4), dstOffset);
        }
        context.putImageData(imageData, 0, 0);
        exportCanvas = canvas;
      }

      if (advancedRealism && (renderWidth !== width || renderHeight !== height)) {
        const downscaled = document.createElement("canvas");
        downscaled.width = width;
        downscaled.height = height;
        const downscaledContext = downscaled.getContext("2d");
        if (downscaledContext) {
          downscaledContext.imageSmoothingEnabled = true;
          downscaledContext.imageSmoothingQuality = "high";
          downscaledContext.drawImage(exportCanvas, 0, 0, width, height);
          exportCanvas = downscaled;
        }
      }

      if (applyWatermark) {
        await applyImageWatermark(exportCanvas, {
          opacity: 0.15,
          position: "bottom-right",
          widthPercent: 0.12,
        });
      }

      const dataUrl =
        format === "jpg"
          ? exportCanvas.toDataURL("image/jpeg", quality)
          : exportCanvas.toDataURL("image/png", 1);
      return { dataUrl, width, height };
    } finally {
      camera.position.copy(originalCameraPosition);
      camera.quaternion.copy(originalCameraQuaternion);
      camera.zoom = originalCameraZoom;
      camera.updateProjectionMatrix();
      if (controls && originalControlsTarget) {
        controls.target.copy(originalControlsTarget);
        controls.update();
      }
      lights.keyLight.intensity = originalLightState.key;
      lights.fillLight.intensity = originalLightState.fill;
      lights.ambient.intensity = originalLightState.ambient;
      lights.rimLight.intensity = originalLightState.rim;
      lights.keyLight.castShadow = originalLightState.castShadow;
      lights.keyLight.shadow.radius = originalLightState.shadowRadius;
      renderer.toneMappingExposure = originalRendererState.toneMappingExposure;
      renderer.shadowMap.enabled = originalRendererState.shadowEnabled;
      renderer.shadowMap.type = originalRendererState.shadowType;
      this.deps.setGroundVisible(originalGroundVisible);
      this.deps.setGridVisible(originalGridVisible);
      roomGroup.visible = originalRoomBuilderVisible;
      originalRoomWallVisibility.forEach(({ mesh, visible }) => {
        mesh.visible = visible;
      });
      if (selectionOutline) selectionOutline.visible = originalOverlayVisibility.selectionOutline;
      if (wallSelectionOutline) wallSelectionOutline.visible = originalOverlayVisibility.wallSelectionOutline;
      if (dimensionsOverlayGroup) dimensionsOverlayGroup.visible = originalOverlayVisibility.dimensionsOverlay;
      if (wallGizmoGroup) wallGizmoGroup.visible = originalOverlayVisibility.wallGizmo;
      swappedMaterials.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
      if (linesMaterial) linesMaterial.dispose();
      renderer.setRenderTarget(prevRenderTarget);
      renderer.setSize(prevRendererSize.x, prevRendererSize.y, false);
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      scene.background = prevBackground;
      scene.environment = prevEnvironment;
      this.deps.updateCanvasSize();
      renderTarget.dispose();
    }
  }
}
