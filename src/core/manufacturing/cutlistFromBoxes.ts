import type {
  AcessorioComPreco,
  BoxModule,
  CutListItemComPreco,
  GrainDirection,
} from "../types";
import { gerarModeloIndustrial, getPieceLabel } from "./boxManufacturing";
import type { RulesConfig } from "../rules/rulesConfig";
import { getMaterialForBox, getMaterialDisplayInfo } from "../materials/materialsService";
import { getVisualMaterialForBox, getFallbackMaterial } from "../materials/materialLibraryV2";
import { attachQrCodesToCutlist } from "../qrcode/qrcodeService";
import { buildEffectiveDrillingRules, buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";

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
  const effRules = buildEffectiveDrillingRules(rules);
  const modelo = gerarModeloIndustrial(box, effRules);
  const materialId = getMaterialForBox(box, projectMaterialId) || undefined;
  const matInfo = getMaterialDisplayInfo(materialId || "MDF Branco");
  const material = matInfo.label;
  const visualMaterial = materialId
    ? getVisualMaterialForBox(box, projectMaterialId)
    : getFallbackMaterial();
  const items: CutListItemComPreco[] = [];

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

  modelo.paineis.forEach((p) => {
    if (!p || !p.id || !p.tipo || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) {
      console.warn("[cutlistFromBoxes] Skipping invalid painel:", p);
      return;
    }
    const grainDirection: GrainDirection = p.orientacaoFibra ?? "none";
    const drillingResult = buildPanelDrillingResult(
      {
        tipo: p.tipo,
        larguraMm: p.largura_mm,
        alturaMm: p.altura_mm,
        espessuraMm: p.espessura_mm,
        doorHeightMm,
      },
      effRules
    );
    const drillingData = drillingResult.success
      ? drillingResult.data ?? { furacoesTecnicas: [], holes: [] }
      : { furacoesTecnicas: [], holes: [] };

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
      material: p.material,
      tipo: p.tipo,
      grainDirection,
      precoUnitario: p.quantidade > 0 ? p.custo / p.quantidade : 0,
      precoTotal: p.custo,
      furacoesTecnicas: drillingData.furacoesTecnicas,
      holes: drillingData.holes,
      hingePositionsMm: drillingData.hingePositionsMm,
      shelfHolePositions: drillingData.shelfHolePositions,
    });
  });

  // Portas já vêm em modelo.paineis (porta_simples, porta_dupla, porta_correr); não duplicar a partir de modelo.portas
  // (modelo.portas é usado apenas para custos/ferragens; a cutlist de peças usa apenas paineis)

  modelo.gavetas.forEach((p) => {
    if (!p || !p.id || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.profundidade_mm) || !Number.isFinite(p.espessura_mm)) {
      console.warn("[cutlistFromBoxes] Skipping invalid gaveta:", p);
      return;
    }
    const drillingResult = buildPanelDrillingResult(
      {
        tipo: "gaveta",
        larguraMm: p.largura_mm,
        alturaMm: p.altura_mm,
        espessuraMm: p.espessura_mm,
      },
      effRules
    );
    const drillingData = drillingResult.success
      ? drillingResult.data ?? { furacoesTecnicas: [], holes: [] }
      : { furacoesTecnicas: [], holes: [] };
    items.push({
      ...baseItem,
      id: `${box.id}-${p.id}`,
      nome: "gaveta",
      quantidade: 1,
      dimensoes: {
        largura: p.largura_mm,
        altura: p.altura_mm,
        profundidade: p.profundidade_mm,
      },
      espessura: p.espessura_mm,
      material,
      tipo: "gaveta",
      grainDirection: "none" as GrainDirection,
      precoUnitario: p.custo,
      precoTotal: p.custo,
      furacoesTecnicas: drillingData.furacoesTecnicas,
      holes: drillingData.holes,
      hingePositionsMm: drillingData.hingePositionsMm,
      shelfHolePositions: drillingData.shelfHolePositions,
    });
  });

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
  }
  return acc;
}