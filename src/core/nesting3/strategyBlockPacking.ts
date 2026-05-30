import type { Nesting3Options, Nesting3Piece, Nesting3Sheet, Nesting3StrategyResult } from "./nesting3Types";
import { runStrategySkyline } from "./strategySkyline";

type Block = {
  id: string;
  pieces: Nesting3Piece[];
  widthMm: number;
  heightMm: number;
};

function makeBlocks(pieces: Nesting3Piece[], sheet: Nesting3Sheet, kerfMm: number): { blocks: Block[]; singles: Nesting3Piece[] } {
  const smallLimit = sheet.widthMm * sheet.heightMm * 0.035;
  const small = pieces.filter((p) => p.widthMm * p.heightMm <= smallLimit);
  const singles = pieces.filter((p) => p.widthMm * p.heightMm > smallLimit);
  const blocks: Block[] = [];
  for (let i = 0; i < small.length; i += 4) {
    const group = small.slice(i, i + 4);
    const widthMm = group.reduce((sum, p) => sum + p.widthMm, 0) + Math.max(0, group.length - 1) * kerfMm;
    const heightMm = Math.max(...group.map((p) => p.heightMm), 1);
    blocks.push({ id: `block-${i / 4}`, pieces: group, widthMm, heightMm });
  }
  return { blocks, singles };
}

export function runStrategyBlockPacking(
  pieces: Nesting3Piece[],
  sheets: Nesting3Sheet[],
  options: Nesting3Options
): Nesting3StrategyResult {
  const started = performance.now();
  const template = sheets[0] ?? { index: 0, widthMm: 2800, heightMm: 2070, thicknessMm: 19 };
  const { blocks, singles } = makeBlocks(pieces, template, options.kerfMm);
  const virtualPieces: Nesting3Piece[] = [
    ...singles,
    ...blocks.map((b, index) => ({
      id: b.id,
      widthMm: b.widthMm,
      heightMm: b.heightMm,
      thicknessMm: b.pieces[0]?.thicknessMm ?? template.thicknessMm ?? 19,
      allowRotation: false,
      grainDirection: "none" as const,
      originalIndex: pieces.length + index,
    })),
  ];
  const packed = runStrategySkyline(virtualPieces, sheets, options);
  const placements = packed.placements.flatMap((placement) => {
    const block = blocks.find((b) => b.id === placement.pieceId);
    if (!block) return [placement];
    let cursorX = placement.xMm;
    return block.pieces.map((piece) => {
      const result = {
        pieceId: piece.id,
        sheetIndex: placement.sheetIndex,
        xMm: cursorX,
        yMm: placement.yMm,
        widthMm: piece.widthMm,
        heightMm: piece.heightMm,
        rotated: false,
      };
      cursorX += piece.widthMm + options.kerfMm;
      return result;
    });
  });

  const placedIds = new Set(placements.map((p) => p.pieceId));
  return {
    strategy: "blockPacking",
    placements,
    unplacedPieceIds: pieces.filter((p) => !placedIds.has(p.id)).map((p) => p.id),
    sheetsUsed: placements.reduce((max, p) => Math.max(max, p.sheetIndex + 1), 0),
    elapsedMs: performance.now() - started,
  };
}
