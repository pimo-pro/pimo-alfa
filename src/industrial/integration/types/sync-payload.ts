// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { OperationTrackingPayloadDto } from '@/industrial/core/piece-operations/dto';
import type { PieceOperation } from '@/industrial/core/piece-operations/types';
import type { IndustrialPiece } from '@/industrial/core/pieces/types';
import type { TimeTrackingPayloadDto } from '@/industrial/core/time-tracking/dto';
import type { WorkOrder } from '@/industrial/core/work-orders/types';

export interface IndustrialSyncPayload {
  source: 'pimo-criativo';
  projectId?: string;
  projectName?: string;
  generatedAt: string;
  workOrder?: WorkOrder;
  pieces: IndustrialPiece[];
  operations?: PieceOperation[];
  operationTracking?: OperationTrackingPayloadDto[];
  timeTracking?: TimeTrackingPayloadDto[];
  metadata?: Record<string, unknown>;
}

export interface CreateIndustrialSyncPayloadDto extends Omit<IndustrialSyncPayload, 'source' | 'generatedAt'> {
  generatedAt?: string;
}

export function createIndustrialSyncPayload(input: CreateIndustrialSyncPayloadDto): IndustrialSyncPayload {
  return {
    ...input,
    source: 'pimo-criativo',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
