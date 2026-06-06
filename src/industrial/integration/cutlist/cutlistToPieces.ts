// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import { operationsToTrackingPayloads, pieceToOperations } from '@/industrial/core/piece-operations/mappers';
import type { OperationTrackingPayloadDto } from '@/industrial/core/piece-operations/dto';
import type { PieceOperation } from '@/industrial/core/piece-operations/types';
import { createPiece } from '@/industrial/core/pieces/actions';
import type { IndustrialPiece, IndustrialPieceOperationKey } from '@/industrial/core/pieces/types';

export interface CutlistPieceInput {
  id?: string;
  nome?: string;
  name?: string;
  boxId?: string;
  material?: string;
  materialId?: string;
  quantidade?: number;
  dimensoes?: {
    largura?: number;
    altura?: number;
    profundidade?: number;
  };
  espessura?: number;
  shortCode?: string;
  metadata?: Record<string, unknown>;
}

export interface CutlistToPiecesOptions {
  projectId?: string;
  workOrderId?: string;
}

function inferOperationsFromCutlistItem(item: CutlistPieceInput): IndustrialPieceOperationKey[] {
  const type = String(item.metadata?.tipo ?? item.metadata?.panelId ?? item.nome ?? item.name ?? '').toLowerCase();
  const operations: IndustrialPieceOperationKey[] = ['cnc'];

  if (type.includes('lateral') || type.includes('porta') || type.includes('fundo') || type.includes('cima')) {
    operations.push('drill');
  }

  if (!type.includes('costa') && !type.includes('fundo')) {
    operations.push('orlar');
  }

  operations.push('montagem', 'embalagem');
  return Array.from(new Set(operations));
}

/**
 * Converte a cutlist atual do pimo-criativo para o novo dominio industrial.
 * O mapeamento e intencionalmente fino: nao importa regras CNC/nesting antigas.
 */
export function cutlistToPieces(items: CutlistPieceInput[], options: CutlistToPiecesOptions = {}): IndustrialPiece[] {
  return items.map((item) =>
    createPiece({
      projectId: options.projectId,
      workOrderId: options.workOrderId,
      boxId: item.boxId,
      sourceItemId: item.id,
      name: item.nome ?? item.name ?? 'Peca',
      material: item.material,
      materialId: item.materialId,
      quantity: item.quantidade ?? 1,
      operations: inferOperationsFromCutlistItem(item),
      barcode: item.shortCode,
      dimensions: {
        widthMm: item.dimensoes?.largura ?? 0,
        heightMm: item.dimensoes?.altura ?? 0,
        thicknessMm: item.espessura ?? item.dimensoes?.profundidade ?? 0,
      },
      metadata: item.metadata,
    }),
  );
}

export function cutlistToPieceOperations(
  items: CutlistPieceInput[],
  options: CutlistToPiecesOptions = {},
): PieceOperation[] {
  return cutlistToPieces(items, options).flatMap(pieceToOperations);
}

export function cutlistToOperationTrackingPayloads(
  items: CutlistPieceInput[],
  options: CutlistToPiecesOptions = {},
): OperationTrackingPayloadDto[] {
  return operationsToTrackingPayloads(cutlistToPieceOperations(items, options));
}
