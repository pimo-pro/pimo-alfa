import type { CutListItem, CutListItemComPreco } from "../types";
import { listOfficialMaterials, resolveMaterial } from "../materials/materials.api";
import { materialFallbackEurM2FromCentral } from "./centralPricingConfig";

// Interface para preço de material
interface PrecoMaterial {
  material: string;
  espessura: number;
  precoPorM2: number; // euros por m²
}

// Preços: uma linha por chapa industrial oficial (espessura real da variante).
const PRECOS_MATERIAIS: PrecoMaterial[] = listOfficialMaterials()
  .filter((m) => m.industrial && m.industrialDefaults)
  .map((m) => {
    const esp = Number(m.industrialDefaults?.espessuraPadrao) || 0;
    const precoPorM2 = Number(m.industrialDefaults?.custo_m2) || 0;
    return { material: m.label, espessura: esp, precoPorM2 };
  });

/**
 * Obtém o preço por m² de um material e espessura específicos
 */
export function getPrecoPorMaterial(material: string, espessura: number): number {
  const resolved = resolveMaterial(material);
  const effectiveMaterial = resolved?.label ?? material;
  const preco = PRECOS_MATERIAIS.find(
    (p) => p.material === effectiveMaterial && p.espessura === espessura
  );

  if (preco) {
    return preco.precoPorM2;
  }

  // Se não encontrar, retorna um preço padrão baseado no material
  const precoPadrao = PRECOS_MATERIAIS.find((p) => p.material === effectiveMaterial);
  if (precoPadrao) {
    // Ajusta o preço proporcionalmente à espessura
    const fatorEspessura = espessura / precoPadrao.espessura;
    return precoPadrao.precoPorM2 * fatorEspessura;
  }

  // Preço padrão se material não encontrado — SSOT /config/pricing.json
  return materialFallbackEurM2FromCentral();
}

/**
 * Calcula o preço de uma peça individual baseado nas suas dimensões e material
 */
export function calcularPrecoPeca(
  largura: number, // mm
  altura: number, // mm
  espessura: number, // mm
  material: string
): number {
  // Converter mm para metros
  const larguraM = largura / 1000;
  const alturaM = altura / 1000;
  
  // Área em m²
  const areaM2 = larguraM * alturaM;
  
  // Preço por m²
  const precoPorM2 = getPrecoPorMaterial(material, espessura);
  
  // Preço da peça
  return areaM2 * precoPorM2;
}

/**
 * Calcula preços para toda a cut list
 */
export function calcularPrecoCutList(
  cutList: CutListItem[]
): CutListItemComPreco[] {
  return cutList.map((item) => {
    const precoUnitario = calcularPrecoPeca(
      item.dimensoes.largura,
      item.dimensoes.altura,
      item.espessura,
      item.material
    );

    const precoTotal = precoUnitario * item.quantidade;

    return {
      ...item,
      precoUnitario: Number(precoUnitario.toFixed(2)),
      precoTotal: Number(precoTotal.toFixed(2)),
      espessura: item.espessura,
    };
  });
}

/**
 * Calcula o preço total de todas as peças
 */
export function calcularPrecoTotalPecas(cutListComPreco: CutListItemComPreco[]): number {
  return cutListComPreco.reduce((total, item) => total + item.precoTotal, 0);
}

/**
 * Calcula o preço total do projeto (peças + margem de segurança)
 */
export function calcularPrecoTotalProjeto(
  precoPecas: number,
  margemSeguranca: number = 0.1 // 10% padrão
): number {
  return precoPecas * (1 + margemSeguranca);
}
