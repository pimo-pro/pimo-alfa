import type { ViewerMaterialQuality } from "../../../context/projectTypes";
import type { MaterialMode } from "./types";

/** Mapeia qualidade visual do viewer para modo do MaterialEngine. */
export function resolveMaterialModeForQuality(quality: ViewerMaterialQuality): MaterialMode {
  if (quality === "premium") return "showcase";
  return "realistic";
}

/** Normaliza qualidade do viewer para valores suportados. */
export function normalizeViewerMaterialQuality(
  quality: ViewerMaterialQuality
): ViewerMaterialQuality {
  return quality === "premium" || quality === "lacquered" ? quality : "standard";
}
