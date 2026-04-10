# Relatório Técnico — Sistema de Materiais (Etapa 6)

**Objetivo:** Diagnóstico completo de todas as matérias (materials, shaders, textures) existentes no projeto: onde são criadas, usadas, duplicadas e onde estão desconectadas da UI de configurações.

**Data:** 2025-03-09  
**Escopo:** Apenas análise; nenhum ficheiro de código foi alterado.

---

## 1. Varredura — Onde são criados materiais e texturas

### 1.1 `THREE.MeshStandardMaterial`

| Ficheiro | Local / contexto | Uso |
|----------|------------------|-----|
| `src/3d/room/WallFactory.ts` | `applyWallMaterial()` | Parede: color, roughness 0.75, metalness 0.05, transparent, opacity; aplicado a cada mesh de parede |
| `src/3d/room/WallFactory.ts` | `createMainWalls()` | 4× mesh criado com `new THREE.MeshStandardMaterial()` depois sobrescrito por `applyWallMaterial` (redundante) |
| `src/3d/room/WallFactory.ts` | `createExtraWall()` | Idem: mesh com MeshStandardMaterial depois `applyWallMaterial` (EXTRA_WALL_COLOR 0x9ca3af) |
| `src/3d/room/elements/DoorElement.ts` | `DoorElement.create()` | Um material partilhado: DEFAULT_ELEMENT_COLOR, roughness 0.7, metalness 0.05 (painel + molduras) |
| `src/3d/room/elements/WindowElement.ts` | `WindowElement.create()` | `frameMaterial` (igual ao da porta); `glassMaterial` (cor 0xc8e0f0, transparent, opacity 0.85) |
| `src/3d/objects/BoxBuilder.ts` | Cutter interno + fallback | Cutter: MeshStandardMaterial; painéis: via `createWoodMaterial` + `getMaterialPreset(defaultMaterialSet, "mdf_branco")` |
| `src/3d/materials/WoodMaterial.ts` | `createWoodMaterial()` | Único ponto de criação de material de madeira (cor, roughness, metalness, envMapIntensity); sem texturas |
| `src/core/materials/materialLibraryV2.ts` | `getThreeJsMaterial()` | Cria MeshStandardMaterial a partir de `VisualMaterial` (cor, roughness, metalness); usado por `applyVisualMaterialToMesh` |
| `src/3d/viewer-engine/environment/Environment.ts` | `createGround()` | Chão: cor `groundColor` ou "#d4dae2", roughness 0.92, metalness 0 |
| `src/3d/viewer-engine/scene/SceneManager.ts` | — | Não cria materiais; usa o ground de `createGround(environment)` e altera aparência com `setGroundAppearance()` |
| `src/3d/room/RoomManager.ts` | Criação do chão da sala | `floorMat`: cor 0xe5e7eb, roughness 0.9, metalness 0, DoubleSide (chão da sala) |
| `src/3d/viewer-engine/ViewerCore.ts` | `buildRoomBox()` | `wallMat`: 0xd1d5db, roughness 0.75, metalness 0.05, transparent 0.8 (paredes + chão + teto do room box) |
| `src/3d/viewer-engine/ViewerCore.ts` | `createKitchenFeetGroup()` | `metalMat` (0x9ca3af, roughness 0.32, metalness 0.82); `baseMat` (0x1f2937, roughness 0.85, metalness 0.1) |
| `src/3d/viewer-engine/ViewerCore.ts` | `loadModelObject()` (STL) | Material único por modelo STL: "#d1d5db", roughness 0.8 |

### 1.2 `THREE.MeshBasicMaterial`

| Ficheiro | Local / contexto | Uso |
|----------|------------------|-----|
| `src/3d/viewer-engine/highlight/HighlightManager.ts` | Overlay de highlight | `tintMat`: cor HIGHLIGHT_COLOR, transparent, opacity, depthWrite false (clone de geometria) |
| `src/3d/viewer-engine/ViewerCore.ts` | Wireframe de debug | `linesMaterial`: cor 0x111111, wireframe true (apenas quando ativo) |
| `src/3d/gizmos/WallGizmo.ts` | Círculo do gizmo | `circleMat`: cor 0x16a34a, DoubleSide, depthTest true |

### 1.3 `THREE.LineBasicMaterial`

| Ficheiro | Local / contexto | Uso |
|----------|------------------|-----|
| `src/3d/viewer-engine/ViewerCore.ts` | Constructor | `selectionOutlineMaterial`: #7dd3fc, opacity 0.6 (BoxHelper seleção caixa) |
| `src/3d/viewer-engine/ViewerCore.ts` | Constructor | `wallSelectionOutlineMaterial`: #3b82f6, opacity 0.9 (seleção parede) |
| `src/3d/viewer-engine/ViewerCore.ts` | Dimensões overlay | Um material: cor 0x64748b para `dimensionsOverlayLines` |
| `src/3d/viewer-engine/ViewerCore.ts` | `getPanelEdgeOverlayMaterial()` | Novo material em cada chamada: #000000, opacity 0.9 (overlay de arestas de painéis/portas/gavetas) |
| `src/3d/viewer-engine/highlight/HighlightManager.ts` | Overlay de highlight | `outlineMat`: LineBasicMaterial para EdgesGeometry (contorno do highlight) |

### 1.4 `THREE.MeshPhysicalMaterial`

- **Nenhuma ocorrência** no projeto.

### 1.5 `THREE.ShaderMaterial` / shaders custom

- **Nenhum** `ShaderMaterial` nem vertex/fragment shaders custom (GLSL) no código de materiais.
- Único uso de `uniforms` encontrado: `ViewerCore.ts` (bokehPass) para pós-processamento (focus), não para materiais de superfície.

---

## 2. TextureLoader e texturas

### 2.1 Onde existe `TextureLoader`

| Ficheiro | Uso |
|----------|-----|
| `src/core/materials/materialLibraryV2.ts` | Loader partilhado (`getTextureLoader()`). Carregamento apenas em `applyVisualMaterialToMesh()` quando `visualMaterial.textureUrl` está definido. |

Não há mais nenhum `new THREE.TextureLoader()` no projeto.

### 2.2 Texturas carregadas em runtime

- **materialLibraryV2:** carrega texturas via URLs em `VisualMaterial.textureUrl` (presets podem definir `textureUrl`; presets atuais em `presets.ts` não definem `textureUrl`).
- **ViewerCore:** `getPremiumTexture()` gera uma `THREE.CanvasTexture` (gradiente + ruído) para o perfil de qualidade "premium"; não carrega ficheiros externos.

### 2.3 Texturas referenciadas na UI (não carregadas pelo Viewer)

- **MaterialPanel** (`materialPresets.ts`): usa caminhos estáticos `/textures/${category}/base.svg`, `normal.svg`, `roughness.svg`, `metalness.svg`, `ao.svg` para preview (CSS `backgroundImage`). Estes ficheiros **não** são usados pelo motor 3D; o Viewer usa apenas `MaterialLibrary` + `WoodMaterial` (cor sólida) ou, opcionalmente, `applyVisualMaterialToMesh` com URL do preset.

---

## 3. materialLibraryV2 e fluxos relacionados

### 3.1 Onde é usado

- **materialLibraryV2.ts:**  
  - `getVisualMaterialForBox`, `getFallbackMaterial`, `buildVisualMaterial`, `getThreeJsMaterial`, `applyVisualMaterialToMesh`.
- **Cutlist:** `cutlistFromBoxes.ts` usa `getVisualMaterialForBox` / `getFallbackMaterial` para preencher `visualMaterial` e `faceMaterials` nos itens (Layout Engine / export).
- **Viewer:** não aplica automaticamente `applyVisualMaterialToMesh` às caixas; as caixas são renderizadas com materiais criados por `createWoodMaterial` + `MaterialLibrary` (getMaterialPreset + defaultMaterialSet).

### 3.2 Fluxo atual das caixas no Viewer

1. **ViewerCore:** `loadMaterial(materialName)` → `getMaterialPreset(this.materialSet, materialName)` (MaterialLibrary) → `createWoodMaterial({}, preset.options)`.
2. **MaterialSet:** vem de `MaterialLibrary.defaultMaterialSet`, construído a partir de `listOfficialMaterials()` (materials.api.ts) com `viewerMaterialId` e cores/roughness fixas.
3. **updateBoxMaterial(id, materialName):** chama `loadMaterial(materialName)` e aplica o resultado ao grupo da caixa (substituição de materiais nos meshes).

Conclusão: o sistema visual das caixas no Viewer é **MaterialLibrary (3d) + WoodMaterial** (cor sólida). **materialLibraryV2** é usado para cutlist/export (VisualMaterial) e está disponível para aplicar texturas via `applyVisualMaterialToMesh`, mas não está ligado à UI de materiais nem ao fluxo principal do Viewer.

---

## 4. Presets e fontes de verdade

### 4.1 Três sistemas de presets

| Sistema | Ficheiro(s) | Consumidores | Conteúdo |
|--------|-------------|--------------|----------|
| **Presets visuais (CRUD/Fase 4)** | `presets.ts`, `presetService.ts` | materialLibraryV2, getVisualMaterialForBox, getDefaultPreset | INITIAL_MATERIAL_PRESETS: mdf_branco, laminado_linho_cancun, mdf_preto, carvalho_natural, nogueira (id, name, color, uvScale, roughness, metallic; textureUrl opcional) |
| **MaterialLibrary (Viewer)** | `MaterialLibrary.ts` + `materials.api.ts` | ViewerCore, BoxBuilder, Piece3DModal | defaultMaterialSet derivado de listOfficialMaterials(); MATERIAIS_PBR_IDS; getMaterialPreset(materialSet, idOrName) → WoodMaterialOptions |
| **MaterialPanel (UI)** | `materialPresets.ts` | MaterialPanel.tsx | wood_oak, wood_walnut, wood_pine; maps: base.svg, normal.svg, etc. por categoria; getPresetById / getPresetsByCategory |

### 4.2 Inconsistências

- **presetService** usa `DEFAULT_PRESET_ID = "branco_liso"` em `getDefaultPreset()`, mas **INITIAL_MATERIAL_PRESETS** não contém "branco_liso" (tem "mdf_branco"). O fallback acaba a ser o primeiro preset do store ou o objeto "fallback" hardcoded.
- **MaterialPanel** usa `materialPresets.ts` (wood_oak, wood_walnut, wood_pine) e mostra roughness/metalness/envMapIntensity; estas alterações **não** estão ligadas ao ViewerCore nem ao MaterialLibrary — são apenas estado local da UI.
- **Nomes/IDs:** materials.api (mdf_branco, carvalho_natural, etc.) vs presets (mdf_branco, carvalho_natural, nogueira) vs materialPresets (wood_oak, wood_walnut, wood_pine). Não há um único ID canónico que una UI, cutlist e Viewer.

---

## 5. Duplicações e configurações repetidas

### 5.1 Cores e parâmetros repetidos

- **Paredes:**  
  - WallFactory: 0xd1d5db, roughness 0.75, metalness 0.05, opacity 0.6.  
  - ViewerCore roomBox: 0xd1d5db, roughness 0.75, metalness 0.05, opacity 0.8.  
  - Extra walls: 0x9ca3af com os mesmos restantes parâmetros.  
  → Constantes espalhadas; candidato a um único “wall material config”.
- **Porta / janela (moldura):** DoorElement e WindowElement usam o mesmo tipo de material (DEFAULT_ELEMENT_COLOR, 0.7, 0.05). Podem partilhar factory.
- **Chão:**  
  - Environment.createGround: #d4dae2, 0.92, 0.  
  - RoomManager floor: 0xe5e7eb, 0.9, 0.  
  - SceneManager setMaterialQuality altera cor/roughness/metalness do ground (premium/lacquered/standard).  
  → Vários “floor” com valores próximos mas em sítios diferentes.
- **MDF branco / fallback:**  
  - MaterialLibrary defaultMaterialSet: #f2f0eb, 0.52, 0.4.  
  - presets.ts mdf_branco: #f2f0eb, 0.52.  
  - WoodMaterial default: #f2f0eb, 0.55.  
  → Valores alinhados mas definidos em três sítios.

### 5.2 Materiais criados em excesso

- **getPanelEdgeOverlayMaterial():** cria um **novo** LineBasicMaterial em cada chamada (ViewerCore, para cada painel/porta/gaveta com overlay de arestas). Deveria ser um material partilhado (ou pool) para reduzir instâncias e GPU.
- **WallFactory:** cada parede é criada com um MeshStandardMaterial() default e logo de seguida `applyWallMaterial` substitui; o material inicial é desperdiçado (ou substituído). Melhor: criar uma vez o material e clonar, ou criar já com os parâmetros corretos.

### 5.3 Shaders repetidos

- Não existem shaders custom de superfície; não há duplicação de GLSL.

### 5.4 Texturas carregadas mais de uma vez

- materialLibraryV2 carrega por URL em `applyVisualMaterialToMesh`; se a mesma URL for aplicada a vários meshes, cada um pode disparar um load. Não há cache de textura por URL no módulo (apenas o TextureLoader é partilhado).

---

## 6. Materiais e recursos não utilizados ou órfãos

### 6.1 Materiais definidos mas não aplicados no Viewer

- **materialLibraryV2.getThreeJsMaterial / applyVisualMaterialToMesh:** capazes de aplicar cor + textura + UV ao mesh, mas o fluxo principal do Viewer (updateBoxMaterial) não os usa; usa apenas createWoodMaterial + preset do MaterialLibrary. Logo, a parte “textura” do materialLibraryV2 está disponível mas não ligada ao Viewer.
- **Presets em presets.ts** com `textureUrl` ou `normalMapUrl`: podem ser usados por getVisualMaterialForBox e applyVisualMaterialToMesh; atualmente os INITIAL_MATERIAL_PRESETS não têm textureUrl, portanto nenhuma textura é de facto aplicada a partir daí.

### 6.2 Texturas carregadas mas não usadas no 3D

- **MaterialPanel:** as URLs `/textures/wood/base.svg`, etc., são usadas só para preview em 2D (style.backgroundImage). Nunca são passadas ao Viewer nem ao materialLibraryV2.

### 6.3 Presets antigos ou redundantes

- **materialPresets.ts** (wood_oak, wood_walnut, wood_pine): usados apenas pelo MaterialPanel para UI; não têm correspondência direta com viewerMaterialId (carvalho_natural, nogueira, etc.). Há sobreposição conceptual (carvalho, nogueira) mas IDs e origem diferentes.
- **presetService** “branco_liso”: id de default não existe em INITIAL_MATERIAL_PRESETS; pode ser considerado obsoleto ou erro de configuração.

---

## 7. Pontos de ligação com a UI de configurações

### 7.1 Opções ligadas ao ViewerCore

- **Qualidade de material (materialQuality):**  
  - project.viewerSettings.materialQuality → Workspace → viewerApi.setMaterialQuality(settings.materialQuality).  
  - DisplayMenuButton altera project.viewerSettings.materialQuality.  
  - ViewerCore.setMaterialQuality → SceneManager.setMaterialQuality + applyMaterialQualityProfile() (altera roughness, metalness, envMapIntensity, map de todos os MeshStandardMaterial da cena; premium aplica getPremiumTexture()).  
  → **Ligado e funcional.**

### 7.2 Opções não ligadas ao motor de materiais

- **MaterialPanel (painel “Materiais”):**  
  - Tipo de material (categoria), Preset (wood_oak, etc.), Roughness, Metalness, etc.  
  - Estado guardado em useMaterial (setAssignment, setCategoryPreset, setCategoryOverrides).  
  - **Não** chama viewerApi, **não** altera material das caixas no Viewer nem atualiza project.boxes com materialId/materialName.  
  → **Desligado** do Viewer e do CRUD de materiais.
- **LeftPanel / modal de material na peça:**  
  - loadMaterials (lista de materiais) e setMaterial podem atualizar projeto; é necessário confirmar se setMaterial propaga materialName ao box e chama updateBoxMaterial no Viewer. Se não chamar viewerApi.updateBoxMaterial, a peça pode mudar só em dados sem atualizar o 3D.

### 7.3 Opções que deveriam controlar materiais mas não controlam

- Escolha de material por peça/caixa na UI (dropdown de material) deveria:  
  - Atualizar project (materialId/materialName).  
  - Chamar viewerApi.updateBoxMaterial(boxId, viewerMaterialId) para refletir no Viewer.  
- MaterialPanel (preset global / por categoria) poderia definir um “material padrão” para novas peças ou aplicar a todas; atualmente não há essa ligação.

### 7.4 Resumo UI ↔ motor

| UI | Ligado? | Observação |
|----|--------|------------|
| materialQuality (standard/premium/lacquered) | Sim | ViewerCore + SceneManager |
| Escolha de material por caixa (LeftPanel/Piece3DModal, etc.) | Parcial | Depende de updateBox ser chamado com materialName e ViewerCore.updateBoxMaterial; useCalculadoraSync passa materialName para updateBox |
| MaterialPanel (categoria, preset, roughness, metalness) | Não | Apenas estado local; não altera Viewer nem CRUD |

---

## 8. Listas consolidadas para migração e limpeza

### 8.1 Materiais Three.js por tipo e ficheiro

- **MeshStandardMaterial:**  
  WallFactory, DoorElement, WindowElement (×2), BoxBuilder (cutter + via WoodMaterial), WoodMaterial, materialLibraryV2, Environment, RoomManager, ViewerCore (roomBox, feet, STL).
- **MeshBasicMaterial:**  
  HighlightManager (tint), ViewerCore (wireframe), WallGizmo (circle).
- **LineBasicMaterial:**  
  ViewerCore (selection, wall selection, dimensions, panel edges), HighlightManager (outline).
- **CanvasTexture (premium):**  
  ViewerCore.getPremiumTexture().

### 8.2 Shaders

- Nenhum ShaderMaterial nem shader de superfície; apenas uniforms de pós-processamento (bokeh) em ViewerCore.

### 8.3 Texturas

- **Runtime 3D:** apenas as carregadas por materialLibraryV2 (quando textureUrl está definido) e a CanvasTexture premium no ViewerCore.
- **Referenciadas na UI:** `/textures/{category}/*.svg` em materialPresets.ts (preview 2D apenas).

### 8.4 Duplicações a unificar

- Configuração de paredes (WallFactory + ViewerCore roomBox).
- Material de moldura porta/janela (factory partilhada).
- Chão (Environment, RoomManager, SceneManager setMaterialQuality).
- Um único material partilhado (ou pool) para panel edge overlay em vez de um por chamada.
- Cache de textura por URL em materialLibraryV2 para evitar loads duplicados.

### 8.5 Obsoletos ou a remover/ajustar

- DEFAULT_PRESET_ID "branco_liso" em presetService (alinear com mdf_branco ou remover).
- Decisão sobre materialPresets.ts: unificar com presets visuais (presets.ts) e com viewerMaterialId, ou marcar como “apenas preview 2D” e não expandir para 3D sem integração.

### 8.6 Problemas estruturais

1. **Três fontes de presets** sem um único ID canónico (presets.ts, MaterialLibrary/defaultMaterialSet, materialPresets.ts).
2. **materialLibraryV2** (VisualMaterial + textura) não está no caminho de renderização principal do Viewer (só cutlist/export).
3. **MaterialPanel** não comunica com Viewer nem com CRUD de materiais.
4. **WallFactory** cria material default e depois substitui (desperdício).
5. **Panel edge overlay:** nova instância de LineBasicMaterial por mesh.
6. Nenhum **cache de texturas** por URL no materialLibraryV2.

### 8.7 Pontos a migrar para o futuro MaterialEngine

- Centralizar criação de MeshStandardMaterial para móveis (actualmente WoodMaterial + MaterialLibrary).
- Unificar presets (CRUD + Viewer + UI) numa única fonte com viewerMaterialId e opcionalmente textureUrl/normalMapUrl.
- Aplicar VisualMaterial (materialLibraryV2) no fluxo principal do Viewer quando houver textura/UV (ou substituir por MaterialEngine).
- Ligar MaterialPanel ao Viewer e ao CRUD (material por peça e material padrão).
- Partilhar configurações de ambiente (paredes, chão, teto) e de overlay (edges, outlines) a partir de um único módulo de “scene materials”.
- Cache de texturas e reutilização de materiais (pool) para overlays e paredes.

### 8.8 Opções da UI a ligar ao sistema de materiais

- MaterialPanel: ao alterar categoria/preset ou parâmetros, atualizar project (e/ou material padrão) e chamar viewerApi para aplicar material às caixas afetadas (updateBoxMaterial ou equivalente).
- LeftPanel / modal de peça: garantir que setMaterial atualiza project e chama updateBoxMaterial(id, getViewerMaterialId(...)) para refletir no Viewer imediatamente.
- Qualidade de material: já ligada; manter como está.

---

## 9. Conclusão

- O projeto **não** usa MeshPhysicalMaterial nem ShaderMaterial para superfícies; apenas MeshStandardMaterial, MeshBasicMaterial e LineBasicMaterial, e uma CanvasTexture para qualidade “premium”.
- **TextureLoader** existe apenas em materialLibraryV2; carregamento de texturas para meshes é opcional e não está no fluxo principal do Viewer (que usa cores sólidas via WoodMaterial + MaterialLibrary).
- Há **três sistemas de presets** (presets/presetService, MaterialLibrary + materials.api, materialPresets para UI) e **duas “bibliotecas”** (MaterialLibrary em 3d/materials, materialLibraryV2 em core/materials) com responsabilidades sobrepostas.
- **Duplicações** relevantes: configurações de paredes/chão, criação desnecessária de materiais em WallFactory e em getPanelEdgeOverlayMaterial, e possíveis múltiplos loads da mesma URL em materialLibraryV2.
- **UI:** apenas materialQuality está ligada ao Viewer; o MaterialPanel está desconectado; a ligação da escolha de material por peça ao Viewer depende de updateBoxMaterial ser chamado de forma consistente.
- Para um futuro **MaterialEngine**, faz sentido: (1) unificar presets e IDs (viewerMaterialId); (2) integrar materialLibraryV2 (ou o seu conceito VisualMaterial) no fluxo de renderização do Viewer; (3) ligar o MaterialPanel ao Viewer e ao CRUD; (4) centralizar constantes de materiais de ambiente e overlays; (5) introduzir cache de texturas e reutilização de materiais onde há muitas instâncias.

Este relatório serve de base para decidir entre reconstruir o sistema de materiais do zero ou reaproveitar e unificar as partes existentes (MaterialLibrary, materialLibraryV2, presets) sob um único MaterialEngine e uma única fonte de verdade para presets e IDs.
