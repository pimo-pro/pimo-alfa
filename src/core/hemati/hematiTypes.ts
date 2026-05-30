import type { FinishDimensions, FinishTransform } from "../kitchenFinish/finishTypes";

export type HematiKind = "DIR" | "ESQ" | "CIMA" | "BAIXO" | "L" | "U" | "FULL";

export type ProjectHemati = {
  id: string;
  parentBoxId: string;
  kind: HematiKind;
  materialId: string;
  thicknessMm: number;
  dimensions: FinishDimensions;
  name: string;
  transform?: FinishTransform;
  placementFree?: boolean;
  parentGroupId?: string;
  partIndex?: 1 | 2 | 3;
  parentWallId?: string;
  visible?: boolean;
  autoLengthMm?: number;
};

export type CreateHematiInput = {
  kind: HematiKind;
  materialId?: string;
  parentBoxId?: string;
  parentWallId?: string;
  thicknessMm?: number;
  /** Altura custom para CIMA (mm). */
  cimaHeightMm?: number;
};

export type UpdateHematiInput = Partial<
  Pick<
    ProjectHemati,
    | "materialId"
    | "thicknessMm"
    | "dimensions"
    | "transform"
    | "placementFree"
    | "parentBoxId"
    | "visible"
    | "parentWallId"
  >
>;

export function hematiKindLabel(kind: HematiKind, partIndex?: number): string {
  if (kind === "L" || kind === "U") return `Hemati ${kind}${partIndex ?? ""}`;
  if (kind === "FULL") return "Hemati Full Wall";
  return `Hemati ${kind}`;
}
