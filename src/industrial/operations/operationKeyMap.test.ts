import { describe, expect, it } from 'vitest';

import {
  mapPieceOperationToStationOperation,
  mapStationOperationToPieceOperation,
  PIECE_OPERATION_TO_STATION,
  STATION_TO_PIECE_OPERATION,
  operationSyncConfig,
} from './operationKeyMap';

describe('operationKeyMap', () => {
  it('mapeia cnc → nesting na estação WO', () => {
    expect(PIECE_OPERATION_TO_STATION.cnc).toBe('nesting');
    expect(mapPieceOperationToStationOperation('cnc')).toBe('nesting');
  });

  it('warehouse não tem operação de peça', () => {
    expect(mapStationOperationToPieceOperation('warehouse')).toBeNull();
    expect(STATION_TO_PIECE_OPERATION.warehouse).toBeUndefined();
  });

  it('nesting mapeia para nesting por defeito (mapNestingToCncOnSync false)', () => {
    expect(operationSyncConfig.mapNestingToCncOnSync).toBe(false);
    expect(mapStationOperationToPieceOperation('nesting')).toBe('nesting');
  });

  it('mapeia estações operacionais para tipos de peça', () => {
    expect(mapStationOperationToPieceOperation('drill')).toBe('drill');
    expect(mapStationOperationToPieceOperation('orlar')).toBe('orlar');
    expect(mapStationOperationToPieceOperation('montagem')).toBe('montagem');
    expect(mapStationOperationToPieceOperation('embalagem')).toBe('embalagem');
  });

  it('rejeita operação desconhecida', () => {
    expect(mapStationOperationToPieceOperation('inventado')).toBeNull();
  });

  it('mapPieceOperationToStationOperation cobre todas as chaves cutlist', () => {
    const keys = ['cnc', 'drill', 'orlar', 'montagem', 'embalagem'] as const;
    for (const key of keys) {
      expect(mapPieceOperationToStationOperation(key)).toBeTruthy();
    }
  });
});
