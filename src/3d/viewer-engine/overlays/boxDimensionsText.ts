/**
 * Labels do Unified Box Dimensions Overlay — sprites billboard com escala de ecrã constante.
 */

import * as THREE from "three";
import { screenOffsetToWorldDelta } from "./boxDimensionsLayout";

const LABEL_PIXEL_HEIGHT = 30;
const LABEL_RENDER_ORDER = 9999;

export type DimensionLabel = {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  text: string;
  basePosition: THREE.Vector3;
  screenOffsetPx: THREE.Vector2;
  aspect: number;
};

export type DimensionLabelDrawOptions = {
  fontSize?: number;
  padX?: number;
  padY?: number;
  textColor?: string;
  backgroundColor?: string;
};

function drawLabelTexture(
  text: string,
  opts: DimensionLabelDrawOptions = {}
): { texture: THREE.CanvasTexture; aspect: number } {
  const fontSize = opts.fontSize ?? 26;
  const padX = opts.padX ?? 12;
  const padY = opts.padY ?? 7;
  const textColor = opts.textColor ?? "#f1f5f9";
  const backgroundColor = opts.backgroundColor ?? "rgba(15, 23, 42, 0.92)";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    return { texture: empty, aspect: 2 };
  }

  const font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  const textW = Math.max(1, ctx.measureText(text).width);
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = Math.ceil(fontSize + padY * 2);

  ctx.font = font;
  ctx.fillStyle = backgroundColor;
  const r = 5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, canvas.width, canvas.height, r);
  } else {
    ctx.rect(0, 0, canvas.width, canvas.height);
  }
  ctx.fill();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, canvas.height * 0.5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  return { texture, aspect: canvas.width / canvas.height };
}

function worldHeightForConstantScreenSize(
  camera: THREE.Camera,
  worldPos: THREE.Vector3,
  viewportHeightPx: number,
  pixelHeight: number
): number {
  const vh = Math.max(1, viewportHeightPx);
  if (camera instanceof THREE.OrthographicCamera) {
    const worldVisibleH = (camera.top - camera.bottom) / Math.max(camera.zoom, 1e-6);
    return (pixelHeight / vh) * worldVisibleH;
  }
  if (camera instanceof THREE.PerspectiveCamera) {
    const dist = Math.max(1e-4, camera.position.distanceTo(worldPos));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const visibleH = 2 * Math.tan(vFov * 0.5) * dist;
    return (pixelHeight / vh) * visibleH;
  }
  return 0.08;
}

/** Cria um label billboard com fundo e texto. */
export function createDimensionLabel(
  text: string,
  position: THREE.Vector3,
  screenOffsetPx = new THREE.Vector2(0, 0)
): DimensionLabel {
  const { texture, aspect } = drawLabelTexture(text);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = LABEL_RENDER_ORDER;
  sprite.frustumCulled = false;
  sprite.position.copy(position);
  sprite.userData.isDimensionLabel = true;

  return {
    sprite,
    texture,
    text,
    basePosition: position.clone(),
    screenOffsetPx: screenOffsetPx.clone(),
    aspect,
  };
}

/** Atualiza texto, posição base e orientação/escala (billboard + tamanho constante no ecrã). */
export function updateDimensionLabel(
  label: DimensionLabel,
  text: string,
  position: THREE.Vector3,
  camera: THREE.Camera,
  viewportHeightPx: number,
  screenOffsetPx?: THREE.Vector2
): void {
  label.basePosition.copy(position);
  if (screenOffsetPx) label.screenOffsetPx.copy(screenOffsetPx);

  if (text !== label.text) {
    label.text = text;
    const { texture, aspect } = drawLabelTexture(text);
    const mat = label.sprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = texture;
    mat.needsUpdate = true;
    label.texture.dispose();
    label.texture = texture;
    label.aspect = aspect;
  }

  faceCamera(label, camera, viewportHeightPx);
}

/** Orienta o sprite para a câmara; escala constante + offset de layout em ecrã. */
export function faceCamera(label: DimensionLabel, camera: THREE.Camera, viewportHeightPx: number): void {
  const worldH = worldHeightForConstantScreenSize(
    camera,
    label.basePosition,
    viewportHeightPx,
    LABEL_PIXEL_HEIGHT
  );
  label.sprite.scale.set(worldH * label.aspect, worldH, 1);
  label.sprite.quaternion.copy(camera.quaternion);

  const worldDelta = screenOffsetToWorldDelta(
    camera,
    label.basePosition,
    viewportHeightPx,
    label.screenOffsetPx,
    worldH / LABEL_PIXEL_HEIGHT
  );
  label.sprite.position.copy(label.basePosition).add(worldDelta);
}

/** Liberta GPU do label. */
export function disposeDimensionLabel(label: DimensionLabel): void {
  const mat = label.sprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  mat.dispose();
  label.texture.dispose();
  label.sprite.removeFromParent();
}
