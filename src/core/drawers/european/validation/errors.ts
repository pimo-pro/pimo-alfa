/**
 * errors.ts — Codigos e factories de erros industriais (Modelo B).
 */

export type EuropeanDrawerValidationError = {
  code: string;
  message: string;
  path?: string;
  severity: "error";
};

export function euError(code: string, message: string, path?: string): EuropeanDrawerValidationError {
  return { code, message, path, severity: "error" };
}

export const EU_ERROR_CODES = {
  BOX_NEGATIVE: "BOX_NEGATIVE",
  BOX_HEIGHT: "BOX_HEIGHT",
  BOX_DEPTH: "BOX_DEPTH",
  BOX_WIDTH: "BOX_WIDTH",
  BOX_PARALLEL: "BOX_PARALLEL",
  DIM_INTERNAL_WIDTH: "DIM_INTERNAL_WIDTH",
  DIM_USEFUL_HEIGHT: "DIM_USEFUL_HEIGHT",
  DIM_BOTTOM: "DIM_BOTTOM",
  DIM_FRONT_SETBACK: "DIM_FRONT_SETBACK",
  DIM_SIDE_CLEARANCE: "DIM_SIDE_CLEARANCE",
  HOLE_BOUNDS: "HOLE_BOUNDS",
  HOLE_DEPTH: "HOLE_DEPTH",
  HOLE_THICKNESS: "HOLE_THICKNESS",
  HOLE_PITCH32: "HOLE_PITCH32",
  HOLE_SETBACK: "HOLE_SETBACK",
  HOLE_BOTTOM_GAP: "HOLE_BOTTOM_GAP",
  ASM_ORDER: "ASM_ORDER",
  ASM_OVERLAP: "ASM_OVERLAP",
  ASM_ALIGN: "ASM_ALIGN",
  CUT_DIM: "CUT_DIM",
  CUT_MATERIAL: "CUT_MATERIAL",
  CUT_QTY: "CUT_QTY",
  CUT_METAL: "CUT_METAL",
  CUT_WOOD: "CUT_WOOD",
  PDF_NULL: "PDF_NULL",
  PDF_DIM: "PDF_DIM",
  PDF_HOLE: "PDF_HOLE",
  PDF_NOTES: "PDF_NOTES",
  VIEW_BOUNDS: "VIEW_BOUNDS",
  VIEW_HOLE: "VIEW_HOLE",
  VIEW_COHERENCE: "VIEW_COHERENCE",
  VIEW_CLIPPING: "VIEW_CLIPPING",
} as const;
