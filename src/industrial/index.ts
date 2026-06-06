/**
 * PIMO-TRAK — pacote industrial.
 * Exporta os blocos migrados da Fase 3B sem acoplar ao restante da app.
 */
export * from './core/events';
export * from './core/analytics';
export * from './core/auth';
export * from './core/barcode';
export * from './core/dashboard';
export * from './core/metrics';
export * from './core/notifications';
export * from './core/piece-operations';
export * from './core/pieces';
export * from './core/quality';
export * from './core/rework';
export * from './core/rules';
export * from './core/time-tracking';
export * from './core/tracking';
export * from './core/users';
export * from './core/work-orders';
export * from './core/workflow-engine';
export * from './infra/db';
export * from './infra/supabase';
export * from './integration/cutlist';
export * from './integration/types';
