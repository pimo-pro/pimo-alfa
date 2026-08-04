# Relatório de Validação — Biblioteca ferragens_3d

**Projeto:** PIMO-Criativo / pimo-v3  
**Documento:** `RELATORIO_VALIDACAO_FERRAGENS_3D.md`  
**Data:** 2026-08-04  
**Modo:** análise read-only da biblioteca + UI local de visualização em `/industrial`  
**Integração industrial:** não efectuada nesta fase (conforme pedido)

---

## 1. Resumo executivo

A biblioteca `pimo-criativo/ferragens_3d/` (v2) contém **13 modelos** em contentor **GLB** (glTF 2.0 binário) com extensão `modelo.gltf`, cada um acompanhado de `medidas.json`.

Validação programática (magic GLB, versão 2.0, meshes/nodes/materiais PBR, POSITION+NORMAL, bounding boxes vs `medidas.json`, escala em metros): **13/13 OK**.

Na página `/industrial` foi adicionado:

- botão **Ferragens 3D** (painel esquerdo) e atalho **F3D** no rail;
- overlay local com Viewer 3D isolado (OrbitControls, iluminação simples, escala 1:1);
- **sem** novas rotas, **sem** alteração do Viewer industrial principal, **sem** ligação a peças do módulo.

---

## 2. Lista completa das ferragens analisadas

| # | ID | Tipo | Norma | Meshes | Vértices | Normais | Índices | BBox mm (X×Y×Z) |
|---|----|------|-------|--------|----------|---------|---------|-----------------|
| 1 | `dobradica_porta` | Dobradiça europeia copo 35 mm | EN 15570 / DIN 355 | 3 | 266 | 266 | 324 | 45 × 16,25 × 45 |
| 2 | `corredica_gaveta_250` | Corrediça telescópica 250 mm | EN 15570 | 5 | 462 | 462 | 612 | 250 × 12 × 34,95 |
| 3 | `corredica_gaveta_300` | Corrediça telescópica 300 mm | EN 15570 | 5 | 462 | 462 | 612 | 300 × 12 × 34,95 |
| 4 | `corredica_gaveta_350` | Corrediça telescópica 350 mm | EN 15570 | 5 | 462 | 462 | 612 | 350 × 12 × 34,95 |
| 5 | `corredica_gaveta_400` | Corrediça telescópica 400 mm | EN 15570 | 5 | 462 | 462 | 612 | 400 × 12 × 34,95 |
| 6 | `corredica_gaveta_450` | Corrediça telescópica 450 mm | EN 15570 | 5 | 462 | 462 | 612 | 450 × 12 × 34,95 |
| 7 | `corredica_gaveta_500` | Corrediça telescópica 500 mm | EN 15570 | 5 | 462 | 462 | 612 | 500 × 12 × 34,95 |
| 8 | `cavilha_10mm` | Cavilha / espiga Ø10×35 | DIN 68840 / EN 14257 | 1 | 194 | 194 | 288 | 10 × 35 × 10 |
| 9 | `parafuso_3x30` | Parafuso madeira 3×30 | DIN 7997 / EN 14592 | 2 | 324 | 324 | 480 | 6 × 6 × 33 |
| 10 | `parafuso_4x35` | Parafuso madeira 4×35 | DIN 7997 / EN 14592 | 2 | 324 | 324 | 480 | 8 × 8 × 39 |
| 11 | `parafuso_4x50` | Parafuso madeira 4×50 | DIN 7997 / EN 14592 | 2 | 324 | 324 | 480 | 8 × 8 × 54 |
| 12 | `parafuso_5x50` | Parafuso madeira 5×50 | DIN 7997 / EN 14592 | 2 | 324 | 324 | 480 | 10 × 10 × 55 |
| 13 | `parafuso_3.5x16` | Parafuso madeira 3,5×16 | DIN 7997 / EN 14592 | 2 | 324 | 324 | 480 | 7 × 7 × 19,5 |

**Nota de catálogo (v2 vs lista histórica v1):** não existem pastas `cavilha_6mm`, `cavilha_8mm`, `corredica_gaveta` (sem sufixo) nem `parafuso_5x60` — remoções/substituições documentadas em `ferragens_3d/RELATORIO_FERRAGENS_3D_ATUALIZADO.md`.

---

## 3. Validação técnica por modelo

Critérios aplicados a todos:

- Magic number GLB `0x46546C67` e versão 2
- `asset.version` = `2.0`
- Nodes, meshes e materiais presentes
- Atributos `POSITION` + `NORMAL` com contagens iguais
- Materiais com `pbrMetallicRoughness`
- Escala 1:1 em **metros** (dims da cena < 2 m)
- Coerência `medidas.json.bounding_box_mm` vs `accessors.min/max` (tolerância 0,05 mm)
- Sistema de coordenadas right-handed (convenção glTF 2.0 / Three.js)

### Resultado agregado

| Verificação | Resultado |
|-------------|-----------|
| GLB válido | 13/13 OK |
| glTF 2.0 | 13/13 OK |
| PBR presente | 13/13 OK |
| Vértices = Normais | 13/13 OK |
| Escala metros 1:1 | 13/13 OK |
| BBox glTF ↔ medidas.json | 13/13 OK |
| Right-handed (glTF) | 13/13 OK (por especificação + metadados) |

### Orientações (metadados + gerador)

| Família | Orientação |
|---------|------------|
| Dobradiça | Placa no plano XZ; copo −Y; braço +Y |
| Corrediças | Trilho ao longo de X; altura Y; largura Z |
| Cavilha | Eixo longitudinal em Y |
| Parafusos | Eixo longitudinal em Z; cabeça em +Z |

Não foram detectadas orientações incorrectas relativamente aos metadados e ao gerador `gerar_ferragens.mjs`.

---

## 4. Problemas encontrados / inconsistências

1. **Extensão vs contentor:** ficheiros chamam-se `modelo.gltf` mas o conteúdo é **GLB binário**. Funciona com `GLTFLoader`/`useGLTF`, mas pode confundir pipelines. Recomendação futura: renomear para `modelo.glb`.
2. **PBR genérico:** `metallicFactor=0.2` e `roughnessFactor=0.6` iguais para aço e madeira (cavilha).
3. **Largura nominal vs BBox (corrediças):** `dimensoes_mm.largura` = 27 mm, mas BBox em Z = **34,95 mm** (trilho móvel).
4. **Parafusos:** BBox Z = comprimento do corpo + altura da cabeça (ex. 30+3=33).
5. **Rosca não modelada** (LOD baixo).
6. **Metadados de ancoragem ausentes** (sem pontos de fixação / eixos / regras de furo).
7. **Sem UVs / texturas.**
8. **Topologia não-manifold / componentes separados.**
9. **Documentação v1 desactualizada** face ao catálogo v2 em disco.
10. Placeholder `[0,0,0]` no gerador é sobrescrito na serialização final (sem impacto).

Nenhum problema de **escala incorrecta** (mm vs m) foi encontrado nos 13 modelos.

---

## 5. Pontos fortes

- Escala **1:1 em metros**, alinhada com Three.js / Viewer do projecto
- Bounding boxes reais gravadas em `medidas.json` e coerentes com a geometria
- Série parametrizada de corrediças (250–500 mm)
- Normais por vértice em todas as meshes
- Materiais PBR básicos presentes
- Gerador Node isolado (`gerador/gerar_ferragens.mjs`)
- Naming industrial claro por pasta
- Biblioteca isolada do módulo Industrial

---

## 6. Conformidade com normas europeias

| Família | Referências | Observação |
|---------|-------------|------------|
| Dobradiça | EN 15570 / DIN 355 | Copo 35 mm típico; geometria simplificada |
| Corrediças | EN 15570 | Carga 35 kg; perfil 27×12 mm; comprimentos standard |
| Cavilha | DIN 68840 / EN 14257 | Ø10 h9 × 35 mm |
| Parafusos | DIN 7997 / EN 14592 | Dimensões industriais; rosca não geométrica |

**Veredicto:** conformidade dimensional/documental adequada para LOD de visualização. Não é certificação de produto.

---

## 7. Conformidade com Three.js / glTF 2.0

| Requisito | Estado |
|-----------|--------|
| glTF 2.0 binário (GLB) | OK |
| Right-handed Y-up | OK |
| Unidades em metros | OK |
| `GLTFLoader` / `useGLTF` | Compatível |
| PBR metallic-roughness | Presente |

Carregamento no overlay via `import.meta.glob(...modelo.gltf?url)` + `@react-three/drei` `useGLTF`.

---

## 8. Observações industriais

- Adequados a inspecção visual; não ainda a BOM automático.
- Envelope das corrediças (34,95 mm Z) para colisão; 27 mm para escolha de ferragem.
- Peças leves para instanciação futura.
- Falta `manifest.json` versionado e pontos de ancoragem.

---

## 9. UI entregue nesta fase (sem integração)

| Item | Local |
|------|-------|
| Botão "Ferragens 3D" | `pimo-criativo/src/app/industrial/index.tsx` |
| Atalho rail F3D | mesmo ficheiro + props opcionais em `StationSidebar.tsx` |
| Overlay Viewer | `src/industrial/ui/ferragens3d/Ferragens3DOverlay.tsx` |
| Catálogo | `src/industrial/ui/ferragens3d/ferragens3dCatalog.ts` |

Fora de âmbito: ligação a peças, Viewer principal, rotas novas, substituição de ferragens existentes.

---

## 10. Plano de integração futura

### 10.1. Viewer industrial

1. Loader dedicado `loadFerragem3D(id)` sem misturar com `ViewerCore`.
2. Camada `FerragensLayer` com toggle (visível / fantasma / oculto).
3. Instancing para parafusos/cavilhas.
4. Materiais próprios da ferragem.

### 10.2. Ligação às peças

1. `attachmentPoints` por tipo de peça.
2. Regras: dobradiça ↔ furo Ø35; corrediça ↔ lateral; parafuso/cavilha ↔ diâmetro/profundidade.
3. Poses a partir do grafo de montagem (mm → m).
4. Validação de colisões envelope vs peça.

### 10.3. Sistema de metadados

Schema mínimo sugerido: `id`, `familia`, `versao`, `norma`, `unidades`, `modelo`, `bbox_mm`, `ancoras[]`, `regras{}` + `ferragens_3d/manifest.json` gerado.

### 10.4. Regras de posicionamento

| Ferragem | Regra inicial |
|----------|---------------|
| Dobradiça | Copo no furo Ø35; placa na face do corpo |
| Corrediça | Origem a meio do comprimento; espelho L/R |
| Cavilha | Eixo Y no eixo do furo; centro no plano de junta |
| Parafuso | Eixo Z no furo; cabeça no lado de entrada |

### 10.5. Governança e naming

- Pasta = ID canónico (`snake_case`).
- `modelo.glb` + `medidas.json` + manifesto.
- Versionar e regenerar via gerador; CI de validação.
- Não substituir ferragens legacy sem feature flag + mapeamento BOM.

---

## 11. Conclusão

A biblioteca **está pronta para visualização isolada** e tecnicamente coerente (escala, PBR básico, BBoxes, glTF 2.0). A fase actual entrega o botão + overlay em `/industrial` e este relatório. A integração com peças e Viewer principal fica para um passo posterior.
