// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { PieceViewDto } from './dto';
import type { IndustrialPiece } from './types';

export function pieceToViewDto(piece: IndustrialPiece): PieceViewDto {
  const { widthMm, heightMm, thicknessMm } = piece.dimensions;
  return {
    id: piece.id,
    label: piece.name,
    material: piece.material,
    dimensionsLabel: `${widthMm} x ${heightMm} x ${thicknessMm} mm`,
    status: piece.status,
    operations: piece.operations,
  };
}

export function piecesByBoxId(pieces: IndustrialPiece[]): Record<string, IndustrialPiece[]> {
  return pieces.reduce<Record<string, IndustrialPiece[]>>((groups, piece) => {
    const key = piece.boxId ?? 'sem-caixa';
    groups[key] ??= [];
    groups[key].push(piece);
    return groups;
  }, {});
}
