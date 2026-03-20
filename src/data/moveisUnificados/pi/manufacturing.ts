import type { BoxModule } from "../../../core/types";
import type { RulesConfig } from "../../../core/rules/rulesConfig";
import { getSettings } from "../../../core/settings/settingsService";
import { getMaterialForBox, getIndustrialMaterial } from "../../../core/materials/service";
import { PI_MODEL_DEFAULT_SETTINGS, clampPiNumeroGavetas, type PiModelSettings } from "./settings";
import { PI_BASE_BOX_HEIGHT_MM, PI_BASE_DEPTH_MM } from "./models";
import { buildPiDrawerLayoutForFronts } from "./drilling";

type PiPainelIndustrial = {
  id: string;
  tipo: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  material: string;
  orientacaoFibra: "horizontal" | "vertical";
  quantidade: number;
  custo: number;
};

type PiGavetaIndustrial = {
  id: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  espessura_mm: number;
  corrediças: number;
  custo: number;
};

type PiFerragemIndustrial = {
  id: string;
  tipo: string;
  quantidade: number;
  custo: number;
};

const FRONT_GAP_MM = 2;
const RUNNER_SIDE_CLEARANCE_MM = 13;

const clampPositive = (value: number) => Math.max(0, Math.round(value));

function getPiSettings(): PiModelSettings {
  const cfg = getSettings().modeloPI;
  return {
    ...PI_MODEL_DEFAULT_SETTINGS,
    ...cfg,
    numeroGavetas: clampPiNumeroGavetas(cfg?.numeroGavetas ?? PI_MODEL_DEFAULT_SETTINGS.numeroGavetas),
  };
}

function getDrawerSystemLabel(settings: PiModelSettings): string {
  return `${settings.sistemaGavetas} + Actro YOU (${settings.comprimentoCorredicaMm}mm)`;
}

export function getPiEspessuraMm(defaultEspessura: number): number {
  const fromSettings = getPiSettings().espessuraMadeiraMm;
  return Number.isFinite(fromSettings) && fromSettings > 0 ? fromSettings : defaultEspessura;
}

export function gerarPaineisPi(box: BoxModule): PiPainelIndustrial[] {
  const material = getIndustrialMaterial(getMaterialForBox(box, undefined) || "mdf_branco").nome;
  const espessura = getPiEspessuraMm(box.espessura);
  const largura = Number(box.dimensoes.largura) || 0;
  const altura = PI_BASE_BOX_HEIGHT_MM;
  const profundidade = PI_BASE_DEPTH_MM;

  const panels: PiPainelIndustrial[] = [
    {
      id: box.panelIds?.cima ?? "pi-cima-1",
      tipo: "cima",
      largura_mm: clampPositive(largura),
      altura_mm: clampPositive(profundidade),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "horizontal",
      quantidade: 1,
      custo: 0,
    },
    {
      id: box.panelIds?.fundo ?? "pi-fundo-1",
      tipo: "fundo",
      largura_mm: clampPositive(largura),
      altura_mm: clampPositive(profundidade),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "horizontal",
      quantidade: 1,
      custo: 0,
    },
    {
      id: box.panelIds?.lateral_esquerda ?? "pi-lateral-esquerda-1",
      tipo: "lateral_esquerda",
      largura_mm: clampPositive(profundidade),
      altura_mm: clampPositive(altura),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    },
    {
      id: box.panelIds?.lateral_direita ?? "pi-lateral-direita-1",
      tipo: "lateral_direita",
      largura_mm: clampPositive(profundidade),
      altura_mm: clampPositive(altura),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    },
    {
      id: box.panelIds?.costa ?? "pi-costa-1",
      tipo: "COSTA",
      largura_mm: clampPositive(largura),
      altura_mm: clampPositive(altura),
      espessura_mm: Number.isFinite(box.espessura) ? Math.max(10, Math.min(19, box.espessura)) : 10,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    },
  ];

  const drawerLayers = box.drawersLayer ?? [];
  if (drawerLayers.length === 0) {
    return panels;
  }

  const n = clampPiNumeroGavetas(drawerLayers.length);
  const layout = buildPiDrawerLayoutForFronts(altura, n);
  const gavetasIds = box.panelIds?.gavetas ?? [];

  drawerLayers.forEach((item, index) => {
    const frontHeight =
      Number.isFinite(item.height) && item.height > 0
        ? Math.round(item.height)
        : layout.frontHeightsMm[index] ?? layout.frontHeightsMm[layout.frontHeightsMm.length - 1];
    const frontWidth =
      Number.isFinite(item.width) && item.width > 0
        ? Math.round(item.width)
        : clampPositive(largura - FRONT_GAP_MM * 2);
    panels.push({
      id: gavetasIds[index] ?? item.id ?? `pi-gaveta-frente-${index + 1}`,
      tipo: "gaveta_frente",
      largura_mm: clampPositive(frontWidth),
      altura_mm: clampPositive(frontHeight),
      espessura_mm: espessura,
      material,
      orientacaoFibra: "vertical",
      quantidade: 1,
      custo: 0,
    });
  });

  return panels;
}

export function gerarGavetasPi(box: BoxModule): PiGavetaIndustrial[] {
  const settings = getPiSettings();
  const espessura = getPiEspessuraMm(box.espessura);
  const largura = Number(box.dimensoes.largura) || 0;
  const altura = PI_BASE_BOX_HEIGHT_MM;
  const profundidade = PI_BASE_DEPTH_MM;
  const numeroGavetas = clampPiNumeroGavetas(settings.numeroGavetas);
  const layout = buildPiDrawerLayoutForFronts(altura, numeroGavetas);
  const ids = box.panelIds?.gavetas ?? [];

  return layout.frontHeightsMm.map((frontHeight, index) => ({
    id: ids[index] ?? `pi-gaveta-caixa-${index + 1}`,
    largura_mm: clampPositive(largura - RUNNER_SIDE_CLEARANCE_MM * 2),
    altura_mm: clampPositive(frontHeight - FRONT_GAP_MM * 2),
    profundidade_mm: clampPositive(Math.min(settings.comprimentoCorredicaMm, profundidade - 20)),
    espessura_mm: espessura,
    corrediças: 1,
    custo: 0,
  }));
}

export function gerarFerragensPi(box: BoxModule, _rules: RulesConfig): PiFerragemIndustrial[] {
  const n = box.drawersLayer?.length ?? 0;
  if (n === 0) return [];
  const settings = getPiSettings();
  return [
    {
      id: "pi-corredicas-actro-you",
      tipo: getDrawerSystemLabel(settings),
      quantidade: n * 2,
      custo: 0,
    },
  ];
}

