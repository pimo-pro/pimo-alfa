import type { BoxPanelIds, WorkspaceBox } from "../types";

/** Gera um ID único estável (UUID-like). */
export function createStableId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Cria BoxPanelIds com IDs únicos para a estrutura fixa e arrays com tamanho suficiente
 * para prateleiras, portas, gavetas, divisórios e separadores.
 */
export function ensureBoxPanelIds(
  current: Partial<BoxPanelIds> | null | undefined,
  options: {
    prateleiras: number;
    portaTipo: "sem_porta" | "porta_simples" | "porta_dupla" | "porta_correr";
    gavetas: number;
    cornerFixedFront?: boolean;
    divisoresCount?: number;
    separadoresCount?: number;
  }
): BoxPanelIds {
  const numPortas = options.portaTipo === "sem_porta" ? 0 : options.portaTipo === "porta_dupla" ? 2 : 1;
  const nPrateleiras = Math.max(0, Math.floor(options.prateleiras));
  const nGavetas = Math.max(0, Math.floor(options.gavetas));
  const nDivisores = Math.max(0, Math.floor(options.divisoresCount ?? 0));
  const nSeparadores = Math.max(0, Math.floor(options.separadoresCount ?? 0));

  const prateleiras = [...(current?.prateleiras ?? [])];
  while (prateleiras.length < nPrateleiras) prateleiras.push(createStableId());

  const portas = [...(current?.portas ?? [])];
  while (portas.length < numPortas) portas.push(createStableId());

  const gavetas = [...(current?.gavetas ?? [])];
  while (gavetas.length < nGavetas) gavetas.push(createStableId());

  const divisores = [...(current?.divisores ?? [])];
  while (divisores.length < nDivisores) divisores.push(createStableId());

  const separadores = [...(current?.separadores ?? [])];
  while (separadores.length < nSeparadores) separadores.push(createStableId());

  const needsFixedFront = options.cornerFixedFront === true && options.portaTipo === "porta_simples";

  return {
    cima: current?.cima ?? createStableId(),
    fundo: current?.fundo ?? createStableId(),
    lateral_esquerda: current?.lateral_esquerda ?? createStableId(),
    lateral_direita: current?.lateral_direita ?? createStableId(),
    costa: current?.costa ?? createStableId(),
    frente_fixa: needsFixedFront ? (current?.frente_fixa ?? createStableId()) : undefined,
    prateleiras: prateleiras.slice(0, nPrateleiras),
    portas: portas.slice(0, numPortas),
    gavetas: gavetas.slice(0, nGavetas),
    divisores: divisores.slice(0, nDivisores),
    separadores: separadores.slice(0, nSeparadores),
  };
}

/** Opções seguras para `ensureBoxPanelIds` (sem arrays divisores/separadores). */
export function panelIdOptionsFromBox(
  box: Pick<WorkspaceBox, "prateleiras" | "portaTipo" | "gavetas" | "divisores" | "separadores" | "baseCabinetId">,
  overrides?: Partial<{
    prateleiras: number;
    portaTipo: WorkspaceBox["portaTipo"];
    gavetas: number;
    divisoresCount: number;
    separadoresCount: number;
    cornerFixedFront: boolean;
  }>
) {
  return {
    prateleiras: overrides?.prateleiras ?? box.prateleiras,
    portaTipo: overrides?.portaTipo ?? box.portaTipo,
    gavetas: overrides?.gavetas ?? box.gavetas,
    divisoresCount: overrides?.divisoresCount ?? box.divisores?.length ?? 0,
    separadoresCount: overrides?.separadoresCount ?? box.separadores?.length ?? 0,
    cornerFixedFront: overrides?.cornerFixedFront,
  };
}
