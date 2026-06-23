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

/** Altura do corpo / vão da gaveta (laterais, costa, fundo). */
export function resolveDrawerBodyHeightMm(item: DrawerLayerItem): number {
  const body = Number(item.bodyHeight);
  if (Number.isFinite(body) && body > 0) return body;
  return Number(item.height) > 0 ? Number(item.height) : 1;
}

/**
 * Altura efectiva da frente: override UI ou altura do corpo (drawerHeight).
 */
export function resolveDrawerFrontHeightMm(item: DrawerLayerItem): number {
  const override = item.metadata?.frontHeightMm;
  if (override != null && Number.isFinite(override) && override > 0) return override;
  return resolveDrawerBodyHeightMm(item);
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

export function resolveDrawerFrontPieceLabel(
  item: DrawerLayerItem,
  boxName: string,
  drawerIndex1Based: number
): string {
  const custom = sanitizeDrawerIndustrialName(item.metadata?.frontPieceName ?? "");
  if (custom) return custom;
  return buildDrawerIndustrialLabel(
    resolveDrawerGroupPrefix(item, boxName),
    "gaveta_frente",
    drawerIndex1Based
  );
}

export function resolveDrawerPieceIndustrialLabel(
  item: DrawerLayerItem,
  boxName: string,
  pieceTipo: DrawerPieceTipo,
  drawerIndex1Based: number
): string {
  if (pieceTipo === "gaveta_frente") {
    return resolveDrawerFrontPieceLabel(item, boxName, drawerIndex1Based);
  }
  return buildDrawerIndustrialLabel(
    resolveDrawerGroupPrefix(item, boxName),
    pieceTipo,
    drawerIndex1Based
  );
}
