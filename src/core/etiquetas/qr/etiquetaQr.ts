import type { BoxModule, CutListItemComPreco } from "../../types";
import type { RulesConfig } from "../../rules/rulesConfig";
import { resolveAuthoritativeLabelNumber } from "../../qrcode/panelLabelNumber";
import { buildLocalQrPayload } from "../../qrcode/qrcodeService";
import {
  buildEtiquetaCodeV5,
  buildPiecesPerSheetMap,
  labelItemSheetKey,
  type LabelSheetPlacement,
} from "./etiquetaCodeV5";

export type EtiquetaPieceLike = CutListItemComPreco & {
  boxId?: string;
  nome?: string;
  shortCode?: string;
};

export type EtiquetaQrContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

/**
 * QR canónico do UEE (formato v5).
 */
export function resolveUnifiedEtiquetaQrCode(
  item: EtiquetaPieceLike,
  ctx: EtiquetaQrContext,
  piecesPerSheet: Map<string, number>,
  index0: number
): string {
  const key = labelItemSheetKey(item.boxId, item.nome);
  const totalPiecesInSheet = piecesPerSheet.get(key) ?? 0;
  const pieceSeq = resolveAuthoritativeLabelNumber(item) ?? index0 + 1;
  const effectiveProjectName = String(ctx.projectName ?? "PROJETO");
  return buildEtiquetaCodeV5({
    projectName: effectiveProjectName,
    pieceSeq,
    totalPiecesInSheet,
  });
}

/**
 * Compatibilidade S1 — short code para cutlist, técnico, drill (inalterado).
 */
export function resolveLegacyShortQrCode(
  item: EtiquetaPieceLike,
  ctx: EtiquetaQrContext
): string {
  const authoritative = resolveAuthoritativeLabelNumber(item);
  if (authoritative != null) {
    return buildLocalQrPayload(item, ctx, authoritative);
  }
  const rawSc = String(item.shortCode ?? "").trim();
  if (rawSc && rawSc !== "ERR") return rawSc;
  return buildLocalQrPayload(item, ctx, 1);
}

export { buildEtiquetaCodeV5, buildPiecesPerSheetMap, labelItemSheetKey, type LabelSheetPlacement };

export {
  generateEtiquetaCode,
  buildLocalQrPayload,
  attachQrCodesToCutlist,
} from "../../qrcode/qrcodeService";
