/**
 * Overrides UI por gaveta → DrawerParametrics (FASE 6).
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import type {
  DrawerMetalBoxType,
  DrawerSlideType,
} from "../settings/settingsSchema";
import type { DrawerParametricOverrides } from "./DrawerParametrics";

export function drawerParametricOverridesFromLayerItem(
  item?: DrawerLayerItem | null
): DrawerParametricOverrides | undefined {
  if (!item) return undefined;

  const meta = item.metadata;
  const overrides: DrawerParametricOverrides = {};

  const nominalDepth = meta?.nominalDepth;
  if (nominalDepth != null && Number.isFinite(nominalDepth) && nominalDepth > 0) {
    overrides.nominalDepthMm = nominalDepth;
  }

  const slideType = (item.slideType ?? meta?.slideType) as DrawerSlideType | undefined;
  if (slideType) overrides.slideType = slideType;

  const metalBoxType = (item.metalBoxType ?? meta?.metalBoxType) as DrawerMetalBoxType | undefined;
  if (metalBoxType) overrides.metalBoxType = metalBoxType;

  if (typeof item.softClose === "boolean") {
    overrides.softClose = item.softClose;
  } else if (typeof meta?.softClose === "boolean") {
    overrides.softClose = meta.softClose;
  }

  const drawerType = item.type ?? item.drawerType ?? meta?.drawerType;
  if (drawerType === "normal" || drawerType === "pro") {
    overrides.drawerType = drawerType;
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

export function buildDrawerParametricOverridesList(
  existing: DrawerLayerItem[] | undefined,
  drawerCount: number
): Array<DrawerParametricOverrides | undefined> {
  return Array.from({ length: drawerCount }, (_, index) =>
    drawerParametricOverridesFromLayerItem(existing?.[index])
  );
}
