# Diagnóstico Completo do Projeto PIMO v3

**Data:** 09/03/2025  
**Objetivo:** Varredura completa da estrutura, código, arquitetura e dependências para identificar problemas, riscos técnicos, bugs potenciais e melhorias necessárias para elevar o projeto ao nível ideal.

---

## 1. Visão geral da estrutura

### 1.1 Stack e build

| Item | Valor |
|------|--------|
| **Runtime** | React 19 + TypeScript (ES2022, ESNext modules) |
| **Build** | Vite 7, `tsc -b && vite build` |
| **Estado** | Zustand (uiStore, wallStore) + Context (ProjectProvider, MaterialProvider, PimoViewerContext, etc.) |
| **3D** | Three.js + @react-three/fiber + @react-three/drei |
| **PDF** | jsPDF + jspdf-autotable |
| **Testes** | Vitest (apenas 1 ficheiro de teste encontrado) |

### 1.2 Organização do código

```
src/
├── 3d/                    # Viewer 3D (Viewer.ts ~4463 linhas), BoxBuilder, Room, materiais
├── components/            # UI React (layout, admin, panels, ui)
├── context/               # ProjectProvider (~2229 linhas), projectState (~667), PimoViewer, Material, etc.
├── core/                  # Lógica de negócio (box, rules, manufacturing, pdf, layout, materials, drill, etc.)
├── hooks/                 # useCalculadoraSync, useCadModelsSync, useViewerSync, useFerragens, etc.
├── models/                # BoxModel, BoxLayers
├── pages/                 # PainelReferencia, Documentacao, AdminPanel, ProjectProgress
├── services/              # boxLayersService, drawerCutlistAdapter
├── stores/                # uiStore, wallStore
├── templates/             # templatesIndex
└── utils/                 # storage, units, watermark, openingConstraints
```

---

## 2. Problemas críticos e de alta prioridade

### 2.1 TypeScript: `strict: false`

- **Ficheiro:** `tsconfig.app.json`
- **Problema:** `"strict": false` desativa verificação estrita (null/undefined, any implícito, etc.).
- **Risco:** Bugs em runtime por null/undefined e tipos incorretos não detetados em compile.
- **Recomendação:** Ativar `strict: true` de forma gradual (por módulo ou por regra) e corrigir erros. Começar por `strictNullChecks` em ficheiros novos.

### 2.2 Ficheiros monolíticos (refatoração urgente)

| Ficheiro | Linhas aprox. | Problema |
|----------|----------------|----------|
| **Viewer.ts** | **4463** | Classe única com cena, câmera, controls, boxes, room, snapping, collision, highlight, GLB, reflow, export. Impossível manter e testar em isolado. |
| **ProjectProvider.tsx** | **2229** | Provider com estado, ações, persistência, autosave, undo/redo, spawn, layout, export PDF, navegação. Múltiplas responsabilidades. |
| **projectState.ts** | **667** | Funções puras + defaults + createBox + recomputeState. Pode ser dividido em state factories, reducers e selectors. |

**Recomendação:**

- **Viewer.ts:** Extrair para módulos por responsabilidade (ex.: `ViewerBoxManager`, `ViewerRoomManager`, `ViewerSelection`, `ViewerReflow`, `ViewerExport`) e manter `Viewer` como orquestrador fino.
- **ProjectProvider.tsx:** Extrair lógica para hooks (`useProjectPersistence`, `useProjectActions`, `useProjectExport`) e reducers/actions em ficheiros separados; o provider fica só com composição e contexto.

### 2.3 Roteamento manual sem React Router

- **Ficheiro:** `App.tsx`
- **Problema:** Rotas implementadas com `window.history.pushState` e estado local (`showAbout`, `showAdmin`, etc.). Sem react-router (ou similar).
- **Riscos:** Botão “voltar” do browser não sincroniza estado; deep links e refresh não funcionam corretamente; código de navegação repetido e propenso a erros.
- **Recomendação:** Introduzir React Router (ou outro router leve) e derivar vistas da URL em vez de estado booleano.

### 2.4 ViewerSync desconectado do Viewer real (já documentado na auditoria)

- **Ficheiros:** `useViewerSync.ts`, `viewerApiAdapter.ts`, `ProjectProvider`, Workspace
- **Problema:** `viewerApiRef.current` em useViewerSync é preenchido pelo adapter que o Workspace regista. Funções como `saveSnapshot`, `restoreSnapshot`, `enable2DView`, `disable2DView` estão como **TODO** no adapter e devolvem null ou no-op.
- **Impacto:** Botões de vista 2D e de captura de imagem na UI não têm efeito; utilizador pode pensar que a funcionalidade existe.
- **Recomendação:** Implementar no Viewer (e expor via PimoViewerApi) as funções de snapshot e vista 2D, ou remover/desativar os controlos na UI até estarem implementados.

### 2.5 Dependência `pg` no package.json

- **Ficheiro:** `package.json` (dependencies)
- **Problema:** Pacote `pg` (cliente PostgreSQL) está em dependencies. Não há nenhum `import` de `pg` em `src/`.
- **Risco:** Aumento de tamanho do bundle se for incluído no build do frontend; dependência órfã ou destinada apenas a scripts/backend não claros.
- **Recomendação:** Remover `pg` das dependencies se não for usado no frontend; se for usado em scripts Node, mover para devDependencies ou para um projeto de backend separado.

---

## 3. Riscos técnicos e bugs potenciais

### 3.1 Duplicação e sobreposição de conceitos “ferragens”

- **Ficheiros:**  
  - `src/core/design/ferragens.ts` — `buildFerragens(prateleiras, portaTipo, gavetas)` → array de `Acessorio` com preços.  
  - `src/core/ferragens/ferragens.ts` — catálogo `FERRAGENS_DEFAULT` (tipo `Ferragem` com categoria, medidas, descrição).  
  - `src/core/industriais/ferragensIndustriais.ts` — lógica industrial.
- **Problema:** Dois modelos diferentes (“acessórios com quantidade/preço” vs “catálogo de ferragens”). Nomes e domínios sobrepostos geram confusão e risco de uso incorreto.
- **Recomendação:** Unificar numa única camada de domínio “ferragens” (catálogo + cálculo de quantidades/preços) ou documentar claramente a fronteira (ex.: design vs industrial vs catálogo admin).

### 3.2 Carregamento de dados do localStorage duplicado

- **Padrão:** Vários módulos leem do localStorage com chaves `pimo_*` e parsing manual:
  - `gerarPdfTecnico.ts`: `loadComponentTypesFromStorage()`, `loadMaterialsFromStorage()` (chaves `pimo_component_types`, `pimo_admin_materials`).
  - `projectState.ts`: leitura de `pimo_admin_cad_models`.
  - `materials/service.ts`: `pimo_materials_crud_v1`.
- **Problema:** Lógica de “load from storage + parse + fallback” repetida; inconsistência possível (ex.: um sítio usa default, outro não).
- **Recomendação:** Centralizar acesso a “admin/config” storage em um único serviço (ex.: `settingsService` ou `adminStorageService`) com funções tipo `getComponentTypes()`, `getAdminMaterials()`, etc., e usar em PDF e projectState.

### 3.3 Tratamento de erros e catch vazio

- Vários `catch` apenas com `/* ignore */` ou sem rethrow/log (ex.: parsing JSON em `gerarPdfTecnico`, storage em materials).
- **Risco:** Falhas silenciosas; difícil diagnosticar em produção.
- **Recomendação:** Pelo menos log em dev (`console.warn` ou logger) e, onde fizer sentido, fallback explícito ou mensagem ao utilizador.

### 3.4 TODOs não resolvidos (funcionalidade incompleta)

| Local | TODO |
|-------|------|
| `viewerApiAdapter.ts` | saveSnapshot, restoreSnapshot, enable2DView, disable2DView |
| `multibox/multiBoxManager.ts` | Expor manager via Context; suportar gap configurável |
| `deploy/backupManager.ts` | Executar no servidor; implementar restauro |
| `deploy/cloudBackup.ts` | Google Drive API; download e extrair |
| `DeployAdminPage.tsx` | Chamar endpoint `/api/deploy`; integrar backend real |

Estes pontos indicam funcionalidades expostas na UI ou em APIs que ainda não estão implementadas — risco de expectativas incorretas e suporte difícil.

### 3.5 Ordem e timing dos efeitos (sync Viewer ↔ estado)

- **Ficheiros:** `useCalculadoraSync`, `useCadModelsSync`, Workspace
- **Problema:** Sincronização depende de `viewerReady` e da ordem de execução dos efeitos. Se `viewerReady` mudar de forma inesperada ou a ordem de montagem mudar, podem surgir caixas sem modelos ou modelos sem caixa.
- **Recomendação:** Documentar o contrato “viewerReady + ordem de sync” e, se possível, ter testes de integração que garantam estado consistente após add/update/remove e após reflow.

### 3.6 Placeholder 100×100×100 para caixas CAD-only

- Até o GLB carregar, dimensões são 100 mm. Reflow usa essas dimensões.
- **Risco:** Várias caixas CAD-only a carregar em paralelo podem fazer as posições “saltar” quando as dimensões reais chegarem.
- **Recomendação:** Considerar não fazer reflow até haver dimensões reais (ex.: flag `dimensionsFromGlb`) ou desativar reflow automático para caixas ainda em loading.

---

## 4. Código duplicado e inconsistências

### 4.1 Export: re-export em cadeia

- `core/export/index.ts` → `exportService` → `service.ts`. Duas camadas para o mesmo módulo.
- **Recomendação:** Exportar diretamente de `service.ts` (ou renomear para `exportService.ts`) e manter um único ponto de entrada no `index`.

### 4.2 updateWorkspaceBoxPosition vs updateWorkspacePosition

- Documentado na auditoria: um é alias do outro. Duplicação de nome e de ação.
- **Recomendação:** Manter uma única ação e documentar, ou remover o alias e atualizar todas as chamadas.

### 4.3 Duas páginas de documentação

- `Documentation.tsx` (inglês) e `Documentacao.tsx` (português) em rotas diferentes.
- **Problema:** Conteúdo pode divergir; referências a caminhos (ex.: ThreeViewer) já incorretas nalguns sítios.
- **Recomendação:** Unificar numa única fonte (ex.: markdown ou dados) e gerar vistas PT/EN, ou separar claramente “doc técnica” vs “doc utilizador” e corrigir caminhos.

### 4.4 Rotação: rotacaoY_90 vs rotacaoY

- `WorkspaceBox` tem `rotacaoY_90` (boolean) e `rotacaoY` (radianos). Dois conceitos para a mesma coisa.
- **Risco:** Inconsistência se ambos forem escritos em momentos diferentes.
- **Recomendação:** Escolher um único conceito (ex.: apenas radianos) e migrar a UI e o estado.

---

## 5. Partes que precisam de refatoração

### 5.1 Viewer.ts (~4463 linhas)

- **Sugestão de divisão:**
  - **ViewerBoxManager:** addBox, removeBox, updateBox, reflowBoxes, getBox, listBoxes.
  - **ViewerRoomManager:** createRoom, removeRoom, portas/janelas, RoomBuilder.
  - **ViewerSelection:** selectBox, raycast, highlight, getSelectedBoxDimensions.
  - **ViewerGLB:** addModelToBox, removeModelFromBox, loadGLB, extractedParts.
  - **ViewerSnapshot/Render:** saveSnapshot, restoreSnapshot, renderScene, enable2DView (quando implementados).
  - Manter **Viewer** como facade que usa estes módulos e expõe a API pública.

### 5.2 ProjectProvider.tsx (~2229 linhas)

- **Sugestão:**
  - Extrair persistência: `useProjectPersistence` (load/save/autosave/backups).
  - Extrair ações de caixa/layout: `useProjectBoxActions` (add, remove, update, reorder, spawn).
  - Extrair export: `useProjectExport` (PDF, cutlist, ZIP).
  - Manter no provider apenas: estado inicial, composição de hooks e valor do contexto (state + actions).

### 5.3 projectState.ts

- Separar: (1) constantes e defaults, (2) funções puras de transformação (recomputeState, buildBoxesFromWorkspace), (3) helpers de storage se continuarem aqui, ou mover storage para o serviço central referido acima.

### 5.4 Módulo de materiais

- Existem `core/materials/` (service, types, materials.api, presetService, materialLibraryV2, etc.) e referências a “materialContext” e “project.material”. Há risco de duplicação de conceito (material do projeto vs material/tema UI).
- **Recomendação:** Documentar ou refatorar para que “material do projeto” tenha uma única fonte (ex.: sempre via projectState + materialId) e o contexto de materiais seja apenas para UI/catálogo.

---

## 6. Melhorias recomendadas

### 6.1 Testes

- Apenas **1** ficheiro de teste encontrado: `src/validation/industrialFase7.test.ts`.
- **Recomendação:** Aumentar cobertura: testes unitários para `projectState` (recomputeState, buildBoxesFromWorkspace), para regras de layout e validação, e para funções puras de PDF/cutlist; testes de integração para fluxo Workspace ↔ Viewer (sync de caixas e modelos).

### 6.2 Lint e qualidade

- ESLint com recommended + TypeScript + React Hooks. Não há regras específicas para complexidade (ex.: max-lines-per-function) que poderiam sinalizar Viewer e ProjectProvider.
- **Recomendação:** Adicionar regras de complexidade e, opcionalmente, avisos para ficheiros com mais de N linhas, para evitar novos monolitos.

### 6.3 Logs e diagnóstico

- Ainda existem `console.log`/`console.info` em vários ficheiros (BoxBuilder, useGerarArquivoHandlers, Viewer, boxLayersService, etc.). Parte está protegida por `import.meta.env.DEV`.
- **Recomendação:** Padronizar: em produção não escrever logs de diagnóstico; em dev usar um logger único (ex.: `logger.debug`) para facilitar desativação e filtros.

### 6.4 Documentação de arquitetura

- Existe documentação em `docs/` e `src/core/docs/` (auditoria, specs, arquitetura, painel de referência). Alguns caminhos de ficheiros estão desatualizados.
- **Recomendação:** Revisar todos os caminhos (ex.: ThreeViewer, ProjectProvider) e manter um único doc de “arquitetura v3” com diagrama de fluxo (workspaceBoxes → boxes → cutlist → PDF) e responsabilidades por pasta.

### 6.5 Build e bundle

- Vite com `manualChunks` (three, pdf, viewer, core). `chunkSizeWarningLimit: 2000` indica que já existem chunks grandes.
- **Recomendação:** Após refatorar Viewer e ProjectProvider, rever chunks (ex.: lazy load do viewer 3D) para melhorar tempo de carregamento inicial.

---

## 7. Pontos que podem causar falhas futuras

1. **Reflow só para CAD quando dimensões mudam**  
   Paramétricas não disparam reflow ao mudar dimensões; apenas ao mudar index. Qualquer feature que dependa de “colar” após redimensionar vai precisar de alteração na condição de reflow.

2. **Index vs ordem de workspaceBoxes**  
   O index usado no reflow vem de `workspaceBoxes.findIndex` no sync. Reordenar noutro sítio sem refletir em `workspaceBoxes` quebra o alinhamento 3D.

3. **manualPosition e posição no estado**  
   Se alguma ação escrever posição (posicaoX_mm, posicaoZ_mm) sem definir `manualPosition = true`, o reflow pode sobrescrever a posição no próximo sync.

4. **createBox vs createWorkspaceBox**  
   Nomes parecidos; createBox é interno à conversão workspace → BoxModule. Confusão pode levar a usar a função errada noutros módulos.

5. **PimoViewerClean**  
   Referido na auditoria como não usado na aplicação principal. Se alguém o importar por engano, pode haver dois “viewers” e comportamento imprevisível.

6. **Versão e deploy**  
   `__PIMO_VERSION__` é injetado no build. Deploy e backup têm TODOs (backend, Google Drive). Qualquer uso em produção sem resolver esses pontos é arriscado.

---

## 8. Resumo executivo

| Categoria | Quantidade / Estado |
|-----------|----------------------|
| **Problemas críticos** | 5 (strict:false, monolitos Viewer/ProjectProvider, roteamento manual, ViewerSync inativo, dependência pg) |
| **Riscos técnicos / bugs potenciais** | 6 (ferragens duplicadas, storage duplicado, TODOs, sync/timing, placeholder CAD, erros silenciosos) |
| **Código duplicado / inconsistências** | 4 (export, updateWorkspace*, doc PT/EN, rotacaoY) |
| **Refatorações prioritárias** | 3 (Viewer, ProjectProvider, projectState) |
| **Melhorias recomendadas** | 5 (testes, lint, logs, documentação, bundle) |
| **Riscos de falha futura** | 6 (reflow, index, manualPosition, createBox, PimoViewerClean, deploy) |

**Prioridade sugerida:**

1. **Imediato:** Ativar gradualmente TypeScript strict; remover ou justificar dependência `pg`; documentar ou desativar na UI as funções de snapshot/2D do viewer.
2. **Curto prazo:** Refatorar Viewer e ProjectProvider em módulos/hooks menores; centralizar storage admin; unificar ou documentar ferragens.
3. **Médio prazo:** Introduzir roteamento (React Router); aumentar testes; unificar documentação e corrigir caminhos; resolver TODOs de deploy/backup ou remover da UI.
4. **Contínuo:** Revisar reflow e manualPosition em novas features; manter um único “single source of truth” para estado de projeto e viewer.

Este diagnóstico complementa o relatório em `docs/auditoria-tecnica.md` e pode ser usado como base para um plano de refatoração e para evitar regressões nas áreas indicadas.
