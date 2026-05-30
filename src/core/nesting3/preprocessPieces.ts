import type {
  Nesting3BoundingBox,
  Nesting3CollisionCache,
  Nesting3GrainDirection,
  Nesting3Piece,
  Nesting3PreprocessedGroup,
  Nesting3PreprocessResult,
} from "./nesting3Types";

type RawPiece = {
  id?: string;
  widthMm?: number;
  heightMm?: number;
  materialId?: string;
  materialName?: string;
  thicknessMm?: number;
  allowRotation?: boolean;
  grainDirection?: string;
};

function normalizeGrainDirection(value: string | undefined): Nesting3GrainDirection {
  if (value === "length" || value === "width") return value;
  return "none";
}

function groupKey(piece: Nesting3Piece): string {
  return [
    piece.materialId ?? "sem-material",
    piece.thicknessMm,
    piece.allowRotation ? "rot" : "fixed",
  ].join("|");
}

function collisionKey(a: Nesting3BoundingBox, b: Nesting3BoundingBox): string {
  return `${a.pieceId}:${a.rotated ? 1 : 0}|${b.pieceId}:${b.rotated ? 1 : 0}`;
}

function buildBoundingBoxes(piece: Nesting3Piece): Nesting3BoundingBox[] {
  const base: Nesting3BoundingBox = {
    pieceId: piece.id,
    rotated: false,
    widthMm: piece.widthMm,
    heightMm: piece.heightMm,
    areaMm2: piece.widthMm * piece.heightMm,
  };
  if (!piece.allowRotation || piece.widthMm === piece.heightMm) return [base];
  return [
    base,
    {
      pieceId: piece.id,
      rotated: true,
      widthMm: piece.heightMm,
      heightMm: piece.widthMm,
      areaMm2: piece.widthMm * piece.heightMm,
    },
  ];
}

export function preprocessPieces(rawPieces: RawPiece[]): Nesting3PreprocessResult {
  const pieces: Nesting3Piece[] = rawPieces
    .map((raw, index) => {
      const widthMm = Math.max(1, Number(raw.widthMm ?? 0));
      const heightMm = Math.max(1, Number(raw.heightMm ?? 0));
      return {
        id: raw.id?.trim() || `nesting3-piece-${index + 1}`,
        widthMm,
        heightMm,
        materialId: raw.materialId,
        materialName: raw.materialName,
        thicknessMm: Math.max(1, Number(raw.thicknessMm ?? 19)),
        allowRotation: raw.allowRotation !== false,
        grainDirection: normalizeGrainDirection(raw.grainDirection),
        originalIndex: index,
      };
    })
    .sort((a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm);

  const groupsByKey = new Map<string, Nesting3PreprocessedGroup>();
  const boundingBoxes = new Map<string, Nesting3BoundingBox[]>();
  const collisionCache: Nesting3CollisionCache = new Map();

  for (const piece of pieces) {
    const key = groupKey(piece);
    const group = groupsByKey.get(key) ?? {
      key,
      pieces: [],
      materialId: piece.materialId,
      thicknessMm: piece.thicknessMm,
      allowRotation: piece.allowRotation,
    };
    group.pieces.push(piece);
    groupsByKey.set(key, group);
    boundingBoxes.set(piece.id, buildBoundingBoxes(piece));
  }

  for (const a of pieces) {
    for (const b of pieces) {
      if (a.id === b.id) continue;
      const aBoxes = boundingBoxes.get(a.id) ?? [];
      const bBoxes = boundingBoxes.get(b.id) ?? [];
      for (const ab of aBoxes) {
        for (const bb of bBoxes) {
          collisionCache.set(collisionKey(ab, bb), false);
        }
      }
    }
  }

  return {
    pieces,
    groups: Array.from(groupsByKey.values()),
    boundingBoxes,
    collisionCache,
  };
}
