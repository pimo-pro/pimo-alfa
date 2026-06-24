import type { BoxModule, CutListItemComPreco } from "../../types";
import type { RulesConfig } from "../../rules/rulesConfig";
import { resolveIndustrialPieceRef } from "../../cutlayout/cutLayoutProPieceNaming";
import { resolveAuthoritativeLabelNumber } from "../../qrcode/panelLabelNumber";
import { buildLocalQrPayload } from "../../qrcode/qrcodeService";
import {
  buildEtiquetaCodeV5,
  buildEtiquetaQrPayloadV5,
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
 * QR canónico do UEE — nome industrial completo + número da etiqueta.
 * Ex.: ANTONIO_NOVO_5_CC4_REMATE_L_B_01-6
 */
export function resolveUnifiedEtiquetaQrCode(
  item: EtiquetaPieceLike,
  ctx: EtiquetaQrContext,
  _piecesPerSheet: Map<string, number>,
  index0: number
): string {
  const boxNome = ctx.boxes.find((b) => b.id === item.boxId)?.nome;
  const pieceSeq = resolveAuthoritativeLabelNumber(item) ?? index0 + 1;
  const industrialRef = resolveIndustrialPieceRef(item, boxNome, ctx.projectName);
  return buildEtiquetaQrPayloadV5({ industrialPieceRef: industrialRef, pieceSeq });
}

/**
 * Código legível na faixa inferior — derivado do nome industrial completo + número.
 * Ex.: NP2624619_CAIXA_FORNO_SEP_02-6 (não usa sigla do projecto).
 */
export function resolveEtiquetaDisplayCodeV5(
  item: EtiquetaPieceLike,
  ctx: EtiquetaQrContext,
  _piecesPerSheet: Map<string, number>,
  index0: number
): string {
  const boxNome = ctx.boxes.find((b) => b.id === item.boxId)?.nome;
  const pieceSeq = resolveAuthoritativeLabelNumber(item) ?? index0 + 1;
  const industrialRef = resolveIndustrialPieceRef(item, boxNome, ctx.projectName);
  return buildEtiquetaQrPayloadV5({ industrialPieceRef: industrialRef, pieceSeq });
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

export { buildEtiquetaCodeV5, buildEtiquetaQrPayloadV5, buildPiecesPerSheetMap, labelItemSheetKey, type LabelSheetPlacement };

export {
  generateEtiquetaCode,
  buildLocalQrPayload,
  attachQrCodesToCutlist,
} from "../../qrcode/qrcodeService";
