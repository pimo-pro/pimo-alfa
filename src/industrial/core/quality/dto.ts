// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { QualityDecision, QualityInspectionPoint } from './types';

export interface CreateQualityInspectionDto {
  id?: string;
  pieceId: string;
  decision: QualityDecision;
  points?: QualityInspectionPoint[];
  inspectorId?: string;
  reason?: string;
  notes?: string;
  createdAt?: string;
}

export interface QualityResultDto {
  pieceId: string;
  decision: QualityDecision;
  shouldBlockPiece: boolean;
  shouldCreateRework: boolean;
  reason?: string;
}
