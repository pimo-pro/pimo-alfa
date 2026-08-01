/**
 * Persistencia isolada do Relatorio Final (localStorage).
 * Nao escreve em ProjectState, work-orders nem overrides industriais.
 */

import {
  emptyQualidade,
  PROJECT_REPORT_STORAGE_KEY,
  type ProjectReport,
  type ReportStyle,
} from "./types";
import { recalcFinanceiro } from "./financeReportCalc";

type ReportMap = Record<string, ProjectReport>;

function readMap(): ReportMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROJECT_REPORT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ReportMap;
  } catch {
    return {};
  }
}

function writeMap(map: ReportMap): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROJECT_REPORT_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("[pimo] Falha ao guardar project reports:", err);
  }
}

function normalizeReport(raw: ProjectReport): ProjectReport {
  const ratingRaw = Number(raw.qualidade?.rating);
  const rating =
    ratingRaw >= 1 && ratingRaw <= 5 ? (Math.round(ratingRaw) as 1 | 2 | 3 | 4 | 5) : 3;

  return {
    ...raw,
    version: 1,
    reportStyle: raw.reportStyle === "cards" ? "cards" : "classic",
    manualPaths: Array.isArray(raw.manualPaths) ? raw.manualPaths : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    notas: Array.isArray(raw.notas) ? raw.notas : [],
    qualidade: {
      rating,
      observacoes: Array.isArray(raw.qualidade?.observacoes)
        ? raw.qualidade.observacoes.map(String)
        : [],
    },
    financeiro: recalcFinanceiro(
      raw.financeiro ?? { ivaPct: 23, linhas: [], subtotal: 0, ivaValor: 0, totalProjeto: 0 }
    ),
  };
}

export function loadProjectReport(projectId: string): ProjectReport | null {
  const id = projectId.trim();
  if (!id) return null;
  const map = readMap();
  const found = map[id];
  return found ? normalizeReport(found) : null;
}

export function saveProjectReport(report: ProjectReport): ProjectReport {
  const id = report.projectId.trim();
  if (!id) throw new Error("projectId em falta no relatorio.");
  const next: ProjectReport = normalizeReport({
    ...report,
    projectId: id,
    updatedAt: new Date().toISOString(),
  });
  const map = readMap();
  map[id] = next;
  writeMap(map);
  return next;
}

export function markManualPath(report: ProjectReport, path: string): ProjectReport {
  if (report.manualPaths.includes(path)) return report;
  return { ...report, manualPaths: [...report.manualPaths, path] };
}

export function isManualPath(report: ProjectReport, path: string): boolean {
  return (
    report.manualPaths.includes(path) ||
    report.manualPaths.some((p) => path.startsWith(`${p}.`))
  );
}

export function setReportStyle(report: ProjectReport, style: ReportStyle): ProjectReport {
  return markManualPath({ ...report, reportStyle: style }, "reportStyle");
}

export function ensureReportExtras(report: ProjectReport): ProjectReport {
  return {
    ...report,
    history: report.history ?? [],
    notas: report.notas ?? [],
    qualidade: report.qualidade ?? emptyQualidade(),
  };
}
