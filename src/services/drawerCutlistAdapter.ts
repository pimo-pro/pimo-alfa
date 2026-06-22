/**
 * Conversão: DrawerLayerItem[] → CutListItem[]
 *
 * Extrai todas as subpeças das gavetas (frente, laterais, fundo, traseira) para a cutlist.
 * Taxonomia unificada (docs/matriz-faces-A-B-FINAL.md): gaveta_frente, gaveta_lat_esq,
 * gaveta_lat_dir, gaveta_fundo, gaveta_traseira.
 */

import type { CutListItem } from "../core/types";
import { buildDrawerIndustrialLabel } from "../core/drawers/drawerIndustrialLabels";
import { resolveIndustrialGrainCode } from "../core/materials/grainDirection";
import type { DrawerLayerItem } from "../models/BoxLayers";
import {
  DRAWER_SIDE_THICKNESS_MM,
  resolveDrawerBottomMaterial,
  resolveDrawerSideMaterial,
  resolveMaterial,
} from "../core/materials/materials.api";

/** Convenção industrial unificada (FASE 2): uma corrediça por lado. */
export const DRAWER_SLIDES_PER_DRAWER = 2;

export const DRAWER_PIECE_TIPOS = [
  "gaveta_frente",
  "gaveta_lat_esq",
  "gaveta_lat_dir",
  "gaveta_fundo",
  "gaveta_traseira",
] as const;

export type DrawerPieceTipo = (typeof DRAWER_PIECE_TIPOS)[number];

export function isDrawerPieceTipo(tipo: string): tipo is DrawerPieceTipo {
  return (DRAWER_PIECE_TIPOS as readonly string[]).includes(tipo);
}

export function isDrawerSideOrBackPieceTipo(tipo: string): boolean {
  return tipo === "gaveta_lat_esq" || tipo === "gaveta_lat_dir" || tipo === "gaveta_traseira";
}

export function boxUsesModernDrawerPipeline(box: { drawersLayer?: DrawerLayerItem[] | null }): boolean {
  return (box.drawersLayer?.length ?? 0) > 0;
}

export type DrawerHardwareSummary = {
  drawerId: string;
  drawerIndex: number;
  boxId: string;
  slideType: string;
  slideQuantity: number;
  slideLengthMm?: number;
  softClose: boolean;
  metalBoxType?: string;
  handleType?: string;
};

/**
 * Ferragens por gaveta a partir de drawersLayer (BOM unificado com cutlist).
 */
export function extractDrawerHardwareSummaryFromLayerItems(
  layerItems: DrawerLayerItem[]
): DrawerHardwareSummary[] {
  return layerItems.map((item, index) => ({
    drawerId: item.id,
    drawerIndex: index + 1,
    boxId: item.parentBoxId,
    slideType: item.slideType ?? "Genérica",
    slideQuantity: DRAWER_SLIDES_PER_DRAWER,
    slideLengthMm: item.bodyDepth ?? item.depth,
    softClose: Boolean(item.softClose),
    metalBoxType: item.metalBoxType,
    handleType: item.handleType,
  }));
}

export type DrawerIndustrialBom = {
  pieces: CutListItem[];
  hardware: DrawerHardwareSummary[];
};

export const DRAWER_FRONT_USES_BODY_THICKNESS = true;
export const DRAWER_BACK_THICKNESS_MM = 16;
export const DRAWER_BOTTOM_THICKNESS_MM = 10;

function resolveDrawerFrontThicknessMm(item: DrawerLayerItem): number {
  const fromLayer = Number(item.frontThickness);
  if (Number.isFinite(fromLayer) && fromLayer > 0) return fromLayer;
  return 19;
}

function withDrawerIndustrialMeta(
  piece: CutListItem,
  boxName: string,
  drawerIndex1Based: number
): CutListItem {
  const tipo = piece.tipo as DrawerPieceTipo;
  const industrialLabel = buildDrawerIndustrialLabel(boxName, tipo, drawerIndex1Based);
  return {
    ...piece,
    nome: industrialLabel,
    metadata: {
      ...(piece.metadata ?? {}),
      industrialLabel,
      drawerIndex: drawerIndex1Based,
    },
  };
}

export type DrawerCutlistMaterialContext = {
  bodyMaterialId: string;
};

function normalizeDrawerMaterialContext(
  bodyMaterialIdOrLegacyLabel?: string
): DrawerCutlistMaterialContext {
  const raw = bodyMaterialIdOrLegacyLabel?.trim();
  if (!raw) return { bodyMaterialId: "mdf_branco-19" };
  if (resolveMaterial(raw)) return { bodyMaterialId: raw };
  return { bodyMaterialId: "mdf_branco-19" };
}

/**
 * BOM industrial unificado: peças (cutlist) + ferragens por gaveta.
 */
export function extractDrawerIndustrialBomFromLayerItems(
  layerItems: DrawerLayerItem[],
  bodyMaterialIdOrLegacyLabel?: string
): DrawerIndustrialBom {
  return {
    pieces: extractDrawerCutlistFromLayerItems(layerItems, bodyMaterialIdOrLegacyLabel),
    hardware: extractDrawerHardwareSummaryFromLayerItems(layerItems),
  };
}

/**
 * Converte uma DrawerLayerItem em múltiplas CutListItems
 * (uma para cada peça: frente, lateral esq, lateral dir, fundo, traseira)
 */
export function drawerLayerItemToCutList(
  item: DrawerLayerItem,
  drawerIndex: number,
  bodyMaterialIdOrLegacyLabel?: string,
  boxName?: string
): CutListItem[] {
  const materialContext = normalizeDrawerMaterialContext(bodyMaterialIdOrLegacyLabel);
  const drawerIndex1Based = drawerIndex + 1;
  const safeBoxName = boxName?.trim() || "BOX";
  const sideMaterial = resolveDrawerSideMaterial(materialContext.bodyMaterialId);
  const sideThickness = DRAWER_SIDE_THICKNESS_MM;
  const backThickness = DRAWER_BACK_THICKNESS_MM;
  const bottomThickness =
    Number.isFinite(item.bottomThickness) && (item.bottomThickness ?? 0) > 0
      ? Number(item.bottomThickness)
      : DRAWER_BOTTOM_THICKNESS_MM;
  const bottomMaterial = resolveDrawerBottomMaterial(
    materialContext.bodyMaterialId,
    bottomThickness
  );
  const frontThicknessMm = resolveDrawerFrontThicknessMm(item);
  const frontMaterialId = item.materialId ?? materialContext.bodyMaterialId;
  const frontOfficial = resolveMaterial(frontMaterialId);
  const frontMaterialLabel = frontOfficial?.label ?? frontMaterialId;

  const pieces: CutListItem[] = [];

  const baseId = `${item.parentBoxId}-drawer-${drawerIndex}`;
  const hasMetalBox = item.metalBoxType != null && item.metalBoxType !== "Nenhuma";
  const drawerHardware = [
    {
      tipo: "corredica",
      nome: item.slideType ?? "Genérica",
      quantidade: DRAWER_SLIDES_PER_DRAWER,
      softClose: Boolean(item.softClose),
      capacidadeCargaKg: item.capacityKg ?? 40,
    },
    ...(hasMetalBox
      ? [{
          tipo: "caixa_metalica",
          nome: item.metalBoxType,
          quantidade: 1,
        }]
      : []),
    ...(item.handleType && item.handleType !== "Nenhum"
      ? [{
          tipo: "handle",
          nome: item.handleType,
          posicao: item.handlePosition ?? "Centro",
          offsetMm: item.handleOffsetMm ?? 0,
          quantidade: 1,
        }]
      : []),
  ];

  // FRENTE — espessura do corpo do móvel
  pieces.push(
    withDrawerIndustrialMeta(
      {
        id: `${baseId}-front`,
        nome: `Gaveta ${drawerIndex1Based} - Frente`,
        quantidade: 1,
        dimensoes: {
          largura: item.width,
          altura: item.height,
          profundidade: frontThicknessMm,
        },
        espessura: frontThicknessMm,
        material: frontMaterialLabel,
        tipo: "gaveta_frente",
        sourceType: "parametric",
        boxId: item.parentBoxId,
        materialId: frontOfficial?.canonicalId ?? frontMaterialId,
        grainDirection: resolveIndustrialGrainCode({ tipo: "gaveta_frente" }),
        metadata: {
          drawerHardware,
          drawerRules: {
            slideType: item.slideType ?? "Genérica",
            softClose: Boolean(item.softClose),
            metalBoxType: item.metalBoxType ?? "Nenhuma",
            handleType: item.handleType ?? "Nenhum",
            handlePosition: item.handlePosition ?? "Centro",
            handleOffsetMm: item.handleOffsetMm ?? 0,
          },
        },
      },
      safeBoxName,
      drawerIndex1Based
    )
  );

  if (hasMetalBox) return pieces;

  const hasLeftSide =
    (item.leftSideWidth ?? 0) > 0 ||
    (item.leftSideHeight ?? 0) > 0 ||
    (item.leftSideDepth ?? 0) > 0;
  const hasRightSide =
    (item.rightSideWidth ?? 0) > 0 ||
    (item.rightSideHeight ?? 0) > 0 ||
    (item.rightSideDepth ?? 0) > 0;

  // LATERAL ESQUERDA (1×)
  if (hasLeftSide) {
    pieces.push(
      withDrawerIndustrialMeta(
        {
          id: `${baseId}-left`,
          nome: `Gaveta ${drawerIndex1Based} - Lateral Esquerda`,
          quantidade: 1,
          dimensoes: {
            largura: item.leftSideDepth ?? 0,
            altura: item.leftSideHeight ?? 0,
            profundidade: sideThickness,
          },
          espessura: sideThickness,
          material: sideMaterial.label,
          tipo: "gaveta_lat_esq",
          sourceType: "parametric",
          boxId: item.parentBoxId,
          materialId: sideMaterial.materialId,
          grainDirection: resolveIndustrialGrainCode({ tipo: "gaveta_lat_esq" }),
        },
        safeBoxName,
        drawerIndex1Based
      )
    );
  }

  // LATERAL DIREITA (1×)
  if (hasRightSide) {
    pieces.push(
      withDrawerIndustrialMeta(
        {
          id: `${baseId}-right`,
          nome: `Gaveta ${drawerIndex1Based} - Lateral Direita`,
          quantidade: 1,
          dimensoes: {
            largura: item.rightSideDepth ?? 0,
            altura: item.rightSideHeight ?? 0,
            profundidade: sideThickness,
          },
          espessura: sideThickness,
          material: sideMaterial.label,
          tipo: "gaveta_lat_dir",
          sourceType: "parametric",
          boxId: item.parentBoxId,
          materialId: sideMaterial.materialId,
          grainDirection: resolveIndustrialGrainCode({ tipo: "gaveta_lat_dir" }),
        },
        safeBoxName,
        drawerIndex1Based
      )
    );
  }

  // FUNDO (10 mm)
  if (bottomMaterial.thicknessMm > 0 && (item.bottomWidth ?? 0) > 0 && (item.bottomDepth ?? 0) > 0) {
    pieces.push(
      withDrawerIndustrialMeta(
        {
          id: `${baseId}-bottom`,
          nome: `Gaveta ${drawerIndex1Based} - Fundo`,
          quantidade: 1,
          dimensoes: {
            largura: item.bottomWidth ?? 0,
            altura: item.bottomDepth ?? 0,
            profundidade: bottomMaterial.thicknessMm,
          },
          espessura: bottomMaterial.thicknessMm,
          material: bottomMaterial.label,
          tipo: "gaveta_fundo",
          sourceType: "parametric",
          boxId: item.parentBoxId,
          materialId: bottomMaterial.materialId,
          grainDirection: resolveIndustrialGrainCode({ tipo: "gaveta_fundo" }),
        },
        safeBoxName,
        drawerIndex1Based
      )
    );
  }

  // COSTAS / TRASEIRA (16 mm)
  if ((item.backWidth ?? 0) > 0 && (item.backHeight ?? 0) > 0) {
    pieces.push(
      withDrawerIndustrialMeta(
        {
          id: `${baseId}-back`,
          nome: `Gaveta ${drawerIndex1Based} - Costas`,
          quantidade: 1,
          dimensoes: {
            largura: item.backWidth ?? 0,
            altura: item.backHeight ?? 0,
            profundidade: backThickness,
          },
          espessura: backThickness,
          material: sideMaterial.label,
          tipo: "gaveta_traseira",
          sourceType: "parametric",
          boxId: item.parentBoxId,
          materialId: sideMaterial.materialId,
          grainDirection: resolveIndustrialGrainCode({ tipo: "gaveta_traseira" }),
        },
        safeBoxName,
        drawerIndex1Based
      )
    );
  }

  return pieces;
}

/**
 * Converte todas as DrawerLayerItems de um box em CutListItems
 */
export function extractDrawerCutlistFromLayerItems(
  layerItems: DrawerLayerItem[],
  bodyMaterialIdOrLegacyLabel?: string,
  boxName?: string
): CutListItem[] {
  const allPieces: CutListItem[] = [];

  for (let i = 0; i < layerItems.length; i++) {
    const item = layerItems[i];
    const pieces = drawerLayerItemToCutList(item, i, bodyMaterialIdOrLegacyLabel, boxName);
    allPieces.push(...pieces);
  }

  return allPieces;
}
