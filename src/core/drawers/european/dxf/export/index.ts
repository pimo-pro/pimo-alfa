/**
 * european/dxf/export — API segura para browser (sem Node FS).
 * Para escrita física: importar `exportEuropeanDXFFiles` de `./dxfFileWriter`.
 */

export {
  buildDxfFileName,
  resolvePieceKeyFromCodigo,
  DXF_FILE_NAMES,
  INDUSTRIAL_CODE_TO_PIECE_KEY,
  DEFAULT_DXF_EXPORT_DIR,
} from "./dxfFileNaming";
export type { EuropeanDxfPieceKey } from "./dxfFileNaming";

export { serializeEntitiesToDxf, utf8ByteLength } from "./dxfAscii";

export {
  buildEuropeanDXFFileContents,
  prepareEuropeanDXFFiles,
} from "./dxfFileContents";
export type { DxfExportOptions, DxfExportPieceSelection } from "./dxfFileContents";

export { buildDxfFileReport } from "./dxfFileReport";
export type {
  DxfExportReport,
  DxfExportedFileInfo,
  DxfFileExportStatus,
} from "./dxfFileReport";
