# Viewer Engine — Etapa 3: Migração box, snapshot, loader e types

Documentação da terceira etapa da divisão estrutural do Viewer Engine.

## Objetivo

Migrar os módulos restantes do antigo `core/viewer` para a estrutura modular em `viewer-engine`, reduzindo dependências híbridas e preparando a extração de events/state/tools/utils na Etapa 4. Apenas mover, reorganizar e ajustar imports, sem alterar comportamento nem APIs públicas.

---

## 1. O que foi movido e para onde

| Módulo / ficheiro   | Antes (src/3d/core/viewer/) | Depois (src/3d/viewer-engine/)   |
|---------------------|-----------------------------|-----------------------------------|
| BoxManager          | `BoxManager.ts`             | `box/BoxManager.ts`               |
| SnapshotRenderer   | `SnapshotRenderer.ts`      | `snapshot/SnapshotRenderer.ts`   |
| GlbLoader          | `GlbLoader.ts`              | `loader/GlbLoader.ts`            |
| types              | `types.ts`                  | `types/types.ts`                 |

Os ficheiros originais da pasta legada do viewer foram **removidos** após a criação das cópias em viewer-engine. Na etapa seguinte, room e selection também foram migrados para viewer-engine.

---

## 2. Estrutura criada

```
src/3d/viewer-engine/
├── box/
│   ├── BoxManager.ts      # ViewerBoxManager (mapa de caixas, reflow)
│   └── index.ts
├── snapshot/
│   ├── SnapshotRenderer.ts
│   └── index.ts
├── loader/
│   ├── GlbLoader.ts       # addModelToBox, GlbLoaderAddOptions
│   └── index.ts
├── types/
│   ├── types.ts           # ViewerBoxEntry
│   └── index.ts
├── camera/    # (Etapa 1)
├── controls/  # (Etapa 1)
├── lighting/  # (Etapa 1)
├── scene/     # (Etapa 2)
├── renderer/  # (Etapa 2)
├── highlight/ # (Etapa 2)
├── ...
├── ViewerCore.ts
└── index.ts
```

---

## 3. Ajuste de imports nos módulos migrados

### types/types.ts

- **Dependências:** `LoadedWoodMaterial` (3d/materials), `ViewerDrillMarkersByPanel` (core/types).
- **Alteração:** imports passaram de `"../../materials/WoodMaterial"` e `"../../../core/types"` para `"../../materials/WoodMaterial"` e `"../../../core/types"` (paths relativos a `viewer-engine/types/` → ../../ = 3d, ../../../ = src).

### box/BoxManager.ts

- **Dependência:** `ViewerBoxEntry` (antes em ./types).
- **Alteração:** import de `"./types"` para `"../types"`.

### snapshot/SnapshotRenderer.ts

- **Dependência:** `ViewerSnapshot` (context/projectTypes).
- **Alteração:** mantido `"../../../context/projectTypes"` (relativo a viewer-engine/snapshot/).

### loader/GlbLoader.ts

- **Dependência:** `ViewerBoxEntry` (antes em ./types).
- **Alteração:** import de `"./types"` para `"../types"`.

---

## 4. Ficheiros atualizados no projeto

| Ficheiro | Alteração |
|----------|-----------|
| `src/3d/viewer-engine/ViewerCore.ts` | Imports de `ViewerBoxManager` e `SnapshotRenderer` passaram de `"../core/viewer/index"` para `"./box"` e `"./snapshot"`. |
| `src/3d/viewer-engine/index.ts` | Passou a exportar também `ViewerBoxManager`, `SnapshotRenderer`, `SnapshotRendererHost`, `addModelToBox`, `GlbLoaderAddOptions`, `ViewerBoxEntry`. |
| `src/3d/core/viewer/index.ts` | Deixa de exportar a partir dos ficheiros locais removidos; re-exporta `ViewerBoxManager`, `SnapshotRenderer`, `addModelToBox`, `ViewerBoxEntry`, `SnapshotRendererHost` a partir de `../../viewer-engine/...`. |
| `src/3d/core/viewer/BoxManager.ts` | **Removido** (lógica em viewer-engine/box/). |
| `src/3d/core/viewer/SnapshotRenderer.ts` | **Removido** (lógica em viewer-engine/snapshot/). |
| `src/3d/core/viewer/GlbLoader.ts` | **Removido** (lógica em viewer-engine/loader/). |
| `src/3d/core/viewer/types.ts` | **Removido** (lógica em viewer-engine/types/). |

Nenhum outro ficheiro do projeto importava estes módulos directamente de `core/viewer`; apenas o ViewerCore importava `ViewerBoxManager` e `SnapshotRenderer` de `core/viewer/index`, e foi actualizado para usar viewer-engine.

---

## 5. Garantias

- **Viewer** continua a expor a mesma API; `src/3d/core/Viewer.ts` inalterado (delega em ViewerCore).
- **TransformControls, OrbitControls e eventos** continuam a funcionar; a lógica permanece em ViewerCore, que passa a usar os módulos em viewer-engine (box, snapshot).
- **Compatibilidade:** Quem importar de `core/viewer` (ex.: `ViewerBoxManager`, `SnapshotRenderer`, `addModelToBox`, `ViewerBoxEntry`) continua a ser servido via re-exports em `core/viewer/index.ts`.
- **Build:** `npm run build` conclui com sucesso após as alterações.

---

## 6. O que será migrado na Etapa 4

- **Environment:** migrar para `viewer-engine/environment/` e ajustar imports em viewer-engine/scene.
- **ViewerRoomManager e SelectionManager:** migrar para viewer-engine (ex.: `viewer-engine/room/`, `viewer-engine/selection/`) para deixar o índice legado apenas como re-export.
- **Events, tools, state, utils:** começar a extrair do ViewerCore a lógica correspondente para os módulos placeholder já existentes em viewer-engine (handlers de eventos, estado de seleção/preset, TransformControls/tools, helpers), mantendo apenas movimentação e ajuste de imports, sem alterar comportamento.

### Nota de consistência (estado atual)

- Os itens de room/selection/environment foram concluídos na Etapa 4.

Qualquer migração na Etapa 4 deve manter a mesma regra: apenas mover e ajustar imports, sem alterar comportamento nem APIs públicas.
