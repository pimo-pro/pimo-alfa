import type { WorkspaceBox } from "../types";
import type {
  CreateRematePieceInput,
  RemateMountSlot,
  RemateCompletoRules,
  RematePartRole,
  RematePiece,
  RematePieceTipo,
  RemateProductOptions,
  RemateProductType,
  UpdateRematePieceInput,
} from "./rematePieceTypes";
import {
  depthMmFromModule,
  getFeetHeightMm,
  getRemateEnvelopeMm,
  type RemateBoxMeta,
} from "./remateDimensions";

export const DEFAULT_AVISTA_WIDTH_MM = 100;

export function defaultCompletoRules(): RemateCompletoRules {
  return {
    doorFlushEnabled: false,
    doorFlushMm: 20,
    backExtraMm: 50,
    topExtraMm: 20,
    bottomExtraMm: 20,
    floorProxEnabled: false,
    floorProxMm: 100,
    maxOverBoxMm: 200,
  };
}
export const DEFAULT_AVISTA_FLUSH_DEPTH_MM = 20;
export const DEFAULT_L_GAP_MAX_MM = 200;
export const RODAPE_HEIGHT_MM = 150;
export const PUXADOR_HEIGHT_MM = 150;

export function defaultMountSlotForProduct(productType: RemateProductType): RemateMountSlot {
  switch (productType) {
    case "RODAPE":
    case "RODAPE_L":
      return "FUNDO";
    case "L":
      return "DIR";
    default:
      return "FRENTE";
  }
}

export function deriveLegacyTipo(
  productType: RemateProductType,
  mountSlot: RemateMountSlot
): RematePieceTipo {
  if (productType === "L") return "L";
  if (productType === "RODAPE") return "RODAPE";
  if (productType === "RODAPE_L") return "RODAPE_L";
  switch (mountSlot) {
    case "DIR":
      return "DIR";
    case "ESQ":
      return "ESQ";
    case "CIMA":
      return "CIMA";
    case "FUNDO":
    case "TRAS":
      return "BAIXO";
    case "FRENTE":
      return "FRENTE";
    default:
      return "DIR";
  }
}

export function inferProductTypeFromLegacy(piece: Pick<RematePiece, "tipo" | "productType">): RemateProductType {
  if (piece.productType) return piece.productType;
  if (piece.tipo === "L") return "L";
  if (piece.tipo === "RODAPE") return "RODAPE";
  if (piece.tipo === "RODAPE_L") return "RODAPE_L";
  return "AVISTA";
}

export function normalizeProductOptions(
  productType: RemateProductType,
  options?: RemateProductOptions
): RemateProductOptions {
  const base: RemateProductOptions = options ?? {};
  if (productType === "AVISTA") {
    return {
      avistaWidthMm: base.avistaWidthMm ?? DEFAULT_AVISTA_WIDTH_MM,
      avistaFlushDepthMm: base.avistaFlushDepthMm ?? DEFAULT_AVISTA_FLUSH_DEPTH_MM,
      avistaFlushToDoor: base.avistaFlushToDoor ?? false,
    };
  }
  if (productType === "COMPLETO") {
    // Permite opções parciais vindas da UI sem perder os defaults completos.
    const baseRules: Partial<RemateCompletoRules> = base.completoRules ?? {};
    const def = defaultCompletoRules();
    return {
      coverageExtraMm: base.coverageExtraMm ?? 0,
      includeTopBottomRemates: base.includeTopBottomRemates ?? false,
      asPuxador: base.asPuxador ?? false,
      completoRules: {
        doorFlushEnabled: baseRules.doorFlushEnabled ?? def.doorFlushEnabled,
        doorFlushMm: baseRules.doorFlushMm ?? def.doorFlushMm,
        backExtraMm: baseRules.backExtraMm ?? def.backExtraMm,
        topExtraMm: baseRules.topExtraMm ?? def.topExtraMm,
        bottomExtraMm: baseRules.bottomExtraMm ?? def.bottomExtraMm,
        floorProxEnabled: baseRules.floorProxEnabled ?? def.floorProxEnabled,
        floorProxMm: baseRules.floorProxMm ?? def.floorProxMm,
        maxOverBoxMm: baseRules.maxOverBoxMm ?? def.maxOverBoxMm,
      },
    };
  }
  if (productType === "L") {
    return { lGapMaxMm: base.lGapMaxMm ?? DEFAULT_L_GAP_MAX_MM, lSide: base.lSide ?? "DIR" };
  }
  return base;
}

export type ProductDimContext = {
  box: WorkspaceBox | null;
  productType: RemateProductType;
  mountSlot: RemateMountSlot;
  thicknessMm: number;
  productOptions?: RemateProductOptions;
  partRole?: RematePartRole;
  partIndex?: 1 | 2;
};

function spanMetrics(box: WorkspaceBox | null) {
  const largura = Math.max(1, box?.dimensoes?.largura ?? 600);
  const altura = Math.max(1, box?.dimensoes?.altura ?? 720);
  const profundidade = Math.max(1, box?.dimensoes?.profundidade ?? 600);
  const env = box
    ? getRemateEnvelopeMm(box as RemateBoxMeta)
    : { aboveMm: 20, belowMm: 20, frontMm: 20, backMm: 70 };
  const spanHeight = altura + env.aboveMm + env.belowMm;
  const spanDepth = depthMmFromModule(profundidade);
  const feetMm = box ? getFeetHeightMm(box as RemateBoxMeta) : 0;
  return { largura, altura, profundidade, spanHeight, spanDepth, feetMm };
}

export function computeDimensionsForProduct(
  ctx: ProductDimContext
): Pick<RematePiece, "width" | "height" | "depth"> {
  const opts = normalizeProductOptions(ctx.productType, ctx.productOptions);
  const { largura, altura, profundidade, spanHeight, feetMm } = spanMetrics(ctx.box);
  const t = ctx.thicknessMm;
  const avistaW = opts.avistaWidthMm ?? DEFAULT_AVISTA_WIDTH_MM;
  const avistaD = opts.avistaFlushToDoor
    ? Math.max(1, opts.avistaFlushDepthMm ?? DEFAULT_AVISTA_FLUSH_DEPTH_MM)
    : Math.min(DEFAULT_AVISTA_WIDTH_MM, avistaW);
  const extra = opts.coverageExtraMm ?? 0;

  if (ctx.productType === "RODAPE") {
    return { width: largura, height: RODAPE_HEIGHT_MM, depth: t };
  }
  if (ctx.productType === "RODAPE_L") {
    if (ctx.partIndex === 2) return { width: largura, height: avistaD, depth: t };
    return { width: largura, height: RODAPE_HEIGHT_MM, depth: t };
  }
  if (ctx.productType === "L") {
    if (ctx.partIndex === 2) return { width: largura, height: avistaD, depth: t };
    return { width: avistaD, height: spanHeight, depth: t };
  }

  if (ctx.productType === "COMPLETO") {
    const rules = opts.completoRules ?? defaultCompletoRules();
    const doorAdd = rules.doorFlushEnabled ? rules.doorFlushMm : 0;
    const topAdd = rules.topExtraMm;
    const bottomAdd = rules.floorProxEnabled
      ? Math.max(rules.bottomExtraMm, rules.floorProxMm + feetMm)
      : rules.bottomExtraMm;
    void profundidade;
    // Clamp width/height to not exceed box by more than maxOverBoxMm
    const maxOver = rules.maxOverBoxMm;

    if (opts.asPuxador) {
      const w = Math.min(largura + extra + doorAdd, largura + maxOver);
      return { width: w, height: PUXADOR_HEIGHT_MM, depth: t };
    }
    if (ctx.partRole === "TOP" || ctx.partRole === "BOTTOM") {
      return { width: Math.min(largura + extra + doorAdd, largura + maxOver), height: t, depth: t };
    }
    const slot = ctx.mountSlot;
    if (slot === "DIR" || slot === "ESQ") {
      const h = Math.min(altura + topAdd + bottomAdd + extra, altura + maxOver);
      return { width: t, height: h, depth: t };
    }
    if (slot === "CIMA" || slot === "FUNDO" || slot === "TRAS") {
      return { width: Math.min(largura + extra + doorAdd, largura + maxOver), height: t, depth: t };
    }
    // FRENTE (default / main face)
    const w = Math.min(largura + extra + doorAdd, largura + maxOver);
    const h = Math.min(altura + topAdd + bottomAdd + extra, altura + maxOver);
    return { width: w, height: h, depth: t };
  }

  if (ctx.partRole === "TOP" || ctx.partRole === "BOTTOM") {
    return { width: largura, height: t, depth: t };
  }
  const slot = ctx.mountSlot;
  if (slot === "DIR" || slot === "ESQ") {
    return { width: t, height: spanHeight, depth: t };
  }
  if (slot === "CIMA" || slot === "FUNDO" || slot === "TRAS") {
    return { width: largura, height: t, depth: t };
  }
  return { width: largura, height: spanHeight, depth: t };
}

export type ProductPieceSpec = {
  productType: RemateProductType;
  mountSlot: RemateMountSlot;
  tipo: RematePieceTipo;
  partRole?: RematePartRole;
  partIndex?: 1 | 2;
  productOptions?: RemateProductOptions;
};

export function buildProductPieceSpecs(input: CreateRematePieceInput): ProductPieceSpec[] {
  const productType =
    input.productType ??
    (input.tipo ? inferProductTypeFromLegacy({ tipo: input.tipo }) : "AVISTA");
  const opts = normalizeProductOptions(productType, input.productOptions);
  const mountSlot = input.mountSlot ?? defaultMountSlotForProduct(productType);

  if (productType === "L" || productType === "RODAPE_L") {
    const sideSlot = productType === "L" ? (opts.lSide === "ESQ" ? "ESQ" : "DIR") : mountSlot;
    return ([1, 2] as const).map((partIndex) => ({
      productType,
      mountSlot: partIndex === 1 ? sideSlot : "FRENTE",
      tipo: productType === "L" ? "L" : "RODAPE_L",
      partIndex,
      productOptions: opts,
    }));
  }

  if (productType === "COMPLETO" && opts.asPuxador) {
    return [
      {
        productType,
        mountSlot: "FUNDO",
        tipo: deriveLegacyTipo(productType, "FUNDO"),
        partRole: "MAIN",
        productOptions: opts,
      },
    ];
  }

  const main: ProductPieceSpec = {
    productType,
    mountSlot,
    tipo: deriveLegacyTipo(productType, mountSlot),
    partRole: "MAIN",
    productOptions: opts,
  };

  if (productType !== "COMPLETO" || !opts.includeTopBottomRemates) {
    return [main];
  }

  return [
    main,
    {
      productType,
      mountSlot: "CIMA",
      tipo: "CIMA",
      partRole: "TOP",
      productOptions: opts,
    },
    {
      productType,
      mountSlot: "FUNDO",
      tipo: "BAIXO",
      partRole: "BOTTOM",
      productOptions: opts,
    },
  ];
}

export function applyProductPatch(piece: RematePiece, patch: UpdateRematePieceInput): RematePiece {
  const productType = patch.productType ?? piece.productType ?? inferProductTypeFromLegacy(piece);
  const mountSlot = patch.mountSlot ?? piece.mountSlot ?? defaultMountSlotForProduct(productType);
  const productOptions = normalizeProductOptions(productType, {
    ...piece.productOptions,
    ...patch.productOptions,
  });
  return {
    ...piece,
    ...patch,
    productType,
    mountSlot,
    productOptions,
    tipo: patch.tipo ?? deriveLegacyTipo(productType, mountSlot),
  };
}
