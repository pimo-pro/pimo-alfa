# Mat�ria das frentes: Porta vs Gaveta vs Frente Fixa

## Problema
Label/estado guardam a mat�ria, mas ap�s update / rebuild / sync / reopen o visual volta ao branco (corpo). A porta n�o sofre isto.

## 1) Porta (OK)

| Etapa | Onde |
|-------|------|
| Persist�ncia | `doorsLayer[].material` + `materialId` |
| UI | `setDoorMaterial` + `viewerApi.updateDoorMaterial` |
| Rebuild | `BoxUpdater` usa `item.material ?? item.materialId` por porta |
| Sync | Fingerprint inclui `material`/`materialId` ? rebuild com a mat�ria correcta |
| Mesh | `updateDoorMaterial` reconstr�i `door-layer-*` |

## 2) Frente da gaveta (falha)

| Etapa | Onde |
|-------|------|
| Persist�ncia | `material` / `materialId` / `metadata.frontMaterial` via `withDrawerMaterial` |
| UI | `setDrawerMaterial` + `updateDrawerMaterial` |
| Rebuild | `resolveDrawerFrontMaterialId` + `createDrawerObject` |
| Falha | `syncDrawerFrontMaterialsForBox` / discover sem mat�ria ? **fallback corpo**; `materialPreservation` n�o restaurava `metadata.frontMaterial`; ap�s `updateBox(materialName)` o sync podia reaplicar branco |

## 3) Frente fixa (falha � ponto exacto)

| Etapa | Onde |
|-------|------|
| Persist�ncia | `workspaceBox.frenteFixaMaterialId` (`setWorkspaceBoxFrenteFixaMaterial`) |
| UI | `SelecionarMaterialSection` grava estado + `updateFixedFrontMaterial` (s� mesh) |
| Rebuild | `BoxUpdater` / `BoxAssembler`: se `opts.frenteFixaMaterialId` ausente ? **usa `materialName` do corpo** |
| Sync | `updateBoxMaterial` ? `syncFixedFrontMaterialForBox(�, syncCtx?.frenteFixaMaterialId)` � se contexto omitir o id ? **for�a material do corpo** |

### Ponto exacto de perda (frente fixa)
1. `updateDrawerMaterial` chama `updateBox({ drawerLayerItems, materialName })` **sem** `frenteFixaMaterialId`.
2. `BoxUpdater` recalcula FF com fallback ao corpo ? pinta branco.
3. `updateBoxMaterial` / `syncFixedFrontMaterialForBox` sem id expl�cito ? volta a pintar com o corpo.

A porta n�o passa por este fallback: a mat�ria vai sempre em `doorLayerItems`.

## 4) Mapa comparativo

| | Porta | Frente gaveta | Frente fixa |
|---|---|---|---|
| Campo | `doorsLayer.material(Id)` | `drawersLayer.material(Id)` + `metadata.frontMaterial` | `frenteFixaMaterialId` |
| Viewer update | `updateDoorMaterial` (rebuild) | `updateDrawerMaterial` | `updateFixedFrontMaterial` |
| Fallback corpo | N�o | Sim (sync/discover) | Sim (opts omitidos) |
| Sobrevive updateBox parcial | Sim | Fr�gil | **N�o** |

## 5) Correc��o
- Preservar mat�ria da FF no mesh/entry quando `opts` omite o campo.
- `syncFixedFrontMaterialForBox` nunca herda corpo se j� existir id no mesh/entry.
- `updateDrawerMaterial` / `updateBox` propagam `frenteFixaMaterialId` existente.
- Facade `updateFrontMaterial(partType, �)` alinhada aos tr�s fluxos.
- `materialPreservation` restaura `metadata.frontMaterial` nas gavetas.
