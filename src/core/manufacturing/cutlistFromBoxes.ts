import type {
  AcessorioComPreco,
  BoxModule,
  CutListItemComPreco,
  PanelDrillHole,
} from "../types";
import { resolveIndustrialGrainCode } from "../materials/grainDirection";
import { gerarModeloIndustrial, getPieceLabel } from "./boxManufacturing";
import type { RulesConfig } from "../rules/rulesConfig";
import { getMaterialForBox, getMaterialDisplayInfo } from "../materials/materialsService";
import { resolveMaterial, getDefaultOfficialMaterial, resolveCostaMaterialForBox, resolveCostaThicknessMm } from "../materials/materials.api";
import { getVisualMaterialForBox, getFallbackMaterial } from "../materials/materialLibraryV2";
import { attachQrCodesToCutlist } from "../qrcode/qrcodeService";
import {
  hasExplicitMetadataLabelNumber,
  readLabelNumberFromMetadata,
} from "../qrcode/panelLabelNumber";
import { buildEffectiveDrillingRules, buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { computeDoorVerticalGaps } from "../doors/doorLayerGeometry";
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import { isCornerFixedFrontModel, getCornerFixedFrontHingeSide } from "../cornerCabinet";
import { buildPiUniversalLateralDrilling } from "../../data/moveisUnificados/pi/drilling";
import { isWardrobeModel } from "../wardrobe/wardrobeRules";
import { calcLateralDowelHoles } from "../drill/lateralDowels";
import { getSettings } from "../settings/settingsService";
import { getProfundidadeInternaUtilMm } from "../box/boxDepthHelpers";
import { calcularPrecoCutList } from "../pricing/pricing";
import { extractDrawerCutlistFromLayerItems, isDrawerPieceTipo } from "../../services/drawerCutlistAdapter";
import { buildDivSepDrilling, mergeDrillHoles } from "../divSep/drilling";
import { buildDivSepIndustrialLabel } from "../divSep/labels";

/** Campos derivados — não entram na chave de cache (evita recomputes por efeitos colaterais). */
const CAMPOS_EXCLUIDOS_FP_CUTLIST = new Set([
  "cutList",
  "cutListComPreco",
  "estrutura3D",
  "precoTotalPecas",
]);

function jsonIndustrialBoxParaCutlist(box: BoxModule): string {
  return JSON.stringify(box, (key, value) => {
    if (key !== "" && CAMPOS_EXCLUIDOS_FP_CUTLIST.has(key)) return undefined;
    return value;
  });
}

type EntradaCacheCutlistBox = { chave: string; items: CutListItemComPreco[] };

let cutlistCompletaCacheChave: string | null = null;
let cutlistCompletaCache: CutListItemComPreco[] | null = null;
const cutlistPorCaixaCache = new Map<string, EntradaCacheCutlistBox>();

/** Invalidação total (import, troca macro de regras, etc.). */
export function clearAllCutlistCache(): void {
  cutlistCompletaCacheChave = null;
  cutlistCompletaCache = null;
  cutlistPorCaixaCache.clear();
}

/**
 * Invalida cache relacionado com um projeto. `projectId` reserva-se para diagnóstico futuro.
 * Com `boxIds`, remove entradas por caixa; a lista completa em cache é sempre invalidada.
 */
export function clearCutlistCacheForProject(_projectId: string, boxIds?: readonly string[]): void {
  void _projectId;
  cutlistCompletaCacheChave = null;
  cutlistCompletaCache = null;
  if (boxIds?.length) {
    for (const bid of boxIds) cutlistPorCaixaCache.delete(bid);
  }
}

/**
 * Converte furos de caneco da porta (Y em coordenadas do painel: topo=0, Y↓) para offsets industriais
 * a partir da base da peça (mm), iguais a getHingeYPositions — mesma lista que a lateral deve usar.
 */
function extractDoorHingeOffsetsFromBottomMm(drillHoles: PanelDrillHole[] | undefined, doorAlturaMm: number): number[] {
  if (!Array.isArray(drillHoles) || drillHoles.length === 0) return [];
  if (!Number.isFinite(doorAlturaMm) || doorAlturaMm <= 0) return [];
  const offs = drillHoles
    .filter((h) => h.holeType === "dobradica")
    .map((h) => doorAlturaMm - Number(h.y))
    .filter((o) => Number.isFinite(o));
  if (offs.length === 0) return [];
  const unique = Array.from(new Set(offs.map((o) => Math.round(o * 1000) / 1000)));
  unique.sort((a, b) => a - b);
  return unique;
}

/**
 * Gera cutlist com preço para uma caixa a partir de project.boxes (Single Source of Truth).
 * Usa gerarModeloIndustrial com rules do projeto. Material = label do CRUD ou legado.
 * Preenche materialId, visualMaterial, grainDirection e opcionalmente faceMaterials (Layout Engine / MaterialLibrary v2).
 */
export function cutlistComPrecoFromBox(
  box: BoxModule,
  rules: RulesConfig,
  projectMaterialId?: string
): CutListItemComPreco[] {
  const chaveCaixa = `${jsonIndustrialBoxParaCutlist(box)}\0${JSON.stringify(rules)}\0${projectMaterialId ?? ""}`;
  const entradaCaixa = cutlistPorCaixaCache.get(box.id);
  if (entradaCaixa && entradaCaixa.chave === chaveCaixa) {
    return entradaCaixa.items;
  }

  const effRules = buildEffectiveDrillingRules(rules);
  const modelo = gerarModeloIndustrial(box, effRules);
  const materialId = getMaterialForBox(box, projectMaterialId) || undefined;
  const bodyMaterialKey = materialId || "mdf_branco";
  const matInfo = getMaterialDisplayInfo(bodyMaterialKey);
  const material = matInfo.label;
  const costaMaterial = resolveCostaMaterialForBox(box, bodyMaterialKey);
  const profundidadeExternaMm = Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || 0;
  const profundidadeInternaUtilMm = getProfundidadeInternaUtilMm(
    {
      dimensoes: { profundidade: profundidadeExternaMm },
      espessura: box.espessura,
      portaTipo: box.portaTipo,
      doorsLayer: box.doorsLayer,
      costaAtiva: box.costaAtiva,
    },
    resolveCostaThicknessMm(box)
  );
  const visualMaterial = materialId
    ? getVisualMaterialForBox(box, projectMaterialId)
    : getFallbackMaterial();
  const items: CutListItemComPreco[] = [];
  const hasShelves = Math.max(0, Math.floor(box.prateleiras ?? 0)) > 0;
  const drawersLayer = box.drawersLayer ?? [];
  const isPiBox = isPiBaseCabinetId(box.baseCabinetId);
  const hasDrawers = isPiBox
    ? drawersLayer.length > 0
    : Math.max(0, Math.floor(box.gavetas ?? 0)) > 0 || drawersLayer.length > 0;
  // Roupeiros: gavetas apenas na zona inferior; furos 32mm de prateleira devem ser calculados sem “bloqueio” por gavetas.
  const hasDrawersForShelfDrilling = isWardrobeModel(box.baseCabinetId) ? false : hasDrawers;

  const baseItem = {
    sourceType: "parametric" as const,
    boxId: box.id,
    materialId,
    visualMaterial,
    faceMaterials: { top: visualMaterial, front: visualMaterial } as { top?: typeof visualMaterial; front?: typeof visualMaterial },
    boxProfundidadeExternaMm: profundidadeExternaMm,
    boxProfundidadeInternaUtilMm: profundidadeInternaUtilMm,
  };

  const firstDoorPanel = modelo.paineis.find(
    (panel) => panel.tipo === "porta_dupla" || panel.tipo === "porta_simples" || panel.tipo === "porta_correr"
  );
  const doorHeightMm = firstDoorPanel?.altura_mm ?? (modelo.portas.length > 0 ? modelo.portas[0].altura_mm : undefined);
  const doorsLayer = box.doorsLayer ?? [];
  const doorsLayerCount = doorsLayer.length;
  const hasDoorLeft = doorsLayer.some((d) => d.hingeSide === "left");
  const hasDoorRight = doorsLayer.some((d) => d.hingeSide === "right");
  const hasDoorTop = doorsLayer.some((d) => d.hingeSide === "top");
  const hasDoorBottom = doorsLayer.some((d) => d.hingeSide === "bottom");
  const doorWidthMm = firstDoorPanel?.largura_mm;
  const lateralHeights = modelo.paineis
    .filter((p) => p.tipo === "lateral_esquerda" || p.tipo === "lateral_direita")
    .map((p) => p.altura_mm)
    .filter((h) => Number.isFinite(h) && h > 0) as number[];
  const openingHeightMm = lateralHeights.length > 0 ? Math.max(...lateralHeights) : (doorHeightMm ?? undefined);

  // Pré-cálculo obrigatório: gerar furos das portas primeiro para extrair as posições reais
  // e garantir que as laterais copiem 100% (mesmo número e mesmos Y).
  const doorTipos = ["porta_simples", "porta_dupla", "porta_correr"];
  const doorPanelsInOrder = modelo.paineis.filter((p) => doorTipos.includes(p.tipo));
  const doorDrillHolesByIndex = new Map<number, PanelDrillHole[]>();
  const hingePositionsBySide: Partial<Record<"left" | "right", number[]>> = {};
  const divSepDrilling = buildDivSepDrilling(box, box.panelIds);
  let divIndex = 0;
  let sepIndex = 0;
  for (let i = 0; i < doorPanelsInOrder.length; i++) {
    const p = doorPanelsInOrder[i]!;
    if (!p || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) continue;
    const hingeSide = doorsLayer[i]?.hingeSide;
    const openingH = Number.isFinite(openingHeightMm) && Number(openingHeightMm) > 0 ? Number(openingHeightMm) : p.altura_mm;
    const doorLayer = doorsLayer[i];
    const { bottomGap, topGap } = doorLayer
      ? (() => {
          const gaps = computeDoorVerticalGaps(openingH, p.altura_mm, doorLayer.posY ?? 0);
          return { bottomGap: gaps.bottomGapMm, topGap: gaps.topGapMm };
        })()
      : { bottomGap: (openingH - p.altura_mm) / 2, topGap: openingH - p.altura_mm - (openingH - p.altura_mm) / 2 };
    const drillingResult = buildPanelDrillingResult(
      {
        tipo: p.tipo,
        larguraMm: p.largura_mm,
        alturaMm: p.altura_mm,
        espessuraMm: p.espessura_mm,
        hasShelves,
        hasDrawers: hasDrawersForShelfDrilling,
        doorHeightMm,
        doorWidthMm,
        openingHeightMm: openingH,
        bottomGapMm: bottomGap,
        topGapMm: topGap,
        hingeSide,
        portaTipo: box.portaTipo,
        doorsLayerCount,
      },
      effRules
    );
    const drillHoles =
      drillingResult.success && drillingResult.data?.drillHoles?.length ? drillingResult.data.drillHoles : [];
    doorDrillHolesByIndex.set(i, drillHoles);
    if (hingeSide === "left" || hingeSide === "right") {
      const hingeOffsetsDoorLocal = extractDoorHingeOffsetsFromBottomMm(drillHoles, p.altura_mm);
      // Converter offsets locais da porta para offsets globais do vão (base do vão).
      const hingeOffsetsGlobal = hingeOffsetsDoorLocal.map((o) => o + bottomGap);
      if (hingeOffsetsGlobal.length > 0) hingePositionsBySide[hingeSide] = hingeOffsetsGlobal;
    }
  }

  let doorPanelIndex = 0;
  modelo.paineis.forEach((p) => {
    if (!p || !p.id || !p.tipo || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) {
      return;
    }
    if (drawersLayer.length > 0 && (p.tipo === "gaveta_frente" || p.tipo === "gaveta" || isDrawerPieceTipo(p.tipo))) {
      return;
    }
    const grainDirection = resolveIndustrialGrainCode({ tipo: p.tipo });
    const isDoor = p.tipo === "porta_simples" || p.tipo === "porta_dupla" || p.tipo === "porta_correr";
    const isFixedFront = p.tipo === "frente_fixa";
    const isCornerBox = isCornerFixedFrontModel(box.baseCabinetId);
    const isLateralLeft = p.tipo === "lateral_esquerda";
    const isLateralRight = p.tipo === "lateral_direita";
    const isTopPanel = p.tipo === "cima";
    const isBottomPanel = p.tipo === "fundo";
    const doorIndex = isDoor ? doorPanelIndex : -1;
    const doorHingeSide = doorsLayer[0]?.hingeSide;
    const hingeSide =
      isDoor && doorsLayer[doorIndex]
        ? doorsLayer[doorIndex].hingeSide
        : isFixedFront && isCornerBox
          ? getCornerFixedFrontHingeSide(box)
          : isLateralLeft && hasDoorLeft
            ? "left"
            : isLateralRight && hasDoorRight
              ? "right"
              : isTopPanel && hasDoorTop
                ? "top"
                : isBottomPanel && hasDoorBottom
                  ? "bottom"
                  : undefined;
    const isCostaPanel = p.tipo === "COSTA";
    const isDivisor = p.tipo === "divisorio";
    const isSeparador = p.tipo === "separador";
    const doorOfficial = isDoor && doorsLayer[doorIndex]?.material
      ? resolveMaterial(doorsLayer[doorIndex].material)
      : null;
    const itemMaterial = isDoor
      ? (doorOfficial?.label ?? doorsLayer[doorIndex]?.material ?? getDefaultOfficialMaterial().label)
      : isCostaPanel
        ? costaMaterial.label
        : material;
    const itemMaterialId = isCostaPanel ? costaMaterial.materialId : materialId;
    if (isDoor) doorPanelIndex += 1;
    const doorHeightForLateral =
      isLateralLeft && hasDoorLeft ? doorHeightMm : isLateralRight && hasDoorRight ? doorHeightMm : undefined;
    const doorWidthForTopBottom =
      (isTopPanel && hasDoorTop) || (isBottomPanel && hasDoorBottom) ? doorWidthMm : undefined;
    const hingePositionsForLateral =
      isFixedFront && isCornerBox && (doorHingeSide === "left" || doorHingeSide === "right")
        ? hingePositionsBySide[doorHingeSide]
        : isLateralLeft && hasDoorLeft
          ? hingePositionsBySide.left
          : isLateralRight && hasDoorRight
            ? hingePositionsBySide.right
            : undefined;
    const openingH = Number.isFinite(openingHeightMm) && Number(openingHeightMm) > 0 ? Number(openingHeightMm) : p.altura_mm;
    const doorLayerForGap = isDoor && doorsLayer[doorIndex] ? doorsLayer[doorIndex] : undefined;
    const { bottomGap, topGap } = doorLayerForGap
      ? (() => {
          const gaps = computeDoorVerticalGaps(openingH, p.altura_mm, doorLayerForGap.posY ?? 0);
          return { bottomGap: gaps.bottomGapMm, topGap: gaps.topGapMm };
        })()
      : isDoor
        ? { bottomGap: Math.max(0, (openingH - p.altura_mm) / 2), topGap: Math.max(0, openingH - p.altura_mm - (openingH - p.altura_mm) / 2) }
        : { bottomGap: 0, topGap: 0 };
    let drillHoles: PanelDrillHole[] = [];
    if (isPiBox && (p.tipo === "lateral_esquerda" || p.tipo === "lateral_direita")) {
      const piSettings = getSettings().modeloPI;
      const gavetasSettings = getSettings().gavetas;
      const firstDrawer = drawersLayer[0];
      drillHoles = buildPiUniversalLateralDrilling({
        alturaMm: p.altura_mm,
        profundidadeMm: p.largura_mm,
        side: p.tipo === "lateral_esquerda" ? "left" : "right",
        piHideDrawerHoles: box.piHideDrawerHoles === true,
        piSettings: piSettings ?? {},
        drawersLayerCount: drawersLayer.length,
        slideType: firstDrawer?.slideType ?? gavetasSettings.gavetaTipoCorredica,
        metalBoxType: firstDrawer?.metalBoxType ?? gavetasSettings.gavetaTipoCaixaMetalica,
        softClose: firstDrawer?.softClose ?? gavetasSettings.gavetaSoftClose,
      });
    } else {
      if (isDoor) {
        drillHoles = doorDrillHolesByIndex.get(doorIndex) ?? [];
      } else {
        const drillingResult = buildPanelDrillingResult(
          {
            tipo: p.tipo,
            larguraMm: p.largura_mm,
            alturaMm: p.altura_mm,
            espessuraMm: p.espessura_mm,
            hasShelves,
            hasDrawers: hasDrawersForShelfDrilling,
            doorHeightMm: isDoor ? doorHeightMm : doorHeightForLateral,
            doorWidthMm: doorWidthForTopBottom,
            openingHeightMm: openingH,
            bottomGapMm: bottomGap,
            topGapMm: topGap,
            hingeSide,
            hingePositionsMm: hingePositionsForLateral,
            portaTipo: box.portaTipo,
            doorsLayerCount,
          },
          effRules
        );
        drillHoles = drillingResult.success && drillingResult.data?.drillHoles?.length
          ? drillingResult.data.drillHoles
          : [];
      }
    }

    const panelIdForDivSep = p.id;
    drillHoles = mergeDrillHoles(drillHoles, divSepDrilling.getExtraHoles(p.tipo, panelIdForDivSep));

    let industrialLabel: string | undefined;
    let displayNome = getPieceLabel(p.tipo);
    if (isDivisor) {
      divIndex += 1;
      industrialLabel = buildDivSepIndustrialLabel(box.nome, "DIV", divIndex);
      displayNome = industrialLabel;
    } else if (isSeparador) {
      sepIndex += 1;
      industrialLabel = buildDivSepIndustrialLabel(box.nome, "SEP", sepIndex);
      displayNome = industrialLabel;
    }

    items.push({
      ...baseItem,
      id: `${box.id}-${p.id}`,
      nome: displayNome,
      metadata: {
        panelId: p.id,
        ...(industrialLabel ? { industrialLabel, divSepKind: isDivisor ? "DIV" : "SEP" } : {}),
      },
      quantidade: p.quantidade,
      dimensoes: {
        largura: p.largura_mm,
        altura: p.altura_mm,
        profundidade: p.espessura_mm,
      },
      espessura: isCostaPanel ? costaMaterial.thicknessMm : p.espessura_mm,
      materialId: itemMaterialId,
      material: itemMaterial,
      tipo: p.tipo,
      grainDirection,
      precoUnitario: p.quantidade > 0 ? p.custo / p.quantidade : 0,
      precoTotal: p.custo,
      drillHoles,
    });
  });

  if (drawersLayer.length > 0) {
    const drawerCutlist = extractDrawerCutlistFromLayerItems(drawersLayer, bodyMaterialKey, box.nome);
    const drawerItems = calcularPrecoCutList(drawerCutlist).map((item) => {
      const drawerRules = item.metadata?.drawerRules as
        | {
            slideType?: string;
            metalBoxType?: string;
            softClose?: boolean;
            handleType?: string;
            handlePosition?: "Centro" | "Topo" | "Inferior";
            handleOffsetMm?: number;
          }
        | undefined;
      const drillingResult = buildPanelDrillingResult(
        {
          tipo: item.tipo,
          larguraMm: item.dimensoes.largura,
          alturaMm: item.dimensoes.altura,
          espessuraMm: item.espessura,
          hasShelves,
          hasDrawers,
          slideType: drawerRules?.slideType,
          metalBoxType: drawerRules?.metalBoxType,
          softClose: drawerRules?.softClose,
          handleType: drawerRules?.handleType,
          handlePosition: drawerRules?.handlePosition,
          handleOffsetMm: drawerRules?.handleOffsetMm,
        },
        effRules
      );
      const drillHoles =
        drillingResult.success && drillingResult.data?.drillHoles?.length ? drillingResult.data.drillHoles : [];
      return {
        ...baseItem,
        ...item,
        materialId: item.materialId ?? materialId,
        material: item.material ?? material,
        visualMaterial,
        faceMaterials: baseItem.faceMaterials,
        drillHoles,
      };
    });
    items.push(...drawerItems);
  }

  // Portas já vêm em modelo.paineis (porta_simples, porta_dupla, porta_correr); não duplicar a partir de modelo.portas
  // (modelo.portas é usado apenas para custos/ferragens; a cutlist de peças usa apenas paineis)

  for (const item of items) {
    if (item.tipo !== "lateral_esquerda" && item.tipo !== "lateral_direita") continue;

    const panelLength = item.dimensoes?.altura ?? 0;
    if (panelLength <= 0) continue;

    const dowelHoles = calcLateralDowelHoles(panelLength);

    const newHoles: PanelDrillHole[] = dowelHoles.map((h) => ({
      x: h.x,
      y: h.edge === "top" ? panelLength : 0,
      diameter: h.diameter,
      depth: h.depth,
      holeType: "cavilha" as const,
      topDrillable: false,
      face: "B" as const,
    }));

    item.drillHoles = [...(item.drillHoles ?? []), ...newHoles];
  }

  const prevById = new Map((box.cutListComPreco ?? []).map((x) => [x.id, x]));
  for (const item of items) {
    const prev = prevById.get(item.id);
    if (!prev) continue;
    if (prev.metadata && Object.keys(prev.metadata).length > 0) {
      item.metadata = { ...(item.metadata ?? {}), ...prev.metadata };
    }
    if (hasExplicitMetadataLabelNumber(prev.metadata)) {
      const n = readLabelNumberFromMetadata(prev.metadata);
      if (n != null) {
        item.pieceNumber = n;
        if (prev.shortCode && prev.shortCode !== "ERR") {
          item.shortCode = prev.shortCode;
        }
      }
    }
  }

  cutlistPorCaixaCache.set(box.id, { chave: chaveCaixa, items });
  return items;
}

/**
 * Cutlist com preço agregada de todas as caixas (project.boxes).
 */
export function cutlistComPrecoFromBoxes(
  boxes: BoxModule[],
  rules: RulesConfig,
  projectMaterialId?: string,
  projectName = "Projeto"
): CutListItemComPreco[] {
  const idsPresentes = new Set(boxes.map((b) => b.id));
  for (const id of cutlistPorCaixaCache.keys()) {
    if (!idsPresentes.has(id)) cutlistPorCaixaCache.delete(id);
  }

  const fpCaixasOrdenado = [...boxes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((b) => `${b.id}:${jsonIndustrialBoxParaCutlist(b)}`)
    .join("\n");
  const chaveCompleta = `${projectName}\0${projectMaterialId ?? ""}\0${JSON.stringify(rules)}\0${fpCaixasOrdenado}`;

  if (cutlistCompletaCacheChave === chaveCompleta && cutlistCompletaCache) {
    return cutlistCompletaCache;
  }

  const raw = boxes.flatMap((box) => cutlistComPrecoFromBox(box, rules, projectMaterialId));
  const comQr = attachQrCodesToCutlist(raw, {
    projectName,
    boxes,
    rules,
  });
  cutlistCompletaCacheChave = chaveCompleta;
  cutlistCompletaCache = comQr;
  return comQr;
}

/**
 * Cutlist paramétrica + peças CAD extraídas, com um único attachQr global
 * (alinhado ao PDF unificado / exportação industrial).
 */
export function buildGlobalQrCutlistMerged(
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string,
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>
): CutListItemComPreco[] {
  const rawParam = boxes.flatMap((box) => cutlistComPrecoFromBox(box, rules, materialId));
  const extracted = boxes.flatMap((box) => {
    const byModel = extractedPartsByBoxId?.[box.id];
    if (!byModel) return [] as CutListItemComPreco[];
    return Object.values(byModel).flat() as CutListItemComPreco[];
  });
  const merged = [...rawParam, ...extracted];
  return attachQrCodesToCutlist(merged, {
    projectName,
    boxes,
    rules,
  });
}

/**
 * Ferragens (acessórios) agregadas de todas as caixas (project.boxes).
 * Cada ferragem já tem id único por caixa (f.id em boxManufacturing); a posição
 * no array modelo.ferragens não é usada — apenas mapeamos f → AcessorioComPreco.
 */
export function ferragensFromBoxes(boxes: BoxModule[], rules: RulesConfig): AcessorioComPreco[] {
  const acc: AcessorioComPreco[] = [];
  for (const box of boxes) {
    const modelo = gerarModeloIndustrial(box, rules);
    for (const f of modelo.ferragens) {
      acc.push({
        id: `${box.id}-${f.id}`,
        nome: f.tipo,
        quantidade: f.quantidade,
        precoUnitario: f.quantidade > 0 ? f.custo / f.quantidade : 0,
        precoTotal: f.custo,
        tipo: f.tipo,
      });
    }
    if (box.cabinetType === "lower" && box.feetEnabled !== false) {
      acc.push({
        id: `${box.id}-pe-cozinha-regulavel`,
        nome: "Pé de cozinha regulável",
        quantidade: 4,
        precoUnitario: 0,
        precoTotal: 0,
        tipo: "pe_regulavel",
      });
    }
  }
  return acc;
}