// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { CreatePieceDto, UpdatePieceDto } from './dto';
import type { IndustrialPiece, IndustrialPieceStatus } from './types';

function now(): string {
  return new Date().toISOString();
}

export function createPiece(input: CreatePieceDto): IndustrialPiece {
  const timestamp = now();

  return {
    id: input.id ?? input.sourceItemId ?? `${input.boxId ?? 'piece'}:${input.name}`,
    projectId: input.projectId,
    workOrderId: input.workOrderId,
    boxId: input.boxId,
    sourceItemId: input.sourceItemId,
    name: input.name,
    material: input.material,
    materialId: input.materialId,
    dimensions: input.dimensions,
    quantity: input.quantity ?? 1,
    operations: input.operations ?? [],
    status: input.status ?? 'pending',
    barcode: input.barcode,
    metadata: input.metadata ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updatePiece(piece: IndustrialPiece, input: UpdatePieceDto): IndustrialPiece {
  return {
    ...piece,
    name: input.name ?? piece.name,
    material: input.material ?? piece.material,
    materialId: input.materialId ?? piece.materialId,
    dimensions: { ...piece.dimensions, ...input.dimensions },
    quantity: input.quantity ?? piece.quantity,
    operations: input.operations ?? piece.operations,
    status: input.status ?? piece.status,
    barcode: input.barcode === null ? undefined : (input.barcode ?? piece.barcode),
    metadata: input.metadata ? { ...piece.metadata, ...input.metadata } : piece.metadata,
    updatedAt: now(),
  };
}

export function updatePieceStatus(piece: IndustrialPiece, status: IndustrialPieceStatus): IndustrialPiece {
  return {
    ...piece,
    status,
    updatedAt: now(),
  };
}
