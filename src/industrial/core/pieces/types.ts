// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

export type IndustrialPieceStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'rework' | 'scrapped';
export type IndustrialPieceOperationKey = 'cnc' | 'drill' | 'orlar' | 'montagem' | 'embalagem';

export interface PieceDimensions {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}

export interface IndustrialPiece {
  id: string;
  boxId?: string;
  projectId?: string;
  workOrderId?: string;
  sourceItemId?: string;
  name: string;
  material?: string;
  materialId?: string;
  dimensions: PieceDimensions;
  quantity: number;
  operations: IndustrialPieceOperationKey[];
  status: IndustrialPieceStatus;
  barcode?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
