# Single Source of Truth – Cálculo Real (Antes / Depois)

**Fonte da verdade (faces e pipeline):** `docs/matriz-faces-A-B-FINAL.md`. Cálculo real: `cutlistFromBoxes` + `buildBoxDesign`.

## Por que “Resultados Atuais” mudava e o resto não?

- **Resultados Atuais** (card no RightToolsBar) lia `project.resultados?.numeroPecas` e `project.acessorios?.reduce(...)`.
- `project.resultados` e `project.acessorios` só são preenchidos quando o utilizador clica em **“Gerar Design 3D”** (ação `gerarDesign()`), que chama `buildDesignState(prev)` e atualiza o estado com o pipeline moderno: `buildBoxDesign` usa `cutlistComPrecoFromBox` e `extractDrawerCutlistFromLayerItems`; fonte única em `cutlistFromBoxes.ts`. Referência: `docs/matriz-faces-A-B-FINAL.md`.
- Ao **adicionar ou duplicar caixas**, o estado atualizado era apenas:
  - `project.workspaceBoxes`
  - `project.boxes = buildBoxesFromWorkspace(...)`
- Ninguém chamava `gerarDesign()` nem `recomputeState(..., true)` nessa altura, por isso:
  - `project.resultados` e `project.acessorios` continuavam com os valores da última vez que “Gerar Design” foi clicado.
- O card “Resultados Atuais” podia parecer “certo” se em algum fluxo esses campos fossem atualizados (por exemplo após “Gerar Design”), mas **Cutlist Industrial**, **Resumo Financeiro** e **PDF** usavam exatamente os mesmos campos antigos (`project.cutList`, `project.cutListComPreco`, `project.design`, `project.precoTotalPecas`, etc.), que **não** eram recalculados ao adicionar/duplicar caixas.
- Conclusão: a contagem visual que “mudava” era inconsistente com o resto; o **cálculo real** (preços, listas, totais) estava todo preso à lógica antiga, que só corre ao clicar “Gerar Design”.

---

## 1) Onde o cálculo real ainda era feito (ANTES)

| Local | Fonte dos dados (ANTES) | Problema |
|-------|--------------------------|----------|
| **RightToolsBar** – card “Resultados Atuais” | `project.resultados?.numeroPecas`, `project.acessorios?.reduce(...)` | Só atualizados em `gerarDesign()`; ao adicionar/duplicar caixas não mudavam. |
| **BottomPanel** – “Resumo Financeiro do Projeto” | `project.resultados`, `project.acessorios`, `project.precoTotalPecas`, `project.precoTotalAcessorios`, `project.precoTotalProjeto` | Mesma dependência do design antigo; não refletia novas caixas. |
| **CutlistPanel** – “Cutlist Industrial” | Uma única caixa: `selectedBox` de `project.boxes` + `gerarModeloIndustrial(selectedBox)` | Mostrava só a caixa selecionada; ao adicionar 2ª caixa, a lista e totais não agregavam as duas. |
| **PDF** | `gerarPdfIndustrial(project.boxes)` | Já recebia `project.boxes` e, dentro do PDF, `gerarModeloIndustrial(box)` por caixa – **este já estava correto**. |
| **buildSendPackage** (envio) | Já tinha sido alterado para `cutlistComPrecoFromBoxes(project.boxes)` e `ferragensFromBoxes(project.boxes)` | Nenhuma alteração adicional. |

Funções/estruturas antigas ainda usadas na UI:

- `project.cutList`
- `project.cutListComPreco`
- `project.design?.acessorios`
- `project.resultados` (numeroPecas, precoFinal, precoMaterial)
- `project.acessorios`
- `project.precoTotalPecas`
- `project.precoTotalAcessorios`
- `project.precoTotalProjeto`
- `box.cutList` / `box.cutListComPreco` (em CutListView já tinham sido trocados por helpers)

---

## 2) Substituição pela lógica nova (DEPOIS)

### PDF

- **Antes:** Já usava `gerarPdfIndustrial(project.boxes)` e, dentro do PDF, `gerarModeloIndustrial(box)` por caixa.
- **Depois:** Nenhuma alteração. Continua a usar **apenas** `project.boxes` e `gerarModeloIndustrial(box)`.

### Cutlist Industrial (CutlistPanel)

- **Antes:** Uma caixa: `selectedBox` + `gerarModeloIndustrial(selectedBox)`; totais só dessa caixa.
- **Depois:**
  - Itera **todas** as caixas: `project.boxes.forEach((box) => { const modelo = gerarModeloIndustrial(box); ... })`.
  - Agrega painéis, portas, gavetas e ferragens de todas as caixas em listas únicas (com coluna “Caixa”).
  - Totais do painel: soma de peças, ferragens, custos e “Custo total do projeto” a partir desses agregados.
  - Base: **só** `project.boxes` e `gerarModeloIndustrial(box)`.

### Resumo Financeiro do Projeto (BottomPanel)

- **Antes:**  
  `resultados = project.resultados`, `totalPecas = resultados?.numeroPecas`, `totalFerragens = project.acessorios?.reduce(...)`, `precoTotal = project.precoTotalProjeto ?? resultados?.precoFinal`, `custoPecas = project.precoTotalPecas`, `custoFerragens = project.precoTotalAcessorios`, `precoPorCaixa = project.precoTotalProjeto`.
- **Depois:**
  - `cutlist = cutlistComPrecoFromBoxes(project.boxes)`
  - `ferragens = ferragensFromBoxes(project.boxes)`
  - `totalPecas` = soma de `quantidade` em `cutlist`
  - `totalFerragens` = soma de `quantidade` em `ferragens`
  - `custoPecas = calcularPrecoTotalPecas(cutlist)`
  - `custoFerragens` = soma de `precoTotal` em `ferragens`
  - `custoMateriais = custoPecas + custoFerragens`
  - `precoTotal = calcularPrecoTotalProjeto(custoPecas + custoFerragens)`
  - `precoPorCaixa = precoTotal / boxes.length` (quando há caixas)
  - Nenhuma leitura de `project.resultados`, `project.design`, `project.acessorios` ou `project.precoTotal*`.

### Resultados Atuais (RightToolsBar)

- **Antes:**  
  `totalPecas = project.resultados?.numeroPecas ?? 0`, `totalFerragens = project.acessorios?.reduce(...)`.
- **Depois:**
  - `cutlistFromBoxes = cutlistComPrecoFromBoxes(project.boxes)`
  - `ferragensFromBoxesList = ferragensFromBoxes(project.boxes)`
  - `totalPecas` = soma de `quantidade` em `cutlistFromBoxes`
  - `totalFerragens` = soma de `quantidade` em `ferragensFromBoxesList`
  - Nenhuma leitura de `project.resultados` nem `project.acessorios`.

---

## 3) Remoção de dependências do design antigo

- **RightToolsBar:** não usa mais `project.resultados` nem `project.acessorios`.
- **BottomPanel:** não usa mais `project.resultados`, `project.acessorios`, `project.precoTotalPecas`, `project.precoTotalAcessorios`, `project.precoTotalProjeto`.
- **CutlistPanel:** não depende de “caixa selecionada” para os totais; usa sempre todas as caixas de `project.boxes`.
- **CutListTable / CutListView / buildSendPackage:** já tinham sido migrados para `cutlistComPrecoFromBoxes(project.boxes)` e `ferragensFromBoxes(project.boxes)`.

Base única de cálculo em toda a UI e export:

- `project.boxes`
- `gerarModeloIndustrial(box)` (boxManufacturing)
- `cutlistComPrecoFromBox(box)` / `cutlistComPrecoFromBoxes(boxes)` (cutlistFromBoxes)
- `ferragensFromBoxes(boxes)` (cutlistFromBoxes)
- `calcularPrecoTotalPecas(cutlist)` / `calcularPrecoTotalProjeto(...)` (pricing)

---

## 4) Arquivos alterados nesta correção

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/right-tools/RightToolsBar.tsx` | Resultados Atuais passam a usar `cutlistComPrecoFromBoxes(project.boxes)` e `ferragensFromBoxes(project.boxes)` em vez de `project.resultados` e `project.acessorios`. |
| `src/components/layout/bottom-panel/BottomPanel.tsx` | Resumo Financeiro passa a calcular tudo a partir de `cutlistComPrecoFromBoxes(project.boxes)` e `ferragensFromBoxes(project.boxes)` (totais, custos, preço total, preço por caixa). |
| `src/components/panels/CutlistPanel.tsx` | Cutlist Industrial passa a iterar todas as caixas de `project.boxes`, agregar painéis/portas/gavetas/ferragens e mostrar totais do projeto; deixa de mostrar apenas a caixa selecionada. |

---

## 5) Como validar (teste completo)

1. **Adicionar 1 caixa**
   - Resultados Atuais: peças e ferragens aumentam.
   - Cutlist Industrial: nova caixa aparece nas tabelas; totais (peças, ferragens, custo total do projeto) refletem as duas caixas.
   - Resumo Financeiro: peças totais, ferragens, custos e total geral batem com o painel Cutlist.
   - PDF: duas caixas (duas secções/páginas); totais por caixa e sensação geral consistentes com o painel.

2. **Duplicar caixa**
   - Resultados Atuais: peças e ferragens aumentam (ex.: dobram se a caixa duplicada for igual).
   - Cutlist Industrial: lista e totais dobram (ou refletem a nova caixa).
   - Resumo Financeiro: totais e preço total refletem o dobro (ou a nova caixa).
   - PDF: mais uma caixa; totais no PDF batem com a interface.

3. **Remover caixa**
   - Resultados Atuais, Cutlist Industrial, Resumo Financeiro e PDF voltam a refletir apenas as caixas restantes; números batem entre si.

Se em todos os passos os números forem consistentes entre Resultados Atuais, Cutlist Industrial, Resumo Financeiro e PDF, a cadeia de cálculo está 100% baseada em `project.boxes` e nos helpers novos.
