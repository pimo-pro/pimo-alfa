# Relatório Técnico — Viewer: Multi-Selection, Scaling e Proteção de Materiais

**Data:** Junho 2026  
**Escopo:** Correção de materiais em resize, multi-seleção, menu de contexto, scaling additive/ratio, settings.

---

## 1. O que foi implementado

### 1.1 Proteção de materiais em alteração de medidas
- `regenerateLayersForBox` agora aceita `{ preserveMaterials: true }` (padrão).
- Antes de regenerar portas/gavetas, cria backup via `backupLayerMaterials`.
- Após o cálculo geométrico, restaura `materialId`/`material` via `restoreLayerMaterials`.
- `setDimensoes` e `setWorkspaceBoxDimensoes` passam explicitamente `preserveMaterials: true`.
- Portas deixam de ser resetadas para `mdf_branco` ao mudar L×A×P da caixa.

### 1.2 Multi-Selection System
- Estado global `selectedObjects: string[]` em `uiStore` (Zustand).
- IDs codificados: `box:`, `door:`, `drawer:`, `remate:`, `rodape:`, `piece:` (`selectionIds.ts`).
- **Ctrl/Cmd + clique** em caixas (existente) agora sincroniza com `selectedObjects`.
- **Seleção por arrasto (marquee):** componente `SelectionMarquee.tsx` + `ViewerCore.getSelectionIdsInScreenRect`.
- Suporte a caixas, remates e rodapés na marquee; portas via Ctrl+clique no menu de contexto.

### 1.3 Menu de contexto multi-seleção
- Categoria **Seleção (N)** quando ≥ 2 itens selecionados.
- Itens: Copiar, Apagar, Rodar, Mover, Mostrar Medidas MC, Alterar Material, Alterar Medidas.
- Submenu **Alterar Medidas:** Adicionar Diferença | Escala Percentual.
- Clique direto em **Alterar Medidas** usa `viewerSettings.defaultScalingMode`.

### 1.4 Additive Scaling (padrão)
```
oldMax = max(dimensões de todos os itens)
delta = newLength - oldMax
newSize = oldSize + delta  (por dimensão de cada item)
```

### 1.5 Ratio Scaling
```
ratio = newLength / oldMax
newSize = oldSize * ratio
```

### 1.6 Settings — Default Scaling Mode
- Campo `viewerSettings.defaultScalingMode: "additive" | "ratio"`.
- UI em **Display Menu → Transformações** (`DisplayMenuButton.tsx`).

### 1.7 Material Protection Layer
- Scaling, duplicar e rodar não alteram `materialId` (apenas geometria/transform).
- `duplicateSelectedObjects` faz spread do objeto completo (materiais preservados).
- Resize de caixa usa `preserveMaterials: true` em `regenerateLayersForBox`.

---

## 2. Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/services/boxLayersService.ts` | Backup/restore de materiais em regenerate |
| `src/context/hooks/useBoxTransformActions.ts` | Flag `preserveMaterials` no resize |
| `src/stores/uiStore.ts` | `selectedObjects` + actions |
| `src/core/viewer/materialPreservation.ts` | **Novo** — backup/restore |
| `src/core/viewer/selectionIds.ts` | **Novo** — codificação de IDs |
| `src/core/viewer/scalingModes.ts` | **Novo** — lógica additive/ratio |
| `src/core/viewer/scalingModes.test.ts` | **Novo** — testes unitários |
| `src/core/viewer/selectionTransformService.ts` | **Novo** — aplica scaling multi-objeto |
| `src/context/hooks/useSelectionTransformActions.ts` | **Novo** — actions de transformação |
| `src/context/projectTypes.ts` | `ScalingMode`, `defaultScalingMode`, actions |
| `src/context/projectState.ts` | Default `defaultScalingMode: "additive"` |
| `src/context/hooks/useProjectActions.ts` | Integração selection transform |
| `src/context/projectHelpers.ts` | `getAdjacentPlacementMm` exportado |
| `src/ui/context-menu/ContextMenuEngine.ts` | Categoria multi-seleção |
| `src/components/layout/workspace/ContextMenu.tsx` | Handlers multi + submenu medidas |
| `src/components/layout/workspace/Workspace.tsx` | Marquee, sync selectedObjects |
| `src/components/layout/workspace/SelectionMarquee.tsx` | **Novo** — drag box UI |
| `src/components/layout/topbar/DisplayMenuButton.tsx` | Settings Transformações |
| `src/3d/viewer-engine/ViewerCore.ts` | `getSelectionIdsInScreenRect` |
| `src/3d/viewer-engine/utils/screenSelection.ts` | **Novo** — projeção 3D→tela |

---

## 3. Funções criadas ou atualizadas

### Novas
- `backupLayerMaterials`, `restoreLayerMaterials`
- `encodeSelectionId`, `decodeSelectionId`, `boxSelectionId`, …
- `scaleDimensionValues`, `maxLengthAcross`
- `resolveScalableTargets`, `applyScalingToProject`
- `useSelectionTransformActions`: `scaleSelectedObjects`, `duplicateSelectedObjects`, `deleteSelectedObjects`, `rotateSelectedObjects`
- `promptScalingNewLength`
- `ViewerCore.getSelectionIdsInScreenRect`
- `isObjectInScreenRect`, `projectObjectToScreenRect`

### Atualizadas
- `regenerateLayersForBox(box, options?)`
- `buildMouseMenu` — categoria `multiSelection`
- `uiStore`: `setSelectedObjects`, `toggleSelectedObject`, …

---

## 4. Testes realizados

| Teste | Resultado |
|-------|-----------|
| `npm run build` (tsc + vite) | ✅ Passou |
| `vitest run scalingModes.test.ts` | ✅ 3 testes additive/ratio/max |

---

## 5. Melhorias sugeridas

1. **Marquee sem conflito com orbit:** iniciar drag-select apenas quando raycast não acerta objeto (evita interferência com rotação de câmera).
2. **Highlight visual multi-seleção:** outline para todos os `selectedObjects`, não só a caixa ativa.
3. **Ctrl+clique em portas/gavetas/remates no canvas:** integrar no `EventsManager` (hoje parcial via context menu).
4. **Alterar Material em lote:** aplicar material escolhido a todos os `selectedObjects` compatíveis.
5. **Undo dedicado para scaling multi:** agrupar num único passo de histórico com preview.
6. **Settings admin:** espelhar `defaultScalingMode` em `SystemSettingsBase` Viewer para persistência global.
7. **Peças industriais (`piece:`):** ligar seleção de painéis do highlight manager ao `selectedObjects`.

---

## 6. Como usar

1. **Multi-seleção:** Ctrl+clique em caixas; ou arraste retângulo no viewer (modo Selecionar).
2. **Menu:** botão direito com ≥2 itens → categoria Seleção.
3. **Medidas:** clique em *Alterar Medidas* (modo padrão) ou submenu para Additive/Ratio.
4. **Settings:** ícone Display → secção *Transformações* → Additive ou Ratio.
