import * as THREE from "three";
import { computeMountFrameM } from "../../../core/remate/remateMountFrame";
import type { RemateMountSlot } from "../../../core/remate/rematePieceTypes";
import { getRemateEnvelopeBoundsM, type StructuralBoundsM } from "../../../core/remate/rematePlacement";
import type { RemateBoxMeta } from "../../../core/remate/remateDimensions";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";

export type RemateSnapTargetKind =
  | "DOOR_FRONT"
  | "DRAWER_FRONT"
  | "BOX_FRENTE"
  | "BOX_TRAS"
  | "BOX_DIR"
  | "BOX_ESQ"
  | "BOX_CIMA"
  | "BOX_FUNDO";

export type RemateSnapPlane = {
  kind: RemateSnapTargetKind;
  priority: number;
  /** Ponto no plano (local box, metros). */
  pointM: THREE.Vector3;
  /** Normal unitária para alinhamento (local box). */
  normalM: THREE.Vector3;
  sourceId?: string;
};

const PRIORITY: Record<RemateSnapTargetKind, number> = {
  DOOR_FRONT: 0,
  DRAWER_FRONT: 1,
  BOX_FRENTE: 2,
  BOX_TRAS: 3,
  BOX_DIR: 4,
  BOX_ESQ: 4,
  BOX_CIMA: 5,
  BOX_FUNDO: 5,
};

const SLOT_TO_KIND: Record<RemateMountSlot, RemateSnapTargetKind> = {
  FRENTE: "BOX_FRENTE",
  TRAS: "BOX_TRAS",
  DIR: "BOX_DIR",
  ESQ: "BOX_ESQ",
  CIMA: "BOX_CIMA",
  FUNDO: "BOX_FUNDO",
};

const _worldBox = new THREE.Box3();
const _localBox = new THREE.Box3();
const _corner = new THREE.Vector3();
const _invBox = new THREE.Matrix4();

function expandWorldAabbToBoxLocal(worldBox: THREE.Box3, boxMesh: THREE.Object3D, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty();
  boxMesh.updateMatrixWorld(true);
  _invBox.copy(boxMesh.matrixWorld).invert();
  const { min, max } = worldBox;
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        _corner.set(x, y, z).applyMatrix4(_invBox);
        out.expandByPoint(_corner);
      }
    }
  }
  return out;
}

function meshAabbInBoxLocal(mesh: THREE.Object3D, boxMesh: THREE.Object3D): THREE.Box3 {
  setBox3FromObjectExcludingLayoutProxy(_worldBox, mesh);
  return expandWorldAabbToBoxLocal(_worldBox, boxMesh, _localBox.clone());
}

function planeFromMaxZ(kind: RemateSnapTargetKind, localBox: THREE.Box3, sourceId?: string): RemateSnapPlane {
  return {
    kind,
    priority: PRIORITY[kind],
    pointM: new THREE.Vector3(
      (localBox.min.x + localBox.max.x) * 0.5,
      (localBox.min.y + localBox.max.y) * 0.5,
      localBox.max.z
    ),
    normalM: new THREE.Vector3(0, 0, 1),
    sourceId,
  };
}

function collectDoorDrawerPlanes(boxMesh: THREE.Object3D): RemateSnapPlane[] {
  const planes: RemateSnapPlane[] = [];
  boxMesh.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const ud = child.userData;
    const isDoor =
      ud.doorPart === "panel" || (typeof child.name === "string" && child.name.startsWith("door-leaf-"));
    const isDrawerFront =
      ud.drawerPart === "front" || (typeof child.name === "string" && child.name.startsWith("drawer-front-"));
    if (!isDoor && !isDrawerFront) return;

    const localBox = meshAabbInBoxLocal(child, boxMesh);
    if (localBox.isEmpty()) return;
    const kind: RemateSnapTargetKind = isDoor ? "DOOR_FRONT" : "DRAWER_FRONT";
    const sourceId =
      (ud.doorLayerId as string | undefined) ?? (ud.drawerLayerId as string | undefined) ?? child.name;
    planes.push(planeFromMaxZ(kind, localBox, sourceId));
  });
  return planes;
}

function collectStructuralPlanes(bounds: StructuralBoundsM): RemateSnapPlane[] {
  return (Object.keys(SLOT_TO_KIND) as RemateMountSlot[]).map((slot) => {
    const frame = computeMountFrameM(bounds, slot);
    const kind = SLOT_TO_KIND[slot];
    return {
      kind,
      priority: PRIORITY[kind],
      pointM: new THREE.Vector3(frame.originM.x, frame.originM.y, frame.originM.z),
      normalM: new THREE.Vector3(frame.normal.x, frame.normal.y, frame.normal.z).normalize(),
    };
  });
}

export function collectRemateSnapTargets(params: {
  boxMesh: THREE.Object3D;
  widthM: number;
  heightM: number;
  depthM: number;
  boxMeta?: RemateBoxMeta | null;
}): RemateSnapPlane[] {
  const bounds = getRemateEnvelopeBoundsM(params.widthM, params.heightM, params.depthM, params.boxMeta ?? null);
  const doorDrawer = collectDoorDrawerPlanes(params.boxMesh);
  const structural = collectStructuralPlanes(bounds);
  const byKind = new Map<RemateSnapTargetKind, RemateSnapPlane>();

  for (const p of structural) byKind.set(p.kind, p);
  for (const p of doorDrawer) byKind.set(p.kind, p);

  return [...byKind.values()].sort((a, b) => a.priority - b.priority);
}

/** Distância assinada da face do remate mais próxima do plano (local box, m). */
export function signedDistanceRemateFaceToPlane(remateLocalBox: THREE.Box3, plane: RemateSnapPlane): number {
  const n = plane.normalM;
  const p0 = plane.pointM;
  let best = Infinity;
  const c = new THREE.Vector3();
  for (const sx of [remateLocalBox.min.x, remateLocalBox.max.x]) {
    for (const sy of [remateLocalBox.min.y, remateLocalBox.max.y]) {
      for (const sz of [remateLocalBox.min.z, remateLocalBox.max.z]) {
        c.set(sx, sy, sz);
        const d = c.clone().sub(p0).dot(n);
        if (Math.abs(d) < Math.abs(best)) best = d;
      }
    }
  }
  return best;
}
