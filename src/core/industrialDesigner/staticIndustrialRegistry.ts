/**
 * Registo de módulos industriais built-in (catálogo fixo, sem localStorage).
 */

import type { BaseCabinetModel } from "../baseCabinets/types";
import type { CustomIndustrialModelRecord } from "./industrialCatalogTypes";
import {
  INDUSTRIAL_BASE_600_MODULE_ID,
} from "./modules/industrialBaseConstants";
import { INDUSTRIAL_UPPER_600_MODULE_ID } from "./modules/industrialUpperConstants";
import { INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID } from "./modules/industrialCornerRightConstants";
import { INDUSTRIAL_CORNER_LEFT_900_MODULE_ID } from "./modules/industrialCornerLeftConstants";
import { INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID } from "./modules/industrialDrawerSingleConstants";

export { INDUSTRIAL_BASE_600_MODULE_ID } from "./modules/industrialBaseConstants";
export { INDUSTRIAL_UPPER_600_MODULE_ID } from "./modules/industrialUpperConstants";
export { INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID } from "./modules/industrialCornerRightConstants";
export { INDUSTRIAL_CORNER_LEFT_900_MODULE_ID } from "./modules/industrialCornerLeftConstants";
export { INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID } from "./modules/industrialDrawerSingleConstants";

export const BUILTIN_INDUSTRIAL_MODEL_IDS = new Set<string>([
  INDUSTRIAL_BASE_600_MODULE_ID,
  INDUSTRIAL_UPPER_600_MODULE_ID,
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
  INDUSTRIAL_CORNER_LEFT_900_MODULE_ID,
  INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID,
]);

const builtinRegistry = new Map<string, CustomIndustrialModelRecord>();

export function isBuiltinIndustrialModelId(id: string | null | undefined): boolean {
  return typeof id === "string" && BUILTIN_INDUSTRIAL_MODEL_IDS.has(id);
}

export function isIndustrialCatalogModelId(id: string | null | undefined): boolean {
  if (typeof id !== "string") return false;
  if (isBuiltinIndustrialModelId(id)) return true;
  return id.startsWith("custom-model-");
}

export function registerBuiltinIndustrialModel(record: CustomIndustrialModelRecord): void {
  builtinRegistry.set(record.id, record);
}

export function listBuiltinIndustrialModels(): CustomIndustrialModelRecord[] {
  return [...builtinRegistry.values()];
}

export function getBuiltinIndustrialModel(id: string): CustomIndustrialModelRecord | undefined {
  return builtinRegistry.get(id);
}

export function builtinIndustrialModelToBaseCabinet(record: CustomIndustrialModelRecord): BaseCabinetModel {
  const shelves = record.designBox.panels.filter((p) => p.tipo === "prateleira").length;
  const doors = record.designBox.panels.filter((p) => p.tipo === "frente").length;
  const categoria = record.metadata.categoriaCatalogo ?? "base";
  const isCorner = categoria === "corner";
  const isDrawer = categoria === "gavetas";
  return {
    id: record.id,
    nome: record.nome,
    widthMm: record.widthMm,
    heightMm: record.heightMm,
    depthMm: record.depthMm,
    doors,
    shelves,
    drawers: isDrawer ? (record.metadata.drawerCount ?? 1) : 0,
    categoria,
    cornerFixedFront: isCorner,
    cornerDefaultSide: record.metadata.cornerSide ?? "right",
    tipo: "industrial-designer",
    designWorkspace: record.designWorkspace,
    subcategoriaCatalogo: isCorner
      ? "caixas-de-canto"
      : isDrawer
        ? "gavetas-industriais"
        : record.designWorkspace
          ? "modelos-industriais-personalizados"
          : "modulos-industriais",
  };
}

export function listBuiltinIndustrialModelsAsBaseCabinet(): BaseCabinetModel[] {
  return listBuiltinIndustrialModels().map(builtinIndustrialModelToBaseCabinet);
}

export function __resetBuiltinIndustrialModelsForTests(): void {
  builtinRegistry.clear();
}
