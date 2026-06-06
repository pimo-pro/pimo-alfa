// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { IndustrialPieceOperationKey, IndustrialPieceStatus, PieceDimensions } from './types';

export interface CreatePieceDto {
  id?: string;
  boxId?: string;
  projectId?: string;
  workOrderId?: string;
  sourceItemId?: string;
  name: string;
  material?: string;
  materialId?: string;
  dimensions: PieceDimensions;
  quantity?: number;
  operations?: IndustrialPieceOperationKey[];
  status?: IndustrialPieceStatus;
  barcode?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePieceDto {
  name?: string;
  material?: string;
  materialId?: string;
  dimensions?: Partial<PieceDimensions>;
  quantity?: number;
  operations?: IndustrialPieceOperationKey[];
  status?: IndustrialPieceStatus;
  barcode?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PieceViewDto {
  id: string;
  label: string;
  material?: string;
  dimensionsLabel: string;
  status: IndustrialPieceStatus;
  operations: IndustrialPieceOperationKey[];
}
