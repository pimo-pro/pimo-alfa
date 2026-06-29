/**
 * Sistema de Base Cabinets: modelos base únicos e padronizados.
 * Regras estruturais (espessura, costa, pés, 32mm) são aplicadas pelo sistema, não no modelo.
 */

export { SYSTEM_THICKNESS_MM, SYSTEM_BACK_MM, DEFAULT_FEET_HEIGHT_MM } from "./constants";
export type { MountType, DoorHingeType, DrawerRunnerType } from "./constants";
export type { BaseCabinetModel, PortaTipoFromModel } from "./types";
export { modelToPortaTipo } from "./types";
export { BASE_CABINET_MODELS } from "./models";

import type { BaseCabinetModel } from "./types";
import { BASE_CABINET_STATIC_MODELS } from "./models";
import { listIndustrialCatalogModelsAsBaseCabinet } from "../industrialDesigner/customIndustrialModel";

export function getBaseCabinetModelsMerged(): BaseCabinetModel[] {
  return [...BASE_CABINET_STATIC_MODELS, ...listIndustrialCatalogModelsAsBaseCabinet()];
}

export function getBaseCabinetById(id: string): BaseCabinetModel | undefined {
  return getBaseCabinetModelsMerged().find((m) => m.id === id);
}

export function getBaseCabinets(): BaseCabinetModel[] {
  return getBaseCabinetModelsMerged().slice();
}
