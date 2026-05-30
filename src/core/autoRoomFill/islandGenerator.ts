import type { ProjectRoomConfig } from "../../3d/viewer-engine/room/roomEngineTypes";
import { getBaseCabinetById } from "../baseCabinets";
import {
  MIN_ISLAND_CENTER_D_MM,
  MIN_ISLAND_CENTER_W_MM,
  MIN_ISLAND_WALL_CLEARANCE_MM,
} from "./layoutDetection";
import type {
  AutoFillFinishSpec,
  AutoFillIslandConfig,
  AutoFillPlacedModule,
} from "./autoRoomFillTypes";
import { ISLAND_LAYOUT_WALL_ID } from "./autoRoomFillTypes";
import { SPECIAL_CATALOG } from "./moduleCatalog";

const LOWER_Y_MM = 100 + 720 / 2;
const MIN_MODULE_GAP_MM = 1100;

export function computeIslandConfig(room: ProjectRoomConfig): AutoFillIslandConfig | null {
  const freeW = room.widthMm - 2 * MIN_ISLAND_WALL_CLEARANCE_MM;
  const freeD = room.depthMm - 2 * MIN_ISLAND_WALL_CLEARANCE_MM;
  if (freeW < MIN_ISLAND_CENTER_W_MM || freeD < MIN_ISLAND_CENTER_D_MM) return null;

  const useWide = freeW >= 2400;
  const widthMm = useWide ? 1200 : 900;
  const depthMm = 600;
  const moduleCatalogIds = useWide
    ? ["base-600-2portas-2prateleiras", "base-600-3gavetas"]
    : ["base-600-2portas-2prateleiras", "base-300-porta-2prateleiras"];

  let centerX = room.widthMm / 2;
  let centerZ = room.depthMm / 2;
  const halfW = widthMm / 2;
  const halfD = depthMm / 2;
  centerX = Math.max(MIN_ISLAND_WALL_CLEARANCE_MM + halfW, Math.min(room.widthMm - MIN_ISLAND_WALL_CLEARANCE_MM - halfW, centerX));
  centerZ = Math.max(MIN_ISLAND_WALL_CLEARANCE_MM + halfD, Math.min(room.depthMm - MIN_ISLAND_WALL_CLEARANCE_MM - halfD, centerZ));

  return {
    widthMm,
    depthMm,
    centerX_mm: centerX,
    centerZ_mm: centerZ,
    moduleCatalogIds,
    hasSink: useWide,
    hasCooktop: !useWide,
  };
}

export function generateIslandModules(
  config: AutoFillIslandConfig
): { modules: AutoFillPlacedModule[]; finishes: AutoFillFinishSpec[] } {
  const modules: AutoFillPlacedModule[] = [];
  const finishes: AutoFillFinishSpec[] = [];
  const ids = [...config.moduleCatalogIds];

  if (config.hasSink) {
    ids[ids.length - 1] = SPECIAL_CATALOG.sink.lowerId;
  } else if (config.hasCooktop) {
    ids[0] = SPECIAL_CATALOG.cooktop.lowerId;
  }

  let cursorX =
    config.centerX_mm -
    ids.reduce((sum, id) => sum + (getBaseCabinetById(id)?.widthMm ?? 600), 0) / 2;

  for (let i = 0; i < ids.length; i++) {
    const catalogId = ids[i];
    const model = getBaseCabinetById(catalogId);
    const w = model?.widthMm ?? 600;
    const isSpecial =
      catalogId === SPECIAL_CATALOG.sink.lowerId || catalogId === SPECIAL_CATALOG.cooktop.lowerId;

    modules.push({
      catalogId,
      role: isSpecial ? "special" : "lower",
      specialKind: catalogId === SPECIAL_CATALOG.sink.lowerId ? "sink" : catalogId === SPECIAL_CATALOG.cooktop.lowerId ? "cooktop" : undefined,
      wallId: ISLAND_LAYOUT_WALL_ID,
      wallLabel: "ilha",
      posicaoX_mm: cursorX + w / 2,
      posicaoY_mm: LOWER_Y_MM,
      posicaoZ_mm: config.centerZ_mm,
      rotacaoY_rad: 0,
    });

    const idx = modules.length - 1;
    finishes.push({
      boxIndex: idx,
      wallId: ISLAND_LAYOUT_WALL_ID,
      remateDir: i === ids.length - 1,
      remateEsq: i === 0,
      hematiDir: true,
      hematiEsq: true,
      rodapeSimple: true,
    });

    cursorX += w + (i < ids.length - 1 ? Math.min(80, MIN_MODULE_GAP_MM - w) : 0);
  }

  return { modules, finishes };
}
