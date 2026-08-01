/**
 * Audit log do Relatorio Final - isolado; nao toca industrial.
 */

import { getCurrentProjectUser } from "../projects/currentUser";
import {
  HISTORY_MAX_ENTRIES,
  makeReportId,
  type ProjectReport,
  type ReportHistoryEntry,
} from "./types";

export function serializeHistoryValue(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getValueAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function resolveHistoryUser(): string {
  try {
    const u = getCurrentProjectUser();
    return (u.ownerName || u.ownerId || "utilizador").trim() || "utilizador";
  } catch {
    return "utilizador";
  }
}

export function createHistoryEntry(
  path: string,
  oldValue: unknown,
  newValue: unknown,
  user?: string
): ReportHistoryEntry {
  return {
    id: makeReportId("hist"),
    timestamp: new Date().toISOString(),
    path,
    oldValue: serializeHistoryValue(oldValue),
    newValue: serializeHistoryValue(newValue),
    user: (user ?? resolveHistoryUser()).trim() || "utilizador",
  };
}

/** Acrescenta entrada se old !== new; mantem limite HISTORY_MAX_ENTRIES. */
export function appendHistoryEntry(
  report: ProjectReport,
  path: string,
  oldValue: unknown,
  newValue: unknown,
  user?: string
): ProjectReport {
  const oldS = serializeHistoryValue(oldValue);
  const newS = serializeHistoryValue(newValue);
  if (oldS === newS) return report;
  const entry = createHistoryEntry(path, oldValue, newValue, user);
  const history = [entry, ...(report.history ?? [])].slice(0, HISTORY_MAX_ENTRIES);
  return { ...report, history };
}

/**
 * Regista alteracao num path apos updater.
 * Compara valor no path entre prev e next.
 */
export function withHistoryForPath(
  prev: ProjectReport,
  next: ProjectReport,
  path: string,
  user?: string
): ProjectReport {
  const oldValue = getValueAtPath(prev, path);
  const newValue = getValueAtPath(next, path);
  return appendHistoryEntry(next, path, oldValue, newValue, user);
}

export function sortHistoryChronological(
  history: ReportHistoryEntry[],
  newestFirst = true
): ReportHistoryEntry[] {
  const copy = [...(history ?? [])];
  copy.sort((a, b) => {
    const ta = Date.parse(a.timestamp) || 0;
    const tb = Date.parse(b.timestamp) || 0;
    return newestFirst ? tb - ta : ta - tb;
  });
  return copy;
}
