import type { WorkspaceBox } from "../types";
import type { CreateRemateInput } from "./remateTypes";
import { createRematePieces } from "./rematePieceFactory";
import type { CreateRematePieceInput, RemateMountSlot, RematePiece, RemateProductType } from "./rematePieceTypes";

function mapPositionToMountSlot(input: CreateRemateInput): RemateMountSlot {
  if (input.type === "rodape" || input.position === "rodape") return "FUNDO";
  if (input.position === "dir") return "DIR";
  if (input.position === "esq") return "ESQ";
  if (input.position === "cima") return "CIMA";
  if (input.position === "baixo") return "FUNDO";
  return "FRENTE";
}

function mapLegacyInputToCreate(input: CreateRemateInput): CreateRematePieceInput {
  const productType: RemateProductType =
    input.type === "completo"
      ? "COMPLETO"
      : input.type === "L"
        ? "L"
        : input.type === "rodape"
          ? "RODAPE"
          : "AVISTA";
  return {
    productType,
    mountSlot: mapPositionToMountSlot(input),
    parentBoxId: input.parentBoxId,
    materialPresetId: input.materialId,
    followBox: true,
  };
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
    { ...mapLegacyInputToCreate(input), parentBoxId: box.id },
    {
      box,
      materialPresetId: materialId,
      thicknessMm,
      boxDimsM: boxDimsM(box),
    }
  );
}
