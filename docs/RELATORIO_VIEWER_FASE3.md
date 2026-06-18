# Relatório Técnico — Viewer Fase 3 (Grupos, Snapping, Âncoras, Undo, Gizmo)

**Data:** Junho 2026  
**Escopo:** Group Transform, Smart Snapping para grupos, Measurement Anchors, Undo/Redo melhorado, 3D Gizmo para grupos.

**Base:** Fases 1–2 ([multi-seleção](./RELATORIO_VIEWER_MULTI_SELECTION_SCALING.md), [melhorias](./RELATORIO_VIEWER_MULTI_SELECTION_FASE2.md)).

---

## 1. Resumo

| # | Sistema | Estado |
|---|---------|--------|
| 1 | Group Transform System | Concluído |
| 2 | Smart Snapping (grupos + existente) | Concluído |
| 3 | Measurement Anchors | Concluído |
| 4 | Undo/Redo melhorado | Concluído |
| 5 | 3D Gizmo para grupos | Concluído |

---

## 2. Detalhamento

### 2.1 Group Transform System

**Persistência:** `ProjectState.objectGroups: Record<string, ObjectGroupData>` — membros como IDs codificados (`box:`, `door:`, etc.).

**Módulos:**
- `groupTypes.ts` — `ObjectGroupData`, `GroupBoundingBox`
- `groupService.ts` — `createGroupInProject`, `ungroupInProject`, `findGroupContainingMember`
- `groupBounds.ts` — `getGroupBoundingBox` a partir do estado do projeto
- `groupStore.ts` (Zustand) — `activeGroupId`, `ephemeralMemberIds` para gizmo efémero

**UI:** Menu **Seleção (N)** → **Criar Grupo** / **Desagrupar**.

**Regras:** IDs individuais preservados; materiais e metadados industriais intactos (sem rebuild).

---

### 2.2 Smart Snapping (grupos)

**Novo:** `groupSnapApply.ts` — `applySmartSnap`, `computeGroupSnapCandidates`, `computeMeshesCenter`.

Integra com `smartSnapEngine` existente. Durante translate de grupo, `ViewerCore.clampGroupTransform()` aplica snap unificado a todos os membros.

**API:** `ViewerCore.applySmartSnapForGroup()`.

Objetos suportados no snap de grupo: caixas, remates, rodapés (via entidades `SmartSnapEntity`).

---

### 2.3 Measurement Anchors

**Estado:** `ProjectMeasurementsState.anchors: MeasurementAnchorEntry[]`.

**Módulos:**
- `measurementAnchors.ts` — `addAnchor`, `removeAnchor`, `getAnchors`, distâncias âncora↔âncora
- `MeasurementAnchorsVisualizer.ts` — pinos 3D (cones) + linhas de medição

**UI:** **Seleção (N)** → **Adicionar Âncora** (posição do clique no canvas).

**Integração:** `ViewerCore.syncMeasurementAnchors()`; `Workspace` sincroniza com `project.measurements.anchors`.

---

### 2.4 Undo/Redo melhorado

**Novo:** `historyManager.ts` — compressão de drag contínuo (`beginDragSession` / `endDragSession`), registo de eventos (`group.create`, `scaling`, `material.batch`, `snap`, `anchor.*`, `transform.drag`).

**Drag transform:** `recordDragUndo(preDragState)` em `useHistoryActions` — empilha snapshot **antes** do drag no fim do arrasto (`setOnTransformDragStart` / `setOnTransformDragEnd` no `Workspace`).

**Compatível** com sistema de snapshots existente (`ProjectProvider`, `HISTORY_MAX_ENTRIES = 200`).

---

### 2.5 3D Gizmo para grupos

**Novo:** `GroupGizmo.ts` — pivô no centro do AABB unificado; delta de matriz aplicado a todos os membros sem alterar hierarquia permanente.

**Integração:**
- `ViewerTools.updateTransformControlsAttachment()` — prioridade grupo quando `groupTransformMemberIds.length >= 2`
- `objectChange` → `groupGizmo.applyPivotTransform()`
- `finishTransformDrag` → `notifyGroupTransform()` por membro (box/remate/rodapé)

**Multi-seleção sem grupo formal:** gizmo efémero via `ephemeralMemberIds` quando ≥2 itens em `selectedObjects`.

---

## 3. Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/core/viewer/groupTypes.ts` | Tipos de grupo |
| `src/core/viewer/groupBounds.ts` | Bounding box de grupo |
| `src/core/viewer/groupService.ts` | CRUD de grupos no projeto |
| `src/stores/groupStore.ts` | Estado UI de grupo activo |
| `src/3d/viewer-engine/tools/GroupGizmo.ts` | Gizmo 3D multi-objeto |
| `src/3d/viewer-engine/snapping/groupSnapApply.ts` | Snap para grupos |
| `src/core/viewer/measurementAnchors.ts` | Lógica de âncoras |
| `src/3d/viewer-engine/measurement/MeasurementAnchorsVisualizer.ts` | Render 3D de âncoras |
| `src/core/viewer/historyManager.ts` | Compressão e registo de eventos |
| `src/context/hooks/useGroupActions.ts` | Actions create/ungroup |
| `src/context/hooks/useMeasurementAnchorActions.ts` | Actions âncoras |
| `src/core/viewer/groupBounds.test.ts` | Testes |
| `src/core/viewer/measurementAnchors.test.ts` | Testes |
| `src/core/viewer/historyManager.test.ts` | Testes |
| `docs/RELATORIO_VIEWER_FASE3.md` | Este relatório |

---

## 4. Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/context/projectTypes.ts` | `objectGroups`, actions de grupo/âncoras |
| `src/context/projectState.ts` | Default `objectGroups` |
| `src/context/projectPersistence.ts` | Revive grupos e âncoras |
| `src/3d/viewer-engine/ViewerCore.ts` | Gizmo grupo, snap, âncoras, drag history |
| `src/3d/viewer-engine/tools/ViewerTools.ts` | Attachment gizmo de grupo |
| `src/3d/viewer-engine/tools/ToolsEngineTypes.ts` | Contrato grupo |
| `src/3d/viewer-engine/state/ViewerState.ts` | `groupTransformMemberIds` |
| `src/3d/viewer-engine/measurement/internalRulerTypes.ts` | `anchors` em measurements |
| `src/ui/context-menu/ContextMenuEngine.ts` | Itens grupo/âncora |
| `src/components/layout/workspace/ContextMenu.tsx` | Handlers |
| `src/components/layout/workspace/Workspace.tsx` | Sync grupo, âncoras, undo drag |
| `src/context/hooks/useHistoryActions.ts` | `recordDragUndo` |
| `src/context/hooks/useSelectionTransformActions.ts` | Eventos history em scale/material |
| `src/context/hooks/useProjectActions.ts` | Integração hooks |
| `src/hooks/viewer/viewerCoreWindow.d.ts` | Tipos globais |

---

## 5. API ViewerCore (novas)

```typescript
setGroupTransformMembers(ids: string[]): void
clearGroupTransformMembers(): void
getGroupTransformMembers(): string[]
applySmartSnapForGroup(): boolean
syncMeasurementAnchors(anchors, selectedMesh?): void
addMeasurementAnchorAtPointer(event): MeasurementAnchorEntry | null
setOnTransformDragStart(cb): void
setOnTransformDragEnd(cb): void
resolveMemberMesh(encoded): THREE.Object3D | null
```

---

## 6. Fluxos de interação

### Criar grupo
1. Multi-seleção ≥2 objetos.
2. Menu → **Criar Grupo**.
3. Grupo persistido em `objectGroups`; gizmo activo no centro do AABB.

### Mover grupo
1. Ferramenta **Mover** + grupo ou multi-seleção ≥2.
2. Gizmo único no centro; arrasto aplica delta a todos os membros.
3. Smart snap durante translate; undo regista estado pré-drag.

### Âncoras
1. Multi-seleção → **Adicionar Âncora**.
2. Pino 3D no ponto clicado; linhas entre âncoras e seleção.

### Desagrupar
1. Com grupo activo → **Desagrupar**.
2. Membros mantêm IDs; gizmo volta a multi-seleção efémera ou desactiva.

---

## 7. Testes

```bash
npm run build
npx vitest run src/core/viewer/groupBounds.test.ts \
  src/core/viewer/measurementAnchors.test.ts \
  src/core/viewer/historyManager.test.ts \
  src/core/viewer/scalingModes.test.ts \
  src/core/viewer/scalingPreview.test.ts
```

| Ficheiro | Testes |
|----------|--------|
| `groupBounds.test.ts` | 1 |
| `measurementAnchors.test.ts` | 2 |
| `historyManager.test.ts` | 2 |
| `scalingModes.test.ts` | 3 |
| `scalingPreview.test.ts` | 2 |

---

## 8. Limitações e sugestões

- **Portas/gavetas em grupos:** gizmo e bounds funcionam via mesh layer; persistência de transform de layer em grupo usa callbacks existentes por tipo.
- **Scale em grupo:** scaling multi-select (Fase 1) aplica-se aos IDs do grupo; gizmo `scale` em grupo não está activo (translate/rotate prioritários).
- **Âncoras:** remoção individual via action `removeMeasurementAnchor` — UI de lista dedicada pode ser adicionada no painel de medições.
- **Snapping avançado:** reutiliza motor existente; snap porta↔porta em grupo pode ser refinado com entidade proxy dedicada.
- **History UI:** eventos registados em `historyManager.getRecentEvents()` — integração com timeline visual é evolução futura.

---

## 9. Conclusão

A Fase 3 entrega os cinco sistemas solicitados, integrados com Multi-Selection, Scaling Modes, Material Preservation e ViewerCore, com build e testes a passar. Grupos e gizmo unificado permitem workflow tipo SketchUp; âncoras e undo de drag fecham lacunas de UX identificadas nas fases anteriores.
