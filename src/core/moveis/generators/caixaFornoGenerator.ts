import type { BoxModule, CutListItemComPreco, WorkspaceBox } from "../../types";
import type { RulesConfig } from "../../rules/rulesConfig";
import type { SeparadorItem } from "../../divSep/types";
import type { DivSepBoxLike } from "../../divSep/types";
import { resolveSeparadorCenterY } from "../../divSep/dimensions";
import type { DoorLayerItem } from "../../../models/BoxLayers";
import { getSettings } from "../../settings/settingsService";
import { getMaterialForBox, getIndustrialMaterial } from "../../materials/service";
import { resolveCostaMaterialForBox, resolveCostaThicknessMm, getDefaultOfficialMaterial } from "../../materials/materials.api";
import { getProfundidadeInternaUtilMm } from "../../box/boxDepthHelpers";
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
/** Espessura fixa dos separadores horizontais (mm). */
export const CAIXA_FORNO_SEPARADOR_ESPESSURA_MM = 10;

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
  profundidadeSeparadorMm: number;
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

export function hasCaixaFornoPorta(
  box: Pick<BoxModule, "portaTipo" | "doorsLayer">
): boolean {
  return box.portaTipo !== "sem_porta" && (box.doorsLayer?.length ?? 0) > 0;
}

export function resolveCaixaFornoPortaEspessuraMm(
  box: Pick<BoxModule, "espessura" | "doorsLayer">
): number {
  const fromDoor = Number(box.doorsLayer?.[0]?.thickness);
  if (Number.isFinite(fromDoor) && fromDoor > 0) return fromDoor;
  return Math.max(1, Number(box.espessura) || 19);
}

/** Profundidade do separador: P externa − espessura da porta (com porta) ou P externa (sem porta). */
export function resolveCaixaFornoSeparadorProfundidadeMm(
  box: Pick<BoxModule, "dimensoes" | "profundidadeExterna" | "portaTipo" | "doorsLayer" | "espessura">
): number {
  const profundidadeExternaMm =
    Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || CAIXA_FORNO_DEFAULT_DIMS.profundidade;
  if (!hasCaixaFornoPorta(box)) return clampPositive(profundidadeExternaMm);
  return clampPositive(profundidadeExternaMm - resolveCaixaFornoPortaEspessuraMm(box));
}

export function getCaixaFornoSepBottomsMm(
  sepEspessuraMm: number = CAIXA_FORNO_SEPARADOR_ESPESSURA_MM
): CaixaFornoSepPositions {
  const sep1BottomMm = CAIXA_FORNO_WASHER_MM;
  const sep2BottomMm = sep1BottomMm + sepEspessuraMm + CAIXA_FORNO_OVEN_MM;
  const sep3BottomMm = sep2BottomMm + sepEspessuraMm + CAIXA_FORNO_MICROWAVE_MM;
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
  const profundidadeSeparadorMm = resolveCaixaFornoSeparadorProfundidadeMm(box);

  return {
    ...seps,
    alturaTotalMm,
    espessuraMm,
    larguraInternaMm,
    profundidadeInternaMm,
    profundidadeSeparadorMm,
    portaInferiorAlturaMm,
    portaSuperiorAlturaMm,
    costaSuperiorAlturaMm,
    larguraUtilPortaMm,
  };
}

function separadorPositionMmFromBottom(
  bottomFaceFromFloorMm: number,
  sepEspessuraMm: number,
  boxEspessuraMm: number
): number {
  const centerFromFloorMm = bottomFaceFromFloorMm + sepEspessuraMm / 2;
  return centerFromFloorMm - boxEspessuraMm;
}

export function buildCaixaFornoSeparadores(
  box: Pick<BoxModule, "dimensoes" | "espessura" | "profundidadeExterna" | "portaTipo" | "doorsLayer">
): SeparadorItem[] {
  const boxEspessuraMm = Math.max(1, Number(box.espessura) || 19);
  const sepEspessuraMm = CAIXA_FORNO_SEPARADOR_ESPESSURA_MM;
  const seps = getCaixaFornoSepBottomsMm(sepEspessuraMm);
  const profundidadeMm = resolveCaixaFornoSeparadorProfundidadeMm(box);

  const buildOne = (id: string, bottomMm: number): SeparadorItem => ({
    id,
    positionMm: separadorPositionMmFromBottom(bottomMm, sepEspessuraMm, boxEspessuraMm),
    referenceEdge: "bottom",
    profundidadeMm,
  });

  return [
    buildOne("caixa-forno-sep1", seps.sep1BottomMm),
    buildOne("caixa-forno-sep2", seps.sep2BottomMm),
    buildOne("caixa-forno-sep3", seps.sep3BottomMm),
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
  const separadores = buildCaixaFornoSeparadores({ ...baseBox, doorsLayer });
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
    separadores: buildCaixaFornoSeparadores({ ...box, doorsLayer }),
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
  const sepEspessura = CAIXA_FORNO_SEPARADOR_ESPESSURA_MM;
  const sepProfundidade = layout.profundidadeSeparadorMm;
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
      altura_mm: sepProfundidade,
      espessura_mm: sepEspessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.separadores?.[1] ?? "sep2",
      tipo: "separador",
      largura_mm: layout.larguraInternaMm,
      altura_mm: sepProfundidade,
      espessura_mm: sepEspessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: panelIds?.separadores?.[2] ?? "sep3",
      tipo: "separador",
      largura_mm: layout.larguraInternaMm,
      altura_mm: sepProfundidade,
      espessura_mm: sepEspessura,
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
      painel.tipo === "costa_superior"
        ? costaMaterial.thicknessMm
        : painel.tipo === "separador"
          ? sepEspessura
          : espessura,
  }));
}

export function buildCutlistForCaixaForno(
  box: BoxModule,
  rules: RulesConfig,
  projectMaterialId?: string
): CutListItemComPreco[] {
  return cutlistComPrecoFromBox(box, rules, projectMaterialId);
}

const SHELF_WIDTH_CLEARANCE_MM = 2;
const SHELF_VISUAL_INSET_M = 0.001;

export type CaixaFornoSepMeshSpec = {
  name: string;
  size: [number, number, number];
  pos: [number, number, number];
};

export function getCaixaFornoSeparadorMeshSpecs(
  box: DivSepBoxLike & { separadores?: SeparadorItem[] },
  widthM: number,
  heightM: number,
  depthM: number
): CaixaFornoSepMeshSpec[] {
  const boxEspessuraMm = Math.max(1, Number(box.espessura) || 19);
  const sepThicknessM = CAIXA_FORNO_SEPARADOR_ESPESSURA_MM / 1000;
  const specs: CaixaFornoSepMeshSpec[] = [];

  for (const sep of box.separadores ?? []) {
    const profundidadeMm =
      sep.profundidadeMm ??
      resolveCaixaFornoSeparadorProfundidadeMm(box as BoxModule);
    const larguraMm =
      sep.larguraMm ?? Math.max(1, widthM * 1000 - boxEspessuraMm * 2 - SHELF_WIDTH_CLEARANCE_MM);
    const centerYAbs = resolveSeparadorCenterY(box, sep);
    const centerYM = centerYAbs / 1000 - heightM / 2;
    const shelfDepthM = Math.max(0.001, profundidadeMm / 1000);
    const centerZ = -depthM / 2 + shelfDepthM / 2 + SHELF_VISUAL_INSET_M;
    specs.push({
      name: `divsep-sep-${sep.id}`,
      size: [Math.max(0.001, larguraMm / 1000), sepThicknessM, shelfDepthM],
      pos: [0, centerYM, centerZ],
    });
  }

  return specs;
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
