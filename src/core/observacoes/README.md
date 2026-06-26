# Sistema Unificado de Observações

**Implementação oficial e definitiva** do PIMO Criativo. Qualquer evolução futura deve passar por este módulo e nunca reintroduzir lógica paralela ou caminhos legados.

## Modelo de dados (fonte única)

| Campo | Tipo | Âmbito |
|-------|------|--------|
| `box.observacoes` | `string[]` | Observações ao nível da **caixa** (UI: Opções do Box) |
| `project.pieceObservacoes` | `Record<pieceId, string[]>` | Observações por **peça** (chave = `panelId` estável) |

**Domínios separados (nunca misturar):**

- `piece.notes` — Pimo-Trak (qualidade/workflow); **não** ler/escrever aqui
- `materials.api` `observacoes` — domínio de materiais; **não** relacionado

## Camada central obrigatória

`ObservacoesService.ts` é o **único** ponto para manipular observações:

| Responsabilidade | Função |
|------------------|--------|
| Sanitização | `sanitizeObservationText()` |
| Deduplicação | `normalizeObservacoesList()` |
| Leitura caixa | `getBoxObservacoes()` |
| Leitura peça | `getPieceObservacoes()` |
| Pipeline industrial | `resolveObservacoesForCutListItem()`, `collectObservationsForItem()` |
| Formatação PDF | `formatObservacoesForPdf()` |
| Migração legado | `migrateProjectPieceObservacoes()` — **somente na carga/recompute** |
| Multi-projeto | `mergePieceObservacoesStores()` |
| UI industrial | `enumerateIndustrialPiecesForBox()`, `hasObservacoes()` |

Import público: `import { ... } from "../observacoes"` ou `../observacoes/ObservacoesService`.

**Nenhuma outra camada** (UI, PDF, etiquetas, persistência) pode sanitizar, deduplicar ou resolver observações diretamente.

## Regras de sanitização

Aplicadas por `sanitizeObservationText()` em toda escrita e normalização:

1. Trim de espaços
2. Quebras de linha (`\r\n`, `\n`, `\t`, etc.) → espaço único
3. Remoção de tags HTML
4. Remoção de caracteres de controlo (`\u0000`–`\u0008`, `\u000B`, `\u000C`, `\u000E`–`\u001F`, `\u007F`)
5. Colapso de whitespace múltiplo
6. Limite de **240 caracteres** (`MAX_OBSERVATION_TEXT_LENGTH`)
7. Deduplicação via `normalizeObservacoesList()` (ordem preservada)

Etiquetas v5: máximo **3** observações por peça (`MAX_LABEL_OBSERVATIONS_V5`).

## Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│ UI (BoxPecasObservacoesSection, PieceObservacoesEditor)         │
│ Viewer (badge OBS, PieceObservacoesOverlay)                    │
│ useObservacoesActions → sanitize + normalize → estado          │
└────────────────────────────┬────────────────────────────────────┘
                             │
              box.observacoes[]     project.pieceObservacoes[pieceId][]
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ ObservacoesService (única camada de leitura/resolução)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
  pdfEtiquetas          gerarPdfTecnico          pdfCutlist
  UnifiedEtiquetaEngine    pdfUnified          multiProjectFabrication
     │                       │                       │
     └───────────────────────┴───────────────────────┘
              pieceObservacoes exclusivamente
```

### Carga / persistência

1. `reviveState()` — normaliza `pieceObservacoes` com `normalizeObservacoesList()`
2. `applyResultados()` — chama `migrateProjectPieceObservacoes()` (legado metadata → store, **sem sobrescrever** existentes)
3. `serializeState()` / `reviveState()` — roundtrip preserva ambos os campos

### Escrita

- Caixa: `addBoxObservacao` / `removeBoxObservacao` → `box.observacoes`
- Peça: `addPieceObservacao` / `removePieceObservacao` → `project.pieceObservacoes`
- `convertWorkspaceToBox()` sincroniza `observacoes` da caixa

## Pipeline industrial

Todos os destinos leem **exclusivamente** `pieceObservacoes` na resolução (nunca metadata legado, `rules.observacoesPadrao`, `runtime.observations`, nem mistura `box.observacoes` → peça):

| Destino | Ficheiro |
|---------|----------|
| Etiquetas v5 | `pdfEtiquetas.ts`, `UnifiedEtiquetaEngine.ts` |
| tecnico.pdf | `gerarPdfTecnico.ts` |
| Lista de Corte | `pdfCutlist.ts` |
| unificado.pdf | `pdfUnified.ts` |
| Exportações | `useProjectExportActions.ts`, `useGerarArquivoHandlers.ts` |
| Multi-projeto | `multiProjectFabrication.ts` |
| Persistência | `projectPersistence.ts`, `projectState.ts` |

## Legado — estado final

| Fonte | Estado |
|-------|--------|
| `metadata.observacao` / `obs` / `observacoes` | Somente `migrateLegacyMetadataObservations()` na carga |
| `rules.etiqueta.observacoesPadrao` | Removido da pipeline; parâmetro ignorado (`@deprecated`) |
| `runtime.observations` | Removido de `pdfEtiquetas.ts` |
| `labelObservationsV5.ts` | `@deprecated`; reexporta `ObservacoesService` |
| `piece.notes` | Domínio Pimo-Trak; isolado |
| `materials.api` observações | Domínio materiais; isolado |

**Nenhuma destas fontes deve voltar a alimentar PDFs, etiquetas ou cutlist.**

## UI

| Componente | Função |
|------------|--------|
| `BoxPecasObservacoesSection` | Observações da caixa + lista de peças |
| `PieceObservacoesEditor` | Editor por peça |
| `PieceObservacoesOverlay` | Overlay no viewer |
| `BottomInfoToolbar` | Badge OBS |
| `useObservacoesActions.ts` | Ações centralizadas |

## Testes de regressão — contrato oficial (21)

Qualquer alteração futura deve manter **100%** de compatibilidade.

| Ficheiro | Testes | Âmbito |
|----------|--------|--------|
| `ObservacoesService.test.ts` | 12 | Sanitização, migração, pipeline |
| `observacoesIntegration.test.ts` | 7 | Persistência, recompute, multi-projeto, contrato |
| `labelObservationsV5.test.ts` | 2 | Compatibilidade de import |

```bash
npx vitest run src/core/observacoes/ src/core/pdf/labelObservationsV5.test.ts
```

## Evolução futura

Ver **[PIMO.PRO-V5 — Observações](../../docs/PIMO-PRO-V5-OBSERVACOES.md)** (roadmap avançado, checklist de regressão, diagramas).

1. Passar sempre pelo `ObservacoesService`
2. Manter arquitetura unificada (`box.observacoes` + `pieceObservacoes`)
3. Preservar compatibilidade com a pipeline industrial
4. Não reintroduzir fallbacks, leituras paralelas ou caminhos legados
5. Adicionar testes ao contrato antes de alterar comportamento
