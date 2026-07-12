/**
 * FASE 3 (P2) — Orientação de veio por peça no Viewer 3D.
 *
 * Âmbito focado: peças YY (portas, frentes de gaveta, frente-fixa, remates laterais completos).
 * - Só atua em material de madeira.
 * - Só roda o veio de peças YY (longitudinal); XX mantém o default do preset.
 * - Clona as texturas por mesh (isolado) — não afeta outras peças nem o cache global.
 * - Trata o carregamento assíncrono de texturas com um retry curto (requestAnimationFrame).
 */

import * as THREE from "three";
import { resolveIndustrialGrainCode, type IndustrialGrainInput } from "../../../core/materials/grainDirection";
import { isMaterialMadeira, isViewerGrainFlipped } from "../../../core/materials/nestingGrainLock";

/** Rotação do veio para peças YY (longitudinal). Ajustável após validação visual. */
const YY_GRAIN_ROTATION_RAD = Math.PI / 2;

/** Nº máximo de tentativas enquanto as texturas ainda carregam (async). */
const MAX_TEXTURE_WAIT_FRAMES = 30;

type GrainMeshUserData = {
  doorLayerId?: string;
  drawerPart?: string;
  isRematePiece?: boolean;
  remateTipo?: string;
  remateProductType?: string;
  remateMountSlot?: string;
};

/** Resolve YY/XX para um mesh já identificado (âmbito focado). */
export function resolveMeshGrainCode(mesh: THREE.Mesh): "YY" | "XX" | undefined {
  const ud = mesh.userData as GrainMeshUserData;
  if (ud.doorLayerId) return "YY";
  if (ud.drawerPart === "front") return "YY";
  if (mesh.name === "frente-fixa") return "YY";
  if (ud.isRematePiece) {
    return resolveIndustrialGrainCode({
      tipo: "remate",
      remateProductType: ud.remateProductType as IndustrialGrainInput["remateProductType"],
      remateTipo: ud.remateTipo as IndustrialGrainInput["remateTipo"],
      remateMountSlot: ud.remateMountSlot as IndustrialGrainInput["remateMountSlot"],
    });
  }
  return undefined;
}

/** Clona os mapas do material e aplica a rotação de veio. Devolve true se aplicou a algum mapa. */
function rotateMaterialTextures(mat: THREE.MeshStandardMaterial, extraRad: number): boolean {
  let applied = false;
  const rot = (tex: THREE.Texture | null): THREE.Texture | null => {
    if (!tex) return tex;
    const clone = tex.clone();
    clone.center.set(0.5, 0.5);
    clone.rotation = tex.rotation + extraRad;
    clone.needsUpdate = true;
    applied = true;
    return clone;
  };
  mat.map = rot(mat.map);
  mat.normalMap = rot(mat.normalMap);
  mat.roughnessMap = rot(mat.roughnessMap);
  if (applied) mat.needsUpdate = true;
  return applied;
}

/**
 * Aplica orientação de veio YY a um mesh de peça (âmbito focado).
 * @param mesh mesh da peça (folha de porta, frente de gaveta, frente-fixa ou remate).
 * @param materialId id/label do material aplicado (para verificar se é madeira).
 * @param onApplied callback opcional após aplicar (ex.: requestRender).
 */
export function applyMeshGrainOrientation(
  mesh: THREE.Mesh,
  materialId: string | undefined,
  onApplied?: () => void
): void {
  if (!isMaterialMadeira(materialId)) return;
  if (resolveMeshGrainCode(mesh) !== "YY") return;

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  let attempts = 0;

  const tryApply = () => {
    let done = false;
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial) {
        if (rotateMaterialTextures(m, YY_GRAIN_ROTATION_RAD)) done = true;
      }
    }
    if (done) {
      onApplied?.();
      return;
    }
    if (attempts++ < MAX_TEXTURE_WAIT_FRAMES) {
      requestAnimationFrame(tryApply);
    }
  };

  tryApply();
}

/**
 * FASE 4 (P3) — Compensação de veio para remates ao rodar (snap 1/3 = 90°/270°).
 * - Só material de madeira.
 * - Snap 0/2 (0°/180°) fica no default: a rotação geométrica já cobre o alinhamento.
 * - Snap 1/3 (90°/270°) recebe +90° para compensar a troca L↔A da geometria.
 * Idempotente na prática: cada re-sincronização do remate usa material fresco (textura no
 * preset), pelo que a rotação é sempre aplicada a partir da base — nunca acumula.
 */
export function applyRemateGrainOnSnap(
  mesh: THREE.Mesh,
  materialId: string | undefined,
  rotationSnapIndex: number | undefined,
  onApplied?: () => void
): void {
  if (!isMaterialMadeira(materialId)) return;
  if (!isViewerGrainFlipped(rotationSnapIndex)) return;

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  let attempts = 0;

  const tryApply = () => {
    let done = false;
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial) {
        if (rotateMaterialTextures(m, YY_GRAIN_ROTATION_RAD)) done = true;
      }
    }
    if (done) {
      onApplied?.();
      return;
    }
    if (attempts++ < MAX_TEXTURE_WAIT_FRAMES) {
      requestAnimationFrame(tryApply);
    }
  };

  tryApply();
}
