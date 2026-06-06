// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { ReworkOrigin, ReworkStatus } from './types';

export interface CreateReworkDto {
  id?: string;
  pieceId: string;
  reason: string;
  origin: ReworkOrigin;
  fromOperationId?: string;
  toOperationId?: string;
  requestedBy?: string;
  operatorId?: string;
  createdAt?: string;
}

export interface UpdateReworkDto {
  status?: ReworkStatus;
  toOperationId?: string;
  operatorId?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ReworkPayloadDto {
  id: string;
  pieceId: string;
  reason: string;
  origin: ReworkOrigin;
  status: ReworkStatus;
  route: {
    fromOperationId?: string;
    toOperationId?: string;
  };
}
