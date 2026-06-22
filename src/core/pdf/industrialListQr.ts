import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import {
  buildPiecesPerSheetMap,
  resolveUnifiedEtiquetaQrCode,
  type EtiquetaQrContext,
} from "../etiquetas/qr/etiquetaQr";

export type IndustrialListQrContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

/** N.º QR unificado — mesmo código v5 das etiquetas industriais. */
export function resolveIndustrialListNqr(
  item: CutListItemComPreco,
  ctx: IndustrialListQrContext,
  piecesPerSheet: Map<string, number>,
  index0: number
): string {
  const qrCtx: EtiquetaQrContext = {
    projectName: ctx.projectName,
    boxes: ctx.boxes,
    rules: ctx.rules,
  };
  return resolveUnifiedEtiquetaQrCode(item, qrCtx, piecesPerSheet, index0);
}

export function buildIndustrialListPiecesPerSheet(
  items: CutListItemComPreco[]
): Map<string, number> {
  return buildPiecesPerSheetMap(items);
}
