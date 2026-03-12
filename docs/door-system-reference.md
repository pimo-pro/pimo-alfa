# Sistema de Portas (Door System) — Referência

Documentação interna do fluxo de portas entre estado, regras, Viewer e furos/dobradiças.

## Modelo unificado

- **DoorLayerItem** (`src/models/BoxLayers.ts`): fonte de verdade para estado e UI. Usado por ProjectProvider, Configuração de Regras → Regras da Porta, painéis de layers (DoorsDrawersLayersPanel, BoxLayersPanel).
- **DoorSpec** (`src/3d/objects/BoxBuilder.ts`): projeção em metros para o Three.js. Derivado de `DoorLayerItem[]` via `buildDoorSpecs()`; ordem preservada.

Não existem duas fontes de verdade: o estado usa `DoorLayerItem`; o Viewer usa `DoorSpec` gerado a partir dele.

## Regras da Porta (Configuração de Regras)

- **rulesConfig.portas.ranges**: lista `{ min, max, dobradicas }` em cm (altura da porta). Define quantas dobradiças uma porta tem conforme a altura (ou largura, se abertura top/bottom).
- **getNumDobradicas(alturaCm, rules)** (`src/core/rules/rulesConfig.ts`): retorna o número de dobradiças para uma altura (ou largura) em cm.
- **getHingeYPositions(alturaMm, numHinges, rules)**: calcula as posições Y (mm) das dobradiças; `numHinges` deve vir de `getNumDobradicas` para respeitar as Regras da Porta.

Estas funções são usadas por:

- **drillingAdapter** (`buildPanelDrillingResult`): cálculo de furos para portas, laterais e cima/fundo (posições alinhadas à porta).
- **drillingService** (`calcDobradica`, `calcDobradicaFixacao`): furação técnica (caneco + fixação); número de dobradiças por porta via `getNumDobradicas`.
- **boxManufacturing** (`gerarPortas`): modelo industrial (ferragens).

Assim, o número e a posição dos furos/dobradiças no Viewer e na cutlist seguem as Regras da Porta.

## Fluxo no Viewer

1. **Estado** (`WorkspaceBox.doorsLayer: DoorLayerItem[]`) é sincronizado com o Viewer via `useCalculadoraSync`.
2. **useCalculadoraSync** chama `cutlistComPrecoFromBox(box, rules)` (quando não há cutList em cache), que usa `buildEffectiveDrillingRules` e `buildPanelDrillingResult` (drillingAdapter) com as regras do projeto. O resultado inclui `drillMarkersByPanel` com `portaPerDoor` (furos por porta).
3. **ViewerCore.updateBox** recebe `doorLayerItems`, `drillMarkersByPanel` e chama **updateBoxGroup** (BoxBuilder), que:
   - Constrói `DoorSpec[]` com `buildDoorSpecs(doorLayerItems)`.
   - Para cada porta, chama **createDoorObject(spec, material, drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta)**.
4. **createDoorObject** cria o grupo `door-layer-{id}`, mesh do painel, aplica furos e propaga **userData.doorLayerId** (e `doorPart`) em todos os nós para seleção, context menu e outline.
5. **ViewerCore** chama **applyPanelIdsToBox(boxGroup, boxId)** após qualquer alteração de estrutura, garantindo **userData.boxId** em todos os nós (incluindo portas), necessário para raycaster, outline e getBoxIdByMesh.

## Seleção, context menu e outline

- **getDoorLayerIdByMesh(mesh)**: sobe na hierarquia e devolve o primeiro `userData.doorLayerId` encontrado (mesh da porta ou grupo pivot).
- **getContextMenuLayerHit(event)**: raycaster nos boxes; para o primeiro hit com `getDoorLayerIdByMesh` ou `getDrawerLayerIdByMesh`, devolve `{ boxId, type: "door", doorLayerId }`.
- **getBoxIdByMesh(mesh)**: sobe até encontrar `userData.boxId` ou o grupo da caixa; depende de **applyPanelIdsToBox** ser chamado após adicionar/alterar portas.
- **Outline**: EdgeOutlineSystem e HighlightManager consideram selecionáveis os meshes com `userData.doorLayerId` ou `userData.boxId` (e outros critérios); o outline usa o mesh selecionado da caixa (incluindo porta).

## updateDoorMaterial e rebuild

- **updateDoorMaterial(boxId, doorLayerId, materialName)**: localiza o grupo `door-layer-{doorLayerId}`, extrai **DoorSpec** com **getDoorSpecFromGroup**, preserva **doorHolesEffective** do mesh antigo, remove a porta, cria nova com **createDoorObject(spec, newMaterial, doorHoles)** e chama **applyPanelIdsToBox** e **refreshOutlineTarget**.
- **updateBoxGroup** (BoxBuilder): atualização incremental de portas por fingerprint; remove apenas as que deixaram de existir ou cujo spec/material mudou; recria com **createDoorObject** e **drillMap.portaPerDoor?.[doorIndex]**.

Assim, **doorLayerId**, **userData** e furos são preservados na troca de material e no rebuild.

## Ficheiros principais (sem alterar TCN/manufatura)

- `src/models/BoxLayers.ts` — DoorLayerItem
- `src/core/rules/rulesConfig.ts` — Regras da Porta, getNumDobradicas, getHingeYPositions
- `src/core/drilling/drillingService.ts` — calcDobradica (usa getNumDobradicas)
- `src/modules/drilling/drillingAdapter.ts` — buildPanelDrillingResult (usa getNumDobradicas para portas), buildViewerDrillMarkersByPanelResult
- `src/3d/objects/BoxBuilder.ts` — DoorSpec, buildDoorSpecs, createDoorObject, getDoorSpecFromGroup, updateBoxGroup
- `src/3d/viewer-engine/ViewerCore.ts` — updateBox, updateDoorMaterial, getContextMenuLayerHit, getDoorLayerIdByMesh, applyPanelIdsToBox
