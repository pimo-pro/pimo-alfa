import type { BoxModule, CutListItemComPreco, WorkspaceBox } from "../../types";
import type { RulesConfig } from "../../rules/rulesConfig";
import type { SeparadorItem } from "../../divSep/types";
import type { DoorLayerItem } from "../../../models/BoxLayers";
import { getSettings } from "../../settings/settingsService";
import { getMaterialForBox, getMaterialDisplayInfo } from "../../materials/materialsService";
import { resolveCostaMaterialForBox, resolveCostaThicknessMm, getDefaultOfficialMaterial } from "../../materials/materials.api";
import { getVisualMaterialForBox, getFallbackMaterial } from "../../materials/materialLibraryV2";
import { resolveIndustrialGrainCode } from "../../materials/grainDirection";
import { getProfundidadeInternaUtilMm } from "../../box/boxDepthHelpers";
import { getIndustrialMaterial } from "../../materials/service";
import { calcularPrecoCutList } from "../../pricing/pricing";
import { cutlistComPrecoFromBox } from "../../manufacturing/cutlistFromBoxes";

export const CAIXA_FORNO_ID = "caixa_forno";
export const CAIXA_FORNO_GENERATOR = "caixaFornoGenerator";

export const CAIXA_FORNO_DEFAULT_DIMS = {
  largura: 600,
  altura: 2550,
  profundidade: 600,
} as const;

export const CAIXA_FORNO_WASHER_MM = 900;
export const CAIXA_FORNO_OVEN_MM = 600;
export const CAIXA_FORNO_MICROWAVE_MM = 400;
export const CAIXA_FORNO_DOOR_FLOOR_GAP_MM = 100;

const clampPositive = (value: number) => Math.max(0, Math.round(value));
const DOOR_GAP_MM = 3;

export type CaixaFornoSepPositions = {
  sep1BottomMm: number;
  sep2BottomMm: number;
  sep3BottomMm: number;
  upperStartMm: number;
};

export type CaixaFornoLayout = CaixaFornoSepPositions & {
  alturaTotalMm: number;
  espessuraMm: number;
  larguraInternaMm: number;
  profundidadeInternaMm: number;
  portaInferiorAlturaMm: number;
  portaSuperiorAlturaMm: number;
  costaSuperiorAlturaMm: number;
  larguraUtilPortaMm: number;
};

export type CaixaFornoCreateParams = {
  id?: string;
  nome?: string;
  largura?: number;
  altura?: number;
  profundidade?: number;
  espessura?: number;
  posicaoX_mm?: number;
};

export type CaixaFornoBoxConfig = {
  id: string;
  nome: string;
  dimensoes: { largura: number; altura: number; profundidade: number };
  espessura: number;
  tipoFundo: "sem_fundo";
  feetEnabled: false;
  feetHeight: 0;
  pe_cm: 0;
  cabinetType: "lower";
  baseCabinetId: typeof CAIXA_FORNO_ID;
  catalogItemId: typeof CAIXA_FORNO_ID;
  portaTipo: "porta_simples";
  prateleiras: 0;
  gavetas: 0;
  costaAtiva: true;
  separadores: SeparadorItem[];
  doorsLayer: DoorLayerItem[];
  panelIds: NonNullable<WorkspaceBox["panelIds"]>;
};

export function isCaixaFornoBox(box: {
  baseCabinetId?: string | null;
  catalogItemId?: string | null;
}): boolean {
  return box.baseCabinetId === CAIXA_FORNO_ID || box.catalogItemId === CAIXA_FORNO_ID;
}

export function getCaixaFornoSepBottomsMm(espessuraMm: number): CaixaFornoSepPositions {
  const sep1BottomMm = CAIXA_FORNO_WASHER_MM;
  const sep2BottomMm = sep1BottomMm + espessuraMm + CAIXA_FORNO_OVEN_MM;
  const sep3BottomMm = sep2BottomMm + espessuraMm + CAIXA_FORNO_MICROWAVE_MM;
  return {
    sep1BottomMm,
    sep2BottomMm,
    sep3BottomMm,
    upperStartMm: sep3BottomMm,
  };
}

export function computeCaixaFornoLayout(
  box: Pick<BoxModule, "dimensoes" | "espessura" | "profundidadeExterna" | "portaTipo" | "doorsLayer" | "costaAtiva">
): CaixaFornoLayout {
  const espessuraMm = Math.max(1, Number(box.espessura) || 19);
  const alturaTotalMm = Math.max(1, Number(box.dimensoes.altura) || CAIXA_FORNO_DEFAULT_DIMS.altura);
  const larguraMm = Math.max(1, Number(box.dimensoes.largura) || CAIXA_FORNO_DEFAULT_DIMS.largura);
  const profundidadeExternaMm =
    Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || CAIXA_FORNO_DEFAULT_DIMS.profundidade;
  const seps = getCaixaFornoSepBottomsMm(espessuraMm);
  const larguraInternaMm = clampPositive(larguraMm - espessuraMm * 2);
  const profundidadeInternaMm = clampPositive(
    getProfundidadeInternaUtilMm(
      {
        dimensoes: { profundidade: profundidadeExternaMm },
        espessura: espessuraMm,
        portaTipo: box.portaTipo,
        doorsLayer: box.doorsLayer,
        costaAtiva: box.costaAtiva,
      },
      resolveCostaThicknessMm(box as BoxModule)
    )
  );
  const portaInferiorAlturaMm = clampPositive(seps.sep1BottomMm - CAIXA_FORNO_DOOR_FLOOR_GAP_MM);
  const portaSuperiorAlturaMm = clampPositive(alturaTotalMm - seps.upperStartMm);
  const costaSuperiorAlturaMm = portaSuperiorAlturaMm;
  const larguraUtilPortaMm = clampPositive(larguraMm - DOOR_GAP_MM * 2);

  return {
    ...seps,
    alturaTotalMm,
    espessuraMm,
    larguraInternaMm,
    profundidadeInternaMm,
    portaInferiorAlturaMm,
    portaSuperiorAlturaMm,
    costaSuperiorAlturaMm,
    larguraUtilPortaMm,
  };
}

function separadorPositionMmFromBottom(bottomMm: number, espessuraMm: number): number {
  const centerFromFloorMm = bottomMm + espessuraMm / 2;
  return Math.max(espessuraMm / 2, centerFromFloorMm - espessuraMm);
}

export function buildCaixaFornoSeparadores(espessuraMm: number): SeparadorItem[] {
  const seps = getCaixaFornoSepBottomsMm(espessuraMm);
  return [
    {
      id: "caixa-forno-sep1",
      positionMm: separadorPositionMmFromBottom(seps.sep1BottomMm, espessuraMm),
      referenceEdge: "bottom",
    },
    {
      id: "caixa-forno-sep2",
      positionMm: separadorPositionMmFromBottom(seps.sep2BottomMm, espessuraMm),
      referenceEdge: "bottom",
    },
    {
      id: "caixa-forno-sep3",
      positionMm: separadorPositionMmFromBottom(seps.sep3BottomMm, espessuraMm),
      referenceEdge: "bottom",
    },
  ];
}

function doorCenterLocalYMm(centerFromFloorMm: number, alturaTotalMm: number): number {
  return centerFromFloorMm - alturaTotalMm / 2;
}

export function buildCaixaFornoDoorsLayer(
  box: Pick<WorkspaceBox, "id" | "dimensoes" | "espessura" | "profundidadeExterna" | "portaTipo" | "doorsLayer" | "costaAtiva">,
  existingDoors?: DoorLayerItem[]
): DoorLayerItem[] {
  const layout = computeCaixaFornoLayout(box);
  const settings = getSettings();
  const doorPosZ =
    (Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || CAIXA_FORNO_DEFAULT_DIMS.profundidade) / 2 +
    Math.max(0, settings.portas.portaPosZOffsetMm ?? 0);
  const thickness = layout.espessuraMm;
  const material =
    existingDoors?.[0]?.material ??
    existingDoors?.[0]?.materialId ??
    getDefaultOfficialMaterial().canonicalId;

  const lowerCenterFromFloor =
    CAIXA_FORNO_DOOR_FLOOR_GAP_MM + layout.portaInferiorAlturaMm / 2;
  const upperCenterFromFloor = layout.upperStartMm + layout.portaSuperiorAlturaMm / 2;

  const lowerPivotX = -layout.larguraUtilPortaMm / 2;
  const upperPivotX = -layout.larguraUtilPortaMm / 2;

  return [
    {
      id: existingDoors?.[0]?.id ?? "caixa-forno-porta-inferior",
      parentBoxId: box.id,
      groupType: "simples",
      width: layout.larguraUtilPortaMm,
      height: layout.portaInferiorAlturaMm,
      thickness,
      materialId: material,
      material,
      openDirection: "left",
      isOpen: existingDoors?.[0]?.isOpen ?? false,
      hingeSide: "left",
      pivot: "left-edge",
      posX: lowerPivotX,
      posY: doorCenterLocalYMm(lowerCenterFromFloor, layout.alturaTotalMm),
      posZ: doorPosZ,
      rotY: 0,
      verticalAdjustOrigin: "bottom",
    },
    {
      id: existingDoors?.[1]?.id ?? "caixa-forno-porta-superior",
      parentBoxId: box.id,
      groupType: "simples",
      width: layout.larguraUtilPortaMm,
      height: layout.portaSuperiorAlturaMm,
      thickness,
      materialId: existingDoors?.[1]?.material ?? material,
      material: existingDoors?.[1]?.material ?? material,
      openDirection: "left",
      isOpen: existingDoors?.[1]?.isOpen ?? false,
      hingeSide: "left",
      pivot: "left-edge",
      posX: upperPivotX,
      posY: doorCenterLocalYMm(upperCenterFromFloor, layout.alturaTotalMm),
      posZ: doorPosZ,
      rotY: 0,
      verticalAdjustOrigin: "bottom",
    },
  ];
}

export function createCaixaForno(params: CaixaFornoCreateParams = {}): CaixaFornoBoxConfig {
  const id = params.id ?? `caixa-forno-${Date.now()}`;
  const espessura = Math.max(10, params.espessura ?? 19);
  const dimensoes = {
    largura: params.largura ?? CAIXA_FORNO_DEFAULT_DIMS.largura,
    altura: params.altura ?? CAIXA_FORNO_DEFAULT_DIMS.altura,
    profundidade: params.profundidade ?? CAIXA_FORNO_DEFAULT_DIMS.profundidade,
  };
  const separadores = buildCaixaFornoSeparadores(espessura);
  const panelIds = {
    cima: `${id}-cima`,
    fundo: `${id}-fundo`,
    lateral_esquerda: `${id}-lat-esq`,
    lateral_direita: `${id}-lat-dir`,
    costa: `${id}-costa-superior`,
    prateleiras: [],
    portas: [`${id}-porta-inferior`, `${id}-porta-superior`],
    gavetas: [],
    divisores: [],
    separadores: separadores.map((s) => s.id),
  };
  const baseBox = {
    id,
    dimensoes,
    espessura,
    profundidadeExterna: dimensoes.profundidade,
    portaTipo: "porta_simples" as const,
    doorsLayer: [] as DoorLayerItem[],
    costaAtiva: true,
  };
  const doorsLayer = buildCaixaFornoDoorsLayer(baseBox);

  return {
    id,
    nome: params.nome ?? "Caixa Forno",
    dimensoes,
    espessura,
    tipoFundo: "sem_fundo",
    feetEnabled: false,
    feetHeight: 0,
    pe_cm: 0,
    cabinetType: "lower",
    baseCabinetId: CAIXA_FORNO_ID,
    catalogItemId: CAIXA_FORNO_ID,
    portaTipo: "porta_simples",
    prateleiras: 0,
    gavetas: 0,
    costaAtiva: true,
    separadores,
    doorsLayer,
    panelIds,
  };
}

export function syncCaixaFornoOnDimensoesChange<T extends WorkspaceBox>(box: T): T {
  if (!isCaixaFornoBox(box)) return box;
  const doorsLayer = buildCaixaFornoDoorsLayer(box, box.doorsLayer);
  return {
    ...box,
    separadores: buildCaixaFornoSeparadores(Math.max(1, box.espessura || 19)),
    doorsLayer,
    gavetas: 0,
    prateleiras: 0,
    feetEnabled: false,
    feetHeight: 0,
    pe_cm: 0,
    tipoFundo: "sem_fundo",
  };
}

type CaixaFornoPainelIndustrial = {
  id: string;
  tipo: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  material: string;
  orientacaoFibra: "horizontal" | "vertical" | "none";
  quantidade: number;
  custo: number;
};

export function gerarPaineisCaixaForno(box: BoxModule): CaixaFornoPainelIndustrial[] {
  const layout = computeCaixaFornoLayout(box);
  const bodyMaterialId = getMaterialForBox(box, undefined) || "mdf_branco";
  const material = getIndustrialMaterial(bodyMaterialId).nome;
  const costaMaterial = resolveCostaMaterialForBox(box, bodyMaterialId);
  const espessura = layout.espessuraMm;
  const largura = Number(box.dimensoes.largura) || 0;
  const profundidadeUtil = layout.profundidadeInternaMm;
  const panelIds = box.panelIds;

  const paineis: CaixaFornoPainelIndustrial[] = [
    {
      id: panelIds?.lateral_esquerda ?? "lat-esq",
      tipo: "lateral_esquerda",
      largura_mm: profundidadeUtil,
      altura_mm: layout.alturaTotalMm,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.lateral_direita ?? "lat-dir",
      tipo: "lateral_direita",
      largura_mm: profundidadeUtil,
      altura_mm: layout.alturaTotalMm,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.cima ?? "cima",
      tipo: "cima",
      largura_mm: largura,
      altura_mm: profundidadeUtil,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.separadores?.[0] ?? "sep1",
      tipo: "separador",
      largura_mm: layout.larguraInternaMm,
      altura_mm: profundidadeUtil,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.separadores?.[1] ?? "sep2",
      tipo: "separador",
      largura_mm: layout.larguraInternaMm,
      altura_mm: profundidadeUtil,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.separadores?.[2] ?? "sep3",
      tipo: "separador",
      largura_mm: layout.larguraInternaMm,
      altura_mm: profundidadeUtil,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.portas?.[0] ?? "porta-inferior",
      tipo: "porta_inferior",
      largura_mm: layout.larguraUtilPortaMm,
      altura_mm: layout.portaInferiorAlturaMm,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.portas?.[1] ?? "porta-superior",
      tipo: "porta_superior",
      largura_mm: layout.larguraUtilPortaMm,
      altura_mm: layout.portaSuperiorAlturaMm,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.costa ?? "costa-superior",
      tipo: "costa_superior",
      largura_mm: layout.larguraInternaMm,
      altura_mm: layout.costaSuperiorAlturaMm,
      espessura_mm: costaMaterial.thicknessMm,
      material: costaMaterial.label,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    },
  ];

  const materialInfo = getIndustrialMaterial(bodyMaterialId);
  return paineis.map((painel) => ({
    ...painel,
    custo: 0,
    material:
      painel.tipo === "costa_superior" ? costaMaterial.label : materialInfo.nome,
    espessura_mm:
      painel.tipo === "costa_superior" ? costaMaterial.thicknessMm : espessura,
  }));
}

export function buildCutlistForCaixaForno(
  box: BoxModule,
  rules: RulesConfig,
  projectMaterialId?: string
): CutListItemComPreco[] {
  if (!isCaixaFornoBox(box)) {
    return cutlistComPrecoFromBox(box, rules, projectMaterialId);
  }

  const paineis = gerarPaineisCaixaForno(box);
  const materialId = getMaterialForBox(box, projectMaterialId) || undefined;
  const matInfo = getMaterialDisplayInfo(materialId || "mdf_branco");
  const material = matInfo.label;
  const costaMaterial = resolveCostaMaterialForBox(box, materialId || "mdf_branco");
  const visualMaterial = materialId
    ? getVisualMaterialForBox(box, projectMaterialId)
    : getFallbackMaterial();
  const profundidadeExternaMm = Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || 0;
  const profundidadeInternaUtilMm = computeCaixaFornoLayout(box).profundidadeInternaMm;

  const items = paineis.map((p) => {
    const isCosta = p.tipo === "costa_superior";
    const isDoor = p.tipo === "porta_inferior" || p.tipo === "porta_superior";
    const grainDirection = resolveIndustrialGrainCode({ tipo: isDoor ? "porta_simples" : p.tipo });
    const label = getCaixaFornoPieceLabel(p.tipo);
    return {
      id: p.id,
      nome: `${box.nome} — ${label}`,
      quantidade: 1,
      dimensoes: {
        largura: p.largura_mm,
        altura: p.altura_mm,
        profundidade: p.espessura_mm,
      },
      espessura: p.espessura_mm,
      material: isCosta ? costaMaterial.label : material,
      tipo: p.tipo,
      sourceType: "parametric" as const,
      boxId: box.id,
      materialId: isCosta ? costaMaterial.materialId : materialId,
      visualMaterial,
      grainDirection,
      drillHoles: [],
      metadata: {
        panelId: p.id,
        caixaFornoPiece: p.tipo,
        industrialLabel: label,
      },
      boxProfundidadeExternaMm: profundidadeExternaMm,
      boxProfundidadeInternaUtilMm: profundidadeInternaUtilMm,
    };
  });

  return calcularPrecoCutList(items);
}

export function getCaixaFornoPieceLabel(tipo: string): string {
  const map: Record<string, string> = {
    lateral_esquerda: "Lat esq",
    lateral_direita: "Lat dir",
    cima: "Cima",
    separador: "Separador",
    porta_inferior: "Porta inferior",
    porta_superior: "Porta superior",
    costa_superior: "Costa superior",
  };
  return map[tipo] ?? tipo;
}
