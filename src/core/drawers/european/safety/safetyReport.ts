/**
 * safetyReport.ts — Relatório agregado dos Industrial Safety Gates (Modelo B).
 */

export type EuropeanSafetyGateId =
  | "config"
  | "measures"
  | "geometry"
  | "drilling"
  | "cutlist"
  | "pdf"
  | "viewer";

export type EuropeanSafetySeverity = "error" | "warning";

export type EuropeanSafetyIssue = {
  gate: EuropeanSafetyGateId;
  severity: EuropeanSafetySeverity;
  code: string;
  message: string;
  piece?: string;
};

export type EuropeanSafetyGateResult = {
  gate: EuropeanSafetyGateId;
  ok: boolean;
  errors: EuropeanSafetyIssue[];
  warnings: EuropeanSafetyIssue[];
  piecesAffected: string[];
  durationMs: number;
};

export type EuropeanSafetyReport = {
  gates: EuropeanSafetyGateResult[];
  errors: EuropeanSafetyIssue[];
  warnings: EuropeanSafetyIssue[];
  piecesAffected: string[];
  status: "VALID" | "INVALID";
  totalDurationMs: number;
};

export function emptyGateResult(
  gate: EuropeanSafetyGateId,
  durationMs = 0
): EuropeanSafetyGateResult {
  return { gate, ok: true, errors: [], warnings: [], piecesAffected: [], durationMs };
}

export function issue(
  gate: EuropeanSafetyGateId,
  severity: EuropeanSafetySeverity,
  code: string,
  message: string,
  piece?: string
): EuropeanSafetyIssue {
  return piece ? { gate, severity, code, message, piece } : { gate, severity, code, message };
}

export function finalizeGate(
  gate: EuropeanSafetyGateId,
  startedAt: number,
  errors: EuropeanSafetyIssue[],
  warnings: EuropeanSafetyIssue[] = []
): EuropeanSafetyGateResult {
  const piecesAffected = [
    ...new Set(
      [...errors, ...warnings]
        .map((i) => i.piece)
        .filter((p): p is string => Boolean(p))
    ),
  ];
  return {
    gate,
    ok: errors.length === 0,
    errors,
    warnings,
    piecesAffected,
    durationMs: Math.max(0, performance.now() - startedAt),
  };
}

export function buildSafetyReport(gates: EuropeanSafetyGateResult[]): EuropeanSafetyReport {
  const errors = gates.flatMap((g) => g.errors);
  const warnings = gates.flatMap((g) => g.warnings);
  const piecesAffected = [...new Set(gates.flatMap((g) => g.piecesAffected))];
  const totalDurationMs = gates.reduce((acc, g) => acc + g.durationMs, 0);
  return {
    gates,
    errors,
    warnings,
    piecesAffected,
    status: errors.length === 0 ? "VALID" : "INVALID",
    totalDurationMs,
  };
}

export function formatSafetyReportText(report: EuropeanSafetyReport): string {
  const lines = [
    `European Safety Gates — ${report.status}`,
    `tempo: ${report.totalDurationMs.toFixed(2)} ms`,
    `gates: ${report.gates.map((g) => `${g.gate}:${g.ok ? "OK" : "FAIL"}`).join(", ")}`,
  ];
  if (report.errors.length) {
    lines.push("erros:");
    for (const e of report.errors) {
      lines.push(`  [${e.gate}/${e.code}] ${e.message}${e.piece ? ` (${e.piece})` : ""}`);
    }
  }
  if (report.warnings.length) {
    lines.push("avisos:");
    for (const w of report.warnings) {
      lines.push(`  [${w.gate}/${w.code}] ${w.message}${w.piece ? ` (${w.piece})` : ""}`);
    }
  }
  if (report.piecesAffected.length) {
    lines.push(`pecas: ${report.piecesAffected.join(", ")}`);
  }
  return lines.join("\n");
}
