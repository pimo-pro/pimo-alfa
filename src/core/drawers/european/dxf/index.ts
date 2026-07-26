/**
 * european/dxf — DXF Export + Technical Drawing Mode (Modelo B, Fase 12).
 * Camada somente-leitura — não altera geometry/furos/viewer.
 */

export { buildDxfLayerTable, EUROPEAN_DXF_LAYERS, EUROPEAN_DXF_LAYER_DEFS } from "./dxfLayers";
export type { EuropeanDxfLayerName, EuropeanDxfLayerDef } from "./dxfLayers";

export { buildDxfGeometryContours } from "./dxfGeometry";
export type { DxfPieceContour } from "./dxfGeometry";

export { buildDxfDrillingEntities } from "./dxfDrilling";

export { buildEuropeanDxfDocument } from "./dxfBuilder";
export type { EuropeanDxfDocument } from "./dxfBuilder";

export { buildEuropeanDXF } from "./dxfExport";
export type { EuropeanDXFExport } from "./dxfExport";

export { buildTechnicalDrawingMode } from "./technicalDrawingMode";
export type { EuropeanTechnicalDrawingMode } from "./technicalDrawingMode";

export {
  buildFrontView,
  buildSideView,
  buildTopView,
  buildExplodedView,
} from "./technicalViews";
export type { EuropeanTechnicalView, EuropeanTechnicalViewId } from "./technicalViews";

export { buildDxfReport, formatDxfReportText } from "./dxfReport";
export type { EuropeanDxfReport, EuropeanDxfStatus } from "./dxfReport";

export type { DxfEntity, DxfLineEntity, DxfCircleEntity, DxfTextEntity } from "./dxfTypes";

export {
  buildEuropeanDXFFileContents,
  prepareEuropeanDXFFiles,
  serializeEntitiesToDxf,
  buildDxfFileName,
  resolvePieceKeyFromCodigo,
  DXF_FILE_NAMES,
  DEFAULT_DXF_EXPORT_DIR,
  buildDxfFileReport,
  type DxfExportOptions,
  type DxfExportReport,
  type DxfExportedFileInfo,
  type DxfFileExportStatus,
  type EuropeanDxfPieceKey,
} from "./export";
