# Matriz de Faces A/B — Versão Final (Padrão Industrial do Projeto)

**Documento oficial** do sistema unificado de faces (A/B). Base para futura limpeza e migração do projeto.  
**Estado:** aprovado para adoção. **Nenhuma alteração de código** nesta etapa — apenas documentação.

---

## 1. Escopo e garantias

| Âmbito | Decisão |
|--------|---------|
| **TCN** | Não alterado. Continua a usar apenas `topDrillable`; ignora A/B. |
| **DRILL/XML** | Não alterado. Continua a usar `topDrillable` e tipo de furo (cavilha lateral); ignora A/B. |
| **Unificação** | Viewer, materiais futuros por face, plugins. |
| **Fluxos críticos** | Nenhum fluxo de CNC, nesting ou export é alterado pelo modelo de faces. |

---

## 2. Convenções e definições

| Termo | Definição oficial |
|-------|--------------------|
| **Face A** | Face **externa**: lado do painel voltado para fora do móvel (utilizador, parede, exterior). |
| **Face B** | Face **interna**: lado do painel voltado para o **interior do móvel** (ou, na porta, o lado onde ficam as dobradiças). |
| **Regra única** | Em todos os painéis: **face interna = B**, **face externa = A**. Sem exceções semânticas. |
| **Viewer (overlay)** | Mostrar furação apenas na **face interna (B)**. Uma única regra para todos os tipos. |
| **topDrillable** | Atributo de furo para emissão TCN; independente de A/B. Mantido como está. |
| **DrillFace** | Geometria do furo: `cima` \| `fundo` \| `esquerda` \| `direita` \| `frente` \| `tras`. |
| **PanelFace** | Semântica do painel: `A` \| `B`. |

---

## 3. Aliases aprovados

| Alias | Mapeia para | Regra A/B |
|-------|-------------|-----------|
| **Tampo** | cima | Face interna = B (fundo do painel). Face externa = A (topo). |
| **Base** | fundo | Face interna = B (lado para interior da caixa). Face externa = A. |

Ao introduzir tipos `tampo` ou `base` (catálogo, UI), reutilizar a lógica de **cima** e **fundo** respetivamente, sem novas exceções.

---

## 4. Matriz final: Estado atual | Estado proposto | Estado final aprovado

Uma única tabela por categoria, com três colunas de estado.

### 4.1 Estrutura da caixa

| Tipo | Estado atual | Estado proposto | Estado final aprovado |
|------|--------------|-----------------|------------------------|
| **cima** | Face interna B (fundo). Viewer: só B. Furação em B. | Manter B interna, A externa. Viewer: só B. | **Aprovado:** Face interna = B (fundo). Face externa = A (topo). Viewer: só B. TCN/DRILL inalterados. Tampo = alias de cima. |
| **fundo** | Face interna considerada A (topo do painel) no comentário; Viewer: **não filtra** (mostra todos). | Face interna = B (lado para interior da caixa). Viewer: só B. | **Aprovado:** Face interna = B. Face externa = A. Viewer: **só B** (remover exceção “todos”). Base = alias de fundo. TCN/DRILL inalterados. |
| **lateral_esquerda** | Face interna B (direita). Viewer: só B. Furação em B. | Manter. Viewer: só B. | **Aprovado:** Face interna = B (direita). Face externa = A (esquerda). Viewer: só B. TCN/DRILL inalterados. |
| **lateral_direita** | Face interna B (esquerda). Viewer: **não filtra** (mostra todos). | Face interna = B. Viewer: só B. | **Aprovado:** Face interna = B (esquerda). Face externa = A (direita). Viewer: **só B** (remover exceção “todos”). Comportamento simétrico com lateral_esquerda. TCN/DRILL inalterados. |
| **COSTA** | Sem furação técnica; fora do modelo A/B no Viewer. | Sem alteração. | **Aprovado:** Fora do modelo A/B (painel sem furação por face). Corte apenas; sem impacto em TCN/DRILL de furos. |

### 4.2 Portas

| Tipo | Estado atual | Estado proposto | Estado final aprovado |
|------|--------------|-----------------|------------------------|
| **porta_simples / porta_dupla / porta_correr** | Face interna B (tras = dobradiças). Viewer: só B. | Manter. | **Aprovado:** Face interna = B (lado da dobradiça). Face externa = A (frente visível). Viewer: só B. TCN inalterado. Regra industrial mantida. |

### 4.3 Prateleira

| Tipo | Estado atual | Estado proposto | Estado final aprovado |
|------|--------------|-----------------|------------------------|
| **prateleira** | Sem chave no Viewer por painel; furação nas laterais (tipo prateleira, topDrillable). | Opção mínimo vs completo. | **Aprovado (modelo mínimo):** Prateleira não tem entrada em ViewerDrillMarkersByPanel. Não se introduz A/B no Viewer para prateleira. Furação e TCN mantidos (topDrillable). Se no futuro se implementar materiais por face na prateleira: B = face que olha para baixo (interior da caixa), A = face que olha para cima. |

### 4.4 Gavetas (modelo por subpeça)

| Subpeça / tipo | Estado atual | Estado proposto | Estado final aprovado |
|----------------|--------------|-----------------|------------------------|
| **gaveta_frente** | Nos painéis como peça; sem chave no Viewer. | Face interna B (tras da frente). Face externa A (frente visível). | **Aprovado:** Face interna = B (lado para dentro da gaveta). Face externa = A. Quando houver overlay no Viewer para gaveta_frente: só B. |
| **gaveta_lat_esq / gaveta_lat_dir** | Só em drillingService (corredição); subpeças não na cutlist como peças separadas. | B = lado para dentro da gaveta; A = lado para fora. | **Aprovado:** Face interna = B. Face externa = A. Aplicar quando estas subpeças existirem na cutlist/Viewer. Implementação faseada. |
| **gaveta (corpo / fundo / traseira)** | Cutlist com "gaveta" e "gaveta_frente"; fundo/traseira não como peças individuais na cutlist atual. | B = interior da gaveta; A = exterior. | **Aprovado:** Fundo e traseira: face interna = B, face externa = A. Regra aplicada quando existirem como peças explícitas. |

---

## 5. Regras finais aprovadas

1. **Face interna = B, face externa = A** em todos os painéis e subpeças. Sem exceções semânticas.
2. **Viewer:** overlay de furação apenas na face B. Em todos os tipos com chave no Viewer (cima, fundo, lateral_esquerda, lateral_direita, porta): filtrar `face !== "A"` (mostrar só B). Remover as exceções atuais em fundo e lateral_direita.
3. **TCN:** não utiliza A/B. Apenas `topDrillable` e geometria. Nenhuma alteração.
4. **DRILL/XML:** não utiliza A/B. Apenas tipo de furo (cavilha) e `topDrillable === false`. Nenhuma alteração.
5. **Aliases:** Tampo = cima, Base = fundo. Mesma regra A/B.
6. **Prateleira:** modelo mínimo aprovado — sem A/B no Viewer hoje; definição A/B reservada para materiais por face futuros (B = face para baixo).
7. **Gavetas:** modelo por subpeça aprovado (frente, laterais, fundo, traseira) com B = interior, A = exterior; implementação pode ser faseada conforme as peças existirem na cutlist/Viewer.
8. **COSTA:** fora do modelo A/B; sem furação por face.

---

## 6. Decisões em aberto

| Tema | Decisão em aberto | Observação |
|------|-------------------|------------|
| **Momento da migração** | Quando aplicar as alterações no Viewer (fundo + lateral_direita → só B). | Após validação desta matriz; sem impacto em TCN/DRILL. |
| **Prateleira no Viewer** | Se e quando adicionar overlay de furação por painel para prateleira (com filtro B). | Modelo mínimo aprovado não exige alteração imediata. |
| **Gavetas na cutlist** | Se e quando passar a emitir gaveta_lat_esq, gaveta_lat_dir, fundo, traseira como peças separadas. | Modelo por subpeça está definido; implementação depende da evolução da cutlist. |
| **Materiais por face** | Quando implementar atribuição de material por face (A/B) na UI e no Layout Engine. | O modelo A/B está pronto para suportar essa extensão. |

---

## 7. Plano de migração

### 7.1 O que será alterado (apenas Viewer / adapter)

| Item | Onde | O quê |
|------|------|--------|
| Filtro Viewer para **fundo** | `drillingAdapter.buildViewerDrillMarkersByPanelResult` | Para `tipo === "fundo"`, usar `onlyInternalFaceHoles(item.drillHoles)` em vez de `item.drillHoles` (mostrar só B). |
| Filtro Viewer para **lateral_direita** | Idem | Para `tipo === "lateral_direita"`, usar `onlyInternalFaceHoles(item.drillHoles)` em vez de `item.drillHoles` (mostrar só B). |
| Comentários / documentação | `drillingAdapter`, `drillingService`, tipos | Documentar a regra “face interna = B em todos” e os aliases tampo/base. |

### 7.2 O que será removido

| Item | Onde | O quê |
|------|------|--------|
| Exceção “fundo: não filtrar” | `drillingAdapter` | Remover a condição que faz fundo usar todos os furos; passar a usar só B. |
| Exceção “lateral_direita: todos” | `drillingAdapter` | Remover a condição que faz lateral_direita usar todos os furos; passar a usar só B. |

### 7.3 O que permanece inalterado

| Ámbito | Detalhe |
|--------|---------|
| **TCN** | Lógica de geração (tcnGenerator, cncExport). Uso exclusivo de `topDrillable`. |
| **DRILL/XML** | buildDrillFilesForProject; filtro cavilha + topDrillable === false. |
| **drillingService** | getInternalFace, drillFaceToPanelFace, isTopDrillable, cálculo de furos. |
| **Cutlist / boxManufacturing** | Tipos de peça (cima, fundo, lateral_esquerda, lateral_direita, COSTA, prateleira, porta_*, gaveta_frente, gaveta). |
| **BoxBuilder / Viewer** | Assinaturas e estrutura de drillMarkersByPanel; apenas o *conteúdo* das listas (só B para fundo e lateral_direita) muda no adapter. |
| **Regras de furação** | Posições, diâmetros, profundidades, topDrillable por tipo de furo. |

### 7.4 Segurança

- Nenhuma alteração em ficheiros TCN, DRILL ou em fluxos de export CNC.
- Nenhuma alteração na estrutura de dados da cutlist nem nos tipos de painel.
- Única alteração funcional: **quais furos são mostrados no overlay do Viewer** para fundo e lateral_direita (de “todos” para “só face B”).

---

## 8. Resumo executivo

- **Modelo:** Face interna = B, face externa = A, em todos os painéis. Viewer mostra furação só em B.
- **Aliases:** Tampo = cima, Base = fundo.
- **Prateleira:** modelo mínimo (sem A/B no Viewer); A/B definido para uso futuro (B = face para baixo).
- **Gavetas:** modelo por subpeça aprovado (frente, laterais, fundo, traseira); B = interior, A = exterior; implementação faseada.
- **Migração:** alterar apenas o filtro no drillingAdapter para fundo e lateral_direita (só B). TCN e DRILL permanecem inalterados.
- **Documento:** este ficheiro é o padrão industrial de referência para o sistema de faces A/B do projeto.

---

*Documento final. Nenhuma alteração de código nesta etapa. Base para futura limpeza e migração.*
