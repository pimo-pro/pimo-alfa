/**
 * Tabelas da camada de persistência UI (Fase 2).
 * Mantidas fora de industrial/infra para não acoplar o core.
 */
export const PIECE_PERSISTENCE_TABLES = {
  transforms: 'industrial_piece_transforms',
  edges: 'industrial_piece_edges',
  operations: 'industrial_piece_operations',
  quality: 'industrial_piece_quality',
  timeEntries: 'industrial_piece_time_entries',
  remates: 'industrial_piece_remates',
  systemEvents: 'system_events',
} as const;
