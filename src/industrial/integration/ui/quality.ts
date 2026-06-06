import type { CreateQualityInspectionDto, QualityResultDto } from '@/industrial/core/quality/dto';
import { qualityInspectionToResult } from '@/industrial/core/quality/actions';
import type { QualityInspection } from '@/industrial/core/quality/types';
import type { IndustrialUiActionIntent, IndustrialUiCard } from './types';

export function qualityInspectionToUiCard(inspection: QualityInspection): IndustrialUiCard {
  const result: QualityResultDto = qualityInspectionToResult(inspection);
  return {
    id: inspection.id,
    title: `Peça ${inspection.pieceId}`,
    subtitle: inspection.reason ?? inspection.notes,
    status: result.decision,
    meta: {
      shouldBlockPiece: result.shouldBlockPiece,
      points: inspection.points,
    },
  };
}

export function uiToQualityInspectionIntent(
  payload: CreateQualityInspectionDto,
): IndustrialUiActionIntent<CreateQualityInspectionDto> {
  return { type: 'quality:inspect', payload };
}
