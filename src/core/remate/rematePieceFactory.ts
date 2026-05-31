import type { WorkspaceBox } from "../types";
import type { CreateRematePieceInput, RematePiece } from "./rematePieceTypes";
import { isMultiPartRemateTipo } from "./rematePieceTypes";
import { computeRematePieceSnapForBox, defaultDimensionsForTipo } from "./rematePieceSnap";

let remateSeq = 0;

function nextRemateId(prefix = "remate"): string {
  remateSeq += 1;
  return `${prefix}-${Date.now()}-${remateSeq}`;
}

function buildName(box: WorkspaceBox | null, tipo: RematePiece["tipo"], partIndex?: 1 | 2): string {
  const code = (box?.nome || box?.id || "STANDALONE").trim().replace(/\s+/g, "_").toUpperCase();
  const suffix = partIndex ? `${tipo}${partIndex}` : tipo;
  return `${code}_${suffix}`;
}

function defaultStandalonePosition(
  allBoxes: readonly WorkspaceBox[],
  piece: RematePiece
): RematePiece["position"] {
  const count = allBoxes.length;
  return {
    xMm: 800 + count * 120,
    yMm: piece.height / 2,
    zMm: 600,
  };
}

function applySnapIfNeeded(
  piece: RematePiece,
  box: WorkspaceBox,
  boxDimsM: { widthM: number; heightM: number; depthM: number }
): RematePiece {
  if (!piece.followBox) return piece;
  const snap = computeRematePieceSnapForBox(piece, {
    widthM: boxDimsM.widthM,
    heightM: boxDimsM.heightM,
    depthM: boxDimsM.depthM,
    box,
  });
  return { ...piece, position: snap.position, rotation: snap.rotation };
}

export function createRematePieces(
  input: CreateRematePieceInput,
  ctx: {
    box?: WorkspaceBox | null;
    allBoxes?: readonly WorkspaceBox[];
    materialPresetId: string;
    thicknessMm: number;
    boxDimsM?: { widthM: number; heightM: number; depthM: number };
  }
): RematePiece[] {
  const { box, materialPresetId, thicknessMm, boxDimsM } = ctx;

  if (isMultiPartRemateTipo(input.tipo)) {
    const groupId = nextRemateId("remate-group");
    return ([1, 2] as const).map((partIndex) => {
      const dims = defaultDimensionsForTipo(box ?? null, input.tipo, thicknessMm, partIndex);
      let piece: RematePiece = {
        id: nextRemateId(),
        parentBoxId: input.parentBoxId,
        tipo: input.tipo,
        width: input.width ?? dims.width,
        height: input.height ?? dims.height,
        depth: input.depth ?? dims.depth,
        materialPresetId: input.materialPresetId ?? materialPresetId,
        position: input.workspacePosition ?? { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: input.followBox ?? Boolean(input.parentBoxId),
        name: buildName(box ?? null, input.tipo, partIndex),
        parentGroupId: groupId,
        partIndex,
      };
      if (input.parentBoxId && box && boxDimsM) {
        piece = applySnapIfNeeded(piece, box, boxDimsM);
      } else if (!input.parentBoxId) {
        piece.position = input.workspacePosition ?? defaultStandalonePosition(ctx.allBoxes ?? [], piece);
        piece.followBox = false;
      }
      return piece;
    });
  }

  const dims = defaultDimensionsForTipo(box ?? null, input.tipo, thicknessMm);
  let piece: RematePiece = {
    id: nextRemateId(),
    parentBoxId: input.parentBoxId,
    tipo: input.tipo,
    width: input.width ?? dims.width,
    height: input.height ?? dims.height,
    depth: input.depth ?? dims.depth,
    materialPresetId: input.materialPresetId ?? materialPresetId,
    position: input.workspacePosition ?? { xMm: 0, yMm: 0, zMm: 0 },
    rotation: { xRad: 0, yRad: 0, zRad: 0 },
    followBox: input.followBox ?? Boolean(input.parentBoxId),
    name: buildName(box ?? null, input.tipo),
  };

  if (input.parentBoxId && box && boxDimsM) {
    piece = applySnapIfNeeded(piece, box, boxDimsM);
  } else if (!input.parentBoxId) {
    piece.position = input.workspacePosition ?? defaultStandalonePosition(ctx.allBoxes ?? [], piece);
    piece.followBox = false;
  }

  return [piece];
}
