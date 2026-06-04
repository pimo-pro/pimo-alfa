import type { RemateMountSlot, RematePiece, RematePlacementMode, RemateProductType } from "./rematePieceTypes";
import type { ProjectRemate } from "./remateTypes";
import type { WorkspaceBox } from "../types";
import { getRemateEnvelopeBoundsM } from "./rematePlacement";
import {
  isLegacyCenterZSnap,
  resolveMountSlot,
  snapToMountRule,
} from "./remateMountFrame";
import {
  deriveLegacyTipo,
  inferProductTypeFromLegacy,
  normalizeProductOptions,
} from "./remateProductRules";

function isRematePieceV2(raw: unknown): raw is RematePiece {
  return (
    raw != null &&
    typeof raw === "object" &&
    typeof (raw as RematePiece).width === "number" &&
    typeof (raw as RematePiece).tipo === "string" &&
    (raw as RematePiece).position != null
  );
}

function mapV1ToProductType(v1: ProjectRemate): RemateProductType {
  if (v1.type === "completo") return "COMPLETO";
  if (v1.type === "L") return "L";
  if (v1.type === "rodape") return "RODAPE";
  return "AVISTA";
}

function mapV1ToMountSlot(v1: ProjectRemate): RemateMountSlot {
  if (v1.position === "rodape" || v1.faceKind === "RODAPE") return "FUNDO";
  if (v1.position === "dir") return "DIR";
  if (v1.position === "esq") return "ESQ";
  if (v1.position === "cima") return "CIMA";
  if (v1.position === "baixo") return "FUNDO";
  return "FRENTE";
}

export function migrateRemateV1ToRematePiece(v1: ProjectRemate): RematePiece {
  const placementMode: RematePlacementMode = v1.placementFree ? "FREE" : "SNAPPED";
  const productType = mapV1ToProductType(v1);
  const mountSlot = mapV1ToMountSlot(v1);
  return {
    id: v1.id,
    parentBoxId: v1.parentBoxId,
    productType,
    mountSlot,
    productOptions: normalizeProductOptions(productType, {}),
    tipo: deriveLegacyTipo(productType, mountSlot),
    placementMode,
    width: Math.max(1, v1.dimensions?.widthMm ?? 19),
    height: Math.max(1, v1.dimensions?.heightMm ?? 720),
    depth: Math.max(1, v1.dimensions?.depthMm ?? 100),
    materialPresetId: v1.materialId,
    position: {
      xMm: v1.transform?.xMm ?? 0,
      yMm: v1.transform?.yMm ?? 0,
      zMm: v1.transform?.zMm ?? 0,
    },
    rotation: {
      xRad: v1.transform?.rotacaoXRad ?? 0,
      yRad: v1.transform?.rotacaoYRad ?? 0,
      zRad: v1.transform?.rotacaoZRad ?? 0,
    },
    followBox: !(v1.placementFree ?? false),
    name: v1.name,
    parentGroupId: v1.parentGroupId,
    partIndex: v1.partIndex,
  };
}

function boxDimsFromWorkspace(box: WorkspaceBox) {
  return {
    widthM: Math.max(0.001, (box.dimensoes?.largura ?? 600) / 1000),
    heightM: Math.max(0.001, (box.dimensoes?.altura ?? 720) / 1000),
    depthM: Math.max(0.001, (box.dimensoes?.profundidade ?? 600) / 1000),
  };
}

function upgradeRematePiece(piece: RematePiece, box: WorkspaceBox | null): RematePiece {
  const productType = piece.productType ?? inferProductTypeFromLegacy(piece);
  const mountSlot = piece.mountSlot ?? resolveMountSlot(piece);
  let next: RematePiece = {
    ...piece,
    productType,
    mountSlot,
    productOptions: normalizeProductOptions(productType, piece.productOptions),
    tipo: piece.tipo ?? deriveLegacyTipo(productType, mountSlot),
    placementMode: piece.placementMode ?? (piece.followBox ? "SNAPPED" : "FREE"),
  };
  if (next.placementMode === "FREE" || !next.followBox) return next;
  if (!box) return next;
  const dims = boxDimsFromWorkspace(box);
  const bounds = getRemateEnvelopeBoundsM(dims.widthM, dims.heightM, dims.depthM, box);
  if (!next.faceOffsets || isLegacyCenterZSnap(next)) {
    next = snapToMountRule(next, bounds);
  }
  return next;
}

export function upgradeRematesAfterLoad(
  remates: RematePiece[],
  workspaceBoxes: readonly WorkspaceBox[]
): RematePiece[] {
  return remates.map((piece) => {
    const box = piece.parentBoxId
      ? workspaceBoxes.find((b) => b.id === piece.parentBoxId) ?? null
      : null;
    return upgradeRematePiece(piece, box);
  });
}

export function normalizeRematesFromPersistence(rawList: unknown[]): RematePiece[] {
  return rawList
    .filter((r) => r != null && typeof r === "object" && typeof (r as { id?: unknown }).id === "string")
    .map((raw) => {
      if (isRematePieceV2(raw)) return raw;
      return migrateRemateV1ToRematePiece(raw as ProjectRemate);
    });
}
