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
  /** Nome editável pelo utilizador; substitui o rótulo industrial na UI e cutlist. */
  nomePersonalizado?: string;
  transform?: FinishTransform;
  placementFree?: boolean;
  parentGroupId?: string;
  partIndex?: 1 | 2 | 3;
  parentWallId?: string;
  visible?: boolean;
  autoLengthMm?: number;
  /** true = apenas na criação; sync usa transform guardado. */
  isInitialPlacement?: boolean;
  /** false = veio fixo no nesting; true = permite rodar mesmo com material de madeira. */
  allowPieceRotation?: boolean;
  /** true = manter veio da madeira (proibir rotação no nesting). Auto em material de madeira. */
  lockWoodGrain?: boolean;
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
    | "nomePersonalizado"
    | "allowPieceRotation"
    | "lockWoodGrain"
    | "isInitialPlacement"
  >
>;

export function rodapeKindLabel(kind: RodapeKind, partIndex?: number): string {
  if (kind === "L" || kind === "U") return `Roda pé ${kind}${partIndex ?? ""}`;
  if (kind === "FULL") return "Roda pé Full Wall";
  return "Roda pé";
}
