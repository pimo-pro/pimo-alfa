/**
 * european/cnc — CNC Post-Processor / Industrial Mapping (Modelo B, Fase 17).
 * API segura para browser (sem Node FS).
 * Para escrita física: importar `exportEuropeanCNCFiles` de `./cncFileWriter`.
 */

export {
  buildCncFileName,
  resolveCncPieceKeyFromCodigo,
  CNC_FILE_BASE_NAMES,
  INDUSTRIAL_CODE_TO_CNC_PIECE_KEY,
  CNC_FORMAT_EXTENSIONS,
  DEFAULT_CNC_EXPORT_DIR,
} from "./cncFileNaming";
export type { EuropeanCncPieceKey, EuropeanCncFormat } from "./cncFileNaming";

export {
  mapEuropeanResultToCncPieces,
  mapDxfLayerToCncGroup,
  mapHolePieceRefToCodigo,
  mapDxfEntitiesToCutOps,
  mapHolesToDrillOps,
  mapPieceBoxToCutOps,
} from "./cncMapping";
export type {
  CncCutOperation,
  CncDrillOperation,
  CncPocketOperation,
  CncPieceMeta,
  CncIndustrialGroup,
  MappedCncPiece,
} from "./cncMapping";

export {
  buildEuropeanCncPrograms,
  prepareEuropeanCNCFiles,
  buildEuropeanCNCFileContents,
  buildCncExportReportFromPrepared,
} from "./cncBuilder";
export type { CncPieceProgram, CncExportOptions, CncPreparedFile } from "./cncBuilder";

export { serializeCncProgram, utf8ByteLength } from "./cncFormats";

export { buildCncFileReport, formatCncReportText } from "./cncReport";
export type {
  CncExportReport,
  CncExportedFileInfo,
  CncExportStatus,
} from "./cncReport";
