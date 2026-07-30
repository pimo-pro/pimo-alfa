# Mat�ria visual: Porta vs Frente da Gaveta

## Porta (funciona)

| Etapa | Onde |
|-------|------|
| UI | `SelecionarMaterialSection` ? `setDoorMaterial` + `onDoorMaterialChange` |
| Viewer directo | `HomeLeftPanelSelected` / `Workspace` ? `viewerApi.updateDoorMaterial` |
| 3D | `ViewerCore.updateDoorMaterial` **reconstr�i** o grupo `door-layer-*` com `createDoorObject` + material novo |

O estado (`doorsLayer.material` / `materialId`) e o mesh ficam alinhados porque a UI **sempre** chama o Viewer.

## Frente da gaveta (bug)

| Etapa | Onde |
|-------|------|
| Resolu��o | `resolveDrawerFrontMaterialId` (`drawerFrontMaterial.ts`) � prioridade: `materialId` ? `metadata.frontMaterial` ? `material` ? corpo |
| Persist�ncia | `withDrawerMaterial` / `setDrawerMaterial` / `DrawerConfigPanel` |
| UI �Selecionar Material� | `setDrawerMaterial` sincroniza via `syncDrawerFrontMaterialToViewer`, mas `HomeLeftPanelSelected.onDrawerMaterialChange` **s� mostra toast** � **n�o** chama `viewerApi.updateDrawerMaterial` (ao contr�rio da porta) |
| UI layers | `BoxLayersPanel` ? `updateDrawerMaterial` **sem** `drawerLayerItems` |
| 3D | `updateDrawerMaterial`: com items ? `updateBox`; sem items ? `applyDrawerFrontMaterialToMesh` |
| Sync p�s-caixa | `syncDrawerFrontMaterialsForBox` + `discoverDrawerLayerItemsFromMesh` � se n�o houver items com mat�ria, inventa `{ id }` e `resolveDrawerFrontMaterialId` **cai no material do corpo (branco)** |

## Diferen�a cr�tica

- **Porta:** UI ? `updateDoorMaterial` (rebuild dedicado).
- **Gaveta:** label muda (estado OK); visual depende de sync/incremental e pode ser **reescrito com o branco do corpo** quando o discover n�o conhece a mat�ria da frente.

## Ponto exacto a corrigir

1. `HomeLeftPanelSelected` � espelhar o fluxo da porta (`updateDrawerMaterial`).
2. `ViewerCore.updateDrawerMaterial` � ap�s qualquer `updateBox`, **reaplicar** o `materialName` expl�cito na face `drawerPart === "front"`.
3. `discoverDrawerLayerItemsFromMesh` � preservar `drawerFrontMaterialId` do mesh para o sync n�o herdar o corpo.
