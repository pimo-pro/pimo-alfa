import { calcularProjeto } from "../core/calculator/woodCalculator";
import { buildFerragens } from "../core/ferragens/ferragens";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { buildEffectiveDrillingRules, buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";
import {
  calcularPrecoCutList,
  calcularPrecoTotalPecas,
  calcularPrecoTotalProjeto,
} from "../core/pricing/pricing";
import { calcularPrecosAcessorios } from "../core/acessorios/acessorios";
import type {
  BoxModelInstance,
  BoxModule,
  ChangelogEntry,
  Dimensoes,
  Material,
  ProjetoConfig,
  ResultadosCalculo,
  TipoBorda,
  TipoFundo,
  WorkspaceBox,
} from "../core/types";
import { ensureBoxPanelIds } from "../core/box/panelIds";
import type { ProjectState, ViewerSettings } from "./projectTypes";
import { validateBoxModels } from "../core/rules/validation";
import {
  computeLayoutWarnings,
  type LayoutWarnings,
} from "../core/layout/layoutWarnings";
import { mmToM } from "../utils/units";
import { loadProfiles } from "../core/rules/rulesProfilesStorage";
import { defaultRulesConfig, normalizeRulesConfig } from "../core/rules/rulesConfig";
import type { RulesProfilesConfig } from "../core/rules/rulesProfiles";
import { regenerateLayersForBox } from "../services/boxLayersService";
import { extractDrawerCutlistFromLayerItems } from "../services/drawerCutlistAdapter";
import { getDefaultOfficialMaterial } from "../core/materials/materials.api";

/** Extrai rules do perfil ativo; fallback para default se não existir. */
function getRulesFromProfiles(config: RulesProfilesConfig) {
  const perfil = config.perfis.find((p) => p.id === config.perfilAtivoId);
  return normalizeRulesConfig(perfil?.rules ?? defaultRulesConfig);
}

const defaultOfficialMaterial = getDefaultOfficialMaterial();
const defaultMaterial: Material = {
  tipo: defaultOfficialMaterial.canonicalId,
  espessura: defaultOfficialMaterial.industrialDefaults?.espessuraPadrao ?? 19,
  precoPorM2: defaultOfficialMaterial.industrialDefaults?.custo_m2 ?? 25.0,
};

const defaultDimensoes: Dimensoes = {
  largura: 1800,
  altura: 2000,
  profundidade: 400,
};

const defaultTipoBorda: TipoBorda = "reta";
const defaultTipoFundo: TipoFundo = "recuado";

const defaultViewerSettings: ViewerSettings = {
  showPanelEdges: true,
  hiddenPanels: [],
  explodedViewEnabled: false,
  explodedViewIntensity: 0.35,
  hideAllPanels: false,
  showCeiling: true,
  wallEditMode: false,
  mousePreset: "cad",
  backgroundMode: "studio",
  materialQuality: "standard",
  enableReflections: false,
  photoModeEnabled: false,
  highlightEnabled: false,
  rulerEnabled: false,
  ultraPerformanceModeOptions: {
    enabled: false,
    mode: "balanced",
  },
};

const createBox = (
  id: string,
  nome: string,
  dimensoes: Dimensoes,
  espessura: number,
  models: BoxModelInstance[],
  tipoBorda: TipoBorda = defaultTipoBorda,
  tipoFundo: TipoFundo = defaultTipoFundo
): BoxModule => ({
  id,
  nome,
  dimensoes,
  espessura,
  tipoBorda,
  tipoFundo,
  models: models ?? [],
  prateleiras: 0,
  portaTipo: "porta_simples",
  gavetas: 1,
  alturaGaveta: 200,
  ferragens: [],
  cutList: [],
  cutListComPreco: [],
  doorsLayer: [],
  drawersLayer: [],
  estrutura3D: {
    pecas: [],
    dimensoesTotais: {
      largura: dimensoes.largura,
      altura: dimensoes.altura,
      profundidade: dimensoes.profundidade,
    },
    centro: {
      x: 0,
      y: dimensoes.altura / 2,
      z: 0,
    },
  },
  precoTotalPecas: 0,
});

export type CreateWorkspaceBoxOverrides = {
  prateleiras?: number;
  portaTipo?: WorkspaceBox["portaTipo"];
  gavetas?: number;
  drawerHeightMode?: WorkspaceBox["drawerHeightMode"];
  drawerType?: WorkspaceBox["drawerType"];
  panelIds?: WorkspaceBox["panelIds"];
  cabinetType?: "lower" | "upper";
  pe_cm?: number;
  feetHeight?: number;
  feetOffsetFront?: number;
  feetEnabled?: boolean;
  piHideDrawerHoles?: boolean;
};

export const createWorkspaceBox = (
  id: string,
  nome: string,
  dimensoes: Dimensoes,
  espessura: number,
  posicaoX_mm: number,
  models: BoxModelInstance[] = [],
  tipoBorda: TipoBorda = defaultTipoBorda,
  tipoFundo: TipoFundo = defaultTipoFundo,
  catalogItemId?: string,
  overrides?: CreateWorkspaceBoxOverrides
): WorkspaceBox => {
  let prateleiras = overrides?.prateleiras ?? 0;
  let portaTipo = overrides?.portaTipo ?? "sem_porta";
  let gavetas = overrides?.gavetas ?? 0;
  if (gavetas > 0) {
    portaTipo = "sem_porta";
    prateleiras = 0;
  }
  if (portaTipo !== "sem_porta") {
    gavetas = 0;
  }
  if (prateleiras > 0) {
    gavetas = 0;
  }
  const drawerHeightMode = overrides?.drawerHeightMode ?? "equal";
  const drawerType = overrides?.drawerType ?? "normal";
  const panelIds = ensureBoxPanelIds(overrides?.panelIds, { prateleiras, portaTipo, gavetas });
  const cabinetType = overrides?.cabinetType;
  const feetHeight = Math.max(40, overrides?.feetHeight ?? ((overrides?.pe_cm ?? 10) * 10));
  const pe_cm = feetHeight / 10;
  const feetOffsetFront = Math.max(0, overrides?.feetOffsetFront ?? 100);
  const feetEnabled = overrides?.feetEnabled ?? (cabinetType === "lower");
  const alturaMm = dimensoes?.altura ?? 0;
  const posicaoY_mm =
    cabinetType === "lower" && feetEnabled !== false
      ? (feetHeight ?? 100) + alturaMm / 2
      : cabinetType === "upper"
        ? 1500 + alturaMm / 2
        : 0;
  
  const tempBox: WorkspaceBox = {
    id,
    nome,
    dimensoes,
    espessura,
    tipoBorda,
    tipoFundo,
    models: models ?? [],
    prateleiras,
    portaTipo,
    gavetas,
    alturaGaveta: 200,
    drawerHeightMode,
    drawerType,
    posicaoX_mm,
    posicaoY_mm,
    posicaoZ_mm: 0,
    rotacaoY_90: false,
    rotacaoY: 0,
    manualPosition: false,
    catalogItemId,
    cabinetType,
    pe_cm,
    feetHeight,
    feetOffsetFront,
    feetEnabled,
    autoRotateEnabled: true,
    panelIds,
    doorsLayer: [],
    drawersLayer: [],
    locked: false,
    piHideDrawerHoles: overrides?.piHideDrawerHoles === true,
  };
  
  // Regenerate layers based on portaTipo and gavetas
  const layers = regenerateLayersForBox(tempBox);
  return {
    ...tempBox,
    ...layers,
  };
};

/** Projeto inicia sem caixas; o utilizador adiciona pelo catálogo ou "Adicionar caixote". */
const defaultWorkspaceBoxes: WorkspaceBox[] = [];

export const defaultState: ProjectState = {
  projectName: "Novo Projeto",
  tipoProjeto: "Estante de Parede – 3 Portas",
  material: defaultMaterial,
  materialId: "",
  dimensoes: defaultDimensoes,
  quantidade: 1,
  boxes: [],
  selectedBoxId: "",
  workspaceBoxes: defaultWorkspaceBoxes,
  selectedWorkspaceBoxId: "",

  selectedCaixaId: "",
  selectedCaixaModelUrl: null,
  selectedModelInstanceId: null,
  resultados: null,
  ultimaAtualizacao: null,
  lastAutosaveTime: null,
  design: null,
  cutList: null,
  cutListComPreco: null,
  extractedPartsByBoxId: {},
  ruleViolations: [],
  modelPositionsByBoxId: {},
  layoutWarnings: { collisions: [], outOfBounds: [] },
  estrutura3D: null,
  acessorios: null,
  precoTotalPecas: null,
  precoTotalAcessorios: null,
  precoTotalProjeto: null,
  activeViewerTool: "select",
  viewerSettings: defaultViewerSettings,
  ...((): { rulesProfiles: RulesProfilesConfig; rules: ReturnType<typeof normalizeRulesConfig> } => {
    const profiles = loadProfiles();
    return { rulesProfiles: profiles, rules: getRulesFromProfiles(profiles) };
  })(),
  rulesProfileId: undefined,
  estaCarregando: false,
  erro: null,
  changelog: [],
};

const buildConfig = (state: ProjectState): ProjetoConfig => {
  const selectedWorkspace = getSelectedWorkspaceBox(state);
  const selectedBox = getSelectedBox(state);
  return {
    tipo: state.tipoProjeto,
    material: state.material,
    dimensoes: selectedWorkspace?.dimensoes ?? selectedBox?.dimensoes ?? state.dimensoes,
    quantidade: state.quantidade,
  };
};

const calcularResultadosBoxes = (state: ProjectState): ResultadosCalculo | null => {
  if (!state.boxes || state.boxes.length === 0) {
    return null;
  }
  const totals = state.boxes.reduce(
    (acc, box) => {
      const resultados = calcularProjeto({
        tipo: state.tipoProjeto,
        material: state.material,
        dimensoes: box.dimensoes,
        quantidade: state.quantidade,
      });
      return {
        numeroPecas: acc.numeroPecas + resultados.numeroPecas,
        numeroPaineis: acc.numeroPaineis + resultados.numeroPaineis,
        areaTotal: acc.areaTotal + resultados.areaTotal,
        desperdicio: acc.desperdicio + resultados.desperdicio,
        precoMaterial: acc.precoMaterial + resultados.precoMaterial,
        precoFinal: acc.precoFinal + resultados.precoFinal,
      };
    },
    {
      numeroPecas: 0,
      numeroPaineis: 0,
      areaTotal: 0,
      desperdicio: 0,
      precoMaterial: 0,
      precoFinal: 0,
    }
  );
  const desperdicioPercentual =
    totals.areaTotal > 0 ? (totals.desperdicio / totals.areaTotal) * 100 : 0;
  return { ...totals, desperdicioPercentual };
};

export const applyResultados = (state: ProjectState): ProjectState => {
  try {
    // Sincroniza boxes com workspaceBoxes (single source of truth para o viewer e cálculo).
    const boxes = buildBoxesFromWorkspace(state);
    const stateWithBoxes = { ...state, boxes };
    const resultados =
      boxes.length > 0
        ? calcularResultadosBoxes(stateWithBoxes)
        : calcularProjeto(buildConfig(stateWithBoxes));
    return {
      ...stateWithBoxes,
      resultados,
      ultimaAtualizacao: new Date(),
      estaCarregando: false,
      erro: null,
    };
  } catch (error) {
    return {
      ...state,
      boxes: buildBoxesFromWorkspace(state),
      resultados: null,
      estaCarregando: false,
      erro: error instanceof Error ? error.message : "Erro ao calcular projeto",
    };
  }
};

export const appendChangelog = (
  prev: ChangelogEntry[],
  entry: Omit<ChangelogEntry, "id">
): ChangelogEntry[] => {
  return [
    {
      ...entry,
      id: `${entry.type}-${entry.timestamp.getTime()}-${prev.length + 1}`,
    },
    ...prev,
  ].slice(0, 100);
};

export const recomputeState = (
  prev: ProjectState,
  partial: Partial<ProjectState>,
  withLoading: boolean
): ProjectState => {
  const nextState: ProjectState = {
    ...prev,
    ...partial,

    ...(withLoading ? { estaCarregando: true } : null),
  };

  return applyResultados(nextState);
};

const buildBoxDesign = (prev: ProjectState, box: BoxModule): BoxModule => {
  // Caixa só com modelo(s) CAD (módulo completo): não gerar peças paramétricas; só contam as peças extraídas do GLB
  const isCadOnlyBox =
    (box.models?.length ?? 0) > 0 && box.prateleiras === 0 && box.gavetas === 0;
  if (isCadOnlyBox) {
    const ferragens = buildFerragens(0, box.portaTipo, 0);
    return {
      ...box,
      ferragens,
      cutList: [],
      cutListComPreco: [],
      estrutura3D: null,
      precoTotalPecas: 0,
    };
  }

  // Pipeline moderno: cutlistFromBoxes é a única fonte de peças paramétricas (modelo FINAL).
  const parametricFromBox = cutlistComPrecoFromBox(box, prev.rules, prev.materialId);
  const hasDrawers = (box.drawersLayer?.length ?? 0) > 0;
  const parametricFiltered = hasDrawers
    ? parametricFromBox.filter((item) => item.tipo !== "gaveta_frente" && item.tipo !== "gaveta")
    : parametricFromBox;

  const drawerCutlist = hasDrawers
    ? extractDrawerCutlistFromLayerItems(box.drawersLayer!, prev.material.tipo)
    : [];
  const hasShelves = Math.max(0, Math.floor(box.prateleiras ?? 0)) > 0;
  const effRules = buildEffectiveDrillingRules(prev.rules);
  const drawerWithHoles = drawerCutlist.map((item) => {
    const result = buildPanelDrillingResult(
      {
        tipo: item.tipo,
        larguraMm: item.dimensoes.largura,
        alturaMm: item.dimensoes.altura,
        espessuraMm: item.espessura,
        hasShelves,
        hasDrawers,
      },
      effRules
    );
    const drillHoles =
      result.success && result.data?.drillHoles?.length ? result.data.drillHoles : [];
    return { ...item, drillHoles };
  });

  const combinedCutList = [...parametricFiltered, ...drawerWithHoles];
  const cutListComPreco = calcularPrecoCutList(combinedCutList);
  const precoTotalPecas = calcularPrecoTotalPecas(cutListComPreco);
  const ferragensBase = buildFerragens(box.prateleiras, box.portaTipo, box.gavetas);
  const ferragens =
    box.cabinetType === "lower" && box.feetEnabled !== false
      ? [
          ...ferragensBase,
          {
            id: "pe-cozinha-regulavel",
            nome: "Pé de cozinha regulável",
            tipo: "pe_regulavel",
            quantidade: 4,
            precoUnitario: 0,
          },
        ]
      : ferragensBase;

  return {
    ...box,
    ferragens,
    cutList: combinedCutList,
    cutListComPreco,
    estrutura3D: null,
    precoTotalPecas,
  };
};

export const getSelectedBox = (state: ProjectState): BoxModule | undefined => {
  return state.boxes.find((box) => box.id === state.selectedBoxId) ?? state.boxes[0];
};

export const getSelectedWorkspaceBox = (state: ProjectState): WorkspaceBox | undefined => {
  return (
    state.workspaceBoxes.find((box) => box.id === state.selectedWorkspaceBoxId) ??
    state.workspaceBoxes[0]
  );
};

export const convertWorkspaceToBox = (box: WorkspaceBox): BoxModule => {
  const panelIds = ensureBoxPanelIds(box.panelIds, {
    prateleiras: box.prateleiras,
    portaTipo: box.portaTipo,
    gavetas: box.gavetas,
  });
  return {
    ...createBox(
      box.id,
      box.nome,
      box.dimensoes,
      box.espessura,
      box.models ?? [],
      box.tipoBorda,
      box.tipoFundo
    ),
    prateleiras: box.prateleiras,
    portaTipo: box.portaTipo,
    gavetas: box.gavetas,
    alturaGaveta: box.alturaGaveta,
    cabinetType: box.cabinetType,
    pe_cm: box.pe_cm,
    feetHeight: box.feetHeight,
    feetOffsetFront: box.feetOffsetFront,
    feetEnabled: box.feetEnabled,
    panelIds,
    material: box.material,
    doorsLayer: box.doorsLayer ?? [],
    drawersLayer: box.drawersLayer ?? [],
    catalogItemId: box.catalogItemId,
    baseCabinetId: box.baseCabinetId,
    piHideDrawerHoles: box.piHideDrawerHoles === true,
  };
};

export const buildBoxesFromWorkspace = (state: ProjectState): BoxModule[] => {
  return state.workspaceBoxes.map((box) => convertWorkspaceToBox(box));
};

/** Deriva dimensões aproximadas do modelo a partir das peças extraídas (bbox máximo). */
function getModelDimensoesFromExtracted(
  extractedByBoxId: ProjectState["extractedPartsByBoxId"]
): Record<string, Record<string, import("../core/types").Dimensoes>> {
  const out: Record<string, Record<string, import("../core/types").Dimensoes>> = {};
  for (const [boxId, byInstance] of Object.entries(extractedByBoxId ?? {})) {
    if (!byInstance || typeof byInstance !== "object") continue;
    out[boxId] = {};
    for (const [instanceId, parts] of Object.entries(byInstance)) {
      if (!Array.isArray(parts) || parts.length === 0) continue;
      let largura = 0;
      let altura = 0;
      let profundidade = 0;
      for (const p of parts) {
        const d = p.dimensoes;
        if (d.largura > largura) largura = d.largura;
        if (d.altura > altura) altura = d.altura;
        if (d.profundidade > profundidade) profundidade = d.profundidade;
      }
      out[boxId][instanceId] = { largura, altura, profundidade };
    }
  }
  return out;
}

/** Agrega avisos de layout (colisões e fora dos limites) para todo o estado. */
function computeLayoutWarningsFromState(prev: ProjectState): LayoutWarnings {
  const collisions: LayoutWarnings["collisions"] = [];
  const outOfBounds: LayoutWarnings["outOfBounds"] = [];
  const dimsByBox = getModelDimensoesFromExtracted(prev.extractedPartsByBoxId);
  const positionsByBox = prev.modelPositionsByBoxId ?? {};

  for (const box of prev.workspaceBoxes ?? []) {
    const boxDims = prev.boxes?.find((b) => b.id === box.id)?.dimensoes ?? box.dimensoes;
    const boxDimsM = {
      width: mmToM(boxDims.largura),
      height: mmToM(boxDims.altura),
      depth: mmToM(boxDims.profundidade),
    };
    const modelDims = dimsByBox[box.id];
    const modelPositions = positionsByBox[box.id];
    const models = box.models ?? [];
    if (models.length === 0) continue;

    const positionsAndSizes = models
      .map((m) => {
        const pos = modelPositions?.[m.id] ?? { x: 0, y: boxDimsM.height / 2, z: 0 };
        const dims = modelDims?.[m.id];
        const sizeM = dims
          ? { width: mmToM(dims.largura), height: mmToM(dims.altura), depth: mmToM(dims.profundidade) }
          : { width: 0.1, height: 0.1, depth: 0.1 };
        return { modelInstanceId: m.id, position: pos, size: sizeM };
      })
      .filter((m) => m.size.width > 0 && m.size.height > 0 && m.size.depth > 0);

    const warnings = computeLayoutWarnings(box.id, boxDimsM, positionsAndSizes);
    collisions.push(...warnings.collisions);
    outOfBounds.push(...warnings.outOfBounds);
  }
  return { collisions, outOfBounds };
}

/** Calcula violações de regras dinâmicas para todas as caixas e modelos. */
export function computeRuleViolations(prev: ProjectState): import("../core/rules/types").RuleViolation[] {
  const dimsByBox = getModelDimensoesFromExtracted(prev.extractedPartsByBoxId);
  const all: import("../core/rules/types").RuleViolation[] = [];
  for (const box of prev.workspaceBoxes ?? []) {
    const modelDimensoes = dimsByBox[box.id];
    all.push(
      ...validateBoxModels(
        box.id,
        box.dimensoes,
        (box.models ?? []).map((m) => ({
          id: m.id,
          modelId: m.modelId,
          material: m.material,
          categoria: m.categoria,
        })),
        modelDimensoes
      )
    );
  }
  return all;
}

export const buildDesignState = (prev: ProjectState): Partial<ProjectState> => {
  const boxes = prev.boxes.map((box) => buildBoxDesign(prev, box));
  const selectedBox = getSelectedBox(prev);
  if (!selectedBox) {
    return {
      boxes: prev.boxes,
      design: null,
      cutList: null,
      cutListComPreco: null,
      ruleViolations: computeRuleViolations(prev),
      layoutWarnings: computeLayoutWarningsFromState(prev),
      estrutura3D: null,
      acessorios: null,
      precoTotalPecas: null,
      precoTotalAcessorios: null,
      precoTotalProjeto: null,
      ultimaAtualizacao: new Date(),
      estaCarregando: false,
      erro: "Nenhum caixote disponível para cálculo",
    };
  }
  const selectedDesign =
    boxes.find((design) => design.id === selectedBox.id) ?? boxes[0];
  const resultados = calcularResultadosBoxes({ ...prev, boxes });

  const ferragensAtivas = selectedDesign.ferragens.filter((item) => item.quantidade > 0);
  const acessoriosComPreco = calcularPrecosAcessorios(ferragensAtivas);
  const precoTotalAcessorios = acessoriosComPreco.reduce(
    (total, acc) => total + acc.precoTotal,
    0
  );

  // Incluir peças paramétricas de TODAS as caixas e peças extraídas (modelos CAD) de TODAS as caixas
  const allParametric = boxes.flatMap((b) => b.cutListComPreco ?? []);
  const allExtracted = (prev.boxes ?? []).flatMap((box) =>
    Object.values(prev.extractedPartsByBoxId?.[box.id] ?? {}).flat()
  );
  const cutListComPreco = [...allParametric, ...allExtracted];
  const precoTotalPecas = calcularPrecoTotalPecas(cutListComPreco);
  const precoProjetoBase = precoTotalPecas + precoTotalAcessorios;
  const precoTotalProjeto = calcularPrecoTotalProjeto(precoProjetoBase);

  const ruleViolations = computeRuleViolations(prev);
  const layoutWarnings = computeLayoutWarningsFromState(prev);
  const now = new Date();

  return {
    boxes,
    design: {
      cutList: cutListComPreco,
      estrutura3D: selectedDesign.estrutura3D,
      acessorios: selectedDesign.ferragens,
      timestamp: now,
    },
    cutList: cutListComPreco,
    cutListComPreco,
    ruleViolations,
    layoutWarnings,
    estrutura3D: selectedDesign.estrutura3D,
    acessorios: acessoriosComPreco,
    precoTotalPecas,
    precoTotalAcessorios,
    precoTotalProjeto,
    resultados,
    ultimaAtualizacao: now,
    estaCarregando: false,
    erro: null,
  };
};
