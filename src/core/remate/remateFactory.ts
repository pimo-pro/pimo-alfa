import type { WorkspaceBox } from "../types";
import type { CreateRemateInput, RematePieceTipo } from "./remateTypes";
import { createRematePieces } from "./rematePieceFactory";
import type { RematePiece } from "./rematePieceTypes";

function mapLegacyInputToTipo(input: CreateRemateInput): RematePieceTipo {
  if (input.type === "L") return "L";
  if (input.type === "rodape" || input.position === "rodape") return "RODAPE";
  if (input.position === "dir") return "DIR";
  if (input.position === "esq") return "ESQ";
  if (input.position === "cima") return "CIMA";
  return "BAIXO";
}

function boxDimsM(box: WorkspaceBox) {
  return {
    widthM: Math.max(0.001, (box.dimensoes?.largura ?? 600) / 1000),
    heightM: Math.max(0.001, (box.dimensoes?.altura ?? 720) / 1000),
    depthM: Math.max(0.001, (box.dimensoes?.profundidade ?? 600) / 1000),
  };
}

/** Compatibilidade auto-room-fill e legado V1. */
export function createRematesForBox(params: {
  box: WorkspaceBox;
  input: CreateRemateInput;
  materialId: string;
  thicknessMm: number;
  existingCount: number;
}): RematePiece[] {
  const { box, input, materialId, thicknessMm } = params;
  return createRematePieces(
    {
      tipo: mapLegacyInputToTipo(input),
      parentBoxId: box.id,
      materialPresetId: materialId,
      followBox: true,
    },
    {
      box,
      materialPresetId: materialId,
      thicknessMm,
      boxDimsM: boxDimsM(box),
    }
  );
}
