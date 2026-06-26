/**
 * Sistema unificado de observações — export público.
 * Não misturar com `notes` do Pimo-Trak (qualidade/workflow).
 */

export type {
  CutListItemWithObs,
  IndustrialPieceCategory,
  IndustrialPieceEntry,
  ObservacoesCollectionContext,
  PieceObservacoesStore,
} from "./observacoesTypes";

export {
  MAX_LABEL_OBSERVATIONS_V5,
  MAX_OBSERVATION_TEXT_LENGTH,
  collectObservationsForItem,
  enumerateIndustrialPiecesForBox,
  formatObservacoesForPdf,
  getBoxObservacoes,
  getPieceObservacoes,
  hasObservacoes,
  mergePieceObservacoesStores,
  migrateLegacyMetadataObservations,
  migrateProjectPieceObservacoes,
  normalizeObservationText,
  normalizeObservacoesList,
  observationsToV5Slots,
  panelIdFromCutListItem,
  resolveObservacoesForCutListItem,
  resolveObservacoesForPiece,
  sanitizeObservationText,
  type LabelObservationItemLike,
} from "./ObservacoesService";
