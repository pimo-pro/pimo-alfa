# RELATÓRIO TÉCNICO ATUALIZADO — BIBLIOTECA 3D DE FERRAGENS (ISOLADA)

**Projeto:** PIMO-Criativo  
**Documento:** `ferragens_3d/RELATORIO_FERRAGENS_3D_ATUALIZADO.md`  
**Âmbito:** Biblioteca independente de ferragens 3D — **sem qualquer integração** no Viewer, Industrial, Admin ou Core.  
**Data:** 2026-08-04  
**Versão da biblioteca:** v2  
**Estado:** ✅ Concluído e isolado

---

## 1. Resumo executivo

A biblioteca `/ferragens_3d/` foi atualizada para a **versão v2**, mantendo o isolamento total:

- **Dobradiça de porta** — mantida **exatamente como v1** (inalterada).
- **Corrediças de gaveta** — agora **dinâmicas**, com série industrial de 6 comprimentos (250–500 mm).
- **Cavilhas** — removidas Ø6 e Ø8; mantida apenas Ø10×35.
- **Parafusos** — mantidos 3×30 e 4×50; criados 4×35, 5×50 e 3.5×16; removido 5×60.
- **`medidas.json`** — agora inclui **bounding box real** calculada da geometria (mm).

Nenhum ficheiro do projeto principal foi modificado, criado ou eliminado. Nenhuma rota, componente, serviço ou módulo existente foi tocado.

---

## 2. Lista completa das ferragens finais (13)

| # | Nome industrial | Ficheiro GLTF | Ficheiro de medidas | Tipo |
|---|---|---|---|---|
| 1 | `dobradica_porta` | `dobradica_porta/modelo.gltf` | `dobradica_porta/medidas.json` | Dobradiça europeia de copo 35 mm |
| 2 | `corredica_gaveta_250` | `corredica_gaveta_250/modelo.gltf` | `corredica_gaveta_250/medidas.json` | Corrediça telescópica 250 mm |
| 3 | `corredica_gaveta_300` | `corredica_gaveta_300/modelo.gltf` | `corredica_gaveta_300/medidas.json` | Corrediça telescópica 300 mm |
| 4 | `corredica_gaveta_350` | `corredica_gaveta_350/modelo.gltf` | `corredica_gaveta_350/medidas.json` | Corrediça telescópica 350 mm |
| 5 | `corredica_gaveta_400` | `corredica_gaveta_400/modelo.gltf` | `corredica_gaveta_400/medidas.json` | Corrediça telescópica 400 mm |
| 6 | `corredica_gaveta_450` | `corredica_gaveta_450/modelo.gltf` | `corredica_gaveta_450/medidas.json` | Corrediça telescópica 450 mm |
| 7 | `corredica_gaveta_500` | `corredica_gaveta_500/modelo.gltf` | `corredica_gaveta_500/medidas.json` | Corrediça telescópica 500 mm |
| 8 | `cavilha_10mm` | `cavilha_10mm/modelo.gltf` | `cavilha_10mm/medidas.json` | Cavilha / Chaveta / Espiga Ø10 mm |
| 9 | `parafuso_3x30` | `parafuso_3x30/modelo.gltf` | `parafuso_3x30/medidas.json` | Parafuso de madeira 3×30 |
| 10 | `parafuso_4x35` | `parafuso_4x35/modelo.gltf` | `parafuso_4x35/medidas.json` | Parafuso de madeira 4×35 |
| 11 | `parafuso_4x50` | `parafuso_4x50/modelo.gltf` | `parafuso_4x50/medidas.json` | Parafuso de madeira 4×50 |
| 12 | `parafuso_5x50` | `parafuso_5x50/modelo.gltf` | `parafuso_5x50/medidas.json` | Parafuso de madeira 5×50 |
| 13 | `parafuso_3.5x16` | `parafuso_3.5x16/modelo.gltf` | `parafuso_3.5x16/medidas.json` | Parafuso de madeira 3,5×16 |

**Formato:** Todos os `modelo.gltf` são **GLB** (glTF 2.0 binário) — JSON da cena + geometria binária num único ficheiro. Compatíveis com `GLTFLoader` do Three.js (deteta o container GLB pelo magic number).

---

## 3. O que foi removido

| Modelo removido | Motivo |
|---|---|
| `corredica_gaveta` (sem sufixo, 500 mm) | Substituída pela série parametrizada `corredica_gaveta_500` |
| `cavilha_6mm` | Remoção solicitada — manter apenas Ø10 |
| `cavilha_8mm` | Remoção solicitada — manter apenas Ø10 |
| `parafuso_5x60` | Remoção solicitada — fora da lista final de parafusos |

---

## 4. O que foi criado

| Modelo criado | Tipo | Dimensões |
|---|---|---|
| `corredica_gaveta_250` | Corrediça telescópica | 250 × 27 × 12 mm |
| `corredica_gaveta_300` | Corrediça telescópica | 300 × 27 × 12 mm |
| `corredica_gaveta_350` | Corrediça telescópica | 350 × 27 × 12 mm |
| `corredica_gaveta_400` | Corrediça telescópica | 400 × 27 × 12 mm |
| `corredica_gaveta_450` | Corrediça telescópica | 450 × 27 × 12 mm |
| `corredica_gaveta_500` | Corrediça telescópica | 500 × 27 × 12 mm |
| `parafuso_4x35` | Parafuso de madeira | Ø4 × 35 mm, cabeça Ø8 mm |
| `parafuso_5x50` | Parafuso de madeira | Ø5 × 50 mm, cabeça Ø10 mm |
| `parafuso_3.5x16` | Parafuso de madeira | Ø3,5 × 16 mm, cabeça Ø7 mm |

**Nota:** A corrediça 500 mm foi **regenerada** como `corredica_gaveta_500` com a mesma geometria base da série (trilho fixo + trilho móvel + 3 rolamentos), mantendo a consistência com os restantes comprimentos.

---

## 5. Dimensões reais e bounding boxes (validação técnica)

Todas as dimensões nos ficheiros estão em **metros** (escala 1:1). As bounding boxes abaixo foram **calculadas diretamente da geometria** e gravadas em cada `medidas.json`.

### 5.1. Dobradiça de porta (`dobradica_porta`) — inalterada
| Parâmetro | Valor | Norma |
|---|---|---|
| Placa de fixação | 45 × 45 × 1,5 mm | — |
| Copo (diâmetro) | 35 mm | EN 15570 / DIN 355 |
| Copo (profundidade) | 11,5 mm | — |
| Braço de articulação | 30 × 8 × 2 mm | — |
| Abertura | 95°–110° | EN 15570 |
| **Bounding box real** | **45 × 16,25 × 45 mm** | — |

### 5.2. Corrediças de gaveta (série 250–500 mm)
| Modelo | Comprimento | Largura | Altura | **Bounding box real (X×Y×Z)** |
|---|---|---|---|---|
| `corredica_gaveta_250` | 250 mm | 27 mm | 12 mm | **250 × 12 × 34,95 mm** |
| `corredica_gaveta_300` | 300 mm | 27 mm | 12 mm | **300 × 12 × 34,95 mm** |
| `corredica_gaveta_350` | 350 mm | 27 mm | 12 mm | **350 × 12 × 34,95 mm** |
| `corredica_gaveta_400` | 400 mm | 27 mm | 12 mm | **400 × 12 × 34,95 mm** |
| `corredica_gaveta_450` | 450 mm | 27 mm | 12 mm | **450 × 12 × 34,95 mm** |
| `corredica_gaveta_500` | 500 mm | 27 mm | 12 mm | **500 × 12 × 34,95 mm** |

- Norma: EN 15570 (carga) / série industrial
- Carga nominal: 35 kg
- Extensão: 100% (full extension)
- Material: aço laminado a frio, zincado
- A largura da bounding box (34,95 mm) inclui o trilho móvel deslocado em Z — geometria real do conjunto.

### 5.3. Cavilha 10 mm (`cavilha_10mm`) — única mantida
| Parâmetro | Valor | Norma |
|---|---|---|
| Diâmetro | 10 mm | DIN 68840 / EN 14257 |
| Comprimento | 35 mm | — |
| Tolerância | h9 | DIN 68840 |
| Material | Faia (*Fagus sylvatica*) | — |
| **Bounding box real** | **10 × 35 × 10 mm** | — |

### 5.4. Parafusos de madeira
| Modelo | Ø corpo | Comprimento | Ø cabeça | Altura cabeça | Passo | **Bounding box real (X×Y×Z)** |
|---|---|---|---|---|---|---|
| `parafuso_3x30` | 3 mm | 30 mm | 6 mm | 3 mm | 1,0 mm | **6 × 6 × 33 mm** |
| `parafuso_4x35` | 4 mm | 35 mm | 8 mm | 4 mm | 1,3 mm | **8 × 8 × 39 mm** |
| `parafuso_4x50` | 4 mm | 50 mm | 8 mm | 4 mm | 1,3 mm | **8 × 8 × 54 mm** |
| `parafuso_5x50` | 5 mm | 50 mm | 10 mm | 5 mm | 1,6 mm | **10 × 10 × 55 mm** |
| `parafuso_3.5x16` | 3,5 mm | 16 mm | 7 mm | 3,5 mm | 1,2 mm | **7 × 7 × 19,5 mm** |

- Norma: DIN 7997 / EN 14592
- Material: aço zincado
- A bounding box em Z inclui corpo + cabeça (ex.: 3×30 → 30 mm corpo + 3 mm cabeça = 33 mm).

---

## 6. Sistema de coordenadas e orientação

Os modelos seguem a **convenção glTF 2.0 / Three.js**:

- **Eixo X** → direita (largura)
- **Eixo Y** → cima (altura)
- **Eixo Z** → para o observador (profundidade)
- Sistema **right-handed**, unidades em **metros**, escala **1:1**.

| Ferragem | Orientação dos eixos |
|---|---|
| `dobradica_porta` | Placa no plano XZ; copo orientado para **−Y**; braço em **+Y** |
| `corredica_gaveta_*` | Trilho ao longo de **X**; largura em **Z**; altura em **Y** |
| `cavilha_10mm` | Eixo longitudinal ao longo de **Y** |
| `parafuso_*` | Eixo longitudinal ao longo de **Z**; cabeça em **+Z** |

Todas as malhas incluem **normais por vértice** e **materiais PBR** (`pbrMetallicRoughness`) com fatores de metal/rugosidade adequados (aço zincado, madeira de faia).

---

## 7. Validação técnica dos novos modelos

Validação executada programaticamente sobre todos os 13 GLB:

| Verificação | Resultado |
|---|---|
| Magic number GLB (`0x46546C67`) | ✅ Todos OK |
| Versão glTF 2.0 | ✅ Todos OK |
| JSON da cena parseável | ✅ Todos OK |
| Nodes / Meshes / Materiais presentes | ✅ Todos OK |
| Accessors POSITION com `min`/`max` (bounding box) | ✅ Todos OK |
| Escala 1:1 (metros) | ✅ Confirmado pelas bounding boxes |
| `medidas.json` com bounding box real | ✅ Todos os 13 ficheiros |

**Resumo da validação por tipo:**
- **Corrediças (6):** 5 nodes/meshes/materiais cada (trilho fixo, trilho móvel, 3 rolamentos) — bounding boxes 250–500 mm em X, 12 mm em Y, 34,95 mm em Z.
- **Parafusos (5):** 2 nodes/meshes/materiais cada (corpo + cabeça) — bounding boxes coerentes com Ø e comprimento.
- **Cavilha (1):** 1 node/mesh/material — bounding box 10 × 35 × 10 mm.
- **Dobradiça (1):** 3 nodes/meshes/materiais (placa, copo, braço) — inalterada vs v1.

---

## 8. Estrutura de ficheiros (v2)

```
ferragens_3d/
├── RELATORIO_FERRAGENS_3D.md              ← relatório v1 (histórico)
├── RELATORIO_FERRAGENS_3D_ATUALIZADO.md   ← este documento (v2)
├── gerador/
│   └── gerar_ferragens.mjs                ← gerador v2 (Node.js, sem dependências)
│
├── dobradica_porta/            modelo.gltf + medidas.json
├── corredica_gaveta_250/       modelo.gltf + medidas.json
├── corredica_gaveta_300/       modelo.gltf + medidas.json
├── corredica_gaveta_350/       modelo.gltf + medidas.json
├── corredica_gaveta_400/       modelo.gltf + medidas.json
├── corredica_gaveta_450/       modelo.gltf + medidas.json
├── corredica_gaveta_500/       modelo.gltf + medidas.json
├── cavilha_10mm/               modelo.gltf + medidas.json
├── parafuso_3x30/              modelo.gltf + medidas.json
├── parafuso_4x35/              modelo.gltf + medidas.json
├── parafuso_4x50/              modelo.gltf + medidas.json
├── parafuso_5x50/              modelo.gltf + medidas.json
└── parafuso_3.5x16/            modelo.gltf + medidas.json
```

### 8.1. Conteúdo de cada `medidas.json` (v2)

```json
{
  "tipo": "…",
  "norma": "…",
  "dimensoes_mm": { "…": "…" },
  "material": "…",
  "sistema_coordenadas": "…",
  "escala": "1:1 (metros no ficheiro)",
  "bounding_box_mm": {
    "min": [x, y, z],
    "max": [x, y, z],
    "dimensoes": [dx, dy, dz]
  }
}
```

---

## 9. Observações industriais

1. **Série de corrediças** — Os 6 comprimentos (250–500 mm, passo 50 mm) cobrem a gama standard europeia para gavetas de mobiliário. A geometria base é idêntica, apenas o comprimento varia — consistência dimensional garantida pelo gerador parametrizado.
2. **Bounding box real** — Calculada da geometria efetiva (não nominal). Ex.: corrediça 500 mm → 500 × 12 × 34,95 mm (inclui trilho móvel deslocado); parafuso 3×30 → 6 × 6 × 33 mm (inclui cabeça).
3. **Parafuso 3.5×16** — Diâmetro fracionário (3,5 mm) comum em ferragens de fixação rápida; cabeça Ø7 mm conforme prática industrial.
4. **Rosca** — Os parafusos modelam o corpo cilíndrico com diâmetro nominal; a rosca helicoidal não é representada geometricamente (simplificação intencional para LOD baixo).
5. **Dobradiça** — Mantida bit a bit idêntica à v1 (placa + copo + braço); articulações internas não modeladas individualmente.
6. **Topologia** — Malhas não-manifold (separadas por componente). Adequadas para visualização; não para impressão 3D sem pós-processamento.
7. **Materiais PBR** — Fatores aproximados (aço zincado, madeira de faia). Texturas reais não incluídas (fora do âmbito).
8. **Normas citadas** — EN 15570, DIN 355, DIN 68840, EN 14257, DIN 7997, EN 14592. Dimensões representativas de produtos standard europeus; fabricantes podem variar ±tolerância.
9. **Regeneração** — O gerador v2 regrava toda a biblioteca. Para adicionar um comprimento de corrediça, basta adicionar o valor ao array `[250, 300, 350, 400, 450, 500]`.
10. **Isolamento** — Nenhum ficheiro fora de `/ferragens_3d/` foi alterado, criado ou eliminado.

---

## 10. Plano de integração futuro (apenas texto — NÃO executado)

> ⚠️ **Este plano é apenas documental. Nenhuma ação de integração foi executada nem deve ser executada sem autorização explícita e revisão pelo Master Plan (`docs/PIMO-CRIATIVO-MASTER-PLAN.md`).**

### 10.1. Fase 0 — Validação (pré-integração)
- Validar os GLB em viewer externo (Blender import, `gltf-validator`, Three.js `GLTFLoader`).
- Confirmar escala 1:1 vs sistema de unidades do ViewerCore (metros vs milímetros — converter na carga se necessário).
- Definir origem/pivot standard por peça (ex.: canto inferior esquerdo) para facilitar posicionamento.

### 10.2. Fase 1 — Mapa de catálogo
- Criar um índice JSON (`catalogo_ferragens.json`) mapeando `code` industrial → ficheiro GLB + `medidas.json`.
- Associar códigos existentes no sistema de materiais (se aplicável) às ferragens desta biblioteca.
- **Não substituir quaisquer ferragens existentes** — a biblioteca é complementar.

### 10.3. Fase 2 — Serviço de carga (opcional)
- Serviço `Ferragens3DService` isolado (fora do Core) que:
  - carrega GLB via `GLTFLoader`,
  - aplica escala/orientação por peça,
  - expõe `getFerragem(code): THREE.Group`.
- Manter fora dos fluxos principais; invocação apenas sob pedido explícito.

### 10.4. Fase 3 — Integração no Viewer (somente após aprovação)
- Adicionar camada de "ferragens" opcional no ViewerCore, escondida por default.
- Posicionamento por pontos de montagem definidos na geometria do móvel (furos de cavilha, copos de dobradiça, trilhos de gaveta).
- Performance: instancing (`InstancedMesh`) para parafusos/cavilhas repetidas.

### 10.5. Fase 4 — Evolução do catálogo
- Adicionar: puxadores, pernos excêntricos (minifix), batentes de amortecimento, suportes de prateleira, roldanas, niveladores.
- Estender a série de corrediças (300–800 mm, passo 50 mm) e parafusos (2.5×12, 6×70, etc.).
- Versões parametrizadas (comprimento, Ø, material).
- Baking de texturas PBR fotorrealistas.

### 10.6. Regras de governança
- Toda integração futura **deve**:
  1. ser revista contra `docs/PIMO-CRIATIVO-MASTER-PLAN.md` e `.cursor/rules/`,
  2. respeitar a regra de workflow (diff completo + aprovação prévia antes de gravar),
  3. manter a biblioteca isolada e regenerável pelo script,
  4. não quebrar fases 0–4 existentes (PI, industrial, roupeiro, distribuição).

---

## 11. Checklist de isolamento (v2)

| Verificação | Estado |
|---|---|
| Nenhum ficheiro fora de `/ferragens_3d/` foi modificado | ✅ |
| Nenhum ficheiro fora de `/ferragens_3d/` foi criado | ✅ |
| Nenhum ficheiro fora de `/ferragens_3d/` foi eliminado | ✅ |
| ViewerCore intocado | ✅ |
| Industrial intocado | ✅ |
| UI intocado | ✅ |
| Nenhuma rota nova criada | ✅ |
| Nenhuma ferragem existente fora da biblioteca substituída | ✅ |
| Dobradiça mantida exatamente como v1 | ✅ |
| Cavilhas Ø6 e Ø8 removidas | ✅ |
| Corrediças 250–500 mm criadas (6 modelos) | ✅ |
| Parafusos 4×35, 5×50, 3.5×16 criados | ✅ |
| Parafuso 5×60 removido | ✅ |
| `medidas.json` com bounding box real em todos os modelos | ✅ |
| Modelos GLB válidos (glTF 2.0, normais, PBR) | ✅ |
| Escala 1:1 (metros) | ✅ |
| Relatório atualizado gerado | ✅ |
| Plano de integração futuro documentado (sem executar) | ✅ |

---

*Fim do relatório v2. Biblioteca 100% isolada e segura.*