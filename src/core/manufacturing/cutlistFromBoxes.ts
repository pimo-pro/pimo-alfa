import type { AcessorioComPreco, BoxModule, CutListItemComPreco, GrainDirection } from "../types";
import { gerarModeloIndustrial, getPieceLabel } from "./boxManufacturing";
import type { RulesConfig } from "../rules/rulesConfig";
import { getMaterialForBox, getMaterialDisplayInfo } from "../materials/service";
import { getVisualMaterialForBox, getFallbackMaterial } from "../materials/materialLibraryV2";
import { calcularPosicoesFurosVerticais } from "../rules/rulesConfig";
import { calculateTechnicalDrillingsForPiece } from "../drilling/drillingService";
import { attachQrCodesToCutlist } from "../qrcode/qrcodeService";

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
  const modelo = gerarModeloIndustrial(box, rules);
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

  const makeVerticalHolesForPanel = (largura: number, altura: number) => {
    if (!rules || !rules.furos) return [];
    try {
      const ys = calcularPosicoesFurosVerticais(altura, rules);
      const diam = Math.max(0.5, rules.furos.diametroFuro || 5);
      const radius = diam / 2;
      const recuoRaw = rules.furos.recuoBorda || 50;
      const recuo = Math.min(Math.max(recuoRaw, radius), Math.max(radius, largura - radius));
      const prof = rules.furos.profundidadeFuro || 10;
      const holes: NonNullable<CutListItemComPreco["furacoes"]> = [];
      for (const y of ys) {
        const ySafe = Math.min(Math.max(y, radius), Math.max(radius, altura - radius));
        holes.push({ x: recuo, y: ySafe, diametro: diam, profundidade: prof, tipo: "vertical" });
        holes.push({
          x: Math.min(Math.max(largura - recuo, radius), Math.max(radius, largura - radius)),
          y: ySafe,
          diametro: diam,
          profundidade: prof,
          tipo: "vertical",
        });
      }
      return holes;
    } catch (err) {
      console.warn("[cutlistFromBoxes] Error generating vertical holes:", err);
      return [];
    }
  };

  const makeTechnicalHolesForPanel = (tipo: string, largura: number, altura: number, espessura: number) => {
    if (!rules || !Number.isFinite(largura) || !Number.isFinite(altura) || !Number.isFinite(espessura)) {
      return [];
    }
    try {
      return calculateTechnicalDrillingsForPiece(
        { tipo, largura, altura, espessura },
        rules
      );
    } catch (err) {
      console.warn(`[cutlistFromBoxes] Error generating technical holes for ${tipo}:`, err);
      return [];
    }
  };

  const toNormalizedHoles = (
    furacoesTecnicas: ReturnType<typeof makeTechnicalHolesForPanel>
  ): NonNullable<CutListItemComPreco["holes"]> => (
    furacoesTecnicas.map((h) => ({
      x: h.x,
      y: h.y,
      diameter: h.diametro,
      depth: h.profundidade,
    }))
  );

  modelo.paineis.forEach((p) => {
    if (!p || !p.id || !p.tipo || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) {
      console.warn("[cutlistFromBoxes] Skipping invalid painel:", p);
      return;
    }
    const grainDirection: GrainDirection = p.orientacaoFibra ?? "none";
    const furacoesTecnicas = makeTechnicalHolesForPanel(p.tipo, p.largura_mm, p.altura_mm, p.espessura_mm);
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
      furacoes:
        p.tipo === "lateral_esquerda" || p.tipo === "lateral_direita"
          ? makeVerticalHolesForPanel(p.largura_mm, p.altura_mm)
          : undefined,
      furacoesTecnicas,
      holes: toNormalizedHoles(furacoesTecnicas),
    });
  });

  modelo.portas.forEach((p) => {
    if (!p || !p.id || !p.tipo || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) {
      console.warn("[cutlistFromBoxes] Skipping invalid porta:", p);
      return;
    }
    const furacoesTecnicas = makeTechnicalHolesForPanel(p.tipo, p.largura_mm, p.altura_mm, p.espessura_mm);
    items.push({
      ...baseItem,
      id: `${box.id}-${p.id}`,
      nome: "porta",
      quantidade: 1,
      dimensoes: {
        largura: p.largura_mm,
        altura: p.altura_mm,
        profundidade: p.espessura_mm,
      },
      espessura: p.espessura_mm,
      material,
      tipo: p.tipo,
      grainDirection: "none" as GrainDirection,
      precoUnitario: p.custo,
      precoTotal: p.custo,
      furacoesTecnicas,
      holes: toNormalizedHoles(furacoesTecnicas),
    });
  });

  modelo.gavetas.forEach((p) => {
    if (!p || !p.id || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.profundidade_mm) || !Number.isFinite(p.espessura_mm)) {
      console.warn("[cutlistFromBoxes] Skipping invalid gaveta:", p);
      return;
    }
    const furacoesTecnicas = makeTechnicalHolesForPanel("gaveta", p.largura_mm, p.altura_mm, p.espessura_mm);
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
      furacoesTecnicas,
      holes: toNormalizedHoles(furacoesTecnicas),
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
