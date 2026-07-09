import { isMaterialMadeira } from "../materials/nestingGrainLock";

export type CutlistRotationMetadata = {
  allowPieceRotation?: boolean;
  lockWoodGrain?: boolean;
};

/** Metadata de rotação/veio para cutlist → CutPiece → V3Piece. */
export function buildCutlistRotationMetadata(input: {
  allowPieceRotation?: boolean;
  lockWoodGrain?: boolean;
  materialId?: string;
}): CutlistRotationMetadata {
  const out: CutlistRotationMetadata = {};
  if (input.allowPieceRotation === true) out.allowPieceRotation = true;
  else if (input.allowPieceRotation === false) out.allowPieceRotation = false;

  if (input.lockWoodGrain === true) out.lockWoodGrain = true;
  else if (input.lockWoodGrain === false) out.lockWoodGrain = false;
  else if (isMaterialMadeira(input.materialId)) out.lockWoodGrain = true;

  return out;
}
