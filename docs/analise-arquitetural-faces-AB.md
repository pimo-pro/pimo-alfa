# Análise arquitetural — Sistema de faces A/B

Relatório técnico de arquitetura com base no documento oficial **`docs/matriz-faces-A-B-FINAL.md`** (fonte da verdade do modelo de faces). Objetivo: entender a arquitetura atual face ao modelo final e planear a migração com segurança. **Nenhuma alteração de código.**

---

## 1. Onde o sistema de faces (A/B) está hoje no projeto

- **Tipos centrais**
  - `src/core/types.ts`: `PanelFace` (A | B), `PanelDrillHole.face?`, `DrillPanelKey`, `ViewerDrillMarkersByPanel`, `DrillFace`.
  - `src/core/cutlayout/cutLayoutTypes.ts` e `cutLayoutEngine.ts`: furos com `face?` e `topDrillable?` (propagação para nesting/TCN).

- **Cálculo de furos e mapeamento A/B**
  - `src/core/drilling/drillingService.ts`: `getInternalFace(pieceType)`, `drillFaceToPanelFace(DrillFace → PanelFace)`, `isTopDrillable(face)`. Fonte única da regra A/B por tipo de peça (ver `docs/matriz-faces-A-B-FINAL.md`).
  - `src/modules/drilling/drillingAdapter.ts`: importa `drillFaceToPanelFace` do service; `toPanelDrillHoles` (atribui `face` e `topDrillable` a cada furo), `buildPanelDrillingResult`, `onlyInternalFaceHoles` (filtro `face !== "A"`), `buildViewerDrillMarkersByPanelResult` (getHolesFor por tipo).

- **Viewer e 3D**
  - `src/3d/core/Viewer.ts`: recebe `drillMarkersByPanel?: ViewerDrillMarkersByPanel` no entry da caixa; usa `drillMap.cima | fundo | lateral_esquerda | lateral_direita | porta` para overlays de furação; não conhece A/B — apenas consome listas já filtradas.
  - `src/3d/objects/BoxBuilder.ts`: recebe `drillMarkersByPanel` nas opções; usa `TechnicalDrillHole.face` (DrillFace) para posicionar geometria dos furos (cima/fundo/esquerda/direita); não filtra por PanelFace.

- **Cutlist e construção de dados**
  - `src/core/manufacturing/cutlistFromBoxes.ts`: chama `buildPanelDrillingResult` por painel (tipo, dimensões, hingeSide, etc.); coloca `drillHoles` (PanelDrillHole[]) em cada item da cutlist; não aplica filtro A/B — os furos já vêm com `face` do adapter/service.
  - `src/core/manufacturing/boxManufacturing.ts`: emite tipos de painel (cima, fundo, lateral_esquerda, lateral_direita, COSTA, prateleira, porta_*, gaveta_frente); não trata faces.

- **Consumidores do Viewer (quem monta drillMarkersByPanel)**
  - `src/hooks/useCalculadoraSync.ts`: obtém cutlist da caixa, chama `buildViewerDrillMarkersByPanel(cutListForBox)`, passa `drillMarkersByPanel` ao criar/atualizar entry no Viewer.
  - `src/components/layout/ToolbarModals.tsx`: chama `buildViewerDrillMarkersByPanel(selectedBoxCutList)` para o mesmo fim.

- **Export (não usam A/B)**
  - TCN: `src/core/cnc/tcnGenerator.ts` — só `topDrillable`; não lê `face`.
  - DRILL/XML: `src/core/drill/drillExport.ts` — só `holeType === "cavilha" && topDrillable === false`; não lê `face`.

---

## 2. Acoplamento ao modelo antigo e às exceções

- **drillingAdapter.buildViewerDrillMarkersByPanelResult**
  - **Fundo:** `holesToUse = item.drillHoles` (não filtra; comentário: “face interna = topo do painel = A, não filtrar”). Contrário ao FINAL (face interna = B; mostrar só B).
  - **lateral_direita:** `holesToUse = item.drillHoles` (não filtra). Contrário ao FINAL (mostrar só B).
  - **getHolesFor** está fortemente acoplado a estas exceções por `tipo`.

- **drillingAdapter**
  - Depende de `byType.get(tipo)` com `DrillPanelKey`: só cima, fundo, lateral_esquerda, lateral_direita, porta. Prateleira e gaveta_frente não têm chave em `ViewerDrillMarkersByPanel`; não há overlay por painel para eles (alinhado ao modelo mínimo da prateleira e ao modelo faseado das gavetas no FINAL).

- **drillingService**
  - `getInternalFace` e `drillFaceToPanelFace` já seguem a semântica “face interna” por tipo (cima→fundo, fundo→cima, lateral_esq→direita, etc.). Não há exceção explícita “fundo = A” no service; a exceção está só no adapter (Viewer). O service não precisa de alteração para o modelo FINAL; o ajuste é só no adapter (filtro Viewer).

- **BoxBuilder**
  - Usa `hole.face` como DrillFace (cima/fundo/esquerda/direita) para geometria; não usa PanelFace (A/B). Sem alteração para o modelo FINAL.

---

## 3. Candidatos naturais à refatoração (futura migração)

- **Prioridade alta**
  - **`src/modules/drilling/drillingAdapter.ts`**: unificar `getHolesFor` — aplicar `onlyInternalFaceHoles` a todos os tipos (cima, fundo, lateral_esquerda, lateral_direita, porta); remover as ramificações para fundo e lateral_direita; documentar que a regra é “só face B no Viewer” conforme FINAL.

- **Prioridade média (documentação / consistência)**
  - **`src/core/drilling/drillingService.ts`**: documentar que `getInternalFace` / `drillFaceToPanelFace` implementam “face interna = B” e que o Viewer deve mostrar só B; manter lógica atual (já alinhada).
  - **`src/core/types.ts`** (ou doc de referência): referenciar `matriz-faces-A-B-FINAL.md` para definição de A/B e aliases (tampo/base).

- **Prioridade baixa (evolução futura)**
  - **ViewerDrillMarkersByPanel / DrillPanelKey**: se no futuro se adicionar prateleira ou gaveta_frente ao Viewer por painel, o adapter terá de passar a fornecer essas chaves com o mesmo critério “só B”.
  - **Cutlist / boxManufacturing**: só se for introduzido tampo/base como tipo explícito (mapear para cima/fundo e reutilizar regras A/B).

---

## 4. Dependências cruzadas e impacto na migração

- **cutlistFromBoxes → drillingAdapter**
  - Usa apenas `buildPanelDrillingResult` (e `buildEffectiveDrillingRules`). Não usa `buildViewerDrillMarkersByPanel`. Migração do modelo de faces não altera cutlistFromBoxes.

- **useCalculadoraSync / ToolbarModals → drillingAdapter**
  - Chamam `buildViewerDrillMarkersByPanel(cutlist)`. Qualquer alteração no adapter (filtro só B para fundo e lateral_direita) reflete-se automaticamente no que o Viewer recebe; não é preciso alterar estes callers.

- **Viewer / BoxBuilder → tipos e drillMarkersByPanel**
  - Consomem apenas a estrutura `ViewerDrillMarkersByPanel` (listas por chave). Não dependem de como as listas foram filtradas. Migração não exige alteração em Viewer nem BoxBuilder.

- **drillingAdapter → drillingService**
  - Importa `calculateTechnicalDrillingsForPiece` e `isTopDrillable`. O adapter não altera o cálculo de furos; apenas filtra e converte para TechnicalDrillHole para o Viewer. Refatorar só o filtro no adapter mantém a dependência estável.

- **Risco de dependência circular**
  - Não há ciclo: types → drillingService (tipos); drillingAdapter → drillingService (funções); cutlistFromBoxes → drillingAdapter; hooks/UI → drillingAdapter; Viewer recebe dados. A migração concentra-se no adapter sem propagar mudanças em cadeia.

---

## 5. Riscos de regressão (críticos)

- **Alterar drillingService (getInternalFace / drillFaceToPanelFace / topDrillable)**
  - Impacto: TCN e DRILL usam `topDrillable`; a cutlist recebe `drillHoles` com `face` e `topDrillable` do service (via adapter em buildPanelDrillingResult). Mudar a semântica de face ou de topDrillable pode alterar o que é emitido para CNC. **Recomendação:** não alterar o drillingService na migração; apenas o filtro no adapter (Viewer).

- **Alterar assinaturas ou chaves de ViewerDrillMarkersByPanel**
  - Viewer e BoxBuilder esperam `cima | fundo | lateral_esquerda | lateral_direita | porta` (e portaPerDoor). Remover ou renomear chaves exige alterar Viewer/BoxBuilder. **Recomendação:** não alterar a estrutura; apenas o conteúdo das listas (só B para fundo e lateral_direita).

- **Alterar cutlistFromBoxes ou a forma como drillHoles são atribuídos aos itens**
  - TCN e DRILL consomem a cutlist e os `drillHoles` dos placements. **Recomendação:** não alterar; a migração não toca na cutlist nem nos furos armazenados, só no que o adapter entrega ao Viewer.

- **Regressão visual (Viewer)**
  - Passar fundo e lateral_direita a “só B” pode fazer desaparecer furos que hoje são mostrados (os de face A). É a alteração desejada pelo FINAL; validar em QA que não há overlays a menos onde não deve (ex.: fundo e lateral_direita devem mostrar apenas furos da face interna B).

---

## 6. Ordem lógica de migração (alto nível)

1. **Documentação**
   - Incluir no código (adapter e, se útil, service) referência a `docs/matriz-faces-A-B-FINAL.md` e à regra “Viewer: overlay apenas na face B”.
   - Opcional: comentário em `core/types.ts` para `PanelFace` / `DrillPanelKey` a apontar para o FINAL.

2. **Viewer (comportamento) — via adapter**
   - Em `drillingAdapter.buildViewerDrillMarkersByPanelResult`, em `getHolesFor`:
     - Para `tipo === "fundo"`: usar `onlyInternalFaceHoles(item.drillHoles)` em vez de `item.drillHoles`.
     - Para `tipo === "lateral_direita"`: usar `onlyInternalFaceHoles(item.drillHoles)` em vez de `item.drillHoles`.
   - Remover o comentário que diz “Fundo: face interna = topo do painel = A, não filtrar” e substituir por referência à regra FINAL (face interna = B em todos).

3. **Verificação**
   - Confirmar que TCN e DRILL não foram alterados (sem tocar em tcnGenerator, cncExport, drillExport, cutLayoutEngine na lógica de furos).
   - Testes visuais: cima, fundo, lateral_esquerda, lateral_direita, porta — overlay apenas na face interna (B).

4. **Futuro (fora do âmbito desta migração)**
   - Prateleira: se um dia houver overlay por painel, usar o mesmo critério “só B” (modelo mínimo / FINAL).
   - Gavetas: quando houver subpeças na cutlist/Viewer, aplicar modelo por subpeça do FINAL (B = interior).
   - Tampo/base: ao introduzir tipos, mapear para cima/fundo e reutilizar regras A/B do FINAL.

---

*Fonte da verdade do modelo de faces: `docs/matriz-faces-A-B-FINAL.md`. Este relatório não altera código; serve apenas para planeamento e comparação com o relatório do Git.*
