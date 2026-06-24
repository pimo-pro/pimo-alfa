/**
 * Erro industrial unificado — sempre inclui módulo, peça e sugestões acionáveis.
 */

export type IndustrialErrorKind =
  | "material_not_found"
  | "invalid_thickness"
  | "invalid_measure"
  | "out_of_volume"
  | "drilling_failed"
  | "no_sheet_available";

export type IndustrialErrorPayload = {
  boxId: string;
  pieceId: string;
  message: string;
  hints: string[];
  kind?: IndustrialErrorKind;
  cause?: unknown;
};

export class IndustrialError extends Error {
  readonly boxId: string;
  readonly pieceId: string;
  readonly hints: readonly string[];
  readonly kind: IndustrialErrorKind;

  constructor(payload: IndustrialErrorPayload) {
    super(payload.message);
    this.name = "IndustrialError";
    this.boxId = payload.boxId;
    this.pieceId = payload.pieceId;
    this.hints = Object.freeze([...payload.hints]);
    this.kind = payload.kind ?? "invalid_measure";
    if (payload.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = payload.cause;
    }
  }

  /** Título user-facing: "Erro na peça C1_COSTA do módulo C1" */
  getTitle(): string {
    return `Erro na peça ${this.pieceId} do módulo ${this.boxId}`;
  }

  /** Texto completo para toast (título + mensagem + hints). */
  formatForToast(): string {
    const hintsBlock =
      this.hints.length > 0
        ? `\n\nSugestões:\n${this.hints.map((h) => `• ${h}`).join("\n")}`
        : "";
    return `${this.getTitle()}\n\n${this.message}${hintsBlock}`;
  }

  static materialNotFound(params: {
    boxId: string;
    pieceId: string;
    materialKey: string;
    costaApplicable?: boolean;
  }): IndustrialError {
    const hints = [
      "Substituir por MDF Branco 19mm",
      "Substituir por HDF CRU 19mm",
      "Alterar espessura para 19 mm",
      "Abrir catálogo de materiais",
    ];
    if (params.costaApplicable) {
      hints.push("Ativar Sem Costa (se aplicável)");
    }
    return new IndustrialError({
      kind: "material_not_found",
      boxId: params.boxId,
      pieceId: params.pieceId,
      message: `Material inexistente ou não reconhecido: "${params.materialKey}".`,
      hints,
    });
  }

  static invalidThickness(params: {
    boxId: string;
    pieceId: string;
    thicknessMm: number;
    materialKey?: string;
  }): IndustrialError {
    return new IndustrialError({
      kind: "invalid_thickness",
      boxId: params.boxId,
      pieceId: params.pieceId,
      message: `Espessura inválida (${params.thicknessMm} mm)${params.materialKey ? ` para "${params.materialKey}"` : ""}.`,
      hints: [
        "Alterar espessura para 19 mm",
        "Substituir por MDF Branco 19mm",
        "Abrir catálogo de materiais",
        "Reduzir espessura do corpo da caixa",
      ],
    });
  }

  static invalidMeasure(params: {
    boxId: string;
    pieceId: string;
    detail: string;
    costaApplicable?: boolean;
  }): IndustrialError {
    const hints = [
      "Aumentar profundidade do módulo",
      "Reduzir espessura",
      "Corrigir medidas internas",
    ];
    if (params.costaApplicable) {
      hints.unshift("Ativar Sem Costa");
    }
    return new IndustrialError({
      kind: "invalid_measure",
      boxId: params.boxId,
      pieceId: params.pieceId,
      message: params.detail,
      hints,
    });
  }

  static outOfVolume(params: {
    boxId: string;
    pieceId: string;
    detail?: string;
  }): IndustrialError {
    return new IndustrialError({
      kind: "out_of_volume",
      boxId: params.boxId,
      pieceId: params.pieceId,
      message: params.detail ?? "Peça fora do volume útil do módulo.",
      hints: [
        "Recentrar peça",
        "Corrigir posição X/Y/Z",
        "Recalcular offsets",
        "Aumentar profundidade do módulo",
      ],
    });
  }

  static drillingFailed(params: {
    boxId: string;
    pieceId: string;
    detail: string;
  }): IndustrialError {
    return new IndustrialError({
      kind: "drilling_failed",
      boxId: params.boxId,
      pieceId: params.pieceId,
      message: params.detail,
      hints: [
        "Verificar dimensões da peça",
        "Corrigir medidas internas",
        "Recalcular furos após alterar material",
      ],
    });
  }

  static noSheetAvailable(params: {
    boxId: string;
    pieceId: string;
    materialKey: string;
    thicknessMm: number;
    suggestedLabel?: string;
    suggestedThicknessMm?: number;
  }): IndustrialError {
    const hints = [
      "Substituir por MDF Branco 19mm",
      "Alterar espessura para 19 mm",
      "Abrir catálogo de materiais",
    ];
    if (params.suggestedLabel && params.suggestedThicknessMm) {
      hints.unshift(`Usar ${params.suggestedLabel} (${params.suggestedThicknessMm} mm)`);
    }
    return new IndustrialError({
      kind: "no_sheet_available",
      boxId: params.boxId,
      pieceId: params.pieceId,
      message: `Sem chapa disponível para "${params.materialKey}" a ${params.thicknessMm} mm.`,
      hints,
    });
  }
}

export function isIndustrialError(err: unknown): err is IndustrialError {
  return err instanceof IndustrialError;
}

/** ID de peça no formato C1_COSTA (boxId + tipo em maiúsculas). */
export function buildIndustrialPieceId(boxId: string, pieceKey: string): string {
  const safeBox = String(boxId ?? "BOX").trim() || "BOX";
  const safePiece = String(pieceKey ?? "PECA")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return `${safeBox}_${safePiece}`;
}

export function buildIndustrialPieceIdFromPanel(boxId: string, panelId: string, tipo?: string): string {
  const key = tipo?.trim() || panelId.trim() || "PECA";
  return buildIndustrialPieceId(boxId, key);
}
