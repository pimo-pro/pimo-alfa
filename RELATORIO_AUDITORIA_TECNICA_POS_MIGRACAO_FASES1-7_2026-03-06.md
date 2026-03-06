# Relatorio Tecnico Completo - Auditoria Pos-Migracao Fases 1-7

Data: 2026-03-06
Repositorio: `pimo-v3`
Referencia oficial: `docs/matriz-faces-A-B-FINAL.md`

## 0. Resumo Executivo

A arquitetura pos-Fases 1-7 esta coerente com o modelo FINAL e com o objetivo de consolidacao do pipeline industrial.

Evidencias objetivas desta auditoria:
- Testes industriais Vitest: `42/42` aprovados em `src/validation/industrialFase7.test.ts`.
- Build de producao: concluido com sucesso (`npm run build`).
- Fluxo de peca parametrico: centralizado em `cutlistFromBoxes` + `buildBoxDesign`.
- Conversao DrillFace -> PanelFace: centralizada no `drillingService`.
- Viewer: overlay filtrado para face interna (B) em todos os tipos de painel com chave de overlay.

Conclusao geral:
- Estado funcional e industrial: `APROVADO`.
- Riscos residuais: localizados e de baixa/medio-baixa criticidade (nomenclatura legacy residual e possivel overhead de bundle de pagina de referencia).

## 1. Estado Atual do Projeto

### 1.1 Arquitetura real apos Fases 1-7

Nucleo de furação (fonte unica):
- `src/core/drilling/drillingService.ts:124` define `getInternalFace`.
- `src/core/drilling/drillingService.ts:418` define `drillFaceToPanelFace`.
- `src/core/drilling/drillingService.ts:422` define `isTopDrillable`.

Adapter de furação (sem duplicacao de regra A/B):
- `src/modules/drilling/drillingAdapter.ts:238` (`buildPanelDrillingResult`) delega calculo tecnico ao service e apenas adapta formato.
- Conversao A/B reutiliza `drillFaceToPanelFace` do service.

Pipeline de cutlist (fonte unica):
- `src/core/manufacturing/cutlistFromBoxes.ts:20` (`cutlistComPrecoFromBox`).
- `src/core/manufacturing/cutlistFromBoxes.ts:162` (`cutlistComPrecoFromBoxes`).
- `src/context/projectState.ts:378` explicita: cutlistFromBoxes e a unica fonte paramatrica.

Taxonomia de gavetas (unificada em subpecas):
- `src/services/drawerCutlistAdapter.ts:132` (`extractDrawerCutlistFromLayerItems`).
- Tipos emitidos: `gaveta_frente`, `gaveta_lat_esq`, `gaveta_lat_dir`, `gaveta_fundo`, `gaveta_traseira`.

### 1.2 Fluxos ativos

Fluxos ativos confirmados:
- Calculo principal de projeto: `buildDesignState` em `src/context/projectState.ts`.
- Acao de UI `gerarDesign` (nome de acao) usa pipeline moderno (`buildBoxesFromWorkspace` + `buildDesignState`) em `src/context/ProjectProvider.tsx`.
- Export DRILL: `src/core/drill/drillExport.ts`.
- Export CNC/TCN/KDT: `src/core/cnc/cncExport.ts`.
- Viewer overlay: `buildViewerDrillMarkersByPanel` em `src/modules/drilling/drillingAdapter.ts`.

Fluxos obsoletos/removidos do calculo industrial principal:
- Nao foi encontrado `generateDesign` legacy em `src/**`.
- Nao ha evidencias de caminho paralelo para geracao de pecas parametricas fora de `cutlistFromBoxes` no estado atual.

### 1.3 Dependencias internas entre modulos

Cadeia principal observada:
1. `projectState/buildBoxDesign` -> `cutlistComPrecoFromBox`.
2. `cutlistComPrecoFromBox` -> `buildPanelDrillingResult`.
3. `buildPanelDrillingResult` -> `calculateTechnicalDrillingsForPiece` + `drillFaceToPanelFace` + `isTopDrillable`.
4. `useCalculadoraSync` -> `buildViewerDrillMarkersByPanel` para overlay no 3D.
5. `useGerarArquivoHandlers` -> `buildCncFromCutlistItems` e `buildDrillFilesForProject` para export industrial.

## 2. Verificacao de Consistencia

### 2.1 Alinhamento com documento FINAL

Documento alvo:
- `docs/matriz-faces-A-B-FINAL.md`

Estado encontrado:
- Regra "face interna = B" aplicada no service (fonte unica).
- Viewer com filtro de face interna aplicado de forma unificada.
- `topDrillable` mantido separado de A/B e preservado para CNC/TCN.
- Prateleira alinhada ao modelo minimo FINAL (sem chave dedicada no objeto de overlay por painel).

Resultado:
- Sem divergencia funcional critica entre codigo e documento FINAL.

### 2.2 Resquicios de logica antiga

Resquicios identificados (nao bloqueantes):
1. Alias com nomenclatura legacy:
- `src/3d/objects/BoxBuilder.ts:1243` exporta `buildBoxLegacy = buildBoxGroup`.
- `src/3d/core/Viewer.ts:1746` ainda chama `buildBoxLegacy(...)`.
- Impacto: sem regressao funcional direta; risco de confusao/manutencao.

2. Funcao exportada sem uso detectado no workspace:
- `src/core/cnc/cncExport.ts:94` `buildBasicDrillOperations(...)`.
- Apenas declarada/exportada no proprio ficheiro (nenhuma referencia encontrada em `src/**`).
- Impacto: codigo potencialmente morto/legado.

### 2.3 Codigo morto/duplicado/nao referenciado

Indicacoes de limpeza futura:
- `buildBasicDrillOperations` aparenta legado de compatibilidade.
- Constante marcada `@deprecated` em `drillingService` ainda usada internamente para defaults (`SENSYS_8645I_C00`), logo nao e morta, mas exige consolidacao futura para eliminar ambiguidade de padrao.

## 3. Analise Industrial (drillingService, drillingAdapter, DRILL, cutlist)

### 3.1 Coerencia de ponta a ponta

Coerencia validada:
- `drillingService` calcula geometria e semantica interna por tipo.
- `drillingAdapter` converte para formato painel e aplica face A/B via service.
- `cutlistFromBoxes` injeta `drillHoles` por painel/subpeca de gaveta.
- `DRILL` filtra exatamente `cavilha && topDrillable === false`.

Evidencias:
- `src/core/drill/drillExport.ts:83` filtro DRILL.
- `src/modules/drilling/drillingAdapter.ts` fluxo de adaptacao.
- `src/core/manufacturing/cutlistFromBoxes.ts` pipeline de cutlist.

### 3.2 Garantias sobre TCN, topDrillable e CNC export

Garantias confirmadas:
- CNC export usa apenas furos com `topDrillable=true`:
  - `src/core/cnc/cncExport.ts:75`.
- DRILL nao depende de A/B, apenas de tipo e `topDrillable`:
  - `src/core/drill/drillExport.ts:83`.
- `isTopDrillable` permanece simples e estavel:
  - `src/core/drilling/drillingService.ts:422`.

Resultado:
- Nao foi identificado impacto regressivo de Fases 1-7 em TCN, topDrillable ou export CNC/DRILL.

## 4. Analise do Viewer

### 4.1 Alinhamento ao modelo FINAL

Viewer overlay:
- Filtro de face interna centralizado em `onlyInternalFaceHoles`.
- Evidencia:
  - `src/modules/drilling/drillingAdapter.ts:338`
  - `src/modules/drilling/drillingAdapter.ts:358`

Sincronizacao com estado:
- `useCalculadoraSync` reconstrui/atualiza `drillMarkersByPanel` com base na cutlist da caixa e regras atuais.

Resultado:
- Overlay coerente com o modelo FINAL (mostrar apenas B nos paines suportados).

### 4.2 Pontos que podem causar regressao visual

Riscos monitoraveis:
1. Dependencia de `cutListForBox` no sync do viewer quando ha mudancas de estrutura rapidas.
2. Alias `buildBoxLegacy` no viewer pode induzir manutencao indevida no futuro.

Nao foram encontradas regresses visuais concretas nesta auditoria.

## 5. Riscos e Recomendacoes

## 5.1 Findings (ordenados por severidade)

1. Medio - Possivel inclusao de ficheiros de teste no bundle da pagina de referencia.
- Evidencia: `src/pages/PainelReferencia.tsx:43` usa `import.meta.glob(["../**/*.{ts,tsx,js,jsx,css,html}", ...])` amplo.
- Evidencia de build: foi emitido `dist/assets/industrialFase7.test-*.js` durante `npm run build`.
- Risco: aumento de bundle/carga e exposicao de artefatos de validacao em producao.
- Recomendacao: restringir glob para excluir `**/*.test.*`, `**/*.spec.*`, `src/validation/**` e pastas nao necessarias.

2. Baixo - Nomenclatura legacy residual no viewer/box builder.
- Evidencia: `src/3d/objects/BoxBuilder.ts:1243`, `src/3d/core/Viewer.ts:1746`.
- Risco: confusao de leitura e falsa percecao de fluxo antigo ativo.
- Recomendacao: renomear para `buildBoxGroup` nos call sites e remover alias apos janela de compatibilidade.

3. Baixo - Funcao exportada aparentemente sem consumidores.
- Evidencia: `src/core/cnc/cncExport.ts:94` (`buildBasicDrillOperations`).
- Risco: manutencao desnecessaria e ruido arquitetural.
- Recomendacao: remover ou marcar explicitamente como API publica planejada com cobertura de uso.

### 5.2 Melhorias possiveis

1. Adicionar teste de integracao de export CNC verificando que somente `topDrillable=true` entra em TCN/KDT.
2. Adicionar teste de regressao do viewer para todos os tipos suportados no overlay (nao apenas `cima`).
3. Consolidar deprecacoes internas de ferragem (`SENSYS_8645I_C00`) para reduzir ambiguidades de padrao.
4. Formalizar regra de exclusao de ficheiros de validacao do bundle em check de CI/build.

## 6. Evidencias de Validacao Executadas

Comandos executados nesta auditoria:
- `npm test`
- `npm run build`

Resultados:
- Vitest: `1 file / 42 tests` aprovados (`src/validation/industrialFase7.test.ts`).
- Build: concluido com sucesso.

## 7. Conclusao Final

A migracao Fases 1-7 encontra-se tecnicamente consolidada.

Estado final da auditoria:
- Arquitetura: alinhada ao desenho alvo.
- Consistencia codigo x FINAL: aderente, sem divergencias criticas.
- Pipeline industrial (drillingService -> adapter -> cutlist -> DRILL/CNC): coerente.
- Viewer: alinhado ao modelo FINAL para overlay de face interna.
- Riscos: existentes, mas localizados e trataveis sem retrabalho estrutural.

Classificacao global: `APROVADO COM RECOMENDACOES DE HIGIENE TECNICA`.
