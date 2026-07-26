/**
 * src/core/kitchen — Industrial Kitchen Library (Fase 15 / PIMO.PRO-V5 Fase 10).
 * Camada documental por cima do Modelo B — não altera industrial/** nem Modelo A.
 */

export { buildKitchenLibrary, KITCHEN_LIBRARY_VERSION } from "./libraryBuilder";
export type { KitchenLibrary } from "./libraryBuilder";

export { buildLibraryReport } from "./libraryReport";
export type { KitchenLibraryReport, KitchenLibraryStatus } from "./libraryReport";

export { buildBaseModules } from "./modules/baseModules";
export { buildTallModules } from "./modules/tallModules";
export { buildUpperModules } from "./modules/upperModules";
export { buildCornerModules } from "./modules/cornerModules";

export { buildFrontModels } from "./fronts/frontModels";
export { buildDoorModels } from "./doors/doorModels";
export { buildRemateModels } from "./remates/remateModels";
export { buildRodapeModels, KITCHEN_RODAPE_HEIGHT_MM } from "./rodape/rodapeModels";
export { buildKitchenIndustrialRules } from "./rules/industrialRules";
export { adaptEuropeanDrawerSample } from "./drawers/europeanDrawerAdapter";
export type { KitchenEuropeanDrawerSample } from "./drawers/europeanDrawerAdapter";

export type {
  KitchenModuleSpec,
  KitchenModuleKind,
  KitchenFrontModel,
  KitchenDoorModel,
  KitchenRemateModel,
  KitchenRodapeModel,
  KitchenIndustrialRules,
} from "./types";
