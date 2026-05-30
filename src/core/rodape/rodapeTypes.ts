import type { FinishDimensions, FinishTransform } from "../kitchenFinish/finishTypes";

export type RodapeKind = "SIMPLE" | "L" | "U" | "FULL";

export type ProjectRodape = {
  id: string;
  parentBoxId: string;
  kind: RodapeKind;
  materialId: string;
  thicknessMm: number;
  heightMm: number;
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

export type CreateRodapeInput = {
  kind: RodapeKind;
  materialId?: string;
  parentBoxId?: string;
  parentWallId?: string;
  heightMm?: number;
  thicknessMm?: number;
};

export type UpdateRodapeInput = Partial<
  Pick<
    ProjectRodape,
    | "materialId"
    | "thicknessMm"
    | "heightMm"
    | "dimensions"
    | "transform"
    | "placementFree"
    | "parentBoxId"
    | "visible"
    | "parentWallId"
  >
>;

export function rodapeKindLabel(kind: RodapeKind, partIndex?: number): string {
  if (kind === "L" || kind === "U") return `Roda pé ${kind}${partIndex ?? ""}`;
  if (kind === "FULL") return "Roda pé Full Wall";
  return "Roda pé";
}
