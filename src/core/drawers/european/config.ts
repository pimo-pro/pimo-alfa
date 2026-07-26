/**
 * european/config.ts — Binding de configuração do Modelo B para UI/factories.
 *
 * Tipos e catálogo (folhas). Aliases `drawerEuropeanConfig` / `drawerEuropeanGenerate`
 * estão em `./index` e em `../drawerFactory` para evitar ciclos de import.
 */

export {
  listEuropeanDrawerModels,
  getEuropeanDrawerModel,
  findHeightProfile,
} from "./catalog";

export type {
  EuropeanDrawerBoxConfig,
  EuropeanDrawerSystemId,
  EuropeanDrawerResult,
  EuropeanDrawerBoxInput,
} from "./types";
