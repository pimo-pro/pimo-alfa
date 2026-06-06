import type { CreateReworkDto, UpdateReworkDto } from '@/industrial/core/rework/dto';
import { reworkToPayload } from '@/industrial/core/rework/mappers';
import type { ReworkRequest } from '@/industrial/core/rework/types';
import type { IndustrialUiActionIntent, IndustrialUiCard } from './types';

export function reworkRequestToUiCard(rework: ReworkRequest): IndustrialUiCard {
  const payload = reworkToPayload(rework);
  return {
    id: rework.id,
    title: `Retrabalho: ${rework.pieceId}`,
    subtitle: rework.reason,
    status: rework.status,
    meta: { ...payload },
  };
}

export function uiToCreateReworkIntent(payload: CreateReworkDto): IndustrialUiActionIntent<CreateReworkDto> {
  return { type: 'rework:create', payload };
}

export function uiToUpdateReworkIntent(payload: UpdateReworkDto): IndustrialUiActionIntent<UpdateReworkDto> {
  return { type: 'rework:update', payload };
}
