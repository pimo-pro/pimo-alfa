# Viewer Engine — Etapa 2: Migração scene, renderer e highlight

Documentação da segunda etapa da divisão estrutural do Viewer Engine.

## Objetivo

Mover para `src/3d/viewer-engine/` os módulos que ainda estavam em `src/3d/core/` e que fazem parte do motor do Viewer: SceneManager, RendererManager e HighlightManager. Apenas mover, reorganizar e ajustar imports, sem alterar comportamento nem APIs públicas.

---

## 1. O que foi movido e para onde

| Módulo              | Antes (src/3d/core/)     | Depois (src/3d/viewer-engine/)     |
|---------------------|---------------------------|------------------------------------|
| SceneManager        | `SceneManager.ts`         | `scene/SceneManager.ts`            |
| SceneOptions        | (em SceneManager.ts)      | `scene/index.ts`                   |
| RendererManager     | `RendererManager.ts`      | `renderer/RendererManager.ts`      |
| RendererOptions     | (em RendererManager.ts)   | `renderer/index.ts`                 |
| HighlightManager    | `HighlightManager.ts`     | `highlight/HighlightManager.ts`    |

Os ficheiros originais em `src/3d/core/` foram **removidos** após a criação das cópias em viewer-engine.

---

## 2. Estrutura criada

```
src/3d/viewer-engine/
├── scene/
│   ├── SceneManager.ts   # Cena, ground, grid, reflexões
│   └── index.ts
├── renderer/
│   ├── RendererManager.ts
│   └── index.ts
├── highlight/
│   ├── HighlightManager.ts
│   └── index.ts
├── camera/       # (Etapa 1)
├── controls/     # (Etapa 1)
├── lighting/     # (Etapa 1)
├── ...
├── ViewerCore.ts
└── index.ts
```

---

## 3. Ajuste de imports

### SceneManager (viewer-engine/scene/SceneManager.ts)

- **Dependência:** `Environment` (createGround, createGrid, EnvironmentOptions).
- **Alteração registrada na Etapa 2:** SceneManager ficou temporariamente dependente do módulo de Environment legado.
- **Estado atual (após Etapa 4):** SceneManager importa Environment de `viewer-engine/environment`.

### RendererManager e HighlightManager

- Sem dependências internas além de Three.js; conteúdo copiado sem alteração de imports.

### ViewerCore.ts

- `SceneManager` / `SceneOptions`: de `"../core/SceneManager"` → `"./scene"`.
- `RendererManager` / `RendererOptions`: de `"../core/RendererManager"` → `"./renderer"`.
- `HighlightManager`: de `"../core/HighlightManager"` → `"./highlight"`.

---

## 4. Ficheiros atualizados no projeto

| Ficheiro                         | Alteração                                                                 |
|----------------------------------|---------------------------------------------------------------------------|
| `src/3d/viewer-engine/ViewerCore.ts` | Imports de SceneManager, RendererManager e HighlightManager passam a usar `./scene`, `./renderer`, `./highlight`. |
| `src/3d/viewer-engine/index.ts`  | Passou a exportar também SceneManager, SceneOptions, RendererManager, RendererOptions, HighlightManager. |
| `src/3d/core/SceneManager.ts`    | **Removido** (lógica em viewer-engine/scene/).                           |
| `src/3d/core/RendererManager.ts` | **Removido** (lógica em viewer-engine/renderer/).                        |
| `src/3d/core/HighlightManager.ts`| **Removido** (lógica em viewer-engine/highlight/).                       |

Nenhum outro ficheiro do projeto importava estes três módulos a partir de `3d/core/`; apenas o ViewerCore os utilizava, pelo que não foi necessário alterar mais nenhum import.

---

## 5. Garantias

- **Viewer** continua a expor a mesma API via `ViewerCore`; `src/3d/core/Viewer.ts` inalterado (só delega).
- **TransformControls, OrbitControls e eventos** continuam a funcionar; a lógica permanece em ViewerCore, que agora usa os módulos em viewer-engine.
- **Comportamento funcional** inalterado; apenas a localização do código e os caminhos de import.
- **Build:** `npm run build` conclui com sucesso após as alterações.

---

## 6. O que será migrado na Etapa 3

Candidatos a migrar para viewer-engine na próxima etapa (conforme documentação da Etapa 1 e dependências do ViewerCore):

- **viewer/** (`src/3d/core/viewer/`): ViewerBoxManager, SnapshotRenderer, GlbLoader, etc., usados pelo ViewerCore. Podem ser movidos para `viewer-engine/` (por exemplo `viewer-engine/box-manager/`, `viewer-engine/snapshot/`, ou manter uma pasta `viewer-engine/viewer/`).
- **Events, tools, state, utils:** continuar a extração de lógica do ViewerCore para os módulos placeholder já criados em viewer-engine (events/, tools/, state/, utils/).

### Nota de consistência (estado atual)

- A migração de `Environment` foi concluída na Etapa 4 em `viewer-engine/environment`.

Qualquer migração na Etapa 3 deve manter a mesma regra: apenas mover e ajustar imports, sem alterar comportamento nem APIs públicas.
