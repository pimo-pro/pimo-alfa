/**
 * Metadados leves dos módulos industriais built-in para listagem no catálogo Móveis.
 * Não gera cutlist/TXML — bootstrap completo só em getIndustrialCatalogModel / add ao projeto.
 */

import type { BaseCabinetModel } from "../baseCabinets/types";
import {
  INDUSTRIAL_BASE_600_MODULE_ID,
  INDUSTRIAL_BASE_600_MODULE_NOME,
} from "./modules/industrialBaseConstants";
import {
  INDUSTRIAL_UPPER_600_MODULE_ID,
  INDUSTRIAL_UPPER_600_MODULE_NOME,
} from "./modules/industrialUpperConstants";
import {
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
} from "./modules/industrialCornerRightConstants";
import {
  INDUSTRIAL_CORNER_LEFT_900_MODULE_ID,
  INDUSTRIAL_CORNER_LEFT_900_MODULE_NOME,
} from "./modules/industrialCornerLeftConstants";
import {
  INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID,
  INDUSTRIAL_DRAWER_SINGLE_600_MODULE_NOME,
} from "./modules/industrialDrawerSingleConstants";

const BUILTIN_INDUSTRIAL_CATALOG_STUBS: BaseCabinetModel[] = [
  {
    id: INDUSTRIAL_BASE_600_MODULE_ID,
    nome: INDUSTRIAL_BASE_600_MODULE_NOME,
    widthMm: 600,
    heightMm: 720,
    depthMm: 500,
    doors: 1,
    shelves: 1,
    drawers: 0,
    categoria: "base",
    tipo: "industrial-designer",
    designWorkspace: false,
    subcategoriaCatalogo: "modulos-industriais",
  },
  {
    id: INDUSTRIAL_UPPER_600_MODULE_ID,
    nome: INDUSTRIAL_UPPER_600_MODULE_NOME,
    widthMm: 600,
    heightMm: 350,
    depthMm: 300,
    doors: 1,
    shelves: 1,
    drawers: 0,
    categoria: "upper",
    tipo: "industrial-designer",
    designWorkspace: false,
    subcategoriaCatalogo: "modulos-industriais",
  },
  {
    id: INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
    nome: INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
    widthMm: 900,
    heightMm: 720,
    depthMm: 600,
    doors: 1,
    shelves: 1,
    drawers: 0,
    categoria: "corner",
    cornerFixedFront: true,
    cornerDefaultSide: "right",
    tipo: "industrial-designer",
    designWorkspace: false,
    subcategoriaCatalogo: "caixas-de-canto",
  },
  {
    id: INDUSTRIAL_CORNER_LEFT_900_MODULE_ID,
    nome: INDUSTRIAL_CORNER_LEFT_900_MODULE_NOME,
    widthMm: 900,
    heightMm: 720,
    depthMm: 600,
    doors: 1,
    shelves: 1,
    drawers: 0,
    categoria: "corner",
    cornerFixedFront: true,
    cornerDefaultSide: "left",
    tipo: "industrial-designer",
    designWorkspace: false,
    subcategoriaCatalogo: "caixas-de-canto",
  },
  {
    id: INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID,
    nome: INDUSTRIAL_DRAWER_SINGLE_600_MODULE_NOME,
    widthMm: 600,
    heightMm: 720,
    depthMm: 500,
    doors: 0,
    shelves: 0,
    drawers: 1,
    categoria: "gavetas",
    tipo: "industrial-designer",
    designWorkspace: false,
    subcategoriaCatalogo: "gavetas-industriais",
  },
];

export function listBuiltinIndustrialCatalogStubs(): BaseCabinetModel[] {
  return BUILTIN_INDUSTRIAL_CATALOG_STUBS;
}
