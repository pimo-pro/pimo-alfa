// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import { createReworkRequest } from '@/industrial/core/rework/actions';
import type { CreateReworkDto } from '@/industrial/core/rework/dto';
import type { ReworkRequest } from '@/industrial/core/rework/types';
import { qualityInspectionToResult } from './actions';
import type { QualityInspection } from './types';

export function qualityInspectionToRework(inspection: QualityInspection, targetOperationId?: string): ReworkRequest | null {
  const result = qualityInspectionToResult(inspection);
  if (!result.shouldCreateRework) return null;

  const dto: CreateReworkDto = {
    pieceId: inspection.pieceId,
    reason: inspection.reason ?? 'Retrabalho solicitado pela qualidade',
    origin: 'quality',
    toOperationId: targetOperationId,
    requestedBy: inspection.inspectorId,
    createdAt: inspection.createdAt,
  };

  return createReworkRequest(dto);
}

export function inspectionsByPiece(inspections: QualityInspection[]): Record<string, QualityInspection[]> {
  return inspections.reduce<Record<string, QualityInspection[]>>((groups, inspection) => {
    groups[inspection.pieceId] ??= [];
    groups[inspection.pieceId].push(inspection);
    return groups;
  }, {});
}
