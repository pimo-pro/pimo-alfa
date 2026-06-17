/**
 * Layout engine — cotas técnicas, âncoras de labels e dados print-ready.
 * Geometria em mundo (m); projeção 2D para overlap e exportação.
 */

import * as THREE from "three";

const LABEL_PIXEL_H = 30;
const LABEL_PIXEL_PAD_X = 24;
const MIN_LABEL_GAP_PX = 8;
const EXTENSION_TICK_M = 0.022;
const ARROW_TICK_M = 0.038;

export type LayoutAxis = "x" | "y" | "z";

export type DimensionLayoutInput = {
  id: string;
  featureStart: THREE.Vector3;
  featureEnd: THREE.Vector3;
  axis: LayoutAxis;
  text: string;
  valueMm: number;
  /** Deslocamento da linha de cota para fora do objeto (m). */
  dimLineOffsetM: number;
  /** Direção do offset em mundo (normalizada). */
  offsetDirection: THREE.Vector3;
};

export type LabelLayoutItem = {
  id: string;
  text: string;
  valueMm: number;
  axis: LayoutAxis;
  featureStart: THREE.Vector3;
  featureEnd: THREE.Vector3;
  dimLineStart: THREE.Vector3;
  dimLineEnd: THREE.Vector3;
  anchorWorld: THREE.Vector3;
  screenOffsetPx: THREE.Vector2;
  pixelSize: { width: number; height: number };
};

export type PrintReadyDimensionEntry = {
  text: string;
  valueMm: number;
  axis: LayoutAxis;
  position3d: { x: number; y: number; z: number };
  screen: { x: number; y: number };
  orientation: { yaw: number; pitch: number };
  bbox2d: { minX: number; minY: number; maxX: number; maxY: number };
  lineStart3d: { x: number; y: number; z: number };
  lineEnd3d: { x: number; y: number; z: number };
  featureStart3d: { x: number; y: number; z: number };
  featureEnd3d: { x: number; y: number; z: number };
};

export type PrintReadyDimensions = {
  entries: PrintReadyDimensionEntry[];
  generatedAt: number;
};

export type PrintFriendlyLayoutResult = {
  items: LabelLayoutItem[];
  lineVertices: number[];
  printReady: PrintReadyDimensions;
};

export type ProjectWorldFn = (world: THREE.Vector3) => { x: number; y: number } | null;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _euler = new THREE.Euler();

function vec3Out(v: THREE.Vector3) {
  return { x: v.x, y: v.y, z: v.z };
}

function estimateLabelPixelSize(text: string): { width: number; height: number } {
  const charW = 7.2;
  const w = Math.max(48, text.length * charW + LABEL_PIXEL_PAD_X);
  return { width: w, height: LABEL_PIXEL_H };
}

function dimLineEndpoints(input: DimensionLayoutInput): { start: THREE.Vector3; end: THREE.Vector3 } {
  const off = _dir.copy(input.offsetDirection).multiplyScalar(input.dimLineOffsetM);
  return {
    start: input.featureStart.clone().add(off),
    end: input.featureEnd.clone().add(off),
  };
}

/** Ponto de ancoragem do label — centro da linha de cota + desvio face à câmara. */
export function computeLabelAnchorPosition(
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  camera: THREE.Camera
): THREE.Vector3 {
  _mid.addVectors(lineStart, lineEnd).multiplyScalar(0.5);
  _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  return _mid.clone().addScaledVector(_camUp, 0.02);
}

/** Desloca âncora mundial ao longo de uma direção. */
export function offsetLabel(anchor: THREE.Vector3, direction: THREE.Vector3, amount: number): THREE.Vector3 {
  return anchor.clone().addScaledVector(direction.normalize(), amount);
}

function screenRect(
  center: { x: number; y: number },
  size: { width: number; height: number },
  offset: THREE.Vector2
): { minX: number; minY: number; maxX: number; maxY: number } {
  const cx = center.x + offset.x;
  const cy = center.y + offset.y;
  const hw = size.width * 0.5;
  const hh = size.height * 0.5;
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
}

function rectsOverlap(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return !(a.maxX + MIN_LABEL_GAP_PX < b.minX || b.maxX + MIN_LABEL_GAP_PX < a.minX || a.maxY + MIN_LABEL_GAP_PX < b.minY || b.maxY + MIN_LABEL_GAP_PX < a.minY);
}

/** Evita sobreposição de labels em espaço de ecrã (deslocamento incremental). */
export function avoidLabelOverlap(
  items: LabelLayoutItem[],
  project: ProjectWorldFn
): void {
  const placed: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];

  const sorted = [...items].sort((a, b) => {
    const pa = project(a.anchorWorld);
    const pb = project(b.anchorWorld);
    if (!pa || !pb) return 0;
    return pa.y - pb.y;
  });

  for (const item of sorted) {
    const center = project(item.anchorWorld);
    if (!center) continue;

    let attempts = 0;
    while (attempts < 24) {
      const rect = screenRect(center, item.pixelSize, item.screenOffsetPx);
      const hit = placed.some((p) => rectsOverlap(rect, p));
      if (!hit) {
        placed.push(rect);
        break;
      }
      const band = Math.floor(attempts / 4) + 1;
      const side = attempts % 4;
      if (side === 0) item.screenOffsetPx.y -= LABEL_PIXEL_H * 0.55 * band;
      else if (side === 1) item.screenOffsetPx.y += LABEL_PIXEL_H * 0.55 * band;
      else if (side === 2) item.screenOffsetPx.x -= item.pixelSize.width * 0.35 * band;
      else item.screenOffsetPx.x += item.pixelSize.width * 0.35 * band;
      attempts += 1;
    }
  }
}

function pushSegment(verts: number[], a: THREE.Vector3, b: THREE.Vector3): void {
  verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

function pushAxisTicks(verts: number[], a: THREE.Vector3, b: THREE.Vector3, axis: LayoutAxis): void {
  if (axis === "x") {
    const y = a.y;
    const z = a.z;
    pushSegment(verts, _v.set(a.x, y - EXTENSION_TICK_M, z), _v2.set(a.x, y + EXTENSION_TICK_M, z));
    pushSegment(verts, _v.set(b.x, y - EXTENSION_TICK_M, z), _v2.set(b.x, y + EXTENSION_TICK_M, z));
    const midX = (a.x + b.x) * 0.5;
    pushSegment(verts, _v.set(midX - ARROW_TICK_M, y, z), _v2.set(midX, y + EXTENSION_TICK_M * 0.6, z));
    pushSegment(verts, _v.set(midX + ARROW_TICK_M, y, z), _v2.set(midX, y + EXTENSION_TICK_M * 0.6, z));
  } else if (axis === "y") {
    const x = a.x;
    const z = a.z;
    pushSegment(verts, _v.set(x - EXTENSION_TICK_M, a.y, z), _v2.set(x + EXTENSION_TICK_M, a.y, z));
    pushSegment(verts, _v.set(x - EXTENSION_TICK_M, b.y, z), _v2.set(x + EXTENSION_TICK_M, b.y, z));
    const midY = (a.y + b.y) * 0.5;
    pushSegment(verts, _v.set(x, midY - ARROW_TICK_M, z), _v2.set(x + EXTENSION_TICK_M * 0.6, midY, z));
    pushSegment(verts, _v.set(x, midY + ARROW_TICK_M, z), _v2.set(x + EXTENSION_TICK_M * 0.6, midY, z));
  } else {
    const x = a.x;
    const y = a.y;
    pushSegment(verts, _v.set(x, y, a.z - EXTENSION_TICK_M), _v2.set(x, y, a.z + EXTENSION_TICK_M));
    pushSegment(verts, _v.set(x, y, b.z - EXTENSION_TICK_M), _v2.set(x, y, b.z + EXTENSION_TICK_M));
    const midZ = (a.z + b.z) * 0.5;
    pushSegment(verts, _v.set(x, y - EXTENSION_TICK_M * 0.6, midZ - ARROW_TICK_M), _v2.set(x, y, midZ));
    pushSegment(verts, _v.set(x, y - EXTENSION_TICK_M * 0.6, midZ + ARROW_TICK_M), _v2.set(x, y, midZ));
  }
}

/** Linhas de extensão + cota + ticks (estilo desenho técnico). */
export function buildTechnicalLineVertices(inputs: readonly DimensionLayoutInput[]): number[] {
  const verts: number[] = [];
  for (const input of inputs) {
    const { start: dimA, end: dimB } = dimLineEndpoints(input);
    pushSegment(verts, input.featureStart, dimA);
    pushSegment(verts, input.featureEnd, dimB);
    pushSegment(verts, dimA, dimB);
    pushAxisTicks(verts, dimA, dimB, input.axis);
  }
  return verts;
}

function cameraOrientation(camera: THREE.Camera): { yaw: number; pitch: number } {
  _euler.setFromQuaternion(camera.quaternion, "YXZ");
  return { yaw: _euler.y, pitch: _euler.x };
}

/** Layout completo: cotas técnicas, labels e dados print-ready. */
export function computePrintFriendlyLayout(
  dimensionsData: readonly DimensionLayoutInput[],
  camera: THREE.Camera,
  _viewportWidthPx: number,
  _viewportHeightPx: number,
  project: ProjectWorldFn
): PrintFriendlyLayoutResult {
  const items: LabelLayoutItem[] = dimensionsData.map((input) => {
    const { start: dimLineStart, end: dimLineEnd } = dimLineEndpoints(input);
    const anchorWorld = computeLabelAnchorPosition(dimLineStart, dimLineEnd, camera);
    return {
      id: input.id,
      text: input.text,
      valueMm: input.valueMm,
      axis: input.axis,
      featureStart: input.featureStart.clone(),
      featureEnd: input.featureEnd.clone(),
      dimLineStart,
      dimLineEnd,
      anchorWorld,
      screenOffsetPx: new THREE.Vector2(0, 0),
      pixelSize: estimateLabelPixelSize(input.text),
    };
  });

  avoidLabelOverlap(items, project);

  const orientation = cameraOrientation(camera);
  const entries: PrintReadyDimensionEntry[] = [];

  for (const item of items) {
    const screenCenter = project(item.anchorWorld);
    const screen = screenCenter
      ? { x: screenCenter.x + item.screenOffsetPx.x, y: screenCenter.y + item.screenOffsetPx.y }
      : { x: 0, y: 0 };
    const bbox2d = screenRect(screenCenter ?? { x: 0, y: 0 }, item.pixelSize, item.screenOffsetPx);

    entries.push({
      text: item.text,
      valueMm: item.valueMm,
      axis: item.axis,
      position3d: vec3Out(item.anchorWorld),
      screen,
      orientation: { ...orientation },
      bbox2d,
      lineStart3d: vec3Out(item.dimLineStart),
      lineEnd3d: vec3Out(item.dimLineEnd),
      featureStart3d: vec3Out(item.featureStart),
      featureEnd3d: vec3Out(item.featureEnd),
    });
  }

  return {
    items,
    lineVertices: buildTechnicalLineVertices(dimensionsData),
    printReady: {
      entries,
      generatedAt: Date.now(),
    },
  };
}

/** Converte offset em pixels para deslocamento mundial (billboard). */
export function screenOffsetToWorldDelta(
  camera: THREE.Camera,
  worldAnchor: THREE.Vector3,
  viewportHeightPx: number,
  screenOffsetPx: THREE.Vector2,
  pixelScale: number
): THREE.Vector3 {
  const vh = Math.max(1, viewportHeightPx);
  let worldPerPx = pixelScale;
  if (camera instanceof THREE.PerspectiveCamera) {
    const dist = Math.max(1e-4, camera.position.distanceTo(worldAnchor));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const visibleH = 2 * Math.tan(vFov * 0.5) * dist;
    worldPerPx = visibleH / vh;
  } else if (camera instanceof THREE.OrthographicCamera) {
    const visibleH = (camera.top - camera.bottom) / Math.max(camera.zoom, 1e-6);
    worldPerPx = visibleH / vh;
  }
  _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  return _v
    .copy(_camRight)
    .multiplyScalar(screenOffsetPx.x * worldPerPx)
    .add(_v2.copy(_camUp).multiplyScalar(-screenOffsetPx.y * worldPerPx));
}
