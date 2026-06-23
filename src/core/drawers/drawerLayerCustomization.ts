import type { DrawerLayerItem } from "../../models/BoxLayers";
import type { DrawerPieceTipo } from "../../services/drawerCutlistAdapter";
import { buildDrawerIndustrialLabel } from "./drawerIndustrialLabels";

/** Sanitiza texto para labels industriais / ficheiros (alinhado com drawerIndustrialLabels). */
export function sanitizeDrawerIndustrialName(value: string): string {
  return (
    String(value || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 64) || ""
  );
}

/** Altura do corpo / vão da gaveta (laterais, costa, fundo, frente interna). */
export function resolveDrawerBodyHeightMm(item: DrawerLayerItem): number {
  const body = Number(item.bodyHeight);
  if (Number.isFinite(body) && body > 0) return body;
  return Number(item.height) > 0 ? Number(item.height) : 1;
}

/** Altura da frente interna estrutural (≈ corpo). */
export function resolveDrawerInternalFrontHeightMm(item: DrawerLayerItem): number {
  const fromLayer = Number(item.frontIntHeight ?? item.bodyHeight);
  if (Number.isFinite(fromLayer) && fromLayer > 0) return fromLayer;
  return resolveDrawerBodyHeightMm(item);
}

/**
 * Altura da frente externa decorativa: override UI (frontHeightMm) ou altura do corpo.
 */
export function resolveDrawerExternalFrontHeightMm(item: DrawerLayerItem): number {
  const override = item.metadata?.frontHeightMm;
  if (override != null && Number.isFinite(override) && override > 0) return override;
  return resolveDrawerBodyHeightMm(item);
}

/** @deprecated Usar resolveDrawerExternalFrontHeightMm */
export function resolveDrawerFrontHeightMm(item: DrawerLayerItem): number {
  return resolveDrawerExternalFrontHeightMm(item);
}

/** Prefixo industrial do grupo da gaveta (substitui box.nome quando definido). */
export function resolveDrawerGroupPrefix(item: DrawerLayerItem, boxName: string): string {
  const custom = sanitizeDrawerIndustrialName(item.metadata?.drawerGroupName ?? "");
  if (custom) return custom;
  return boxName;
}

export function resolveDrawerDisplayName(item: DrawerLayerItem, index0Based: number): string {
  const custom = item.metadata?.drawerGroupName?.trim();
  if (custom) return custom;
  return `Gaveta ${index0Based + 1}`;
}

export function resolveDrawerFrontIntPieceLabel(
  item: DrawerLayerItem,
  boxName: string,
  drawerIndex1Based: number
): string {
  const custom = sanitizeDrawerIndustrialName(item.metadata?.frontIntPieceName ?? "");
  if (custom) return custom;
  return buildDrawerIndustrialLabel(
    resolveDrawerGroupPrefix(item, boxName),
    "gaveta_frente_int",
    drawerIndex1Based
  );
}

export function resolveDrawerFrontExtPieceLabel(
  item: DrawerLayerItem,
  boxName: string,
  drawerIndex1Based: number
): string {
  const custom = sanitizeDrawerIndustrialName(
    item.metadata?.frontExtPieceName ?? item.metadata?.frontPieceName ?? ""
  );
  if (custom) return custom;
  return buildDrawerIndustrialLabel(
    resolveDrawerGroupPrefix(item, boxName),
    "gaveta_frente_ext",
    drawerIndex1Based
  );
}

/** @deprecated Usar resolveDrawerFrontExtPieceLabel */
export function resolveDrawerFrontPieceLabel(
  item: DrawerLayerItem,
  boxName: string,
  drawerIndex1Based: number
): string {
  return resolveDrawerFrontExtPieceLabel(item, boxName, drawerIndex1Based);
}

export function resolveDrawerPieceIndustrialLabel(
  item: DrawerLayerItem,
  boxName: string,
  pieceTipo: DrawerPieceTipo,
  drawerIndex1Based: number
): string {
  if (pieceTipo === "gaveta_frente_int") {
    return resolveDrawerFrontIntPieceLabel(item, boxName, drawerIndex1Based);
  }
  if (pieceTipo === "gaveta_frente_ext" || pieceTipo === "gaveta_frente") {
    return resolveDrawerFrontExtPieceLabel(item, boxName, drawerIndex1Based);
  }
  return buildDrawerIndustrialLabel(
    resolveDrawerGroupPrefix(item, boxName),
    pieceTipo,
    drawerIndex1Based
  );
}
