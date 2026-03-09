# Viewer Engine — Etapa 4: Migração selection, room, environment e extração mínima (events, state, tools, utils)

Documentação da quarta etapa da divisão estrutural do Viewer Engine.

## Objetivo

Eliminar as dependências restantes do antigo `core/viewer`, migrar Environment para viewer-engine, e iniciar a extração dos módulos internos do ViewerCore (events, state, tools, utils) de forma mínima e sem alterar comportamento. Apenas mover, reorganizar e ajustar imports.

---

## 1. O que foi movido e para onde

### Migração de core/viewer e core

| Módulo / ficheiro     | Antes                               | Depois (viewer-engine)              |
|-----------------------|-------------------------------------|-------------------------------------|
| SelectionManager      | pasta legada do viewer              | `selection/SelectionManager.ts`     |
| ViewerRoomManager     | pasta legada do viewer              | `room/ViewerRoomManager.ts`         |
| Environment           | módulo legado de ambiente           | `environment/Environment.ts`       |

Os ficheiros originais foram **removidos** após a criação das cópias em viewer-engine.

### Novos módulos internos (extração mínima)

| Módulo        | Ficheiro           | Conteúdo                                                                 |
|---------------|--------------------|--------------------------------------------------------------------------|
| events        | `EventsManager.ts` | Placeholder; reservado para futura extração de handlers do ViewerCore.  |
| state         | `ViewerState.ts`   | Placeholder; reservado para futura extração de estado do ViewerCore.     |
| tools         | `ViewerTools.ts`   | Placeholder; reservado para futura extração de transform/gizmos.        |
| utils         | `ViewerUtils.ts`   | **Extraído:** `getPointerNdc(canvas, event)` — helper puro de NDC.       |

---

## 2. Estrutura criada/atualizada

```
src/3d/viewer-engine/
├── selection/
│   ├── SelectionManager.ts   # ViewerSelectionManager (estado selectedBoxId)
│   └── index.ts
├── room/
│   ├── ViewerRoomManager.ts  # estado sala (grupo, paredes, bounds)
│   └── index.ts
├── environment/
│   ├── Environment.ts        # createGround, createGrid, EnvironmentOptions
│   └── index.ts
├── events/
│   ├── EventsManager.ts      # placeholder
│   └── index.ts
├── state/
│   ├── ViewerState.ts        # placeholder
│   └── index.ts
├── tools/
│   ├── ViewerTools.ts        # placeholder
│   └── index.ts
├── utils/
│   ├── ViewerUtils.ts        # getPointerNdc(canvas, event)
│   └── index.ts
├── ... (camera, controls, lighting, scene, renderer, highlight, box, snapshot, loader, types)
├── ViewerCore.ts
└── index.ts
```

---

## 3. Ajuste de imports

### viewer-engine/room/ViewerRoomManager.ts

- **Dependência:** `RoomBounds`, `WallEntryForViewer` de `RoomManager`.
- **Caminho:** `"../../room/RoomManager"` (viewer-engine/room → 3d/room).

### viewer-engine/scene/SceneManager.ts

- **Antes:** imports de ambiente vindos do módulo legado.
- **Depois:** `"../environment"` e `"../environment"`.

### ViewerCore.ts

- **EnvironmentOptions:** caminho legado de ambiente → `"./environment"`.
- **getPointerNdc:** método privado removido; passou a usar `getPointerNdc(this.rendererManager.renderer.domElement, event)` importado de `"./utils"`.

### core/viewer/index.ts

- **ViewerRoomManager / ViewerSelectionManager:** deixam de ser exportados dos ficheiros locais; passam a re-exportar de `"../../viewer-engine/room"` e `"../../viewer-engine/selection"`.

---

## 4. Ficheiros atualizados no projeto

| Ficheiro | Alteração |
|----------|-----------|
| `src/3d/viewer-engine/ViewerCore.ts` | Import de `EnvironmentOptions` de `./environment`; import e uso de `getPointerNdc` de `./utils`; remoção do método privado `getPointerNdc`. |
| `src/3d/viewer-engine/scene/SceneManager.ts` | Imports de `createGround`, `createGrid` e `EnvironmentOptions` de `../environment`. |
| `src/3d/viewer-engine/utils/ViewerUtils.ts` | **Novo:** função `getPointerNdc(canvas, event)`. |
| `src/3d/viewer-engine/utils/index.ts` | Export de `getPointerNdc` a partir de `ViewerUtils`. |
| `src/3d/viewer-engine/events/EventsManager.ts` | **Novo:** placeholder. |
| `src/3d/viewer-engine/state/ViewerState.ts` | **Novo:** placeholder. |
| `src/3d/viewer-engine/tools/ViewerTools.ts` | **Novo:** placeholder. |
| `src/3d/viewer-engine/index.ts` | Export de `ViewerSelectionManager`, `ViewerRoomManager`, `createGround`, `createGrid`, `EnvironmentOptions`, `getPointerNdc`. |
| `src/3d/core/viewer/index.ts` | Re-export de `ViewerRoomManager` e `ViewerSelectionManager` a partir de viewer-engine. |

### Ficheiros removidos

- ficheiros legados de SelectionManager e ViewerRoomManager da árvore antiga do viewer
- ficheiro legado de Environment da árvore antiga de core 3D

---

## 5. O que será migrado / feito na Etapa 5

- **EventsManager:** extrair do ViewerCore os handlers de eventos (canvas pointer, click, double-click, etc.) para `EventsManager.ts`, mantendo a mesma assinatura/comportamento.
- **ViewerState:** extrair estado (selectedBoxId, transformMode, mousePreset, etc.) para um módulo de estado reutilizável, sem alterar API pública do Viewer.
- **ViewerTools:** extrair lógica de TransformControls, modo de transform e attachment de gizmos para `ViewerTools.ts`.
- **ViewerUtils:** eventualmente mover mais helpers puros (por exemplo cálculo de NDC em `getHighlightIntersects` / `getBoxIdAtPointer`) para evitar duplicação.
- **core/viewer:** avaliar se manter apenas `viewerApiAdapter` e re-exports, ou eliminar a pasta quando nada mais depender dos re-exports de core/viewer.

Qualquer migração na Etapa 5 deve manter a mesma regra: apenas mover e ajustar imports, sem alterar comportamento nem APIs públicas.

---

## 6. Verificação

- `npm run build` executado com sucesso após as alterações.
- Nenhuma referência restante aos módulos legados de environment/selection/room nos imports do projeto.
- API pública do Viewer e do ViewerCore mantida; compatibilidade de imports via `core/viewer` preservada através de re-exports.
