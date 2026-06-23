/**
 * Idempotência na geração de WO — preparação Fase 4, documentado Fase 5.
 *
 * Comportamento actual preservado: `skipExistingStationOrders` desactivado.
 * `warnOnDuplicate` activo — só aviso em consola, sem alterar persistência.
 *
 * @see RELATORIO_FASE_4.md §4.4
 * @see docs/guides/industrial-supervisor-guide.md §3
 * @see docs/architecture/industrial-feature-flags.md
 */
export const woIdempotencyConfig = {
  /**
   * Quando `true`, não cria nova WO se já existir ordem para (projectId, station).
   * Reutiliza a existente no resultado.
   */
  skipExistingStationOrders: false,

  /**
   * Quando `true`, regista aviso em consola se duplicata seria criada.
   * Seguro em produção — não altera persistência.
   */
  warnOnDuplicate: true,
} as const;
