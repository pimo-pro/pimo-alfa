/**
 * Ponto de entrada documentado para geração industrial fora do main thread.
 *
 * Fluxo recomendado (projeto único ou multi):
 * 1. `buildCutlistItemsForIndustrialExport` — uma vez por projeto (cache partilhada no mesmo realm JS / Worker).
 * 2. `buildCncFromCutlistItemsInWorker` — por grupo de material (nesting + TCN).
 * 3. `runCutLayoutInWorker` — quando só é necessário o layout de chapas.
 */
export {
  buildCncFromCutlistItemsInWorker,
  runCutLayoutInWorker,
  terminateIndustrialWorker,
  abortIndustrialWorkerJob,
} from "./industrialWorkerRunner";
export {
  buildCutlistItemsForIndustrialExport,
  type IndustrialExportProjectSnapshot,
} from "./buildCutlistItemsForIndustrialExport";
export { buildIndustrialDataForProject } from "./industrialPipeline";
