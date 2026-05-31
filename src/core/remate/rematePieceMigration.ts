import type { RematePiece, RematePieceTipo } from "./rematePieceTypes";
import type { ProjectRemate } from "./remateTypes";
import { positionToFaceKind } from "./remateTypes";

function isRematePieceV2(raw: unknown): raw is RematePiece {
  return (
    raw != null &&
    typeof raw === "object" &&
    typeof (raw as RematePiece).width === "number" &&
    typeof (raw as RematePiece).tipo === "string" &&
    (raw as RematePiece).position != null
  );
}

function mapV1ToTipo(v1: ProjectRemate): RematePieceTipo {
  if (v1.type === "L") return "L";
  if (v1.faceKind === "RODAPE" || v1.position === "rodape") return "RODAPE";
  const fk = v1.faceKind ?? positionToFaceKind(v1.position ?? "dir", v1.type ?? "avista");
  if (fk === "DIR" || fk === "ESQ" || fk === "CIMA" || fk === "BAIXO") return fk;
  return "DIR";
}

export function migrateRemateV1ToRematePiece(v1: ProjectRemate): RematePiece {
  return {
    id: v1.id,
    parentBoxId: v1.parentBoxId,
    tipo: mapV1ToTipo(v1),
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

export function normalizeRematesFromPersistence(rawList: unknown[]): RematePiece[] {
  return rawList
    .filter((r) => r != null && typeof r === "object" && typeof (r as { id?: unknown }).id === "string")
    .map((raw) => {
      if (isRematePieceV2(raw)) return raw;
      return migrateRemateV1ToRematePiece(raw as ProjectRemate);
    });
}
