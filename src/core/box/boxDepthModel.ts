/**
 * Modelo alvo de profundidade (FASE 1 — desenho PIMO).
 *
 * Regras de produto (referência):
 * - L/A/P externos: `dimensoes` continuam a ser as dimensões EXTERNAS do box.
 * - A costa não aumenta P externo; o desconto é interno (FASE 3+).
 * - Profundidade útil interna = P externa − costa (se ativa) − espessura da porta (se há porta).
 *
 * Este módulo é apenas tipos + funções puras. Nenhum consumidor industrial
 * deve depender disto até às fases seguintes — não altera comportamento atual.
 */

import type { Dimensoes } from "../types";
import { SYSTEM_BACK_MM, SYSTEM_THICKNESS_MM } from "../baseCabinets";

/** Igual a `BoxModule["portaTipo"]` / `WorkspaceBox["portaTipo"]` (evita import circular com types.ts). */
export type PortaTipoCaixa = "sem_porta" | "porta_simples" | "porta_dupla" | "porta_correr";

/** Default quando `costaAtiva` ainda não existe no estado persistido (FASE 2). */
export const DEFAULT_COSTA_ATIVA = true;

/**
 * Campos previstos para persistência (FASE 2).
 * Mantido aqui como contrato; ainda não ligado a `WorkspaceBox` / `BoxModule`.
 */
export interface BoxProfundidadeAlvoCamposPersistidos {
  /** Se false, não se desconta espessura da costa na profundidade útil. Default lógico: true. */
  costaAtiva?: boolean;
}

/** Entrada normalizada do cálculo (valores já resolvidos em mm). */
export interface BoxProfundidadeAlvoEntrada {
  profundidadeExternaMm: number;
  costaAtiva: boolean;
  espessuraCostaMm: number;
  temPorta: boolean;
  espessuraPortaMm: number;
}

/** Resultado do modelo alvo: útil para UI e para futura integração industrial. */
export interface BoxProfundidadeAlvoResultado {
  profundidadeExternaMm: number;
  profundidadeInternaUtilMm: number;
  /** mm descontados pela costa (0 se inativa ou espessura 0). */
  descontoCostaMm: number;
  /** mm descontados pela porta (0 se sem porta ou espessura 0). */
  descontoPortaMm: number;
}

/** Subconjunto mínimo de caixa para montar a entrada (sem acoplar a `BoxModule`). */
export type BoxLikeParaProfundidadeAlvo = {
  dimensoes: Pick<Dimensoes, "profundidade">;
  espessura?: number;
  portaTipo?: PortaTipoCaixa;
  doorsLayer?: readonly unknown[] | null;
  costaAtiva?: boolean;
};

export function resolveProfundidadeExternaMm(dimensoes: Pick<Dimensoes, "profundidade">): number {
  return Number(dimensoes.profundidade) || 0;
}

/** Compatível com `getEspessura(box)` em fabrico: box.espessura > 0 senão 19 mm. */
export function resolveEspessuraPortaMm(espessuraBox: number | undefined): number {
  const e = Number(espessuraBox);
  if (Number.isFinite(e) && e > 0) return e;
  return SYSTEM_THICKNESS_MM;
}

/** Espessura da costa: regra do projeto ou padrão do sistema (10 mm). */
export function resolveEspessuraCostaMm(espessuraCostaRegrasMm: number | undefined): number {
  const e = Number(espessuraCostaRegrasMm);
  if (Number.isFinite(e) && e > 0) return e;
  return SYSTEM_BACK_MM;
}

/** `undefined` tratado como default ativo (projetos antigos). */
export function resolveCostaAtiva(costaAtiva: boolean | undefined): boolean {
  return costaAtiva !== false;
}

/**
 * Há porta para efeito de desconto de profundidade útil:
 * camada com folhas OU tipo de porta diferente de `sem_porta` (legado / antes de sincronizar layers).
 */
export function inferTemPorta(box: Pick<BoxLikeParaProfundidadeAlvo, "portaTipo" | "doorsLayer">): boolean {
  if ((box.doorsLayer?.length ?? 0) > 0) return true;
  const pt = box.portaTipo;
  return pt != null && pt !== "sem_porta";
}

/**
 * Núcleo do desenho alvo (FASE 1).
 * Não altera estado; não escreve em lado nenhum.
 */
export function computeProfundidadeInternaUtilMm(entrada: BoxProfundidadeAlvoEntrada): number {
  const ext = Math.max(0, entrada.profundidadeExternaMm);
  const dc = entrada.costaAtiva ? Math.max(0, entrada.espessuraCostaMm) : 0;
  const dp = entrada.temPorta ? Math.max(0, entrada.espessuraPortaMm) : 0;
  return Math.max(0, ext - dc - dp);
}

export function computeBoxProfundidadeAlvoResultado(entrada: BoxProfundidadeAlvoEntrada): BoxProfundidadeAlvoResultado {
  const profundidadeExternaMm = Math.max(0, entrada.profundidadeExternaMm);
  const descontoCostaMm = entrada.costaAtiva ? Math.max(0, entrada.espessuraCostaMm) : 0;
  const descontoPortaMm = entrada.temPorta ? Math.max(0, entrada.espessuraPortaMm) : 0;
  const profundidadeInternaUtilMm = computeProfundidadeInternaUtilMm(entrada);
  return {
    profundidadeExternaMm,
    profundidadeInternaUtilMm,
    descontoCostaMm,
    descontoPortaMm,
  };
}

/**
 * Monta a entrada a partir de uma caixa “like” + espessura de costa das regras (mm).
 * Nenhum código de produção é obrigado a chamar isto na FASE 1.
 */
export function buildBoxProfundidadeAlvoEntrada(
  box: BoxLikeParaProfundidadeAlvo,
  espessuraCostaRegrasMm: number | undefined
): BoxProfundidadeAlvoEntrada {
  return {
    profundidadeExternaMm: resolveProfundidadeExternaMm(box.dimensoes),
    costaAtiva: resolveCostaAtiva(box.costaAtiva),
    espessuraCostaMm: resolveEspessuraCostaMm(espessuraCostaRegrasMm),
    temPorta: inferTemPorta(box),
    espessuraPortaMm: resolveEspessuraPortaMm(box.espessura),
  };
}

/** Atalho: entrada → resultado completo (externa + útil + descontos). */
export function computeBoxProfundidadeAlvoFromBoxLike(
  box: BoxLikeParaProfundidadeAlvo,
  espessuraCostaRegrasMm: number | undefined
): BoxProfundidadeAlvoResultado {
  return computeBoxProfundidadeAlvoResultado(buildBoxProfundidadeAlvoEntrada(box, espessuraCostaRegrasMm));
}
