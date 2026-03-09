# Plano Técnico — MaterialEngine (Etapa 6 – Parte 2)

**Objetivo:** Transformar o relatório `docs/RELATORIO_SISTEMA_MATERIAIS.md` num plano técnico claro que define o que manter, remover, unificar ou reconstruir para o novo MaterialEngine.

**Data:** 2025-03-09  
**Escopo:** Apenas documentação; nenhum ficheiro de código é alterado nesta etapa.

---

## 1. Diagnóstico consolidado

### 1.1 Materiais realmente usados no Viewer 3D

| Origem | Tipo | Uso no Viewer |
|--------|------|----------------|
| **WoodMaterial** + **MaterialLibrary** (defaultMaterialSet) | MeshStandardMaterial | Materiais das caixas/móveis (cor sólida; loadMaterial → getMaterialPreset → createWoodMaterial). |
| **BoxBuilder** | MeshStandardMaterial (cutter) + WoodMaterial (painéis) | Geometria das caixas; material dos painéis via preset "mdf_branco". |
| **ViewerCore** | MeshStandardMaterial (roomBox, feet, STL), LineBasicMaterial (selection, dimensions, panel edges), MeshBasicMaterial (wireframe) | Room box (paredes/chão/teto), pés de cozinha, modelos STL; overlays de seleção, dimensões e arestas; modo wireframe. |
| **SceneManager** / **Environment** | MeshStandardMaterial (ground) | Chão da cena; aparência alterada por setMaterialQuality. |
| **RoomManager** | MeshStandardMaterial (floor) | Chão da sala (room). |
| **WallFactory** | MeshStandardMaterial (paredes) | Paredes principais e extras da sala. |
| **DoorElement** / **WindowElement** | MeshStandardMaterial (moldura + vidro) | Portas e janelas do room builder. |
| **HighlightManager** | MeshBasicMaterial (tint), LineBasicMaterial (outline) | Overlay de highlight em peças selecionadas. |
| **WallGizmo** | MeshBasicMaterial (círculo) | Gizmo de manipulação de paredes. |

Conclusão: o fluxo visual principal das **caixas** no Viewer é **MaterialLibrary (3d) + WoodMaterial** (cores sólidas, sem texturas). Todo o resto (paredes, chão, overlays, highlight, gizmos) são materiais utilitários ou de ambiente.

### 1.2 Materiais usados apenas no cutlist/export

| Origem | Uso |
|--------|-----|
| **materialLibraryV2** (getVisualMaterialForBox, getFallbackMaterial, buildVisualMaterial) | Cutlist: preenchimento de `visualMaterial`, `faceMaterials`, `grainDirection` nos itens (Layout Engine / export PDF, etc.). Não desenha no Viewer; só fornece dados estruturados. |
| **getThreeJsMaterial** / **applyVisualMaterialToMesh** | Capazes de aplicar cor + textura + UV a um mesh, mas **não** são chamados pelo fluxo de renderização das caixas no Viewer. |

Conclusão: materialLibraryV2 é a fonte de verdade para **dados** de material no cutlist/export; a parte de aplicação visual (applyVisualMaterialToMesh) está disponível mas fora do fluxo principal do Viewer.

### 1.3 Materiais duplicados

- **Paredes:** WallFactory (0xd1d5db, 0.75, 0.05, opacity 0.6) e ViewerCore roomBox (0xd1d5db, 0.75, 0.05, opacity 0.8); extra walls 0x9ca3af. Mesma “família” com constantes em vários ficheiros.
- **Moldura porta/janela:** DoorElement e WindowElement criam materiais equivalentes (DEFAULT_ELEMENT_COLOR, roughness 0.7, metalness 0.05).
- **Chão:** Environment (#d4dae2), RoomManager (0xe5e7eb), SceneManager setMaterialQuality (várias cores por modo). Três origens para “chão”.
- **MDF branco / fallback:** MaterialLibrary defaultMaterialSet (#f2f0eb, 0.52), presets.ts (mdf_branco), WoodMaterial default (#f2f0eb, 0.55). Três definições.
- **Panel edge overlay:** ViewerCore.getPanelEdgeOverlayMaterial() cria um **novo** LineBasicMaterial em cada chamada (uma por painel/porta/gaveta).

### 1.4 Materiais obsoletos

- **presetService** DEFAULT_PRESET_ID = "branco_liso": não existe em INITIAL_MATERIAL_PRESETS (existe "mdf_branco"). getDefaultPreset() acaba a usar o primeiro do store ou objeto "fallback" hardcoded.
- **materialPresets.ts** (wood_oak, wood_walnut, wood_pine): usados só pelo MaterialPanel para UI; IDs diferentes dos viewerMaterialId (carvalho_natural, nogueira); não ligados ao Viewer nem ao CRUD. Conceptualmente sobrepostos mas estruturalmente órfãos.

### 1.5 Materiais que são apenas cores simples e devem evoluir para realistas

- **Caixas/móveis:** atualmente 100% cor sólida (WoodMaterial + MaterialLibrary). Objetivo: suportar texturas (map, normalMap), roughness/metalness por preset, UV scale/rotation, e opcionalmente aoMap, para modo “realistic” ou “showcase”.
- **Paredes e chão:** hoje cores planas; podem permanecer simples em modo “performance” e ganhar opção de textura leve em “showcase” (opcional, baixa prioridade).
- **Porta/janela (moldura):** cor sólida é aceitável; vidro já tem transparent/opacity. Melhoria futura: normalMap para moldura (baixa prioridade).

---

## 2. Lista consolidada — Materiais a manter

Com justificativa técnica para cada um.

| Material / recurso | Justificativa |
|-------------------|----------------|
| **WoodMaterial.createWoodMaterial()** | Ponto único de criação de MeshStandardMaterial para madeira; assinatura (options: color, roughness, metalness, envMapIntensity) é adequada. Manter como **implementação de baixo nível** que o MaterialEngine pode chamar para modo “performance” ou quando não há textura. |
| **MaterialLibrary.defaultMaterialSet + getMaterialPreset()** | Fonte atual de presets para o Viewer (viewerMaterialId, cores, roughness). Manter a **lista de IDs e a resolução** (resolveMaterialId, listOfficialMaterials) como base; migrar para ser alimentada pelo MaterialEngine (single source of truth). |
| **materials.api.ts (OFFICIAL_WOOD_MATERIALS_SEED, listOfficialMaterials, resolveMaterial, getViewerMaterialId)** | Fonte oficial de IDs canónicos e aliases (industrial + visual). Essencial para CRUD, cutlist e Viewer. Manter e fazer do **viewerMaterialId** o ID canónico do MaterialEngine. |
| **materialLibraryV2: getVisualMaterialForBox, getFallbackMaterial, buildVisualMaterial** | Usados pelo cutlist/export para preencher visualMaterial/faceMaterials. Manter; o MaterialEngine deve expor dados no mesmo formato (VisualMaterial) para o cutlist. |
| **materialLibraryV2: TextureLoader partilhado (getTextureLoader)** | Único sítio com TextureLoader; reutilizar no MaterialEngine como loader central e acrescentar **cache por URL**. |
| **ViewerCore: selectionOutlineMaterial, wallSelectionOutlineMaterial, dimensionsOverlayLines material** | Overlays de UI (seleção, dimensões); não são materiais de superfície. Manter; podem ser fornecidos por um módulo “overlay materials” do MaterialEngine ou manter em ViewerCore. |
| **HighlightManager: tintMat, outlineMat** | Overlay de highlight; específico de interação. Manter. |
| **WallGizmo: circleMat** | Gizmo; cor fixa. Manter. |
| **ViewerCore: wireframe MeshBasicMaterial** | Debug. Manter. |
| **ViewerCore: getPremiumTexture() (CanvasTexture)** | Usado por materialQuality "premium". Manter como opção de “textura procedural” até haver texturas reais por material. |
| **applyMaterialQualityProfile() + materialQualityState** | Lógica de perfis standard/premium/lacquered. Manter conceito; o MaterialEngine pode aplicar estes perfis sobre os materiais que criar. |
| **SceneManager.setGroundAppearance / setMaterialQuality** | Ajuste do chão conforme qualidade. Manter; MaterialEngine pode fornecer config de “ground” por modo. |
| **DoorElement / WindowElement: frameMaterial, glassMaterial** | Materiais específicos de elementos de sala. Manter; podem vir de uma factory do MaterialEngine (RoomElementMaterials) para evitar duplicação entre porta/janela. |
| **RoomManager floor, WallFactory walls, ViewerCore roomBox** | Ambiente (sala e room box). Manter; configurações (cores, roughness) devem ser centralizadas num único “scene materials” ou MaterialEngine (ambiente). |

---

## 3. Lista consolidada — Materiais a remover

Com justificativa (duplicado, não usado, obsoleto, substituído).

| Item | Justificativa |
|------|----------------|
| **Criação redundante em WallFactory** | Cada parede é criada com `new THREE.MeshStandardMaterial()` e logo substituída por `applyWallMaterial()`. Remover o material default; criar diretamente com os parâmetros corretos ou usar um material partilhado/clonado. |
| **Uma instância de LineBasicMaterial por chamada em getPanelEdgeOverlayMaterial()** | Cria muitas instâncias iguais. Remover a criação por chamada; substituir por **um material partilhado** (ou pool) para panel edge overlay. |
| **DEFAULT_PRESET_ID "branco_liso" em presetService** | Id não existe em INITIAL_MATERIAL_PRESETS. Remover ou alterar para "mdf_branco" para alinhar com a fonte de verdade. |
| **materialPresets.ts como fonte independente de presets 3D** | wood_oak, wood_walnut, wood_pine não estão ligados ao Viewer nem ao viewerMaterialId. Remover como fonte de presets para o motor 3D; unificar com a fonte canónica (presets + materials.api). O MaterialPanel deve usar a mesma fonte (MaterialEngine) para lista e preview; os IDs devem ser viewerMaterialId. |
| **Duplicação de definição de “MDF branco”** | Hoje em MaterialLibrary.defaultMaterialSet, presets.ts e WoodMaterial. Remover definições duplicadas; uma única definição no MaterialEngine (ou materials.api + presets) e o resto consome. |
| **MaterialLibrary.defaultMaterialSet como objeto estático construído em MaterialLibrary.ts** | Será substituído por presets vindos do MaterialEngine (que por sua vez usa materials.api + presets). Remover a construção estática; MaterialEngine passa a ser a fonte de MaterialSet para o Viewer. |

Não se remove o ficheiro MaterialLibrary.ts nem materials.api.ts; remove-se **duplicação lógica** e **fontes paralelas**. O código que hoje constrói defaultMaterialSet pode passar a chamar o MaterialEngine.

---

## 4. Lista consolidada — Materiais a reconstruir do zero

Para suportar realismo (texturas, roughness, metalness, normal maps).

| Material / capacidade | Objetivo |
|------------------------|----------|
| **Material de superfície para móveis (caixas)** | Novo fluxo no MaterialEngine: por preset (viewerMaterialId) carregar definição (cor, textureUrl, normalMapUrl, roughness, metalness, uvScale, uvRotation). Em modo “performance”: só cor + PBR (como hoje). Em modo “showcase”/“realistic”: map + optional normalMap + UV; cache de texturas por URL; aplicar ao mesh (substituindo o fluxo atual que usa apenas WoodMaterial com cor). |
| **Presets visuais com textura** | Os presets atuais (presets.ts) quase não têm textureUrl. Reconstruir a noção de “preset visual” no MaterialEngine: cada viewerMaterialId pode ter (opcional) textureUrl, normalMapUrl, uvScale, uvRotation; fallback para cor sólida. Fonte: unificar presets.ts + materials.api (e eliminar materialPresets.ts como fonte 3D). |
| **Aplicação de material ao mesh (substituir applyVisualMaterialToMesh)** | MaterialEngine deve ter “applyMaterialToMesh(mesh, materialId, options?)” que: (1) resolve preset; (2) em modo performance usa cor + PBR (pode delegar em WoodMaterial); (3) em modo realistic/showcase carrega texturas (com cache), configura UV e aplica. Assim o ViewerCore/BoxBuilder passam a usar o MaterialEngine em vez de WoodMaterial + MaterialLibrary diretamente. |
| **Cache de texturas** | Não existe hoje. Reconstruir no MaterialEngine: cache por URL (map, normalMap, etc.); um load por URL; partilha entre meshes. |
| **Material de ambiente (paredes, chão) unificado** | Não reconstruir do zero; **unificar** configuração: um único módulo (ex.: MaterialEngine.getSceneMaterialConfig()) que devolve { wall, wallExtra, floor, roomBox } com cores/roughness/metalness. WallFactory, RoomManager, ViewerCore roomBox e SceneManager ground consomem essa config. Opcional: em modo showcase, chão pode ter textureUrl (baixa prioridade). |

Resumo: “reconstruir” significa **novo fluxo e novas capacidades** (texturas, cache, aplicação por modo), não necessariamente apagar todo o código. WoodMaterial e MaterialLibrary podem permanecer como implementação de baixo nível ou ser absorvidos pelo MaterialEngine.

---

## 5. Proposta de arquitetura — MaterialEngine

### 5.1 Estrutura de pastas sugerida

```
src/
  core/
    materials/
      materialEngine/           # NOVO: núcleo do MaterialEngine
        index.ts                # API pública
        MaterialEngine.ts       # Classe ou objeto principal
        types.ts                # MaterialMode, PresetDefinition, etc.
        presetRegistry.ts       # Registo de presets (viewerMaterialId → definição)
        textureCache.ts         # Cache de texturas por URL
        applyToMesh.ts          # Aplicar material a THREE.Mesh por modo
        sceneMaterials.ts       # Configuração de ambiente (wall, floor, roomBox)
      materials.api.ts         # MANTER: OFFICIAL_WOOD_MATERIALS_SEED, getViewerMaterialId
      presets.ts               # MANTER/UNIFICAR: presets visuais (id = viewerMaterialId)
      presetService.ts         # MANTER: getPresetById, getDefaultPreset (consumir presets unificados)
      materialLibraryV2.ts     # MANTER: getVisualMaterialForBox, buildVisualMaterial (dados para cutlist)
      service.ts               # MANTER: CRUD, getMaterialForBox
  3d/
    materials/
      WoodMaterial.ts          # MANTER: createWoodMaterial (usado pelo MaterialEngine em modo performance)
      MaterialLibrary.ts       # REFACTOR: getMaterialPreset passa a delegar no MaterialEngine ou deprecar
```

- **materialEngine/** concentra: modo (performance/showcase/realistic), presets, cache, aplicação ao mesh, e config de ambiente.
- **core/materials** mantém CRUD, materials.api, presets, presetService, materialLibraryV2; o MaterialEngine usa-os e expõe uma API única para o Viewer e para a UI.

### 5.2 Presets por modo (performance, showcase, realistic)

| Modo | Comportamento | Fonte de dados |
|------|----------------|----------------|
| **performance** | Apenas cor + roughness + metalness + envMapIntensity; sem texturas; mínimo de draws e memória. | Mesmo preset (viewerMaterialId); campos textureUrl/normalMapUrl ignorados. |
| **showcase** | Cor + map (e opcionalmente normalMap) quando existir no preset; UV scale/rotation; cache de texturas. | preset com textureUrl (e optional normalMapUrl); fallback para cor se falha ou não definido. |
| **realistic** | Como showcase, com possibilidade de mais mapas (aoMap, roughnessMap) no futuro; qualidade de textura alta. | Mesmo que showcase; diferença pode ser resolução/qualidade de carga (futuro). |

O modo pode ser global (ex.: viewerSettings.materialQuality ou novo viewerSettings.materialMode) ou por material. Recomendação: um modo global (performance / showcase / realistic) em viewerSettings, aplicado pelo MaterialEngine ao resolver e aplicar materiais.

### 5.3 Ligação com ViewerCore

- **ViewerCore** deixa de chamar diretamente `loadMaterial(materialName)` (MaterialLibrary + WoodMaterial) e passa a chamar **MaterialEngine.applyMaterialToBox(boxId, materialName)** ou equivalente (ex.: ao construir/atualizar a caixa, pedir ao MaterialEngine o material para esse materialName e aplicá-lo aos meshes).
- **updateBoxMaterial(id, materialName):** implementação passa a usar MaterialEngine para obter e aplicar o material (performance/showcase conforme viewerSettings).
- **applyMaterialQualityProfile():** pode permanecer em ViewerCore mas deve ser coerente com o modo do MaterialEngine (ex.: quality "premium" = modo showcase + perfil premium nos map); ou o MaterialEngine expõe “applyQualityProfile(scene)” que altera materiais existentes conforme o perfil.
- **getPremiumTexture():** pode ficar no ViewerCore ou mover para MaterialEngine como “procedural texture” para modo premium quando não há textura no preset.

API sugerida no ViewerCore (ou em PimoViewerContextCore):

- `viewerApi.setMaterialMode?.(mode: 'performance' | 'showcase' | 'realistic')` — opcional se reutilizarmos materialQuality com semântica alargada.
- `viewerApi.updateBoxMaterial(boxId, materialId)` — já existe; garantir que por dentro usa MaterialEngine.

### 5.4 Ligação com SceneManager (iluminação, pós-processamento)

- **SceneManager** não cria materiais; usa o ground criado por Environment e altera com setGroundAppearance / setMaterialQuality.
- **MaterialEngine** pode expor **getSceneMaterialConfig(mode)** que devolve { ground: { color, roughness, metalness }, wall: { … }, … }. SceneManager (ou quem cria o ground) usa essa config. Assim, cores e parâmetros de ambiente vêm de um sítio só.
- Iluminação e pós-processamento (bokeh, etc.) ficam fora do MaterialEngine; o MaterialEngine só fornece materiais e config de aparência. SceneManager continua a gerir cena e ground.

### 5.5 Ligação com MaterialPanel (UI)

- **MaterialPanel** deixa de usar `materialPresets.ts` (wood_oak, etc.) como fonte de presets para o 3D. Passa a usar a **mesma lista de presets** que o MaterialEngine (presets com viewerMaterialId = id canónico), vinda de presetRegistry / presetService / materials.api.
- Ao alterar **categoria/preset** no MaterialPanel: (1) atualizar estado do projeto (material padrão ou por peça); (2) chamar viewerApi (ex.: setDefaultMaterial(materialId) ou updateBoxMaterial para as caixas afetadas). Assim o MaterialPanel passa a ser “cliente” do MaterialEngine e do Viewer.
- **Roughness / metalness / envMapIntensity** no MaterialPanel podem ser overrides por projeto ou por preset; ao guardar, atualizar preset (presetService) ou projeto e notificar Viewer para reaplicar materiais (viewerApi.reapplyMaterials() ou por updateBoxMaterial).

Ligação técnica: MaterialPanel usa **hooks/context** que chamam `project.actions` e `viewerApi`; quando o utilizador altera material, disparar atualização no projeto e chamada ao viewerApi (updateBoxMaterial / setDefaultMaterial / reapplyMaterials conforme desenho).

### 5.6 Ligação com materialLibraryV2 (cutlist/export)

- **materialLibraryV2** mantém: getVisualMaterialForBox, getFallbackMaterial, buildVisualMaterial (e tipo VisualMaterial). O **cutlist** continua a usar estes para preencher visualMaterial e faceMaterials.
- O MaterialEngine deve expor **getVisualMaterialForBox(box, projectMaterialId?)** que pode ser o mesmo que materialLibraryV2 (delegação) ou implementação que lê do mesmo registo de presets que o MaterialEngine usa. Objetivo: **uma única fonte de verdade** para “o que é o material desta caixa” (dados); o cutlist continua a receber VisualMaterial.
- **applyVisualMaterialToMesh** pode ser **deprecado** em favor de MaterialEngine.applyMaterialToMesh quando o Viewer usar o MaterialEngine; para export/offline não é necessário aplicar ao mesh, só os dados (VisualMaterial).

Resumo: materialLibraryV2 permanece como contrato de **dados** (VisualMaterial) para cutlist; a **aplicação visual** no Viewer passa a ser responsabilidade do MaterialEngine.

---

## 6. materialLibraryV2 — O que reaproveitar e o que descartar/migrar

| Parte | Ação | Detalhe |
|-------|------|--------|
| **VisualMaterial, buildVisualMaterial, getVisualMaterialForBox, getFallbackMaterial** | **Reaproveitar** | Manter tipo e funções; usados pelo cutlist. MaterialEngine pode delegar getVisualMaterialForBox no materialLibraryV2 ou reimplementar a partir do mesmo registo de presets. |
| **getThreeJsMaterial(visualMaterial)** | **Migrar** | Lógica de “VisualMaterial → MeshStandardMaterial” pode mover para MaterialEngine (applyToMesh); em modo performance não precisa de textura; em showcase usa textureUrl. Manter assinatura compatível ou substituir por MaterialEngine.createMaterial(visualMaterial, mode). |
| **applyVisualMaterialToMesh(mesh, visualMaterial)** | **Substituir** | Substituir no Viewer por MaterialEngine.applyMaterialToMesh(mesh, materialId, options). Manter em materialLibraryV2 como legacy/fallback ou remover quando tudo usar MaterialEngine. |
| **getTextureLoader()** | **Reaproveitar** | Usar no MaterialEngine como loader base e acrescentar cache por URL em volta. |
| **TextureLoader sem cache** | **Descartar como está** | Implementar textureCache no MaterialEngine; materialLibraryV2 deixa de carregar texturas diretamente ou chama o cache do MaterialEngine. |

Não é necessário apagar materialLibraryV2; reduzir responsabilidade para “dados para cutlist” (VisualMaterial) e eventualmente “compatibilidade”; a aplicação visual e cache ficam no MaterialEngine.

---

## 7. Opções da UI a ligar ao MaterialEngine (e como)

| Opção UI | Ligação | Mecanismo |
|----------|---------|-----------|
| **Material por caixa/peça** (LeftPanel, Piece3DModal, calculadora) | Ao escolher material, atualizar projeto (box.materialId/materialName) e atualizar o Viewer. | Callback: ao alterar material na UI → actions.updateBox(id, { materialName: getViewerMaterialId(id) }) e viewerApi.updateBoxMaterial(id, getViewerMaterialId(id)). useCalculadoraSync e restante fluxo devem garantir que updateBoxMaterial é chamado quando o projeto tem materialName. |
| **MaterialPanel: categoria / preset** | Alteração aplica-se ao projeto (material padrão ou por categoria) e ao Viewer. | (1) Estado: guardar em project (ex.: defaultMaterialId ou por categoria). (2) Ao mudar: actions.setDefaultMaterial(materialId) ou equivalente; viewerApi.setDefaultMaterial?.(materialId) e/ou viewerApi.reapplyMaterials?.() para caixas que usam default. (3) Lista de presets: vir do MaterialEngine ou presetService (IDs = viewerMaterialId), não de materialPresets.ts. |
| **MaterialPanel: roughness / metalness / envMapIntensity** | Persistir como override do preset e refletir no Viewer. | (1) Guardar overrides em project ou no preset (presetService.updatePreset). (2) Ao mudar: viewerApi.reapplyMaterials?.() ou updateBoxMaterial por caixa. MaterialEngine aplica preset + overrides. |
| **Qualidade de material (standard/premium/lacquered)** | Já ligada; manter. | project.viewerSettings.materialQuality → Workspace → viewerApi.setMaterialQuality. MaterialEngine pode interpretar "premium" como modo showcase e "standard" como performance. |

API / eventos sugeridos (a implementar no Viewer e no context):

- **viewerApi.updateBoxMaterial(boxId, materialId)** — já existe; garantir que usa MaterialEngine.
- **viewerApi.setMaterialMode?(mode)** — opcional; ou derivar de materialQuality.
- **viewerApi.setDefaultMaterial?(materialId)** — para MaterialPanel aplicar padrão a novas caixas ou a todas.
- **viewerApi.reapplyMaterials?()** — reaplicar materiais a todas as caixas (útil após mudar preset global ou overrides).
- **Callbacks no project:** ao atualizar box (materialName), o Workspace ou o hook que sincroniza com o viewer chama viewerApi.updateBoxMaterial. Não é necessário evento novo se o fluxo de updateBox já existente for usado de forma consistente.

---

## 8. Plano de migração (resumido)

1. **Fase 1 – Fundação**
   - Criar `core/materials/materialEngine/`: types, textureCache, presetRegistry (consumir presets.ts + materials.api), applyToMesh (performance = WoodMaterial; showcase = textura + cache).
   - Corrigir presetService: DEFAULT_PRESET_ID = "mdf_branco" (ou remover e usar getDefaultPreset baseado no primeiro preset disponível).
   - Unificar lista de presets: uma única lista com viewerMaterialId; materialPresets.ts deixa de ser fonte para 3D; MaterialPanel passa a usar presetService / MaterialEngine para lista.

2. **Fase 2 – Viewer**
   - ViewerCore (e BoxBuilder onde aplicável): em updateBoxMaterial e na construção de caixas, usar MaterialEngine para obter e aplicar material (por materialName/viewerMaterialId e modo).
   - Introduzir material partilhado para panel edge overlay (substituir getPanelEdgeOverlayMaterial() por um material único ou pool).
   - WallFactory: criar material uma vez com parâmetros corretos (ou obter de MaterialEngine.getSceneMaterialConfig().wall) e clonar; remover criação default + applyWallMaterial redundante.

3. **Fase 3 – Ambiente**
   - MaterialEngine.getSceneMaterialConfig(mode) para wall, wallExtra, floor, roomBox, ground. WallFactory, RoomManager, ViewerCore roomBox, SceneManager/Environment usam essa config.

4. **Fase 4 – UI**
   - MaterialPanel: obter presets de MaterialEngine/presetService (viewerMaterialId); ao alterar preset/categoria/overrides, atualizar projeto e chamar viewerApi (updateBoxMaterial / setDefaultMaterial / reapplyMaterials conforme desenho).
   - Garantir que LeftPanel/Piece3DModal e calculadora chamam viewerApi.updateBoxMaterial quando o material da peça muda.

5. **Fase 5 – Cutlist e materialLibraryV2**
   - Cutlist continua a usar getVisualMaterialForBox (materialLibraryV2 ou MaterialEngine que delega). Garantir que getVisualMaterialForBox usa o mesmo registo de presets que o MaterialEngine.
   - Deprecar applyVisualMaterialToMesh no fluxo do Viewer (substituído por MaterialEngine.applyMaterialToMesh); manter para compatibilidade em export se necessário.

6. **Fase 6 – Limpeza**
   - Remover duplicações de constantes (MDF branco, paredes, chão) em favor de MaterialEngine / sceneMaterials.
   - Documentar materialPresets.ts como “apenas preview 2D” ou fundir presets com a fonte canónica e usar no MaterialPanel a mesma fonte.

---

## 9. Impacto no ViewerCore, SceneManager e MaterialPanel

| Componente | Impacto |
|------------|---------|
| **ViewerCore** | Passa a usar MaterialEngine para materiais das caixas (loadMaterial → MaterialEngine). Panel edge overlay usa material partilhado. Room box e pés podem usar MaterialEngine.getSceneMaterialConfig() ou manter criação local com config centralizada. applyMaterialQualityProfile pode ser alinhado com modo do MaterialEngine (performance/showcase). |
| **SceneManager** | Não precisa de criar materiais; pode obter config do chão de MaterialEngine.getSceneMaterialConfig() e aplicar com setGroundAppearance. setMaterialQuality continua a alterar aparência do ground; valores podem vir da config. |
| **MaterialPanel** | Fonte de presets passa a ser MaterialEngine/presetService (viewerMaterialId). Cada alteração (preset, roughness, etc.) atualiza projeto e chama viewerApi (updateBoxMaterial / setDefaultMaterial / reapplyMaterials). Preview 2D pode continuar a usar URLs de textura dos presets quando existirem. |
| **BoxBuilder** | Continua a receber materialName; ao criar geometria, pode pedir ao MaterialEngine o material (ou o caller ViewerCore aplica após construir). Cutter e materiais utilitários podem permanecer locais. |
| **cutlistFromBoxes** | Sem alteração de contrato; continua a usar getVisualMaterialForBox (e getFallbackMaterial); a implementação pode delegar no MaterialEngine ou manter em materialLibraryV2 com mesma fonte de presets. |

---

## 10. Resultado esperado (checklist)

- [x] Plano técnico claro para iniciar a implementação do MaterialEngine.
- [x] Decisão fundamentada sobre o que manter (WoodMaterial, materials.api, materialLibraryV2 dados, overlays, SceneManager ground), o que remover (duplicações, panel edge por instância, branco_liso, materialPresets como fonte 3D) e o que reconstruir (fluxo com texturas, cache, aplicação por modo, config de ambiente unificada).
- [x] Base para materiais realistas (presets com textureUrl/normalMapUrl, modos performance/showcase/realistic) e para ligar toda a UI (MaterialPanel, material por peça) ao MaterialEngine via viewerApi e projeto.

Este documento deve ser usado como referência para as próximas etapas de implementação sem alterar código até que a implementação seja iniciada.
