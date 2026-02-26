import type { Dimensoes, ProjetoConfig, ResultadosCalculo } from "../types";
import { PANEL_DEFAULTS } from "../panel/panelConstants";

/**
 * Calcula o número de peças necessárias para um projeto
 * Baseado no tipo de projeto e dimensões
 */
export function calcularNumeroPecas(
  _tipo: string,
  dimensoes: Dimensoes,
  quantidade: number
): number {
  // Para uma estante de parede com 3 portas, calculamos:
  // - 2 painéis laterais
  // - 1 painel traseiro
  // - 3 prateleiras (ou mais dependendo da altura)
  // - 3 portas
  // - Componentes adicionais (trilhos, maçanetas, etc.)

  const pecasBase = 2; // laterais
  const pecasTraseiras = 1; // painel traseiro
  const prateleiras = Math.ceil(dimensoes.altura / 400); // 1 prateleira a cada ~400mm
  const portas = 3;
  const componentesFixacao = 4; // cantoneiras, suportes, etc.

  const totalPecasPorUnidade = pecasBase + pecasTraseiras + prateleiras + portas + componentesFixacao;

  return totalPecasPorUnidade * quantidade;
}

/**
 * Calcula o número de painéis necessários (otimizando cortes)
 */
export function calcularNumeroPaineis(
  dimensoes: Dimensoes,
  quantidade: number,
  larguraPadraoPainel: number = PANEL_DEFAULTS.largura_mm,
  alturaPadraoPainel: number = PANEL_DEFAULTS.altura_mm
): number {
  // Calcula quantos painéis são necessários baseado nas dimensões
  // Otimização simples: calcula áreas necessárias vs área disponível por painel

  const areaPorUnidade = 
    (dimensoes.largura * dimensoes.altura * 2) + // laterais
    (dimensoes.largura * dimensoes.profundidade) + // traseiro
    (dimensoes.profundidade * dimensoes.altura * 2); // topo e fundo (se houver)

  const areaNecessaria = (areaPorUnidade / 1000000) * quantidade; // converte para m²
  const areaPorPainel = (larguraPadraoPainel * alturaPadraoPainel) / 1000000; // m²

  // Adiciona 15% de margem para desperdício e cortes
  const areaComMargem = areaNecessaria * 1.15;
  
  return Math.ceil(areaComMargem / areaPorPainel);
}

/**
 * Calcula a área total de material necessária (em m²)
 */
export function calcularAreaTotal(
  dimensoes: Dimensoes,
  quantidade: number
): number {
  const areaLateral = (dimensoes.profundidade * dimensoes.altura) * 2;
  const areaTraseira = dimensoes.largura * dimensoes.altura;
  const areaTopo = dimensoes.largura * dimensoes.profundidade;
  const areaFundo = dimensoes.largura * dimensoes.profundidade;
  const areaPortas = (dimensoes.altura * dimensoes.profundidade) * 3; // 3 portas

  const areaTotal = (
    areaLateral +
    areaTraseira +
    areaTopo +
    areaFundo +
    areaPortas
  ) / 1000000; // converte mm² para m²

  return areaTotal * quantidade;
}

/**
 * Calcula o desperdício de material (em m² e percentual)
 */
export function calcularDesperdicio(
  areaTotal: number,
  numeroPaineis: number,
  larguraPadraoPainel: number = 2800,
  alturaPadraoPainel: number = 2070
): { desperdicio: number; percentual: number } {
  const areaPorPainel = (larguraPadraoPainel * alturaPadraoPainel) / 1000000; // m²
  const areaTotalPaineis = numeroPaineis * areaPorPainel;
  const desperdicio = areaTotalPaineis - areaTotal;
  const percentual = areaTotalPaineis > 0 ? (desperdicio / areaTotalPaineis) * 100 : 0;

  return {
    desperdicio: Math.max(0, desperdicio),
    percentual: Math.max(0, percentual),
  };
}

/**
 * Calcula o preço do material baseado na área e preço por m²
 */
export function calcularPrecoMaterial(
  areaTotal: number,
  precoPorM2: number
): number {
  return areaTotal * precoPorM2;
}

/**
 * Função principal que calcula todos os resultados do projeto
 */
export function calcularProjeto(config: ProjetoConfig): ResultadosCalculo {
  // Calcula os valores base
  const numeroPecas = calcularNumeroPecas(
    config.tipo,
    config.dimensoes,
    config.quantidade
  );

  const numeroPaineis = calcularNumeroPaineis(
    config.dimensoes,
    config.quantidade
  );

  const areaTotal = calcularAreaTotal(
    config.dimensoes,
    config.quantidade
  );

  const { desperdicio, percentual } = calcularDesperdicio(areaTotal, numeroPaineis);

  const precoMaterial = calcularPrecoMaterial(
    areaTotal,
    config.material.precoPorM2
  );

  // Preço final inclui margem de segurança (10%) para erros e mão de obra
  const precoFinal = precoMaterial * 1.1;

  return {
    numeroPecas,
    numeroPaineis,
    areaTotal: Number(areaTotal.toFixed(3)),
    desperdicio: Number(desperdicio.toFixed(3)),
    desperdicioPercentual: Number(percentual.toFixed(2)),
    precoMaterial: Number(precoMaterial.toFixed(2)),
    precoFinal: Number(precoFinal.toFixed(2)),
  };
}
