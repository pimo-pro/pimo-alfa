/**
 * Ponte unificada: erros/avisos industriais → Notificações, painel export, console e release notes (runtime).
 */

import type { InvariantPhase } from "../../core/invariants/types";
import { invariantNotificationStore } from "../../stores/invariantNotificationStore";
import {
  industrialExportPanelStore,
  type IndustrialExportPanelSeverity,
} from "../../stores/industrialExportPanelStore";
import {
  formatIndustrialThicknessIssue,
  type IndustrialThicknessAdjustment,
} from "../../core/cnc/industrialThicknessResolution";
import { InvariantViolationError } from "../../core/invariants/errors/InvariantViolationError";
import {
  IndustrialError,
  isIndustrialError,
  type IndustrialErrorKind,
} from "../../core/industrial/IndustrialError";
import { devLogger } from "../../utils/devLogger";

export type IndustrialNotificationSource =
  | "export"
  | "nesting"
  | "cnc"
  | "chapa"
  | "espessura"
  | "material"
  | "cutlist"
  | "trak"
  | "pdf"
  | "module";

export type IndustrialNotificationPayload = {
  source: IndustrialNotificationSource;
  severity: IndustrialExportPanelSeverity;
  step: string;
  message: string;
  hints?: string[];
  phase?: InvariantPhase;
  boxId?: string;
  pieceId?: string;
  kind?: IndustrialErrorKind | "export_cancelled" | "nesting_failed" | "cnc_warning";
};

const RELEASE_NOTES_BUFFER_KEY = "pimo_industrial_runtime_release_notes_v1";
const MAX_RELEASE_NOTES_BUFFER = 50;

type RuntimeReleaseNote = {
  at: string;
  step: string;
  severity: IndustrialExportPanelSeverity;
  message: string;
};

function severityToInvariant(severity: IndustrialExportPanelSeverity): "info" | "warning" | "error" {
  return severity;
}

function ruleNameForSource(source: IndustrialNotificationSource): string {
  switch (source) {
    case "nesting":
      return "Nesting por espessura";
    case "cnc":
      return "Exportação CNC";
    case "chapa":
      return "Chapa / matéria-prima";
    case "espessura":
      return "Espessura industrial";
    case "material":
      return "Material industrial";
    case "cutlist":
      return "Cutlist industrial";
    case "trak":
      return "PIMO-TRAK";
    case "pdf":
      return "PDF industrial / Layout PRO";
    case "module":
      return "Módulo dinâmico (assets)";
    default:
      return "Exportação industrial";
  }
}

function ruleIdForPayload(payload: IndustrialNotificationPayload): string {
  if (payload.kind) return `industrial-${payload.kind}`;
  return `industrial-${payload.source}`;
}

function appendRuntimeReleaseNote(payload: IndustrialNotificationPayload): void {
  if (payload.severity === "info") return;
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(RELEASE_NOTES_BUFFER_KEY);
    const parsed = raw ? (JSON.parse(raw) as RuntimeReleaseNote[]) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const entry: RuntimeReleaseNote = {
      at: new Date().toISOString(),
      step: payload.step,
      severity: payload.severity,
      message: payload.message,
    };
    sessionStorage.setItem(
      RELEASE_NOTES_BUFFER_KEY,
      JSON.stringify([entry, ...list].slice(0, MAX_RELEASE_NOTES_BUFFER))
    );
  } catch {
    /* quota */
  }
}

/** Fan-out central — nenhum erro industrial deve ficar só no console ou só no painel export. */
export function dispatchIndustrialNotification(payload: IndustrialNotificationPayload): void {
  const hints = payload.hints ?? [];
  const fullMessage =
    hints.length > 0 ? `${payload.message}\n\nSugestões:\n${hints.map((h) => `• ${h}`).join("\n")}` : payload.message;

  devLogger.warn("[industrial-notification]", {
    source: payload.source,
    severity: payload.severity,
    step: payload.step,
    message: payload.message,
    hints,
  });

  invariantNotificationStore.getState().addIssue({
    ruleId: ruleIdForPayload(payload),
    ruleName: ruleNameForSource(payload.source),
    severity: severityToInvariant(payload.severity),
    message: fullMessage,
    phase: payload.phase ?? "export",
    context: {
      boxId: payload.boxId,
      pieceId: payload.pieceId,
      operation: payload.source,
      phase: payload.phase ?? "export",
    },
  });

  industrialExportPanelStore.getState().addMessage({
    severity: payload.severity,
    step: payload.step,
    message: payload.message,
    hints,
  });

  appendRuntimeReleaseNote(payload);
}

export type NotifyUserOptions = {
  showToast?: (text: string, type?: "error" | "warning" | "info" | "success", duration?: number) => void;
  duration?: number;
};

/** Notifica o utilizador (toast) e regista em Notificações + painel export. */
export function notifyUser(
  payload: IndustrialNotificationPayload,
  options?: NotifyUserOptions
): void {
  dispatchIndustrialNotification(payload);
  const toast = options?.showToast;
  if (!toast) return;
  const hints = payload.hints ?? [];
  const toastText =
    hints.length > 0
      ? `${payload.message}\n\nSugestões:\n${hints.map((h) => `• ${h}`).join("\n")}`
      : payload.message;
  const type = payload.severity === "error" ? "error" : payload.severity === "warning" ? "warning" : "info";
  toast(toastText, type, options.duration ?? (type === "error" ? 12000 : 8000));
}

export function notifyExportPanel(payload: IndustrialNotificationPayload): void {
  dispatchIndustrialNotification(payload);
}

export function notifyCncWarnings(
  warnings: string[] | IndustrialThicknessAdjustment[],
  options?: NotifyUserOptions & { cancelled?: boolean }
): void {
  const lines =
    warnings.length === 0
      ? []
      : typeof warnings[0] === "string"
        ? (warnings as string[])
        : (warnings as IndustrialThicknessAdjustment[]).map(formatIndustrialThicknessIssue);

  for (const line of lines) {
    notifyUser(
      {
        source: "cnc",
        severity: options?.cancelled ? "warning" : "warning",
        step: options?.cancelled ? "Exportação CNC cancelada" : "Aviso CNC",
        message: options?.cancelled ? `Exportação CNC cancelada: ${line}` : line,
        phase: "export",
        kind: "cnc_warning",
      },
      options
    );
  }
}

export function notifyNestingWarnings(
  messages: string[],
  options?: NotifyUserOptions & { severity?: IndustrialExportPanelSeverity }
): void {
  const severity = options?.severity ?? "error";
  for (const message of messages) {
    notifyUser(
      {
        source: "nesting",
        severity,
        step: "Nesting por espessura",
        message,
        phase: "cutlayout",
        kind: "nesting_failed",
      },
      options
    );
  }
}

export function payloadFromIndustrialError(
  err: IndustrialError,
  ctx?: Partial<IndustrialNotificationPayload>
): IndustrialNotificationPayload {
  const source: IndustrialNotificationSource =
    err.kind === "no_sheet_available"
      ? "chapa"
      : err.kind === "invalid_thickness"
        ? "espessura"
        : err.kind === "material_not_found"
          ? "material"
          : "export";

  return {
    source,
    severity: "error",
    step: err.getTitle(),
    message: err.message,
    hints: [...err.hints],
    boxId: err.boxId,
    pieceId: err.pieceId,
    phase: "export",
    kind: err.kind,
    ...ctx,
  };
}

export function payloadFromUnknownError(
  err: unknown,
  ctx: { step: string; source?: IndustrialNotificationSource; severity?: IndustrialExportPanelSeverity }
): IndustrialNotificationPayload {
  if (isIndustrialError(err)) {
    return payloadFromIndustrialError(err, {
      step: ctx.step,
      source: ctx.source,
      severity: ctx.severity,
    });
  }
  if (err instanceof InvariantViolationError) {
    return {
      source: ctx.source ?? "export",
      severity: ctx.severity ?? "error",
      step: ctx.step,
      message: err.formatForToast(),
      phase: "export",
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  let source: IndustrialNotificationSource = ctx.source ?? "export";
  let hints: string[] | undefined;
  if (
    lower.includes("dynamically imported module") ||
    lower.includes("failed to fetch dynamically") ||
    (lower.includes("mime type") && lower.includes("module")) ||
    lower.includes("text/html")
  ) {
    source = "module";
    hints = [
      "Hard refresh (Ctrl+F5) — o browser pode ter um chunk antigo em cache após deploy.",
      "Confirme que /assets/cutLayoutPdf-*.js existe em produção (não deve devolver HTML).",
      "Se o ficheiro faltar, o .htaccess SPA estava a devolver index.html com MIME text/html.",
    ];
  } else if (
    lower.includes("cutlayout") ||
    lower.includes("layout pro") ||
    lower.includes("etiquetas") ||
    lower.includes("pdf")
  ) {
    source = ctx.source === "export" || !ctx.source ? "pdf" : source;
  } else if (lower.includes("chapa") || lower.includes("matéria-prima") || lower.includes("materia-prima")) {
    source = "chapa";
  } else if (lower.includes("espessura")) {
    source = "espessura";
  } else if (lower.includes("nesting")) {
    source = "nesting";
  } else if (lower.includes("cnc")) {
    source = "cnc";
  }
  return {
    source,
    severity: ctx.severity ?? "error",
    step: ctx.step,
    message,
    hints,
    phase: source === "nesting" ? "cutlayout" : "export",
  };
}

export function reportIndustrialError(
  err: unknown,
  ctx: { step: string; source?: IndustrialNotificationSource; severity?: IndustrialExportPanelSeverity },
  options?: NotifyUserOptions
): void {
  notifyUser(payloadFromUnknownError(err, ctx), options);
}

export function throwIndustrialError(err: IndustrialError): never {
  dispatchIndustrialNotification(payloadFromIndustrialError(err));
  throw err;
}

export function reportExportStepErrors(
  errors: Array<{ step: string; message?: string; error?: string }>,
  options?: NotifyUserOptions & {
    projectName?: string;
    boxId?: string;
    pieceId?: string;
  }
): void {
  for (const entry of errors) {
    const message = entry.message ?? entry.error ?? "Erro desconhecido";
    const lower = `${entry.step} ${message}`.toLowerCase();
    let source: IndustrialNotificationSource = "export";
    if (
      lower.includes("dynamically imported") ||
      lower.includes("mime type") ||
      lower.includes("cutlayoutpdf")
    ) {
      source = "module";
    } else if (
      lower.includes("pdf") ||
      lower.includes("etiqueta") ||
      lower.includes("layout") ||
      lower.includes("cutlayout")
    ) {
      source = "pdf";
    } else if (lower.includes("nesting")) {
      source = "nesting";
    } else if (lower.includes("cnc") || lower.includes("tcn")) {
      source = "cnc";
    }
    notifyUser(
      {
        source,
        severity: "error",
        step: entry.step,
        message:
          options?.projectName && !message.includes(options.projectName)
            ? `[${options.projectName}] ${message}`
            : message,
        phase: source === "nesting" ? "cutlayout" : "export",
        boxId: options?.boxId,
        pieceId: options?.pieceId,
        hints:
          source === "module"
            ? [
                "Hard refresh (Ctrl+F5) após deploy.",
                "Verificar se /assets/cutLayoutPdf-*.js devolve JS (não HTML).",
              ]
            : undefined,
      },
      options
    );
  }
}

/** Validação de espessura/chapa — uso no fluxo de exportação (sem alterar core CNC). */
export function validateMaterialThicknessIssue(
  issue: IndustrialThicknessAdjustment,
  options?: NotifyUserOptions
): void {
  const message = formatIndustrialThicknessIssue(issue);
  const severity: IndustrialExportPanelSeverity =
    issue.suggestedThicknessMm > 0 ? "warning" : "error";
  notifyUser(
    {
      source: issue.suggestedThicknessMm > 0 ? "espessura" : "chapa",
      severity,
      step: issue.suggestedThicknessMm > 0 ? "Espessura ajustável" : "Chapa indisponível",
      message,
      hints:
        issue.suggestedThicknessMm > 0 && issue.suggestedMaterialLabel
          ? [`Usar ${issue.suggestedMaterialLabel} (${issue.suggestedThicknessMm} mm)`]
          : ["Abrir catálogo de materiais", "Alterar espessura para valor com chapa configurada"],
      phase: "export",
      kind: issue.suggestedThicknessMm > 0 ? "invalid_thickness" : "no_sheet_available",
    },
    options
  );
}

export function validateCncExportCancelled(
  detail: string,
  options?: NotifyUserOptions
): void {
  notifyCncWarnings([detail], { ...options, cancelled: true });
}

export function validateCncExportFailure(err: unknown, options?: NotifyUserOptions): void {
  reportIndustrialError(err, { step: "Exportação CNC", source: "cnc" }, options);
}

export function buildCompleteExportFailure(err: unknown, step: string, options?: NotifyUserOptions): void {
  reportIndustrialError(err, { step, source: "export" }, options);
}

function formatAutoThicknessCorrectionMessage(adjustment: IndustrialThicknessAdjustment): string {
  const material = adjustment.suggestedMaterialLabel?.trim() || adjustment.materialKey;
  return `Espessura corrigida automaticamente: ${adjustment.requestedThicknessMm} mm → ${adjustment.suggestedThicknessMm} mm (${material}).`;
}

/** Aviso após auto-correção aplicada (Notificações + painel export + toast opcional). */
export function notifyAutoThicknessCorrection(
  adjustment: IndustrialThicknessAdjustment,
  options?: NotifyUserOptions
): void {
  notifyUser(
    {
      source: "espessura",
      severity: "info",
      step: "Auto-correção de espessura",
      message: formatAutoThicknessCorrectionMessage(adjustment),
      phase: "export",
      kind: "invalid_thickness",
    },
    options
  );
}

export function notifyAutoThicknessCorrections(
  adjustments: IndustrialThicknessAdjustment[],
  options?: NotifyUserOptions
): void {
  for (const adjustment of adjustments) {
    notifyAutoThicknessCorrection(adjustment, options);
  }
}
