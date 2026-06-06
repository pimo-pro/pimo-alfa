# RELATÓRIO TÉCNICO COMPLETO — PIMO-CRIATIVO

**Versão:** 1.0  
**Data:** Junho 2026  
**Autor:** Análise Técnica Sênior  
**Projeto:** pimo-criativo (PIMO v3)

---

## 1. ARQUITETURA GERAL DO PROJETO

### 1.1 Estrutura de Pastas

```
pimo-criativo/
├── src/
│   ├── 3d/                          # Motor 3D e renderização (Three.js)
│   │   ├── core/                    # ViewerCore, SceneManager, CameraManager, RendererManager, Lights, Controls, Environment
│   │   ├── materials/               # MaterialLibrary, WoodMaterial
│   │   ├── objects/                 # BoxBuilder (geometria paramétrica)
│   │   ├── room/                    # RoomBuilder, RoomManager, elementos (portas/janelas)
│   │   ├── snapping/                # SmartSnapping, RemateSmartSnapping
│   │   ├── viewer-engine/           # ViewerCore (orquestrador principal), state, events, tools, overlays
│   │   ├── outline/                 # EdgeOutlineSystem
│   │   ├── visibility/              # WallRaycastCulling
│   │   ├── gizmos/                  # WallGizmo
│   │   ├── collision/               # Detecção de colisão
│   │   └── autoLayout/              # AutoLayoutEngine
│   ├── api/                         # Cliente API (authApi, projectsApi, usersApi, globalSettingsApi, userSettingsApi)
│   ├── auth/                        # Autenticação (useAuth, rbac)
│   ├── catalog/                     # Catálogo de itens
│   ├── components/                  # Componentes React da UI
│   │   ├── admin/                   # Painéis administrativos (MaterialsManager, CADModelsManager, TemplatesManager, RulesManager, etc.)
│   │   ├── export/                  # Exportação
│   │   ├── icons/                   # Ícones
│   │   ├── layout/                  # Layout principal (Workspace, Header, Footer, LeftPanel, RightPanel, Toolbars, Panels)
│   │   ├── modals/                  # Modais
│   │   ├── panels/                  # CutlistPanel, RulesPanel
│   │   ├── PiLoader/                # Loader PI
│   │   ├── projects/                # Componentes de projetos
│   │   ├── settings/                # Configurações
│   │   ├── showroom/                # Showroom
│   │   ├── ui/                      # Componentes UI reutilizáveis (Panel, UnifiedPopover, Cube, CutListTable, etc.)
│   │   ├── v4/                      # Versão 4 (legacy)
│   │   └── viewer/                  # ThreeViewer wrapper
│   ├── config/                      # Configurações
│   ├── constants/                   # Constantes (viewerOptions, toolbarConfig, fileManagerConfig, whatsappConfig)
│   ├── context/                     # Context API (ProjectProvider, PimoViewerContext, MaterialContext, ToastContext, SettingsContext, ThemeContext, ToolbarModalContext, WorkspaceUndoRedoRegistryContext, BottomInfoContext)
│   ├── core/                        # Lógica de negócio principal
│   │   ├── calculator/              # woodCalculator
│   │   ├── design/                  # ferragens, acessorios
│   │   ├── glb/                     # Integração GLB (glbLoader, extractPartsFromGLB, glbPartsToCutList, glbRegistry)
│   │   ├── layout/                  # smartArrange, viewerLayoutAdapter, layoutWarnings
│   │   ├── manufacturing/           # boxManufacturing, cutlistFromBoxes, materials
│   │   ├── cad/                     # cadModels, categories
│   │   ├── rules/                   # Sistema de regras dinâmicas (types, modelRules, rulesConfig, rulesProfiles, validation, positioning)
│   │   ├── pricing/                 # pricing
│   │   ├── templates/               # templates
│   │   ├── components/              # componentTypes
│   │   ├── ferragens/               # ferragens
│   │   ├── acessorios/              # acessorios
│   │   ├── baseCabinets/            # Modelos base de armários
│   │   ├── box/                     # boxValidation, panelIds, types
│   │   ├── multibox/                # multiBoxManager
│   │   ├── pdf/                     # Geração de PDFs (pdfCutlist, pdfTechnical, pdfUnified, gerarPdfTecnico)
│   │   ├── cutlayout/               # cutLayoutEngine, cutLayoutPdf, cutLayoutTypes
│   │   ├── cnc/                     # cncExport, cncTypes, tcnGenerator, kdtGenerator
│   │   ├── export/                  # pdfGenerator
│   │   ├── validation/              # validateProject
│   │   ├── deploy/                  # deployLog, backupManager, cloudBackup, versioning
│   │   ├── industriais/             # ferragensIndustriais
│   │   ├── docs/                    # Documentação interna (architectureIndex, changelog, specs, features, howItWorks, projectRoadmap)
│   │   ├── viewer/                  # viewerApiAdapter
│   │   └── materials/               # materialPresets
│   ├── data/                        # Dados estáticos (moveisUnificados)
│   ├── hooks/                       # Hooks customizados (usePimoViewer, useCalculadoraSync, useViewerSync, useCadModelsSync, useCutlistData, useGerarArquivoHandlers, useProjects, useProjectsUIOverlay, useSelectedBoxInfo, useSendProjectPackage, useStorageList, useTemplates, useMaterials, useFerragens, useComponentTypes, useIndustrialTools, usePhotoModeLivePreview)
│   ├── landing-v4/                  # Landing page v4
│   ├── models/                      # Modelos (BoxLayers)
│   ├── modules/                     # Módulos (drilling)
│   ├── nesting-v3/                  # Nesting v3
│   ├── pages/                       # Páginas da aplicação
│   │   ├── admin/                   # AdminPanel, GlobalSettingsAdminPage, ManagePermissionsPage, ManageRolesPage, UsersAdminPage, materials/
│   ├── project/                     # useProjectState
│   ├── server/                      # Server-side
│   ├── services/                    # Serviços (apiClient, boxLayersService, drawerCutlistAdapter)
│   ├── stores/                      # Zustand stores (uiStore, wallStore)
│   ├── templates/                   # Templates
│   ├── theme/                       # Tema
│   ├── ui/                          # UI components
│   ├── utils/                       # Utilitários (storage, units, wallSnapping, openingConstraints)
│   ├── validation/                  # Validação
│   ├── v4/                          # Versão 4
│   ├── workspace/                   # Workspace effects
│   ├── __dev__/                     # Código de desenvolvimento
│   ├── App.tsx                      # Aplicação principal
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Estilos globais
├── public/                          # Assets públicos (hdr, textures, logo)
├── docs/                            # Documentação Markdown (38 arquivos)
├── backend/                         # Backend Node.js (Express) - estrutura aninhada
├── api/                             # API routes (PHP)
├── scripts/                         # Scripts de build/deploy
├── tests/                           # Testes
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

### 1.2 Organização dos Módulos

O projeto segue uma arquitetura **moderna React com separação clara de camadas**:

```
┌─────────────────────────────────────────────┐
│        APRESENTAÇÃO (Components)            │
│  LeftPanel │ RightPanel │ Toolbar │ Modals  │
└───────────────┬─────────────────────────────┘
                ↓
┌─────────────────────────────────────────────┐
│      CONTEXTO (State Management)            │
│  ProjectProvider │ PimoViewerContext        │
│  MaterialContext │ ToastContext             │
└───────────────┬─────────────────────────────┘
                ↓
┌─────────────────────────────────────────────┐
│    LÓGICA DE NEGÓCIO (Core)                 │
│  Calculator │ Design │ Rules │ Manufacturing│
│  GLB │ PDF │ CNC │ Pricing                  │
└───────────────┬─────────────────────────────┘
                ↓
┌─────────────────────────────────────────────┐
│    3D RENDERING (Three.js)                  │
│  ViewerCore │ SceneManager │ Lights │ Materials │
└─────────────────────────────────────────────┘
```

### 1.3 Fluxo de Dados

**Fluxo Primário (Single Source of Truth):**
```
workspaceBoxes (Editável UI)
    ↓ [buildBoxesFromWorkspace]
boxes[] (BoxModule[])
    ↓ [buildDesignState: cutlistFromBoxes + extractDrawerCutlist]
cutList[] + cutListComPreco + ferragens
    ↓ [glbExtraction if CAD]
extractedPartsByBoxId
    ↓ [Viewer sync via useCalculadoraSync]
Visualização 3D atualizada
```

**Fluxo de Sincronização (Main Loop):**
1. Usuário edita `workspaceBox` (UI)
2. `ProjectProvider` calcula `boxes[]` via `buildBoxesFromWorkspace()`
3. `useCalculadoraSync` detecta mudança → `Viewer.updateBox()`
4. `Viewer` recalcula bounding box → `reflowBoxes()`
5. `useCadModelsSync` sincroniza modelos CAD
6. `onModelLoaded` extrai peças → `setWorkspaceBoxDimensoes`
7. Volta ao passo 2 (re-render)

### 1.4 Providers, Hooks, Contextos e Serviços

**Providers (Context API):**
- `ProjectProvider` - Estado global do projeto (workspaceBoxes, boxes, cutlist, seleção, histórico undo/redo)
- `PimoViewerProvider` - Viewer 3D (API exposta via `PimoViewerApi`)
- `MaterialProvider` - Materiais (CRUD, presets, visual materials)
- `ToastProvider` - Notificações
- `SettingsProvider` - Configurações globais
- `ThemeProvider` - Tema (dark/light)
- `ToolbarModalProvider` - Modais da toolbar
- `WorkspaceUndoRedoRegistryProvider` - Registry de undo/redo
- `BottomInfoProvider` - Painel inferior de informações

**Hooks Principais:**
- `useProject()` / `useMaterial()` - Consumers de contexto
- `usePimoViewer()` - API plana do viewer (boxes, room, camera, materials, ruler, snapping, autoLayout)
- `useCalculadoraSync()` - Sincronização ProjectContext → Viewer (fingerprinting para evitar rebuilds)
- `useCadModelsSync()` - Sincronização modelos CAD
- `useViewerSync()` - Sincronização bidirecional (parcialmente implementado)
- `useGerarArquivoHandlers()` - Exportação PDF, CNC/TCN, ZIP, nesting
- `useCutlistData()` - Dados da cutlist para UI
- `useProjects()` / `useProjectsUIOverlay()` - Gerenciamento de projetos

**Serviços:**
- `boxLayersService.ts` - Gera `doorsLayer` e `drawersLayer` para cada caixa
- `drawerCutlistAdapter.ts` - Transforma `DrawerLayerItem[]` em peças de corte
- `apiClient.js` - Cliente HTTP base

---

## 2. SISTEMAS PRINCIPAIS EXISTENTES

### 2.1 Sistema de Projetos
- **Estado:** `ProjectState` com `workspaceBoxes`, `boxes`, `selectedBoxId`, `cutListComPreco`, `precoTotalProjeto`
- **Persistência:** localStorage + backend API (`/api/projects/index.php`)
- **Funcionalidades:** CRUD projetos, duplicação, import/export, autosave, versionamento
- **Multi-box:** Suporte a múltiplas caixas no workspace com reflow automático

### 2.2 Sistema de Peças (Cutlist)
- **Pipeline único:** `cutlistFromBoxes.ts` → `cutlistComPrecoFromBox()` → `cutlistComPrecoFromBoxes()`
- **Cache:** Cache por caixa (`cutlistPorCaixaCache`) e global (`cutlistCompletaCache`)
- **Integração GLB:** Peças extraídas de modelos CAD mergeadas na cutlist final
- **QR Codes:** `attachQrCodesToCutlist()` com numeração sequencial 1-99
- **Materiais por face:** Preparado para `faceMaterials` (Layout Engine v2)

### 2.3 Sistema TCN/TXML
- **TCN Generator:** `tcnGenerator.ts` - Gera arquivos TCN para CNC (usa apenas `topDrillable`, ignora faces A/B)
- **KDT Generator:** `kdtGenerator.ts` - Formato KDT
- **DRILL/XML:** `buildDrillFilesForProject` - Filtro cavilha + `topDrillable === false`
- **Regra:** TCN/DRILL não usam modelo A/B; apenas `topDrillable` e geometria

### 2.4 Sistema de Viewer 3D
- **Core:** `ViewerCore` (5500+ linhas) - Orquestrador principal
- **Componentes:** SceneManager, CameraManager, RendererManager, Lights, Controls, Environment
- **Funcionalidades avançadas:**
  - Multi-box com `ViewerBoxManager`
  - TransformControls (arrastar, rotacionar, escalar)
  - HighlightManager (hover/seleção por mesh)
  - EdgeOutlineSystem (arestas isoladas)
  - InternalRuler (medição CAD interna)
  - SmartSnapping / RemateSmartSnapping
  - AutoLayoutEngine
  - RoomManager (paredes, portas, janelas, utilidades)
  - SnapshotRenderer (save/restore câmera)
  - ViewerRenderExporter (exportação imagem/PDF)
  - MeasurementOverlay (régua 2D)
  - OrlaVisualizer, RematePieceVisualizer, HematiVisualizer, RodapeVisualizer

### 2.5 Sistema de Snapping
- **SmartSnapping:** Grid configurável, alinhamento a paredes, cantos, centros, stacking, spacing
- **RemateSmartSnapping:** Snap específico para remates (rodapés, guarnições)
- **RoomSnapping:** Alinhamento a paredes da sala
- **AutoAlignment/AutoSpacing:** Distribuição automática

### 2.6 Sistema de Auto-Layout
- **AutoLayoutEngine:** `fillWallWithModule`, `extendAlongWallFromBox`, `distributeBoxesEvenly`, `autoStackShelvesInBox`
- **Bridge:** `bindAutoLayoutBridge` conecta ao ProjectContext para obter workspaceBoxes e aplicar planos

### 2.7 Room System
- **RoomBuilder:** Stub (desabilitado, retorna strings vazias)
- **RoomManager:** Gestor completo (4 paredes + extras, piso, teto, lock, utilidades)
- **Funcionalidades:** Criar sala com dimensões, adicionar portas/janelas, utilidades, edit mode, gizmo de paredes

### 2.8 Sistema de Usuários e Permissões
- **Roles (5 níveis):** visitor, pro, ultra, ultra+, admin
- **Permissões atômicas:** `project.view.self`, `project.edit.self`, `project.send_to_production.self`, `project.view.factory`, `project.view.all`, `user.manage.below`, `admin.full_access`
- **Cálculo:** `permissões_efetivas = (permissões_da_role + extraPermissions) - removedPermissions`
- **Fábrica:** ultra+ é gerente, cria usuários abaixo, vê projetos da fábrica
- **RBAC:** `canAccessAdminPanel`, `canOpenProjectsShowroom`, `hasFullAccess`
- **Auth:** JWT via `useAuth`, login/register/forgot-password pages

### 2.9 Sistema de API Routes
- **Frontend API Client:** `src/api/` (authApi, projectsApi, usersApi, globalSettingsApi, userSettingsApi)
- **Backend:** `backend/backend/data/projects/` (Express/Node.js) + `api/` (PHP)
- **Endpoints:** `/api/projects/index.php` (GET/POST/PUT/DELETE), `/api/materials`, `/auth/login`, `/me`

### 2.10 Sistema de Banco de Dados
- **Frontend:** localStorage (projetos, cadModels, settings, profiles)
- **Backend:** PostgreSQL (Render) com `PIMO_PROJECTS_DATA_DIR` para JSON files
- **Migrações:** `work-whatsapp/migrations/` (separado)

### 2.11 Sistema de Caching
- **Cutlist Cache:** `cutlistPorCaixaCache` (Map por boxId) + `cutlistCompletaCache` (global)
- **Invalidation:** `clearAllCutlistCache()`, `clearCutlistCacheForProject()`
- **Material Cache:** `displayMaterialBaseByUuid` (Map por material.uuid)
- **Viewer Bounds Cache:** `ViewerBoundsCache`

### 2.12 Sistema de Eventos Internos
- **Planejado:** `PIMO-CRIATIVO-PLANO-EVENTS-SYSTEM.md`
- **Feature Flag:** `features.eventsSystem` (default: false)
- **Eventos iniciais:** USER_LOGIN, USER_LOGOUT, USER_ROLE_CHANGED, PROJECT_CREATED, PROJECT_UPDATED, PROJECT_VISITED, PROJECT_VISIBILITY_CHANGED, FACTORY_USER_ADDED
- **Função central:** `recordEvent(eventData)` - no-op quando desativado
- **Integração futura:** Painel `/admin/events`, notificações, IA, plugins

### 2.13 Sistema de Proteção PIMO-KEEP e ANTI-LOOP RULES
- **PIMO-KEEP:** Referenciado em documentação (`RELATORIO_SISTEMA_PI_TECNICO.md`, `PIMO_LABEL_SYSTEM_SPEC.md`)
- **Anti-Loop:** `VIEWER_NUNCA_SOBRESCREVER_POSICAO.md` - Viewer nunca sobrescreve posição; posição vem do ProjectContext
- **Fingerprinting:** `useCalculadoraSync` usa `getStructureFingerprint` para evitar rebuilds desnecessários no Viewer
- **Single Source of Truth:** `workspaceBoxes` → `boxes` derivado; Viewer apenas reflete estado

---

## 3. DEPENDÊNCIAS INTERNAS

### 3.1 Relações entre Módulos (Críticas)

```
App.tsx
├── ProjectProvider (context/projectState.ts)
│   ├── useProjectState (project/useProjectState.ts)
│   ├── useViewerSync (hooks/useViewerSync.ts)
│   ├── useProjectExportActions (context/hooks/useProjectExportActions.ts)
│   ├── useProjectPersistence (context/hooks/useProjectPersistence.ts)
│   └── useProjectActions (context/hooks/useProjectActions.ts)
│       ├── buildBoxesFromWorkspace → convertWorkspaceToBox
│       ├── buildBoxDesign → cutlistComPrecoFromBox
│       └── buildDesignState → cutlistComPrecoFromBoxes + extractedParts
│
├── PimoViewerProvider (context/PimoViewerContextCore.ts)
│   └── usePimoViewer (hooks/usePimoViewer.ts)
│       ├── useViewerBoxes (hooks/viewer/useViewerBoxes.ts)
│       ├── useViewerRoom (hooks/viewer/useViewerRoom.ts)
│       ├── useViewerCamera (hooks/viewer/useViewerCamera.ts)
│       └── useViewerMaterials (hooks/viewer/useViewerMaterials.ts)
│
├── Workspace (components/layout/workspace/Workspace.tsx)
│   ├── useCalculadoraSync (hooks/useCalculadoraSync.ts) → Viewer API
│   ├── useCadModelsSync (hooks/useCadModelsSync.ts) → Viewer API
│   └── MultiBoxManager (core/multibox/multiBoxManager.ts)
│
└── Layout Components (LeftPanel, RightPanel, Toolbars, Panels)
    ├── useProject() → ProjectContext
    ├── useMaterial() → MaterialContext
    └── usePimoViewerContext() → PimoViewerContext
```

### 3.2 Arquivos que Dependem de Outros (Pontos Críticos)

| Arquivo | Dependências Críticas | Risco |
|---------|----------------------|-------|
| `projectState.ts` | `cutlistFromBoxes`, `boxManufacturing`, `drawerCutlistAdapter`, `boxLayersService`, `rulesConfig`, `materials.api` | **ALTO** - Núcleo do cálculo |
| `useCalculadoraSync.ts` | `projectState` (convertWorkspaceToBox), `ViewerCore` API, `drillingAdapter`, `cutlistFromBoxes` | **ALTO** - Sincronização 3D |
| `ViewerCore.ts` | 50+ imports internos (scene, camera, renderer, lights, controls, box, room, snapping, autoLayout, measurement, etc.) | **ALTO** - Motor 3D |
| `cutlistFromBoxes.ts` | `boxManufacturing`, `drillingAdapter`, `drawerCutlistAdapter`, `materialsService`, `qrcodeService`, `wardrobeRules` | **ALTO** - Produção |
| `rulesConfig.ts` | `labelConfig`, `labelSystemV5` | **MÉDIO** - Configuração |
| `PimoViewerContextCore.ts` | `Viewer`, `projectTypes`, `BoxBuilder`, `ContextMenuEngine` | **MÉDIO** - API Viewer |

### 3.3 Pontos de Acoplamento Forte

1. **ProjectContext ↔ ViewerCore** - Via `useCalculadoraSync` (bidirecional: UI→Viewer e Viewer→Project via `onBoxTransform`)
2. **cutlistFromBoxes ↔ boxManufacturing** - `gerarModeloIndustrial` chamado dentro de `cutlistComPrecoFromBox`
3. **Drawer System** - Duas fontes de verdade: `DrawerGroup` (domínio moderno) vs `DrawerLayerItem` (persistido) vs `boxManufacturing.gerarGavetas` (legado)
4. **Material System** - `materialContext` + `materialLibraryV2` + `materials.api` + `materialsService` (múltiplas camadas)

### 3.4 Pontos Frágeis ou Duplicados

1. **Drawer System** - Duplicidade entre domínio moderno (`DrawerGroup`) e industrial legado (`boxManufacturing.gerarGavetas`)
2. **Documentation.tsx** - Arquivo vazio (dead code)
3. **ProjectRoadmapStyles_new.ts** - 1092 linhas não importadas
4. **RoomBuilder** - Stub vazio (sistema desabilitado)
5. **ThreeViewer.tsx** - 6 props não utilizadas
6. **useViewerSync** - APIs placeholder (`applyStateToViewer`, `extractStateFromViewer`, `saveViewerSnapshot`, `restoreViewerSnapshot`, `enable2DView`, `renderScene`)
7. **updateWorkspacePosition vs updateWorkspaceBoxPosition** - Funções idênticas (alias)
8. **Nomes de hooks semelhantes** - `useMaterial`/`useMaterials`, `usePimoViewer`/`usePimoViewerContext`, `useCadModels`/`useCadModelsSync`

---

## 4. PONTOS DE EXTENSÃO

### 4.1 Locais para Integração do Sistema Industrial (work-whatsapp)

| Local | Descrição | Como Integrar |
|-------|-----------|---------------|
| `ProjectProvider` / `projectState.ts` | Estado global de projetos | Adicionar campos `workOrderId`, `productionStatus`, `factoryId` em `ProjectState` e `WorkspaceBox` |
| `cutlistFromBoxes.ts` / `buildGlobalQrCutlistMerged` | Geração de cutlist para produção | Estender `CutListItemComPreco` com campos industriais (`workOrderItemId`, `nestingId`, `cncProgramId`) |
| `useGerarArquivoHandlers.ts` | Exportação CNC/TCN/PDF/ZIP | Adicionar handlers para `work-whatsapp` API endpoints |
| `src/api/` | Cliente API | Adicionar `workOrdersApi.ts`, `productionApi.ts`, `factoryApi.ts` |
| `backend/` | Backend Express | Estender rotas `/api/work-orders`, `/api/production`, `/api/factories` |
| `PimoViewerContextCore.ts` | Viewer API | Adicionar `setProductionMode`, `highlightProductionParts`, `showCuttingPlan` |
| `AdminPanel` / `components/admin/` | Painel admin | Adicionar páginas `WorkOrdersAdminPage`, `ProductionDashboardPage`, `FactoryManagementPage` |
| `rulesConfig.ts` | Regras de furação/produção | Estender `RulesConfig` com `productionRules`, `nestingRules`, `cncRules` |
| `labelSystemV5` / `LabelSystemV5.ts` | Etiquetas industriais | Integrar `workOrderNumber`, `batchId`, `machineId` no sistema de labels |

### 4.2 Locais para Novas Páginas

- **Roteamento:** `App.tsx` → `<Routes>` → Adicionar `<Route path="/nova-pagina" element={<NovaPagina />} />`
- **Layout:** Usar `ProtectedLayout` (com `Navbar` + `Outlet`) ou `AppChromeLayout` (header/footer simples)
- **Permissões:** Usar `PermissionRoute` com `check={hasFullAccess}` ou `check={canAccessAdminPanel}`
- **Lazy Loading:** Seguir padrão `const NovaPagina = lazy(() => import("./pages/NovaPagina"))`

### 4.3 Locais para Novos Módulos

- **Core:** `src/core/novo-modulo/` + export em `src/core/index.ts` (se existir)
- **Context:** Novo provider em `src/context/` + adicionar em `App.tsx` wrapper
- **Hooks:** `src/hooks/useNovoModulo.ts` + consumir contextos existentes
- **Components:** `src/components/novo-modulo/` + integrar no `Workspace` ou `LeftPanel`/`RightPanel`
- **Viewer:** Estender `ViewerCore` ou criar `ViewerExtension` via `bindAutoLayoutBridge`/`bindOrlaBridge`/`bindRemateBridge`
- **Types:** Estender `src/core/types.ts` e `src/context/projectTypes.ts`

### 4.4 Locais com Integração Futura Prevista

1. **Events System** - `features.eventsSystem` flag + `recordEvent()` + futuros handlers em pontos críticos (login, project CRUD, factory actions)
2. **Plugin System** - Fase 8 do Master Plan; `ViewerCore.events.emit()` já existe como stub
3. **AI Module** - Fase 7; integração via Events System + novos hooks `useAI*`
4. **Production Module** - Fase 6; `project.send_to_production` permission já definida
5. **Label System V5** - `labelSystemV5` em `RulesConfig` + `LabelSystemV5.ts` como SSOT futuro
6. **Material Library V2** - `materialLibraryV2.ts` + `VisualMaterial` + `faceMaterials` em `CutListItem`
7. **Room System** - `RoomBuilder` stub → implementação completa (Fase 6+)
8. **Multi-Model Multi-Box** - Já implementado (`models: BoxModelInstance[]` por caixa)

---

## 5. PÁGINAS EXISTENTES RELEVANTES

### 5.1 Páginas de Projeto
| Página | Rota | Descrição |
|--------|------|-----------|
| `ProjectsPage` | `/projects` | Lista de projetos do usuário (cards, filtros, ações) |
| `ProjectDetailPage` | `/projects/:id` | Detalhe do projeto (viewer 3D, cutlist, propriedades) |
| `ProjectsViewerPage` | `/projects/viewer` | Showroom de projetos (perm: `canOpenProjectsShowroom`) |
| `UserProjectsPage` | `/meus-projetos` | Projetos do usuário logado |
| `ProjectProgress` | `/project-progress` | Roadmap visual do projeto |

### 5.2 Páginas de Peça/Design
| Página | Rota | Descrição |
|--------|------|-----------|
| `LegacyApp` (root `/`) | `/` | Workspace principal (LeftPanel, Workspace 3D, RightPanel, Toolbars) |
| `PainelReferencia` | `/painel-referencia` | Documentação técnica interativa (arquitetura, specs, roadmap) |
| `Documentacao` | `/documentacao` | Documentação em português |
| `Ajuda` | `/ajuda` | Página de ajuda |

### 5.3 Páginas de Produção
| Página | Rota | Descrição |
|--------|------|-----------|
| `NestingV3Page` | `/nesting-v3` | Nesting v3 (otimização de corte) |
| `CutlistPanel` (componente) | - | Painel de cutlist no workspace |
| `FerragensPanel` (componente) | - | Painel de ferragens |

### 5.4 Páginas Administrativas
| Página | Rota | Permissão |
|--------|------|-----------|
| `AdminPanel` | `/admin` | `canAccessAdminPanel` (admin/ultra+) |
| `UsersAdminPage` | `/admin/users` | `hasFullAccess` (admin) |
| `ManageRolesPage` | `/admin/roles` | `canAccessAdminPanel` |
| `ManagePermissionsPage` | `/admin/permissions` | `canAccessAdminPanel` |
| `GlobalSettingsAdminPage` | `/admin/global-settings` | `hasFullAccess` |
| `MaterialsManager` (componente) | - | Admin: gestão de materiais CRUD |
| `CADModelsManager` (componente) | - | Admin: gestão de modelos CAD |
| `TemplatesManager` (componente) | - | Admin: gestão de templates |
| `RulesManager` / `RulesAdminPage` (componente) | - | Admin: configuração de regras dinâmicas |
| `FerragensAdminPage` (componente) | - | Admin: catálogo de ferragens |
| `ComponentTypesAdminPage` (componente) | - | Admin: tipos de componentes |
| `DeployAdminPage` (componente) | - | Admin: deploy/versionamento |
| `MaterialsManufacturing` (componente) | - | Admin: materiais para manufatura |
| `FileManager` (componente) | - | Admin: gestão de arquivos |

### 5.5 Páginas de Autenticação
| Página | Rota |
|--------|------|
| `LoginPage` | `/login` |
| `RegisterPage` | `/register` |
| `ForgotPasswordPage` | `/forgot-password` |
| `MePage` | `/me` (perfil do usuário) |
| `SettingsPage` | `/definicoes` |

### 5.6 Páginas de API
- **Frontend API Client:** `src/api/` (authApi, projectsApi, usersApi, globalSettingsApi, userSettingsApi)
- **Backend Routes:** `backend/backend/data/projects/` + `api/` (PHP)
- **Endpoints principais:** `/api/projects/index.php`, `/api/materials`, `/auth/login`, `/me`

---

## 6. ANÁLISE DE COMPATIBILIDADE

### 6.1 O que Já Existe no pimo-criativo (Aproveitável)

| Sistema | Status | Comentário |
|---------|--------|------------|
| **Autenticação/RBAC** | ✅ Completo | 5 roles, permissões atômicas, fábrica, JWT |
| **Gestão de Projetos** | ✅ Completo | CRUD, multi-box, persistência local+backend |
| **Viewer 3D Avançado** | ✅ Completo | Three.js, multi-box, snapping, auto-layout, room, measurement |
| **Cutlist Industrial** | ✅ Completo | Pipeline único, cache, QR codes, materiais por face |
| **TCN/CNC Export** | ✅ Completo | tcnGenerator, kdtGenerator, DRILL/XML |
| **PDF Técnico/Unificado** | ✅ Completo | pdfTechnical, pdfUnified, pdfCutlist |
| **Sistema de Regras Dinâmicas** | ✅ Completo | Configuração admin, validação, perfis |
| **Sistema de Materiais V2** | ✅ Avançado | VisualMaterial, faceMaterials, UV, roughness/metallic |
| **Gavetas (Domínio Moderno)** | ✅ Forte | DrawerGroup, DrawerParametrics, DrawerFactory (Viewer) |
| **Portas (Sistema Completo)** | ✅ Completo | DoorLayerItem, DoorFactory, dobradiças, furação |
| **GLB Integration** | ✅ Completo | Extração de peças, cutlist merge, auto-positioning |
| **Smart Layout/Auto-Arrange** | ✅ Completo | smartArrange, viewerLayoutAdapter, layoutWarnings |
| **Nesting v3** | ✅ Implementado | Otimização de corte |
| **Orla/Remate/Hemati/Rodape** | ✅ Visualizers | Visualizadores no ViewerCore |
| **Label System V5** | ✅ Preparado | SSOT para etiquetas, QR, designer |
| **Event System (Planejado)** | 🟡 Estrutura | Feature flag, recordEvent stub, documentado |
| **Multi-Model Multi-Box** | ✅ Completo | Múltiplos GLB por caixa |

### 6.2 O que Falta para Integrar o Sistema Industrial (work-whatsapp)

| Item | Status | Esforço Estimado |
|------|--------|------------------|
| **Work Orders Schema** | ❌ Ausente | Médio - Estender `ProjectState` + `WorkspaceBox` + API + Backend |
| **Production Queue/Status** | ❌ Ausente | Médio - Novo módulo `core/production/` + UI + API |
| **Factory Management** | ⚠️ Parcial (ultra+ role) | Baixo - Estender `Factory` model + admin pages |
| **CNC Program Management** | ❌ Ausente | Médio - Novo módulo + integração `tcnGenerator` |
| **Nesting Integration** | 🟡 Parcial (NestingV3 existe) | Baixo - Conectar `NestingV3Page` ao workflow de produção |
| **Shipping/Logistics** | ❌ Ausente | Alto - Novo domínio completo |
| **Quality Control/Inspection** | ❌ Ausente | Médio - Novo módulo |
| **ERP Integration (API)** | ❌ Ausente | Médio - `src/api/erpApi.ts` + webhooks |
| **Real-time Notifications** | 🟡 Events System planejado | Baixo - Ativar `features.eventsSystem` + handlers |
| **Audit Trail** | 🟡 Events System planejado | Baixo - Usar Events System para auditoria |

### 6.3 O que Precisa Ser Expandido

| Sistema | Expansão Necessária |
|---------|---------------------|
| **Drawer System** | Unificar `DrawerBomService` + `drawerCutlistAdapter`; integrar `settings.gavetas` ao domínio paramétrico; implementar `drawerType: "pro"` real |
| **Material System** | Completar `faceMaterials` no pipeline de corte; integrar `MaterialLibraryV2` ao `cutlistFromBoxes` |
| **Label System V5** | Migrar `etiqueta`/`qrcode`/`labelV5` para `labelSystemV5` como SSOT único |
| **Room System** | Implementar `RoomBuilder` real (remover stub); integrar ao `AutoLayoutEngine` |
| **ViewerSync** | Completar `useViewerSync` APIs (snapshot, 2D view, renderScene) |
| **Events System** | Ativar `features.eventsSystem`; implementar `recordEvent` + handlers em pontos críticos |
| **Admin API** | Estender backend para work-orders, production, factories |
| **Testing** | Adicionar testes unitários para `core/` (especialmente `cutlistFromBoxes`, `drillingAdapter`, `boxManufacturing`) |

### 6.4 O que Precisa Ser Reescrito

| Item | Motivo | Prioridade |
|------|--------|------------|
| **Drawer Industrial Pipeline** | Duas fontes de verdade (`DrawerGroup` vs `boxManufacturing.gerarGavetas`); `DrawerBomService` não integrado | **ALTA** |
| **RoomBuilder** | Stub vazio; precisa implementação real ou remoção | **MÉDIA** |
| **useViewerSync** | APIs placeholder; precisa implementação completa ou remoção | **MÉDIA** |
| **ThreeViewer Props** | 6 props não utilizadas; limpar interface | **BAIXA** |
| **Documentation.tsx** | Arquivo vazio; remover | **BAIXA** |
| **ProjectRoadmapStyles_new.ts** | 1092 linhas dead code; remover | **BAIXA** |

### 6.5 O que Precisa Ser Criado do Zero

| Item | Descrição | Dependências |
|------|-----------|--------------|
| **Work Orders Module** | CRUD, status, assignment, timeline | `ProjectState`, `auth`, `api`, `backend` |
| **Production Dashboard** | Kanban/queue view, metrics, alerts | `Events System`, `work-orders`, `factory` |
| **Factory Management UI** | CRUD factories, users, permissions | `RBAC`, `ultra+` role, `admin` pages |
| **CNC Program Manager** | Versionamento, simulação, download | `tcnGenerator`, `kdtGenerator`, `cutlistFromBoxes` |
| **Shipping/Logistics Module** | Packing lists, delivery tracking, labels | `LabelSystemV5`, `cutlistFromBoxes`, `nesting` |
| **Quality Control Module** | Inspection checklists, non-conformance, reports | `Events System`, `production`, `labelSystemV5` |
| **ERP Connector** | Sync products, orders, inventory, BOMs | `api/erpApi.ts`, webhooks, `backend` |
| **Real-time Collaboration** | Multi-user editing, presence, comments | `Events System`, `WebSocket`, `ProjectContext` |

---

## 7. RESUMO FINAL

### 7.1 Pontos Fortes do pimo-criativo

1. **Arquitetura Sólida e Escalável** - Separação clara de camadas (Presentation → Context → Core → 3D), Single Source of Truth bem definido
2. **Viewer 3D de Classe Mundial** - `ViewerCore` com 5500+ linhas, funcionalidades avançadas (snapping, auto-layout, room, measurement, multi-box, GLB integration)
3. **Pipeline Industrial Completo** - Cutlist único, TCN/CNC export, PDF técnico/unificado, QR codes, nesting v3
4. **Sistema de Regras Dinâmicas** - Configuração via admin, perfis, validação, versionamento
5. **RBAC Robusto** - 5 roles, permissões atômicas, fábrica, extra/removed permissions
6. **Material Library V2 Preparada** - VisualMaterial, faceMaterials, UV mapping, PBR properties
7. **Label System V5 como SSOT** - Designer de etiquetas, QR, production steps, palette groups
8. **Documentação Extensa** - 38 arquivos Markdown em `docs/`, master plan, specs técnicas
9. **TypeScript Forte** - Tipagem rigorosa em todo o core, types compartilhados
10. **Modularidade** - Hooks customizados, context providers, services isolados

### 7.2 Pontos Fracos

1. **Drawer System Fragmentado** - Duas fontes de verdade (moderno vs legado), `DrawerBomService` não integrado, settings não conectadas
2. **Dead Code** - `Documentation.tsx` (vazio), `ProjectRoadmapStyles_new.ts` (1092 linhas), `RoomBuilder` (stub), `ThreeViewer` props não usadas
3. **useViewerSync Incompleto** - 6 APIs placeholder sem implementação
4. **Nomenclatura Inconsistente** - `useMaterial`/`useMaterials`, `updateWorkspacePosition`/`updateWorkspaceBoxPosition`
5. **RoomBuilder Desabilitado** - Stub retorna strings vazias; sistema de sala incompleto
6. **Testes Insuficientes** - Poucos testes unitários para core crítico (`cutlistFromBoxes`, `drillingAdapter`, `boxManufacturing`)
7. **Estilos Misturados** - Inline styles, .ts style files, CSS classes sem padronização

### 7.3 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Inconsistência Drawer Pipeline** | Alta | Alto - CNC/PDF/Viewer divergentes | Unificar pipeline (DrawerBomService + drawerCutlistAdapter) |
| **ViewerCore Monolítico** | Média | Alto - Difícil manutenção/testes | Extrair sub-módulos (room, snapping, measurement) |
| **Event System Não Ativado** | Baixa | Médio - Bloqueia automações futuras | Ativar `features.eventsSystem` + implementar handlers |
| **Backend Duplicado** | Média | Médio - `backend/` + `api/` (PHP) | Consolidar em uma stack (Node.js/Express) |
| **Cache Invalidation Bugs** | Baixa | Alto - Cutlist/preços incorretos | Testes de integração para `clearCutlistCacheForProject` |

### 7.4 Oportunidades de Integração (work-whatsapp)

1. **Aproveitar RBAC Existente** - `ultra+` role = factory manager, `admin` = global admin
2. **Estender ProjectState** - Adicionar `workOrderId`, `productionStatus`, `factoryId` sem breaking changes
3. **Reutilizar Cutlist Pipeline** - `buildGlobalQrCutlistMerged` já mergeia paramétrico + GLB; estender para work orders
4. **Viewer como Production View** - Adicionar `productionMode` no `PimoViewerApi` para highlight de peças em produção
5. **Label System V5 para Industrial** - `workOrderNumber`, `batchId`, `machineId` no designer de etiquetas
6. **Events System para Auditoria** - `recordEvent` em work order transitions, production steps
7. **Nesting V3 Integrado** - Conectar `NestingV3Page` ao workflow de work orders
8. **Multi-Model Multi-Box para Assembly** - Múltiplos GLB por caixa = sub-assemblies em work orders

### 7.5 Recomendações para a Próxima Fase

#### Imediato (Próximos 3 dias)
1. ✅ Remover `Documentation.tsx` (vazio)
2. ✅ Remover `ProjectRoadmapStyles_new.ts` (1092 linhas dead code)
3. ✅ Atualizar docs (remover referências a `PimoViewerClean`)
4. ✅ Unificar `updateWorkspacePosition` / `updateWorkspaceBoxPosition`
5. ✅ Decidir: implementar ou remover `useViewerSync` APIs

#### Curto Prazo (2 semanas)
1. **Unificar Drawer Pipeline** - `DrawerBomService` + `drawerCutlistAdapter` → single source
2. **Conectar `settings.gavetas` ao Domínio** - Remover hardcoded constants em `DrawerParametrics.ts`
3. **Implementar `drawerType: "pro"` Real** - Lateral metal box, fundo/traseira diferentes
4. **Completar `faceMaterials` no Pipeline** - `cutlistFromBoxes` → `MaterialLibraryV2` → `VisualMaterial`
5. **Migrar Label System para V5** - `labelSystemV5` como SSOT, deprecar `etiqueta`/`qrcode`/`labelV5`

#### Médio Prazo (1 mês)
1. **Implementar RoomBuilder Real** - Remover stub; integrar ao `AutoLayoutEngine`
2. **Ativar Events System** - `features.eventsSystem = true` + `recordEvent` handlers
3. **Adicionar Testes Unitários Críticos** - `cutlistFromBoxes`, `drillingAdapter`, `boxManufacturing`, `DrawerParametrics`
4. **Padronizar Estilos** - CSS Modules ou CSS-in-JS consistente
5. **Consolidar Backend** - Unificar `backend/` (Node.js) + `api/` (PHP) em uma stack

#### Longo Prazo (3 meses - Integração work-whatsapp)
1. **Work Orders Module** - CRUD, status, assignment, timeline em `core/production/`
2. **Production Dashboard** - Kanban, métricas, alertas em `pages/admin/ProductionDashboardPage.tsx`
3. **Factory Management UI** - CRUD factories, users, permissions em `pages/admin/FactoryManagementPage.tsx`
4. **CNC Program Manager** - Versionamento, simulação, download em `core/cnc/ProgramManager.ts`
5. **ERP Connector** - Sync products, orders, inventory em `src/api/erpApi.ts`
6. **Shipping/Logistics** - Packing lists, delivery tracking, labels usando `LabelSystemV5`
7. **Quality Control** - Inspection checklists, non-conformance reports
8. **Real-time Collaboration** - Multi-user editing via WebSocket + Events System

---

## APÊNDICE: Referências

### Documentos Principais
- `docs/PIMO-CRIATIVO-MASTER-PLAN.md` - Arquitetura, fases, regras do sistema
- `docs/PIMO-CRIATIVO-PLANO-EVENTS-SYSTEM.md` - Sistema de eventos planejado
- `docs/matriz-faces-A-B-FINAL.md` - Modelo de faces A/B (padrão industrial)
- `docs/drawers-system.md` - Análise completa do sistema de gavetas
- `docs/smart-layout-reference.md` - Smart Layout Engine & Auto-Placement
- `docs/glb-integration-reference.md` - Integração GLB → Sistema Multi-Box
- `docs/multibox-architecture.md` - Arquitetura Multi-Box
- `docs/dynamic-rules-reference.md` - Referência de regras dinâmicas
- `docs/viewer-integration-reference.md` - Integração do Viewer
- `docs/PLANO_MATERIAL_ENGINE.md` - Plano do motor de materiais


