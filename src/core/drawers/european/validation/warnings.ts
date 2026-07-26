/**
 * warnings.ts — Codigos e factories de avisos industriais (Modelo B).
 */

export type EuropeanDrawerValidationWarning = {
  code: string;
  message: string;
  path?: string;
};

export function euWarning(code: string, message: string, path?: string): EuropeanDrawerValidationWarning {
  return { code, message, path };
}

export const EU_WARNING_CODES = {
  HEIGHT_NOT_CATALOG: "HEIGHT_NOT_CATALOG",
  SOFT_PUSH_COMBO: "SOFT_PUSH_COMBO",
  ASM_TOLERANCE: "ASM_TOLERANCE",
  VIEW_CLIPPING: "VIEW_CLIPPING",
  VIEW_HOLE: "VIEW_HOLE",
  STACK_TIGHT: "STACK_TIGHT",
  DEPTH_SNAPPED: "DEPTH_SNAPPED",
} as const;
