import type {
  AcessorioComPreco,
  BoxModule,
  CutListItemComPreco,
  GrainDirection,
  PanelDrillHole,
} from "../types";
import { gerarModeloIndustrial, getPieceLabel } from "./boxManufacturing";
import type { RulesConfig } from "../rules/rulesConfig";
import { getMaterialForBox, getMaterialDisplayInfo } from "../materials/materialsService";
import { resolveMaterial, getDefaultOfficialMaterial } from "../materials/materials.api";
import { getVisualMaterialForBox, getFallbackMaterial } from "../materials/materialLibraryV2";
import { attachQrCodesToCutlist } from "../qrcode/qrcodeService";
import { buildEffectiveDrillingRules, buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { devLogger } from "../../utils/devLogger";
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import { buildPiUniversalLateralDrilling } from "../../data/moveisUnificados/pi/drilling";
import { isWardrobeModel } from "../wardrobe/wardrobeRules";
import { calcLateralDowelHoles } from "../drill/lateralDowels";
import { getSettings } from "../settings/settingsService";

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
  if (import.meta.env.DEV) {
    devLogger.debug("[DRILL-DIAG] cutlistComPrecoFromBox: box recebido", box);
    devLogger.debug("[DRILL-DIAG] cutlistComPrecoFromBox: rules recebido", rules);
  }
  const effRules = buildEffectiveDrillingRules(rules);
  if (import.meta.env.DEV) {
    devLogger.debug("[DRILL-DIAG] cutlistComPrecoFromBox: effRules", effRules);
  }
  const modelo = gerarModeloIndustrial(box, effRules);
  if (import.meta.env.DEV) {
    devLogger.debug("[DRILL-DIAG] cutlistComPrecoFromBox: modelo.paineis", modelo.paineis);
  }
  const materialId = getMaterialForBox(box, projectMaterialId) || undefined;
  const matInfo = getMaterialDisplayInfo(materialId || "mdf_branco");
  const material = matInfo.label;
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
  };

  const firstDoorPanel = modelo.paineis.find(
    (panel) => panel.tipo === "porta_dupla" || panel.tipo === "porta_simples" || panel.tipo === "porta_correr"
  );
  const doorHeightMm = firstDoorPanel?.altura_mm ?? (modelo.portas.length > 0 ? modelo.portas[0].altura_mm : undefined);
  const doorsLayer = box.doorsLayer ?? [];
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
  for (let i = 0; i < doorPanelsInOrder.length; i++) {
    const p = doorPanelsInOrder[i]!;
    if (!p || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) continue;
    const hingeSide = doorsLayer[i]?.hingeSide;
    const openingH = Number.isFinite(openingHeightMm) && Number(openingHeightMm) > 0 ? Number(openingHeightMm) : p.altura_mm;
    const bottomGap = (openingH - p.altura_mm) / 2;
    const topGap = openingH - p.altura_mm - bottomGap;
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
      console.warn("[cutlistFromBoxes] Skipping invalid painel:", p);
      return;
    }
    const grainDirection: GrainDirection = p.orientacaoFibra ?? "none";
    const isDoor = p.tipo === "porta_simples" || p.tipo === "porta_dupla" || p.tipo === "porta_correr";
    const isLateralLeft = p.tipo === "lateral_esquerda";
    const isLateralRight = p.tipo === "lateral_direita";
    const isTopPanel = p.tipo === "cima";
    const isBottomPanel = p.tipo === "fundo";
    const doorIndex = isDoor ? doorPanelIndex : -1;
    const hingeSide =
      isDoor && doorsLayer[doorIndex]
        ? doorsLayer[doorIndex].hingeSide
        : isLateralLeft && hasDoorLeft
          ? "left"
          : isLateralRight && hasDoorRight
            ? "right"
            : isTopPanel && hasDoorTop
              ? "top"
              : isBottomPanel && hasDoorBottom
                ? "bottom"
                : undefined;
    const doorOfficial = isDoor && doorsLayer[doorIndex]?.material
      ? resolveMaterial(doorsLayer[doorIndex].material)
      : null;
    const itemMaterial = isDoor
      ? (doorOfficial?.label ?? doorsLayer[doorIndex]?.material ?? getDefaultOfficialMaterial().label)
      : material;
    if (isDoor) doorPanelIndex += 1;
    const doorHeightForLateral =
      isLateralLeft && hasDoorLeft ? doorHeightMm : isLateralRight && hasDoorRight ? doorHeightMm : undefined;
    const doorWidthForTopBottom =
      (isTopPanel && hasDoorTop) || (isBottomPanel && hasDoorBottom) ? doorWidthMm : undefined;
    const hingePositionsForLateral =
      isLateralLeft && hasDoorLeft ? hingePositionsBySide.left : isLateralRight && hasDoorRight ? hingePositionsBySide.right : undefined;
    const openingH = Number.isFinite(openingHeightMm) && Number(openingHeightMm) > 0 ? Number(openingHeightMm) : p.altura_mm;
    const bottomGap = isDoor ? Math.max(0, (openingH - p.altura_mm) / 2) : 0;
    const topGap = isDoor ? Math.max(0, openingH - p.altura_mm - bottomGap) : 0;
    let drillHoles: PanelDrillHole[] = [];
    if (isPiBox && (p.tipo === "lateral_esquerda" || p.tipo === "lateral_direita")) {
      const piSettings = getSettings().modeloPI;
      drillHoles = buildPiUniversalLateralDrilling({
        alturaMm: p.altura_mm,
        profundidadeMm: p.largura_mm,
        side: p.tipo === "lateral_esquerda" ? "left" : "right",
        piHideDrawerHoles: box.piHideDrawerHoles === true,
        piSettings: piSettings ?? {},
      });
    } else {
      if (isDoor) {
        drillHoles = doorDrillHolesByIndex.get(doorIndex) ?? [];
        if (import.meta.env.DEV) {
          const ys = drillHoles
            .filter((h) => h.holeType === "dobradica")
            .map((h) => h.y);
          devLogger.debug("[DRILL-DIAG] door hinge holes", {
            doorIndex,
            hingeSide,
            count: ys.length,
            ys,
          });
        }
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
          },
          effRules
        );
        drillHoles = drillingResult.success && drillingResult.data?.drillHoles?.length
          ? drillingResult.data.drillHoles
          : [];
      }
    }
    if (import.meta.env.DEV) {
      // Log de diagnóstico dos furos gerados para cada painel
      devLogger.debug("[DRILL-DIAG] cutlistComPrecoFromBox: drillHoles para painel", {
        painelId: p.id,
        tipo: p.tipo,
        drillHoles,
      });
    }
    items.push({
      ...baseItem,
      id: `${box.id}-${p.id}`,
      nome: getPieceLabel(p.tipo),
      quantidade: p.quantidade,
      dimensoes: {
        largura: p.largura_mm,
        altura: p.altura_mm,
        profundidade: p.espessura_mm,
      },
      espessura: p.espessura_mm,
      material: itemMaterial,
      tipo: p.tipo,
      grainDirection,
      precoUnitario: p.quantidade > 0 ? p.custo / p.quantidade : 0,
      precoTotal: p.custo,
      drillHoles,
    });
    if (import.meta.env.DEV) {
      console.log("[CUTLIST] painel gerado:", p.tipo, {
        largura_mm: p.largura_mm,
        altura_mm: p.altura_mm,
        espessura_mm: p.espessura_mm,
        quantidade: p.quantidade,
      });
    }
  });

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

  console.log("[CUTLIST-FINAL] total:", items.length);
  console.log("[CUTLIST-FINAL] tipos:", items.map((p) => p.tipo));
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
  const raw = boxes.flatMap((box) => cutlistComPrecoFromBox(box, rules, projectMaterialId));
  return attachQrCodesToCutlist(raw, {
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