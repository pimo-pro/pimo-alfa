# Relatório Técnico — Viewer: Melhorias Fase 2 (Multi-Selection)

**Data:** Junho 2026  
**Escopo:** Marquee condicional, outline multi-seleção, Ctrl+clique em layers, material em lote, preview de scaling.

**Base:** [RELATORIO_VIEWER_MULTI_SELECTION_SCALING.md](./RELATORIO_VIEWER_MULTI_SELECTION_SCALING.md) (implementação inicial).

---

## 1. Resumo das melhorias

| # | Melhoria | Estado |
|---|----------|--------|
| 1 | Marquee só quando o clique inicial é em área vazia | Concluído |
| 2 | Outline visual para todos os itens em `selectedObjects` | Concluído |
| 3 | Ctrl+clique no canvas para portas, gavetas, remates e rodapés | Concluído |
| 4 | Alteração de material em lote na multi-seleção | Concluído |
| 5 | Preview visual antes de aplicar scaling múltiplo | Concluído |

---

## 2. Detalhamento técnico

### 2.1 Marquee condicional (área vazia)

**Problema:** O arrasto de seleção iniciava mesmo quando o pointerdown acertava um objeto, conflitando com seleção única e transformações.

**Solução:**
- `ViewerRaycastSystem.isPointerOnSelectableObject(event)` — raycast unificado (caixas, remates, rodapés, layers).
- `ViewerCore.isPointerOnSelectableObject` expõe o método para a UI.
- `SelectionMarquee` recebe prop `canStartAtPointer`; retorna `false` se o pointer está sobre objeto selecionável.
- `Workspace` passa callback que consulta `window.viewerCore.isPointerOnSelectableObject`.

**Comportamento:** Marquee só inicia com pointerdown em espaço vazio do canvas.

---

### 2.2 Outline visual multi-seleção

**Problema:** Apenas a seleção primária tinha destaque visual; itens em `selectedObjects` não eram distinguíveis.

**Solução:**
- Novo módulo `MultiSelectionOutline.ts` — outline por mesh (caixa, porta, gaveta, remate, rodapé).
- `ViewerCore.setMultiSelectionOutlines(ids)` resolve meshes via `resolveMultiOutlineTarget` e atualiza outlines no render loop.
- `Workspace` sincroniza `uiStore.selectedObjects` → `setMultiSelectionOutlines` via `useEffect`.

**Comportamento:** Todos os IDs em `selectedObjects` exibem contorno simultâneo, independentemente do objeto ativo.

---

### 2.3 Ctrl+clique no canvas (layers e acabamentos)

**Problema:** Multi-seleção por Ctrl+clique funcionava para caixas, mas não para portas, gavetas, remates e rodapés diretamente no canvas.

**Solução:**
- `selectionHitEncoding.ts` — `encodeSelectionIdFromLayerHit()` converte hit de raycast em ID codificado.
- `ViewerCore.getPointerSelectionEncodedId(event)` — layer hit (door/drawer/piece) + fallback remate/rodapé.
- `EventsManager.tryMultiSelectToggle()` — intercepta Ctrl/Cmd+clique antes da seleção única; suprime o click seguinte.
- `EventEngineTypes` — contratos `getOnMultiSelectToggle`, `getPointerSelectionEncodedId`.
- `Workspace.setOnMultiSelectToggle` — toggle em `uiStore`, sync de caixas via `multiSelectedBoxIdsRef`, seleção única para remate/rodapé.

**Comportamento:** Ctrl/Cmd+clique em porta, gaveta, remate ou rodapé adiciona/remove o item de `selectedObjects` sem perder a seleção dos demais.

---

### 2.4 Material em lote

**Problema:** "Alterar Material" na categoria multi-seleção não aplicava material a todos os itens selecionados.

**Solução:**
- `batchMaterialService.ts` — `applyMaterialToSelectedObjects()` percorre IDs decodificados e atualiza `workspaceBoxes`, `remates`, `rodapes`.
- `useSelectionTransformActions.setSelectedObjectsMaterial` — integra com `recomputeState`.
- `ContextMenu.applyLayerMaterial` — se `activeSelectedObjectIds.length >= 2`, aplica em lote e sincroniza viewer:
  - `updateBoxMaterial` / `updateDoorMaterial` / `updateDrawerMaterial`
  - `syncRemateVisuals` / `syncRodapeVisuals`

**Comportamento:** Escolher material no picker com ≥2 itens selecionados atualiza estado do projeto e refresca o viewer imediatamente.

---

### 2.5 Preview de scaling múltiplo

**Problema:** Scaling em lote aplicava alterações sem confirmação, dificultando validação das novas dimensões.

**Solução:**
- `scalingPreview.ts` — `buildScalingPreviewData()` calcula dimensões atuais e projetadas por item; `formatDimensionList()` para exibição.
- `ScalingPreviewDialog.tsx` — modal com modo (Additive/Ratio), lista de itens e dimensões antes/depois.
- `ContextMenu` — `runScaling()` abre preview em vez de aplicar diretamente; `confirmScalingPreview()` chama `scaleSelectedObjects`.
- Menu não fecha ao abrir preview (`runScaling` retorna `true` → early return antes de `onClose`).

**Comportamento:** Após informar nova medida máxima, o utilizador vê preview detalhado e confirma ou cancela antes da aplicação.

---

## 3. Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/3d/viewer-engine/selection/MultiSelectionOutline.ts` | Outline 3D para multi-seleção |
| `src/core/viewer/selectionHitEncoding.ts` | Codificação de hits de raycast |
| `src/core/viewer/batchMaterialService.ts` | Aplicação de material em lote |
| `src/core/viewer/scalingPreview.ts` | Dados de preview de scaling |
| `src/core/viewer/scalingPreview.test.ts` | Testes unitários do preview |
| `src/components/layout/workspace/ScalingPreviewDialog.tsx` | Modal de confirmação de scaling |
| `docs/RELATORIO_VIEWER_MULTI_SELECTION_FASE2.md` | Este relatório |

---

## 4. Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/3d/viewer-engine/raycast/ViewerRaycastSystem.ts` | `isPointerOnSelectableObject` |
| `src/3d/viewer-engine/ViewerCore.ts` | Outline multi, pointer encoding, marquee helpers |
| `src/3d/viewer-engine/events/EventsManager.ts` | `tryMultiSelectToggle` em click handlers |
| `src/3d/viewer-engine/events/EventEngineTypes.ts` | Novos contratos de evento |
| `src/components/layout/workspace/SelectionMarquee.tsx` | Prop `canStartAtPointer` |
| `src/components/layout/workspace/Workspace.tsx` | Marquee guard, outline sync, multi-select toggle |
| `src/components/layout/workspace/ContextMenu.tsx` | Material lote, preview scaling, handlers restaurados |
| `src/context/hooks/useSelectionTransformActions.ts` | `setSelectedObjectsMaterial` |
| `src/context/hooks/useProjectActions.ts` | Registo da nova action |
| `src/context/projectTypes.ts` | Tipo da action |
| `src/hooks/viewer/viewerCoreWindow.d.ts` | Tipos globais dos novos métodos |

---

## 5. API ViewerCore (novos métodos)

```typescript
isPointerOnSelectableObject(event: { clientX: number; clientY: number }): boolean
getPointerSelectionEncodedId(event: { clientX: number; clientY: number }): string | null
setOnMultiSelectToggle(callback: ((encodedId: string) => void) | null): void
setMultiSelectionOutlines(ids: string[]): void
getSelectionIdsInScreenRect(rect, canvas): string[]  // já existia na fase 1; tipagem alinhada
```

---

## 6. Testes realizados

### Build
```bash
npm run build
```
**Resultado:** Sucesso (tsc + vite build).

### Testes unitários
```bash
npx vitest run src/core/viewer/scalingModes.test.ts src/core/viewer/scalingPreview.test.ts
```

| Ficheiro | Testes | Resultado |
|----------|--------|-----------|
| `scalingModes.test.ts` | 3 | Passou |
| `scalingPreview.test.ts` | 2 | Passou |

**Total:** 5 testes, 5 aprovados.

---

## 7. Fluxos de utilização

### Marquee
1. Ferramenta **Selecionar** ativa.
2. Pointerdown em área vazia do canvas → arrasto desenha retângulo.
3. Pointerdown sobre objeto → marquee não inicia; seleção normal do objeto.

### Multi-seleção com outline
1. Ctrl/Cmd+clique em vários objetos (caixas, portas, gavetas, remates, rodapés).
2. Cada item adicionado exibe outline.
3. Ctrl/Cmd+clique novamente remove o item e o outline.

### Material em lote
1. Selecionar ≥2 objetos.
2. Menu de contexto → **Seleção (N)** → **Alterar Material**.
3. Escolher material → aplica a todos e atualiza viewer.

### Scaling com preview
1. Selecionar ≥2 objetos escaláveis.
2. **Alterar Medidas** (ou submenu Additive/Ratio).
3. Informar nova medida máxima (mm).
4. Revisar preview → **Confirmar** ou **Cancelar**.

---

## 8. Notas e limitações

- **Peças (`piece:`):** Incluídas no encoding e no outline quando o mesh é resolvível; material em lote cobre box/door/drawer/remate/rodapé.
- **Preview de scaling:** Usa `window.prompt` para entrada da medida (consistente com fase 1); o preview em si é o modal `ScalingPreviewDialog`.
- **Sincronização viewer:** Material em lote chama APIs de material e `syncRemateVisuals`/`syncRodapeVisuals` para feedback imediato; alterações estruturais continuam via `useCalculadoraSync`.

---

## 9. Conclusão

As cinco melhorias aprovadas foram implementadas com build e testes unitários a passar. A arquitetura da fase 1 (`selectedObjects`, scaling modes, preservação de materiais) permanece intacta; a fase 2 reforça UX (marquee, outline, Ctrl+clique), operações em lote (material) e segurança (preview de scaling).
