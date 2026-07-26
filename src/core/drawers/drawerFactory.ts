/**
 * drawerFactory.ts — Binding de geração de gavetas para UI / providers.
 *
 * Por omissão (Modelo A off) usa `generateEuropeanDrawer` (Modelo B).
 * O pipeline Modelo A (`generateDrawerGroup`) permanece no código e só —
 * usado quando `isDrawerModeloAActive()` — true (via boxLayersService).
 *
 * NÃO altera geometria/furos/cutlist — apenas o ponto de entrada do factory.
 */

import { isDrawerModeloAActive } from "./drawerSystemFlags";
import {
  generateEuropeanDrawer,
  defaultEuropeanDrawerConfig,
  drawerEuropeanConfig,
  drawerEuropeanDXF,
  drawerEuropeanCNC,
  drawerEuropeanOverlay,
  drawerEuropeanGenerate,
} from "./european";

export type DrawerFactoryMode = "european" | "legacy";

/** Modo activo do factory conforme flag de produto. */
export function resolveDrawerFactoryMode(): DrawerFactoryMode {
  return isDrawerModeloAActive() ? "legacy" : "european";
}

/**
 * Registo explícito do gerador activo.
 * Equivalente a `drawerFactory.use(generateEuropeanDrawer)` quando Modelo B está activo.
 */
export const drawerFactory = {
  mode: resolveDrawerFactoryMode,
  /** Gerador europeu (Modelo B) — binding de produto. */
  use: generateEuropeanDrawer,
  generateEuropeanDrawer,
  drawerEuropeanGenerate,
  drawerEuropeanConfig,
  drawerEuropeanDXF,
  drawerEuropeanCNC,
  drawerEuropeanOverlay,
  defaultConfig: defaultEuropeanDrawerConfig,
};

export {
  generateEuropeanDrawer,
  defaultEuropeanDrawerConfig,
  drawerEuropeanConfig,
  drawerEuropeanDXF,
  drawerEuropeanCNC,
  drawerEuropeanOverlay,
  drawerEuropeanGenerate,
};

export default drawerFactory;
