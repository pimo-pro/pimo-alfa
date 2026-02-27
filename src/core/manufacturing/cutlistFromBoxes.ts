import type {
  AcessorioComPreco,
  BoxModule,
  CutListItemComPreco,
  GrainDirection,
  TechnicalDrillHole,
} from "../types";
import { gerarModeloIndustrial, getPieceLabel } from "./boxManufacturing";
import { getHingeYPositions, MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM } from "../rules/rulesConfig";
import { normalizeRulesConfig, type RulesConfig } from "../rules/rulesConfig";
import { getMaterialForBox, getMaterialDisplayInfo } from "../materials/service";
import { getVisualMaterialForBox, getFallbackMaterial } from "../materials/materialLibraryV2";
import { calculateTechnicalDrillingsForPiece, isTopDrillable } from "../drilling/drillingService";
import { attachQrCodesToCutlist } from "../qrcode/qrcodeService";
import { getSettings } from "../settings/settingsService";

/**
 * Gera cutlist com preço para uma caixa a partir de project.boxes (Single Source of Truth).
 * Usa gerarModeloIndustrial com rules do projeto. Material = label do CRUD ou legado.
 * Preenche materialId, visualMaterial, grainDirection e opcionalmente faceMaterials (Layout Engine / MaterialLibrary v2).
 */
const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function toFiniteNumber(value: unknown, fallback: number): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function mergeFuraçãoIntoRules(rules: RulesConfig): RulesConfig {
  const normalizedRules = normalizeRulesConfig(rules);
  const settings = getSettings();
  const fu = settings?.furação;
  if (!fu?.parafuso || !fu?.prateleira || !fu?.dobradica) return normalizedRules;

  const pr = fu.prateleira;
  const df = fu.dobradicaFixacao;
  const minFuros = clampNumber(toFiniteNumber(pr.minFuros, normalizedRules.furos.tecnicos.prateleira.minFurosPorColuna), 2, 100);
  const maxFurosRaw = clampNumber(toFiniteNumber(pr.maxFuros, normalizedRules.furos.tecnicos.prateleira.maxFurosPorColuna), 2, 100);
  const maxFuros = Math.max(minFuros, maxFurosRaw);
  const distanciaDaBorda = clampNumber(
    toFiniteNumber(pr.distanciaDaBorda, normalizedRules.furos.tecnicos.prateleira.distanciaDaBorda),
    5,
    120
  );

  return {
    ...normalizedRules,
    furos: {
      ...normalizedRules.furos,
      tecnicos: {
        ...normalizedRules.furos.tecnicos,
        parafuso: {
          ...normalizedRules.furos.tecnicos.parafuso,
          distanciaFrente: fu.parafuso.distanciaFrenteParafuso,
          distanciaFundo: fu.parafuso.distanciaFrenteParafuso,
          offsetDaBorda: fu.parafuso.offsetDaBorda,
        },
        cavilha: {
          ...normalizedRules.furos.tecnicos.cavilha,
          distanciaFrente: fu.parafuso.distanciaFrenteCavilha,
          distanciaFundo: fu.parafuso.distanciaFrenteCavilha,
          offsetDaBorda: fu.parafuso.offsetDaBorda,
        },
        prateleira: {
          ...normalizedRules.furos.tecnicos.prateleira,
          margemTopo: pr.margemTop,
          margemBase: pr.margemBottom,
          margemFrente: distanciaDaBorda,
          margemFundo: distanciaDaBorda,
          minFurosPorColuna: minFuros,
          maxFurosPorColuna: maxFuros,
          espacamentoVertical: pr.espacamentoVertical,
          distanciaDaBorda,
        },
        dobradica: {
          ...normalizedRules.furos.tecnicos.dobradica,
          distanciaCentroDaBorda: fu.dobradica.distanciaCentroDaBorda,
          distanciaDobradiçaTopo: fu.dobradica.distanciaDobradiçaTopo,
          distanciaDobradiçaFundo: fu.dobradica.distanciaDobradiçaFundo,
          numeroPorPorta: Math.max(2, fu.dobradica.numeroPorPorta ?? normalizedRules.furos.tecnicos.dobradica.numeroPorPorta ?? 2),
          distribuicaoAutomatica: fu.dobradica.distribuicaoAutomatica ?? normalizedRules.furos.tecnicos.dobradica.distribuicaoAutomatica ?? true,
        },
        ...(df && {
          dobradica_fixacao: {
            ...normalizedRules.furos.tecnicos.dobradica_fixacao,
            distanciaDaBordaCalco: df.distanciaDaBordaCalco ?? normalizedRules.furos.tecnicos.dobradica_fixacao.distanciaDaBordaCalco,
            distanciaDaBordaParafusoUniao: df.distanciaDaBordaParafusoUniao ?? normalizedRules.furos.tecnicos.dobradica_fixacao.distanciaDaBordaParafusoUniao,
            distanciaEntreFurosCalco: df.distanciaEntreFurosCalco ?? normalizedRules.furos.tecnicos.dobradica_fixacao.distanciaEntreFurosCalco,
            profundidadeFuro: df.profundidadeFuro,
            diametro: df.diametro ?? normalizedRules.furos.tecnicos.dobradica_fixacao.diametro,
            diametroParafusoUniao: df.diametroParafusoUniao ?? normalizedRules.furos.tecnicos.dobradica_fixacao.diametroParafusoUniao,
            profundidadeParafusoUniao: df.profundidadeParafusoUniao ?? normalizedRules.furos.tecnicos.dobradica_fixacao.profundidadeParafusoUniao,
          },
        }),
      },
    },
  };
}

function sanitizeHingePositions(
  positions: number[] | undefined,
  alturaRefMm: number,
  distEntreFurosCalcoMm: number
): number[] {
  if (!Array.isArray(positions) || !Number.isFinite(alturaRefMm) || alturaRefMm <= 0) return [];
  const margin = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
  const halfFixationDist = Math.max(0, distEntreFurosCalcoMm / 2);
  const minY = margin + halfFixationDist;
  const maxY = Math.max(minY, alturaRefMm - margin - halfFixationDist);

  return positions
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .map((y) => clampNumber(y, minY, maxY));
}

function getShelfHolePositions(holes: TechnicalDrillHole[]): number[] {
  const yValues = holes
    .filter((h) => h.tipo === "prateleira")
    .map((h) => Number(h.y))
    .filter((y) => Number.isFinite(y));
  return Array.from(new Set(yValues.map((y) => Number(y.toFixed(3))))).sort((a, b) => a - b);
}

export function cutlistComPrecoFromBox(
  box: BoxModule,
  rules: RulesConfig,
  projectMaterialId?: string
): CutListItemComPreco[] {
  const effRules = mergeFuraçãoIntoRules(rules);
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

  /** Posições Y das dobradiças: calculadas na PORTA; a lateral usa exatamente os mesmos Y (ajustados só se ultrapassarem a altura da lateral). */
  const getHingePositionsFromDoorHeight = (
    alturaPortaMm: number,
    alturaLateralMm: number
  ): { hingePositionsDoor: number[]; hingePositionsLateral: number[] } => {
    const empty = { hingePositionsDoor: [] as number[], hingePositionsLateral: [] as number[] };
    if (!effRules || !Number.isFinite(alturaPortaMm) || alturaPortaMm <= 0) return empty;
    const numHinges = effRules.furos?.tecnicos?.dobradica?.numeroPorPorta ?? 2;
    const doorPositions = getHingeYPositions(alturaPortaMm, numHinges, effRules);
    if (doorPositions.length === 0) return empty;
    // Lateral usa os mesmos Y da porta; só ajusta se um Y sair da zona válida da lateral [70, alturaLateral-70]
    if (!Number.isFinite(alturaLateralMm) || alturaLateralMm <= 0) {
      return { hingePositionsDoor: doorPositions, hingePositionsLateral: doorPositions };
    }
    const margem = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
    const yMinLateral = margem;
    const yMaxLateral = Math.max(yMinLateral, alturaLateralMm - margem);
    const distEntreCalco = effRules.furos?.tecnicos?.dobradica_fixacao?.distanciaEntreFurosCalco ?? 32;
    const halfDistHoles = distEntreCalco / 2;
    const yMinSafe = yMinLateral + halfDistHoles;
    const yMaxSafe = Math.max(yMinSafe, yMaxLateral - halfDistHoles);
    const lateralPositions = doorPositions.map((y) => Math.max(yMinSafe, Math.min(yMaxSafe, y)));
    return { hingePositionsDoor: doorPositions, hingePositionsLateral: lateralPositions };
  };

  const makeTechnicalHolesForPanel = (
    tipo: string,
    largura: number,
    altura: number,
    espessura: number,
    contexto?: { hingePositionsMm?: number[] }
  ): TechnicalDrillHole[] => {
    if (!effRules || !Number.isFinite(largura) || !Number.isFinite(altura) || !Number.isFinite(espessura)) {
      return [];
    }
    try {
      return calculateTechnicalDrillingsForPiece(
        { tipo, largura, altura, espessura, hingePositionsMm: contexto?.hingePositionsMm },
        effRules
      );
    } catch (err) {
      console.warn(`[cutlistFromBoxes] Error generating technical holes for ${tipo}:`, err);
      return [];
    }
  };

  const toNormalizedHoles = (furacoesTecnicas: TechnicalDrillHole[]): import("../types").DrillHole[] =>
    furacoesTecnicas.map((h) => {
      const ht = h.tipo as import("../types").DrillType;
      const topByFace = isTopDrillable(h.face);
      const emitInTcn =
        topByFace ||
        ht === "dobradica" ||
        ht === "dobradica_fixacao" ||
        ht === "dobradica_parafuso_uniao" ||
        ht === "prateleira";
      return {
        x: h.x,
        y: h.y,
        diameter: h.diametro,
        depth: h.profundidade,
        holeType: ht,
        topDrillable: emitInTcn,
      };
    });

  const firstDoorPanel = modelo.paineis.find(
    (panel) => panel.tipo === "porta_dupla" || panel.tipo === "porta_simples" || panel.tipo === "porta_correr"
  );
  const doorHeightMm = firstDoorPanel?.altura_mm ?? (modelo.portas.length > 0 ? modelo.portas[0].altura_mm : undefined);
  const distEntreFixacao = effRules.furos.tecnicos.dobradica_fixacao.distanciaEntreFurosCalco;

  modelo.paineis.forEach((p) => {
    if (!p || !p.id || !p.tipo || !Number.isFinite(p.largura_mm) || !Number.isFinite(p.altura_mm) || !Number.isFinite(p.espessura_mm)) {
      console.warn("[cutlistFromBoxes] Skipping invalid painel:", p);
      return;
    }
    const grainDirection: GrainDirection = p.orientacaoFibra ?? "none";
    const isLateral = p.tipo === "lateral_esquerda" || p.tipo === "lateral_direita";
    const isDoor = p.tipo === "porta_simples" || p.tipo === "porta_dupla" || p.tipo === "porta_correr";

    let hingePositions: number[] = [];
    if (isLateral && Number.isFinite(doorHeightMm)) {
      const { hingePositionsLateral } = getHingePositionsFromDoorHeight(Number(doorHeightMm), p.altura_mm);
      hingePositions = sanitizeHingePositions(hingePositionsLateral, p.altura_mm, distEntreFixacao);
    } else if (isDoor) {
      const rawDoorHinges = getHingeYPositions(
        p.altura_mm,
        effRules.furos.tecnicos.dobradica.numeroPorPorta,
        effRules
      );
      hingePositions = sanitizeHingePositions(rawDoorHinges, p.altura_mm, distEntreFixacao);
    }

    const furacoesTecnicas = makeTechnicalHolesForPanel(
      p.tipo,
      p.largura_mm,
      p.altura_mm,
      p.espessura_mm,
      hingePositions.length > 0 ? { hingePositionsMm: hingePositions } : undefined
    );
    const shelfHolePositions = getShelfHolePositions(furacoesTecnicas);

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
      furacoesTecnicas,
      holes: toNormalizedHoles(furacoesTecnicas),
      hingePositionsMm: hingePositions.length > 0 ? hingePositions : undefined,
      shelfHolePositions: shelfHolePositions.length > 0 ? shelfHolePositions : undefined,
    });
  });

  // Portas já vêm em modelo.paineis (porta_simples, porta_dupla, porta_correr); não duplicar a partir de modelo.portas
  // (modelo.portas é usado apenas para custos/ferragens; a cutlist de peças usa apenas paineis)

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
      hingePositionsMm: undefined,
      shelfHolePositions: undefined,
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