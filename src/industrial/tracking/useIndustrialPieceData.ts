/**
 * Boundary PIMO-TRAK — tracking de peça com fontes industriais canónicas.
 *
 * `usePieceData` (`app/industrial/piece/hooks/`) consome `resolvePieceTracking` desde Fase 4.
 * Importar daqui para código em `industrial/**` que precise de tracking sem acoplar à UI.
 *
 * @see docs/guides/industrial-dev-guide.md §3
 * @see docs/architecture/pimo-trak-flow.md
 */
export { buildTrackingSnapshot } from './buildTrackingSnapshot';
export { resolvePieceTracking } from './resolvePieceTracking';
export {
  getWorkOrderTrackingIndustrial,
  getWorkOrderTrackingLegacy,
  getWorkOrderTrackingUnified,
} from './getWorkOrderTrackingUnified';
