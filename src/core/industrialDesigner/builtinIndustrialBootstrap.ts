/**
 * Registo lazy dos módulos industriais built-in (evita dependência circular).
 */

import { INDUSTRIAL_BASE_600_MODULE_ID } from "./modules/industrialBaseConstants";
import { INDUSTRIAL_UPPER_600_MODULE_ID } from "./modules/industrialUpperConstants";
import { INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID } from "./modules/industrialCornerRightConstants";
import { INDUSTRIAL_CORNER_LEFT_900_MODULE_ID } from "./modules/industrialCornerLeftConstants";
import { INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID } from "./modules/industrialDrawerSingleConstants";
import { registerIndustrialBase600x720x500Module } from "./modules/industrialBase600x720x500v1";
import { registerIndustrialUpper600x350x300Module } from "./modules/industrialUpper600x350x300v1";
import { registerIndustrialCornerRight900x720x600Module } from "./modules/industrialCornerRight900x720x600v1";
import { registerIndustrialCornerLeft900x720x600Module } from "./modules/industrialCornerLeft900x720x600v1";
import { registerIndustrialDrawerSingle600x720x500Module } from "./modules/industrialDrawerSingle600x720x500v1";
import { getBuiltinIndustrialModel } from "./staticIndustrialRegistry";

let bootstrapped = false;

export function ensureBuiltinIndustrialModelsRegistered(): void {
  if (bootstrapped) return;
  if (!getBuiltinIndustrialModel(INDUSTRIAL_BASE_600_MODULE_ID)) {
    registerIndustrialBase600x720x500Module();
  }
  if (!getBuiltinIndustrialModel(INDUSTRIAL_UPPER_600_MODULE_ID)) {
    registerIndustrialUpper600x350x300Module();
  }
  if (!getBuiltinIndustrialModel(INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID)) {
    registerIndustrialCornerRight900x720x600Module();
  }
  if (!getBuiltinIndustrialModel(INDUSTRIAL_CORNER_LEFT_900_MODULE_ID)) {
    registerIndustrialCornerLeft900x720x600Module();
  }
  if (!getBuiltinIndustrialModel(INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID)) {
    registerIndustrialDrawerSingle600x720x500Module();
  }
  bootstrapped = true;
}

export function __resetBuiltinIndustrialBootstrapForTests(): void {
  bootstrapped = false;
}
