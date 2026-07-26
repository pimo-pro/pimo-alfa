/**
 * european/binding.ts — Pontos de binding UI ? Modelo B (DXF / CNC / overlay / config).
 * Camada de aliases apenas — não altera pipelines industriais.
 *
 * generateEuropeanDrawer / defaultEuropeanDrawerConfig: reexportados em index.ts
 * como drawerEuropeanGenerate / drawerEuropeanConfig (definidos no próprio index).
 */

export {
  prepareEuropeanDXFFiles,
  buildEuropeanDXFFileContents,
  buildDxfFileReport,
  type DxfExportReport,
} from "./dxf";
export {
  prepareEuropeanCNCFiles,
  buildEuropeanCNCFileContents,
  buildCncFileReport,
  type CncExportReport,
} from "./cnc";
export {
  buildEuropeanOverlay,
  type EuropeanOverlay,
} from "./overlay";

/** Aliases de produto pedidos pelo binding UI. */
export { prepareEuropeanDXFFiles as drawerEuropeanDXF } from "./dxf";
export { prepareEuropeanCNCFiles as drawerEuropeanCNC } from "./cnc";
export { buildEuropeanOverlay as drawerEuropeanOverlay } from "./overlay";
