# Matéria visual: Porta vs Frente da Gaveta

## Porta (funciona)

| Etapa | Onde |
|-------|------|
| UI | `SelecionarMaterialSection` ? `setDoorMaterial` + `onDoorMaterialChange` |
| Viewer directo | `HomeLeftPanelSelected` / `Workspace` ? `viewerApi.updateDoorMaterial` |
| 3D | `ViewerCore.updateDoorMaterial` **reconstrói** o grupo `door-layer-*` com `createDoorObject` + material novo |

O estado (`doorsLayer.material` / `materialId`) e o mesh ficam alinhados porque a UI **sempre** chama o Viewer.

## Frente da gaveta (bug)

| Etapa | Onde |
|-------|------|
| Resolução | `resolveDrawerFrontMaterialId` (`drawerFrontMaterial.ts`) — prioridade: `materialId` ? `metadata.frontMaterial` ? `material` ? corpo |
| Persistência | `withDrawerMaterial` / `setDrawerMaterial` / `DrawerConfigPanel` |
| UI —Selecionar Material— | `setDrawerMaterial` sincroniza via `syncDrawerFrontMaterialToViewer`, mas `HomeLeftPanelSelected.onDrawerMaterialChange` **só mostra toast** —  **não** chama `viewerApi.updateDrawerMaterial` (ao contrário da porta) |
| UI layers | `BoxLayersPanel` ? `updateDrawerMaterial` **sem** `drawerLayerItems` |
| 3D | `updateDrawerMaterial`: com items ? `updateBox`; sem items ? `applyDrawerFrontMaterialToMesh` |
| Sync pós-caixa | `syncDrawerFrontMaterialsForBox` + `discoverDrawerLayerItemsFromMesh` — se não houver items com matéria, inventa `{ id }` e `resolveDrawerFrontMaterialId` **cai no material do corpo (branco)** |

## Diferença crítica

- **Porta:** UI ? `updateDoorMaterial` (rebuild dedicado).
- **Gaveta:** label muda (estado OK); visual depende de sync/incremental e pode ser **reescrito com o branco do corpo** quando o discover não conhece a matéria da frente.

## Ponto exacto a corrigir

1. `HomeLeftPanelSelected` — espelhar o fluxo da porta (`updateDrawerMaterial`).
2. `ViewerCore.updateDrawerMaterial` — após qualquer `updateBox`, **reaplicar** o `materialName` explícito na face `drawerPart === "front"`.
3. `discoverDrawerLayerItemsFromMesh` — preservar `drawerFrontMaterialId` do mesh para o sync não herdar o corpo.
