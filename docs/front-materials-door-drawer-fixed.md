# Matéria das frentes: Porta vs Gaveta vs Frente Fixa

## Problema
Label/estado guardam a matéria, mas após update / rebuild / sync / reopen o visual volta ao branco (corpo). A porta não sofre isto.

## 1) Porta (OK)

| Etapa | Onde |
|-------|------|
| Persistência | `doorsLayer[].material` + `materialId` |
| UI | `setDoorMaterial` + `viewerApi.updateDoorMaterial` |
| Rebuild | `BoxUpdater` usa `item.material ?? item.materialId` por porta |
| Sync | Fingerprint inclui `material`/`materialId` ? rebuild com a matéria correcta |
| Mesh | `updateDoorMaterial` reconstrói `door-layer-*` |

## 2) Frente da gaveta (falha)

| Etapa | Onde |
|-------|------|
| Persistência | `material` / `materialId` / `metadata.frontMaterial` via `withDrawerMaterial` |
| UI | `setDrawerMaterial` + `updateDrawerMaterial` |
| Rebuild | `resolveDrawerFrontMaterialId` + `createDrawerObject` |
| Falha | `syncDrawerFrontMaterialsForBox` / discover sem matéria ? **fallback corpo**; `materialPreservation` não restaurava `metadata.frontMaterial`; após `updateBox(materialName)` o sync podia reaplicar branco |

## 3) Frente fixa (falha — ponto exacto)

| Etapa | Onde |
|-------|------|
| Persistência | `workspaceBox.frenteFixaMaterialId` (`setWorkspaceBoxFrenteFixaMaterial`) |
| UI | `SelecionarMaterialSection` grava estado + `updateFixedFrontMaterial` (só mesh) |
| Rebuild | `BoxUpdater` / `BoxAssembler`: se `opts.frenteFixaMaterialId` ausente ? **usa `materialName` do corpo** |
| Sync | `updateBoxMaterial` ? `syncFixedFrontMaterialForBox(…, syncCtx?.frenteFixaMaterialId)` — se contexto omitir o id ? **força material do corpo** |

### Ponto exacto de perda (frente fixa)
1. `updateDrawerMaterial` chama `updateBox({ drawerLayerItems, materialName })` **sem** `frenteFixaMaterialId`.
2. `BoxUpdater` recalcula FF com fallback ao corpo ? pinta branco.
3. `updateBoxMaterial` / `syncFixedFrontMaterialForBox` sem id explícito ? volta a pintar com o corpo.

A porta não passa por este fallback: a matéria vai sempre em `doorLayerItems`.

## 4) Mapa comparativo

| | Porta | Frente gaveta | Frente fixa |
|---|---|---|---|
| Campo | `doorsLayer.material(Id)` | `drawersLayer.material(Id)` + `metadata.frontMaterial` | `frenteFixaMaterialId` |
| Viewer update | `updateDoorMaterial` (rebuild) | `updateDrawerMaterial` | `updateFixedFrontMaterial` |
| Fallback corpo | Não | Sim (sync/discover) | Sim (opts omitidos) |
| Sobrevive updateBox parcial | Sim | Frágil | **Não** |

## 5) Correcção
- Preservar matéria da FF no mesh/entry quando `opts` omite o campo.
- `syncFixedFrontMaterialForBox` nunca herda corpo se já existir id no mesh/entry.
- `updateDrawerMaterial` / `updateBox` propagam `frenteFixaMaterialId` existente.
- Facade `updateFrontMaterial(partType, …)` alinhada aos três fluxos.
- `materialPreservation` restaura `metadata.frontMaterial` nas gavetas.
