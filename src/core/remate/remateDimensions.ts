import type { WorkspaceBox } from "../types";
import type { CreateRemateInput, RemateDimensions } from "./remateTypes";

export type RemateBoxMeta = Pick<
  WorkspaceBox,
  "cabinetType" | "feetEnabled" | "feetHeight" | "pe_cm"
>;

/** Margens do envelope de remate em relação ao bounding box estrutural do módulo (mm). */
export type RemateEnvelopeMm = {
  aboveMm: number;
  belowMm: number;
  frontMm: number;
  backMm: number;
};

const MARGIN_ABOVE_MM = 20;
const MARGIN_FRONT_MM = 20;
const MARGIN_BACK_MAX_MM = 70;
const DEPTH_EXTRA_PER_SIDE_MM = 20;
const LOWER_BELOW_MAX_MM = 200;

export function isUpperCabinet(box: RemateBoxMeta): boolean {
  return box.cabinetType === "upper";
}

export function getFeetHeightMm(box: RemateBoxMeta): number {
  if (box.feetEnabled === false) return 0;
  const raw = box.feetHeight ?? (box.pe_cm ?? 10) * 10;
  return Math.min(LOWER_BELOW_MAX_MM, Math.max(0, raw));
}

/** Envelope visual do remate à volta do caixote (superior vs inferior). */
export function getRemateEnvelopeMm(box: RemateBoxMeta): RemateEnvelopeMm {
  const upper = isUpperCabinet(box);
  return {
    aboveMm: MARGIN_ABOVE_MM,
    belowMm: upper ? MARGIN_ABOVE_MM : Math.min(LOWER_BELOW_MAX_MM, Math.max(MARGIN_ABOVE_MM, getFeetHeightMm(box))),
    frontMm: MARGIN_FRONT_MM,
    backMm: MARGIN_BACK_MAX_MM,
  };
}

export function depthMmFromModule(profundidadeMm: number): number {
  return Math.max(1, profundidadeMm + DEPTH_EXTRA_PER_SIDE_MM * 2);
}

export function computeRemateDimensionsFromBox(
  box: WorkspaceBox,
  input: CreateRemateInput,
  thicknessMm: number
): RemateDimensions {
  const largura = Math.max(1, box.dimensoes?.largura ?? 1);
  const altura = Math.max(1, box.dimensoes?.altura ?? 1);
  const profundidade = Math.max(1, box.dimensoes?.profundidade ?? 1);
  const env = getRemateEnvelopeMm(box);
  const spanHeight = altura + env.aboveMm + env.belowMm;
  const spanDepth = depthMmFromModule(profundidade);
  const avistaDepth = Math.min(100, spanDepth);

  if (input.position === "rodape" || input.type === "rodape") {
    return {
      widthMm: largura,
      heightMm: 150,
      depthMm: thicknessMm,
    };
  }

  if (input.type === "L") {
    const legDepth = avistaDepth;
    return { widthMm: thicknessMm, heightMm: spanHeight, depthMm: legDepth };
  }

  if (input.position === "dir" || input.position === "esq") {
    return {
      widthMm: thicknessMm,
      heightMm: spanHeight,
      depthMm: input.type === "completo" ? spanDepth : avistaDepth,
    };
  }

  return {
    widthMm: largura,
    heightMm: thicknessMm,
    depthMm: input.type === "completo" ? spanDepth : avistaDepth,
  };
}
