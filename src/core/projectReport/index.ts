export type {
  ProjectReport,
  ReportStyle,
  ReportOperador,
  ReportCaixa,
  ReportPeca,
  ReportMaterialLinha,
  ReportFinanceiroLinha,
  ReportFinanceiroDetalhe,
  ProjectReportGerais,
  ProjectReportMetricas,
  ProjectReportDesign,
  ProjectReportProducao,
  ProjectReportMontagem,
  ProjectReportFinanceiro,
  ReportHistoryEntry,
  ReportNota,
  ProjectReportQualidade,
} from "./types";

export {
  PROJECT_REPORT_STORAGE_KEY,
  PROJECT_REPORT_IVA_DEFAULT,
  FINANCEIRO_REPORT_LABELS,
  HISTORY_MAX_ENTRIES,
  makeReportId,
  emptyGerais,
  emptyMetricas,
  emptyDesign,
  emptyProducao,
  emptyMontagem,
  emptyFinanceiro,
  emptyQualidade,
} from "./types";

export {
  loadProjectReport,
  saveProjectReport,
  markManualPath,
  isManualPath,
  setReportStyle,
  ensureReportExtras,
} from "./projectReportStore";

export {
  recalcFinanceiro,
  recalcLinha,
  updateFinanceiroLinha,
  ensureFinanceiroShape,
  lineTotalFromQtyPrice,
} from "./financeReportCalc";

export { seedOrMergeProjectReport } from "./seedProjectReport";
export { buildChartMetrics } from "./chartMetrics";
export type { ChartMetricItem } from "./chartMetrics";

export {
  appendHistoryEntry,
  withHistoryForPath,
  createHistoryEntry,
  sortHistoryChronological,
  serializeHistoryValue,
  getValueAtPath,
  resolveHistoryUser,
} from "./history";

export { exportProjectReportPdf } from "./exportPdf";

export {
  importTrakSnapshot,
  applyTrakToReportParts,
} from "./trakImport";
export type { TrakImportSnapshot } from "./trakImport";
