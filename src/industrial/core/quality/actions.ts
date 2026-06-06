// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { CreateQualityInspectionDto, QualityResultDto } from './dto';
import type { QualityInspection } from './types';

export function createQualityInspection(input: CreateQualityInspectionDto): QualityInspection {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? `${input.pieceId}:quality:${createdAt}`,
    pieceId: input.pieceId,
    decision: input.decision,
    points: input.points ?? [],
    inspectorId: input.inspectorId,
    reason: input.reason,
    notes: input.notes,
    createdAt,
  };
}

export function isQualityBlocking(inspection: QualityInspection): boolean {
  return inspection.decision === 'rework' || inspection.decision === 'rejected';
}

export function qualityInspectionToResult(inspection: QualityInspection): QualityResultDto {
  return {
    pieceId: inspection.pieceId,
    decision: inspection.decision,
    shouldBlockPiece: isQualityBlocking(inspection),
    shouldCreateRework: inspection.decision === 'rework',
    reason: inspection.reason,
  };
}
