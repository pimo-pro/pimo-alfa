import * as THREE from "three";
import type { Room } from "./Room";

const WALL_THICKNESS_M = 0.12;

export interface WallMaterialOptions {
  doubleSide?: boolean;
  transparent?: boolean;
  opacity?: number;
  color?: number;
}

/**
 * Aplica material às paredes (MeshStandardMaterial, DoubleSide, transparent).
 */
export function applyWallMaterial(
  mesh: THREE.Mesh,
  options: WallMaterialOptions = {}
): void {
  const {
    doubleSide = true,
    transparent = true,
    opacity = 0.6,
    color = 0xd1d5db,
  } = options;
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0.05,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    transparent,
    opacity,
  });
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else {
      (mesh.material as THREE.Material).dispose();
    }
  }
  mesh.material = mat;
}

/**
 * Cria as 4 paredes principais para uma sala (front, right, back, left).
 * Não adiciona à cena; apenas cria os meshes com userData (wallId 0–3, isMainWall, etc.).
 */
export function createMainWalls(room: Room): THREE.Mesh[] {
  const t = WALL_THICKNESS_M;
  const { width, depth, height, minX, maxX, minZ, maxZ, centerX, centerZ, minY } = room;
  const yCenter = minY + height / 2;

  const front = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, t),
    new THREE.MeshStandardMaterial()
  );
  front.position.set(centerX, yCenter, minZ - t / 2);
  front.userData.wallId = 0;
  front.userData.wallNormal = new THREE.Vector3(0, 0, -1);
  front.userData.isRoomWall = true;
  front.userData.isMainWall = true;
  front.userData.wallLengthMm = width * 1000;
  front.userData.wallHeightMm = height * 1000;
  front.userData.wallThicknessM = t;
  applyWallMaterial(front, { opacity: 0.6, color: 0xd1d5db });

  const right = new THREE.Mesh(
    new THREE.BoxGeometry(depth, height, t),
    new THREE.MeshStandardMaterial()
  );
  right.rotation.y = Math.PI / 2;
  right.position.set(maxX + t / 2, yCenter, centerZ);
  right.userData.wallId = 1;
  right.userData.wallNormal = new THREE.Vector3(-1, 0, 0);
  right.userData.isRoomWall = true;
  right.userData.isMainWall = true;
  right.userData.wallLengthMm = depth * 1000;
  right.userData.wallHeightMm = height * 1000;
  right.userData.wallThicknessM = t;
  applyWallMaterial(right, { opacity: 0.6, color: 0xd1d5db });

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, t),
    new THREE.MeshStandardMaterial()
  );
  back.position.set(centerX, yCenter, maxZ + t / 2);
  back.userData.wallId = 2;
  back.userData.wallNormal = new THREE.Vector3(0, 0, 1);
  back.userData.isRoomWall = true;
  back.userData.isMainWall = true;
  back.userData.wallLengthMm = width * 1000;
  back.userData.wallHeightMm = height * 1000;
  back.userData.wallThicknessM = t;
  applyWallMaterial(back, { opacity: 0.6, color: 0xd1d5db });

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(depth, height, t),
    new THREE.MeshStandardMaterial()
  );
  left.rotation.y = Math.PI / 2;
  left.position.set(minX - t / 2, yCenter, centerZ);
  left.userData.wallId = 3;
  left.userData.wallNormal = new THREE.Vector3(1, 0, 0);
  left.userData.isRoomWall = true;
  left.userData.isMainWall = true;
  left.userData.wallLengthMm = depth * 1000;
  left.userData.wallHeightMm = height * 1000;
  left.userData.wallThicknessM = t;
  applyWallMaterial(left, { opacity: 0.6, color: 0xd1d5db });

  return [front, right, back, left];
}

/**
 * Reposiciona as 4 paredes principais conforme as dimensões da sala.
 * Atualiza posição, rotação e geometria (comprimento) de cada parede.
 */
export function positionMainWalls(room: Room, walls: THREE.Mesh[]): void {
  if (walls.length < 4) return;
  const t = WALL_THICKNESS_M;
  const { width, depth, minX, maxX, minZ, maxZ, centerX, centerZ, minY, height } = room;
  const yCenter = minY + height / 2;

  const [front, right, back, left] = walls;

  front.geometry.dispose();
  front.geometry = new THREE.BoxGeometry(width, height, t);
  front.position.set(centerX, yCenter, minZ - t / 2);
  front.rotation.y = 0;
  (front.userData.wallLengthMm as number) = width * 1000;
  (front.userData.wallHeightMm as number) = height * 1000;

  right.geometry.dispose();
  right.geometry = new THREE.BoxGeometry(depth, height, t);
  right.rotation.y = Math.PI / 2;
  right.position.set(maxX + t / 2, yCenter, centerZ);
  (right.userData.wallLengthMm as number) = depth * 1000;
  (right.userData.wallHeightMm as number) = height * 1000;

  back.geometry.dispose();
  back.geometry = new THREE.BoxGeometry(width, height, t);
  back.position.set(centerX, yCenter, maxZ + t / 2);
  back.rotation.y = 0;
  (back.userData.wallLengthMm as number) = width * 1000;
  (back.userData.wallHeightMm as number) = height * 1000;

  left.geometry.dispose();
  left.geometry = new THREE.BoxGeometry(depth, height, t);
  left.rotation.y = Math.PI / 2;
  left.position.set(minX - t / 2, yCenter, centerZ);
  (left.userData.wallLengthMm as number) = depth * 1000;
  (left.userData.wallHeightMm as number) = height * 1000;
}

/** Cor das paredes extras (cinza claro, distinta das principais). */
const EXTRA_WALL_COLOR = 0x9ca3af;

/**
 * Cria uma parede extra (livre). Dimensões padrão; posição (0,0,0) para o caller posicionar.
 */
export function createExtraWall(id: number): THREE.Mesh {
  const length = 2;
  const height = 2.7;
  const t = WALL_THICKNESS_M;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, height, t),
    new THREE.MeshStandardMaterial()
  );
  mesh.position.set(0, height / 2, 0);
  mesh.userData.wallId = id;
  mesh.userData.wallNormal = new THREE.Vector3(0, 0, 1);
  mesh.userData.isRoomWall = true;
  mesh.userData.isMainWall = false;
  mesh.userData.wallLengthMm = length * 1000;
  mesh.userData.wallHeightMm = height * 1000;
  mesh.userData.wallThicknessM = t;
  applyWallMaterial(mesh, { opacity: 0.6, color: EXTRA_WALL_COLOR });
  return mesh;
}

export { WALL_THICKNESS_M };
