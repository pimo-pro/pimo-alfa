# Fase 7 — Validação industrial final

**Documento de referência:** `docs/matriz-faces-A-B-FINAL.md`  
**Data:** Março 2026  
**Objetivo:** Confirmar que todo o sistema industrial (furação, cutlist, DRILL, Viewer e CNC) está correto, consistente e alinhado ao modelo FINAL, sem regressões.

---

## 1. Resumo

A Fase 7 foi concluída através de **testes automatizados** em `src/validation/industrialFase7.test.ts`, executáveis com:

```bash
npm test
```

Nenhuma alteração foi feita em TCN, `topDrillable`, exportações CNC nem na lógica industrial de produção. Apenas foram adicionados testes e este documento.

---

## 2. O que foi validado

### 2.1 Conversão A/B (getInternalFace)

| Tipo de peça | Face interna (DrillFace) | PanelFace B |
|--------------|--------------------------|-------------|
| cima | fundo | ✓ |
| fundo | cima | ✓ |
| lateral_esquerda | direita | ✓ |
| lateral_direita | esquerda | ✓ |
| porta_simples / porta_dupla / porta_correr / porta | tras | ✓ |
| gaveta_frente / gaveta | tras | ✓ |
| gaveta_lat_esq | direita | ✓ |
| gaveta_lat_dir | esquerda | ✓ |
| gaveta_fundo | cima | ✓ |
| gaveta_traseira | frente | ✓ |
| prateleira | fundo | ✓ |

### 2.2 drillFaceToPanelFace

- Face interna do painel → **B**
- Demais faces → **A**
- Validado para cima, fundo, lateral_esquerda, lateral_direita, porta, gaveta_frente, gaveta_fundo, gaveta_traseira, prateleira.

### 2.3 isTopDrillable (inalterado)

- `cima` e `fundo` → `true`
- `frente`, `tras`, `esquerda`, `direita` → `false`

### 2.4 Furação por tipo (buildPanelDrillingResult)

- Tipos cobertos: cima, fundo, lateral_esquerda, lateral_direita, prateleira, porta_simples, gaveta, gaveta_frente, gaveta_lat_esq, gaveta_lat_dir, gaveta_fundo, gaveta_traseira.
- Para cada tipo: resultado com `success: true` e todos os furos com `face` em `"A"` ou `"B"` e `topDrillable` booleano.

### 2.5 DRILL (buildDrillFilesForProject)

- Apenas furos com `holeType === "cavilha"` e `topDrillable === false` são exportados para XML.
- Estrutura de saída: `KDTPanelFormat`, `Horizontal Hole`, etc.

### 2.6 Viewer (buildViewerDrillMarkersByPanelResult)

- Overlay mostra **apenas furos da face B** (filtro `onlyInternalFaceHoles`: exclui `face === "A"`).
- Teste: cutlist com um painel com 1 furo A e 1 furo B → o Viewer recebe apenas 1 furo (o da face B).

### 2.7 Cutlist (cutlistFromBoxes)

- Caixa mínima (sem porta, sem gavetas, sem prateleiras): gera cima, fundo, lateral_esquerda, lateral_direita, COSTA.
- Caixa com prateleiras: inclui itens com `tipo === "prateleira"` na quantidade correta.
- Itens da cutlist com `drillHoles` têm `face` em A ou B quando preenchido.

---

## 3. Garantias respeitadas

| Âmbito | Estado |
|--------|--------|
| **TCN** | Não alterado. |
| **topDrillable** | Não alterado; comportamento validado pelos testes. |
| **Exportações CNC** | Não alteradas. |
| **Lógica industrial** | Não alterada; apenas adicionados testes. |

---

## 4. Conclusão

O sistema industrial está **validado** e **alinhado ao modelo FINAL** (faces A/B, Viewer só face B, DRILL com cavilha e topDrillable, cutlist única em cutlistFromBoxes). A migração das fases 1–7 considera-se concluída.

Para revalidar a qualquer momento:

```bash
npm test
```

Ou em modo watch (reexecuta ao guardar ficheiros):

```bash
npm run test:watch
```
