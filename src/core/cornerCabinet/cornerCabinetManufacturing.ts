import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import {
  getDefaultOfficialMaterial,
  resolveCostaMaterialForBox,
  resolveCostaThicknessMm,
} from "../materials/materials.api";
import { getMaterialForBox, getIndustrialMaterial } from "../materials/service";
import { computeBoxProfundidadeAlvoFromBoxLike } from "../box/boxDepthModel";
import { getCornerCabinetConfig, computeCornerLayoutForBox, inferCornerSideFromBox } from "./cornerCabinetRules";
import { getSettings } from "../settings/settingsService";

type PainelCorner = {
  id: string;
  tipo: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  material: string;
  materialId?: string;
  orientacaoFibra: "horizontal" | "vertical" | "none";
  quantidade: number;
  custo: number;
};

const clampPositive = (value: number) => Math.max(0, Math.round(value));

const buildId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

function getStructuralPanelId(
  box: BoxModule,
  kind: "cima" | "fundo" | "lateral_esquerda" | "lateral_direita" | "costa"
): string {
  const id = box.panelIds?.[kind];
  if (typeof id === "string") return id;
  const prefix =
    kind === "lateral_esquerda" ? "lateral-esquerda" : kind === "lateral_direita" ? "lateral-direita" : kind;
  return buildId(prefix, 0);
}

function getArrayPanelId(box: BoxModule, kind: "prateleiras" | "portas" | "gavetas", index: number): string {
  const arr = box.panelIds?.[kind];
  if (Array.isArray(arr) && arr[index] != null) return arr[index];
  const prefix = kind === "prateleiras" ? "prateleira" : kind === "portas" ? "porta" : "gaveta";
  return buildId(prefix, index);
}

function getFixedFrontPanelId(box: BoxModule): string {
  return box.panelIds?.frente_fixa ?? buildId("frente-fixa", 0);
}

const getEspessura = (box: BoxModule) => {
  const fromBox = Number(box.espessura);
  if (fromBox > 0) return fromBox;
  const mid = getMaterialForBox(box, undefined);
  const eMat = Number(getIndustrialMaterial(mid || "mdf_branco").espessuraPadrao);
  if (Number.isFinite(eMat) && eMat > 0) return eMat;
  return getDefaultOfficialMaterial().industrialDefaults!.espessuraPadrao;
};

const getNomeMaterial = (box: BoxModule) =>
  getIndustrialMaterial(getMaterialForBox(box, undefined) || "mdf_branco").nome;

function calcularCustoPainel(
  painel: Omit<PainelCorner, "custo">,
  materialInfo: ReturnType<typeof getIndustrialMaterial>
) {
  const area_m2 = (painel.largura_mm / 1000) * (painel.altura_mm / 1000);
  return area_m2 * materialInfo.custo_m2;
}

export function gerarPaineisCorner(box: BoxModule, rules: RulesConfig): PainelCorner[] {
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  if (!cfg) return [];

  const settings = getSettings();
  const layout = computeCornerLayoutForBox(box, {
    gapVerticalMm: settings.portas.portaGapVerticalMm,
    gapHorizontalMm: settings.portas.portaGapHorizontalMm,
    doorPosZOffsetMm: settings.portas.portaPosZOffsetMm,
  });
  if (!layout) return [];

  const largura = Number(box.dimensoes.largura) || 0;
  const altura = Number(box.dimensoes.altura) || 0;
  const profundidadeExterna = Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || 0;
  const espessuraCostaMm = resolveCostaThicknessMm(box);
  const profundidadeInterna = clampPositive(
    computeBoxProfundidadeAlvoFromBoxLike(
      {
        dimensoes: { profundidade: profundidadeExterna },
        espessura: box.espessura,
        portaTipo: box.portaTipo,
        doorsLayer: box.doorsLayer,
        costaAtiva: box.costaAtiva,
      },
      espessuraCostaMm
    ).profundidadeInternaUtilMm
  );
  const espessura = getEspessura(box);
  const material = getNomeMaterial(box);
  const bodyMaterialId = getMaterialForBox(box, undefined) || "mdf_branco";
  const costaMat = resolveCostaMaterialForBox(box, bodyMaterialId);
  const alturaLateral = rules.madeira.calcularAlturaLaterais
    ? clampPositive(altura - espessura * 2)
    : clampPositive(altura);
  const larguraLateral = profundidadeInterna;
  const profundidadeUtil = profundidadeInterna;

  const paineis: PainelCorner[] = [];

  paineis.push(
    {
      id: getStructuralPanelId(box, "cima"),
      tipo: "cima",
      largura_mm: clampPositive(largura),
      altura_mm: clampPositive(profundidadeUtil),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: getStructuralPanelId(box, "fundo"),
      tipo: "fundo",
      largura_mm: clampPositive(largura),
      altura_mm: clampPositive(profundidadeUtil),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: getStructuralPanelId(box, "lateral_esquerda"),
      tipo: "lateral_esquerda",
      largura_mm: larguraLateral,
      altura_mm: alturaLateral,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: getStructuralPanelId(box, "lateral_direita"),
      tipo: "lateral_direita",
      largura_mm: larguraLateral,
      altura_mm: alturaLateral,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    },
    {
      id: getStructuralPanelId(box, "costa"),
      tipo: "COSTA",
      largura_mm: clampPositive(largura),
      altura_mm: clampPositive(altura),
      espessura_mm: costaMat.thicknessMm,
      material: costaMat.label,
      materialId: costaMat.materialId,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    }
  );

  const shelfDepthRecess = 5 + layout.shelfDepthExtraRecessMm;
  const larguraPrateleira = clampPositive(largura - espessura * 2 - 2);
  const profundidadePrateleira = clampPositive(profundidadeInterna - shelfDepthRecess);
  const nPrateleiras = Math.max(0, Math.floor(box.prateleiras));
  for (let i = 0; i < nPrateleiras; i++) {
    paineis.push({
      id: getArrayPanelId(box, "prateleiras", i),
      tipo: "prateleira",
      largura_mm: larguraPrateleira,
      altura_mm: profundidadePrateleira,
      espessura_mm: espessura,
      material,
      orientacaoFibra: "none",
      quantidade: 1,
      custo: 0,
    });
  }

  paineis.push({
    id: getFixedFrontPanelId(box),
    tipo: "frente_fixa",
    largura_mm: clampPositive(layout.fixedFrontWidthMm),
    altura_mm: clampPositive(layout.doorHeightMm),
    espessura_mm: espessura,
    material,
    orientacaoFibra: "vertical",
    quantidade: 1,
    custo: 0,
  });

  if (box.portaTipo !== "sem_porta") {
    paineis.push({
      id: getArrayPanelId(box, "portas", 0),
      tipo: "porta_simples",
      largura_mm: clampPositive(layout.doorWidthMm),
      altura_mm: clampPositive(layout.doorHeightMm),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    });
  }

  const materialInfo = getIndustrialMaterial(bodyMaterialId);
  const costaMaterialInfo = getIndustrialMaterial(costaMat.materialId);
  return paineis.map((painel) => ({
    ...painel,
    custo:
      calcularCustoPainel(
        painel,
        painel.tipo === "COSTA" ? costaMaterialInfo : materialInfo
      ) * painel.quantidade,
  }));
}

/** Lado da frente fixa para furação (calço): oposto ao lado da dobradiça da porta. */
export function getCornerFixedFrontHingeSide(box: BoxModule): "left" | "right" {
  const side = inferCornerSideFromBox(box);
  return side === "right" ? "left" : "right";
}
