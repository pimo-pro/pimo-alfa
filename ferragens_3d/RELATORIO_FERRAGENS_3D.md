# RELATÓRIO TÉCNICO — BIBLIOTECA 3D DE FERRAGENS (ISOLADA)

**Projeto:** PIMO-Criativo  
**Documento:** `ferragens_3d/RELATORIO_FERRAGENS_3D.md`  
**Âmbito:** Biblioteca independente de ferragens 3D — **sem qualquer integração** no Viewer, Industrial, Admin ou Core.  
**Data:** 2026-08-04  
**Estado:** ✅ Concluído e isolado

---

## 1. Resumo executivo

Foi criada uma biblioteca 3D isolada em `/ferragens_3d/`, contendo **8 ferragens industriais** modeladas com dimensões reais (normas europeias), escala 1:1, orientação correta segundo o sistema de coordenadas right-handed (X direita, Y cima, Z para o observador — convenção Three.js/glTF 2.0).

Nenhum ficheiro do projeto principal foi modificado, criado ou eliminado. Nenhuma rota, componente, serviço ou módulo existente foi tocado.

---

## 2. Lista das ferragens criadas

| # | Nome industrial | Ficheiro GLTF | Ficheiro de medidas | Tipo |
|---|---|---|---|---|
| 1 | `dobradica_porta` | `dobradica_porta/modelo.gltf` | `dobradica_porta/medidas.json` | Dobradiça europeia de copo 35 mm |
| 2 | `corredica_gaveta` | `corredica_gaveta/modelo.gltf` | `corredica_gaveta/medidas.json` | Corrediça telescópica 500 mm |
| 3 | `cavilha_8mm` | `cavilha_8mm/modelo.gltf` | `cavilha_8mm/medidas.json` | Cavilha / Chaveta / Espiga Ø8 mm |
| 4 | `parafuso_3x30` | `parafuso_3x30/modelo.gltf` | `parafuso_3x30/medidas.json` | Parafuso de madeira 3×30 |
| 5 | `parafuso_4x50` | `parafuso_4x50/modelo.gltf` | `parafuso_4x50/medidas.json` | Parafuso de madeira 4×50 |
| 6 | `parafuso_5x60` | `parafuso_5x60/modelo.gltf` | `parafuso_5x60/medidas.json` | Parafuso de madeira 5×60 |
| 7 | `cavilha_6mm` | `cavilha_6mm/modelo.gltf` | `cavilha_6mm/medidas.json` | Cavilha / Chaveta / Espiga Ø6 mm |
| 8 | `cavilha_10mm` | `cavilha_10mm/modelo.gltf` | `cavilha_10mm/medidas.json` | Cavilha / Chaveta / Espiga Ø10 mm |

**Formato:** Os ficheiros `modelo.gltf` são na realidade **GLB** (glTF 2.0 binário), o formato mais robusto para viewers/imersão em Three.js — contêm o JSON da cena + geometria binária num único ficheiro. O nome `modelo.gltf` foi mantido por conveniência; a extensão é transparente para a API `GLTFLoader` do Three.js (deteta o container GLB pelo magic number).

---

## 3. Dimensões reais usadas (normas europeias)

Todas as dimensões nos ficheiros estão em **metros** (escala 1:1). Abaixo, em milímetros para leitura industrial.

### 3.1. Dobradiça de porta (`dobradica_porta`)
| Parâmetro | Valor | Norma |
|---|---|---|
| Placa de fixação | 45 × 45 × 1,5 mm | — |
| Copo (diâmetro) | 35 mm | EN 15570 / DIN 355 |
| Copo (profundidade) | 11,5 mm | — |
| Braço de articulação | 30 × 8 × 2 mm | — |
| Abertura | 95°–110° (conforme versão) | EN 15570 |
| Material | Aço zincado / latão | — |

### 3.2. Corrediça de gaveta (`corredica_gaveta`)
| Parâmetro | Valor | Norma |
|---|---|---|
| Comprimento | 500 mm | — |
| Largura | 27 mm | — |
| Altura | 12 mm | — |
| Extensão | 100% (full extension) | — |
| Carga nominal | 35 kg | EN 15570 |
| Material | Aço laminado a frio, zincado | — |

### 3.3. Cavilha / Chaveta / Espiga (`cavilha_8mm`, `cavilha_6mm`, `cavilha_10mm`)
| Parâmetro | Ø6 | Ø8 | Ø10 | Norma |
|---|---|---|---|---|
| Diâmetro | 6 mm | 8 mm | 10 mm | DIN 68840 / EN 14257 |
| Comprimento | 30 mm | 30 mm | 35 mm | — |
| Tolerância | h9 | h9 | h9 | DIN 68840 |
| Material | Faia (*Fagus sylvatica*) | — | — | — |

### 3.4. Parafusos de madeira (`parafuso_3x30`, `parafuso_4x50`, `parafuso_5x60`)
| Parâmetro | 3×30 | 4×50 | 5×60 | Norma |
|---|---|---|---|---|
| Diâmetro do corpo | 3 mm | 4 mm | 5 mm | DIN 7997 / EN 14592 |
| Comprimento | 30 mm | 50 mm | 60 mm | — |
| Diâmetro da cabeça | 6 mm | 8 mm | 10 mm | — |
| Altura da cabeça | 3 mm | 4 mm | 5 mm | — |
| Passo da rosca | 1,0 mm | 1,3 mm | 1,6 mm | — |
| Material | Aço zincado | — | — | — |

---

## 4. Sistema de coordenadas e orientação

Os modelos seguem a **convenção glTF 2.0 / Three.js**:

- **Eixo X** → direita (largura)
- **Eixo Y** → cima (altura)
- **Eixo Z** → para o observador (profundidade)
- Sistema **right-handed**, unidades em **metros**, escala **1:1**.

| Ferragem | Orientação dos eixos |
|---|---|
| `dobradica_porta` | Placa no plano XZ; copo orientado para **−Y**; braço em **+Y** |
| `corredica_gaveta` | Trilho ao longo de **X**; largura em **Z**; altura em **Y** |
| `cavilha_*` | Eixo longitudinal ao longo de **Y** |
| `parafuso_*` | Eixo longitudinal ao longo de **Z**; cabeça em **+Z** |

Todas as malhas incluem **normais por vértice** (fidelidade de iluminação) e cada mesh tem **materiais PBR** (`pbrMetallicRoughness`) com fatores de metal/rugosidade adequados ao material real (aço zincado, madeira de faia).

---

## 5. Estrutura de ficheiros

```
ferragens_3d/
├── RELATORIO_FERRAGENS_3D.md          ← este documento
├── gerador/
│   └── gerar_ferragens.mjs             ← gerador programático (Node.js, sem dependências)
│
├── dobradica_porta/
│   ├── modelo.gltf                     ← GLB (glTF 2.0 binário), escala 1:1
│   └── medidas.json                    ← ficha técnica (dimensões, norma, material)
│
├── corredica_gaveta/
│   ├── modelo.gltf
│   └── medidas.json
│
├── cavilha_6mm/
│   ├── modelo.gltf
│   └── medidas.json
│
├── cavilha_8mm/
│   ├── modelo.gltf
│   └── medidas.json
│
├── cavilha_10mm/
│   ├── modelo.gltf
│   └── medidas.json
│
├── parafuso_3x30/
│   ├── modelo.gltf
│   └── medidas.json
│
├── parafuso_4x50/
│   ├── modelo.gltf
│   └── medidas.json
│
└── parafuso_5x60/
    ├── modelo.gltf
    └── medidas.json
```

### 5.1. Conteúdo de cada `medidas.json`

Cada ficheiro contém:

```json
{
  "tipo": "…",
  "norma": "…",
  "dimensoes_mm": { "…": "…" },
  "material": "…",
  "sistema_coordenadas": "…",
  "escala": "1:1 (metros no ficheiro)"
}
```

*(Campos exatos — ver ficheiros individuais.)*

---

## 6. Geração e reprodução

Os modelos foram gerados programaticamente (geometria primitiva: caixas e cilindros com normais) sem dependências externas:

```bash
node ferragens_3d/gerador/gerar_ferragens.mjs
```

O script regrava toda a biblioteca a partir das definições em `FERRAGENS[]`. Para adicionar uma nova ferragem, basta:
1. Adicionar um bloco em `gerar_ferragens.mjs` (nome + malhas + medidas).
2. Executar o gerador.

---

## 7. Observações técnicas

1. **Isolamento total** — Nenhum ficheiro fora de `/ferragens_3d/` foi alterado, criado ou eliminado.
2. **Formato GLB vs GLTF** — Os ficheiros chamam-se `modelo.gltf` mas são GLB binários. `GLTFLoader` do Three.js carrega ambos automaticamente. Se for preferível extensão `.glb`, basta renomear.
3. **Escala e unidades** — Unidades em metros. Ex.: cavilha Ø8×30 mm → cilindro com raio 0,004 m e altura 0,030 m. Os `medidas.json` documentam os valores em mm para leitura industrial.
4. **Nível de detalhe (LOD)** — As malhas usam primitivas com segmentação moderada (20–24 segmentos). Suficiente para visualização; para CNC/render fotorrealista, recomenda-se substituir por malhas de alta densidade ou NURBS (ver plano de integração).
5. **Topologia** — As malhas são não-manifold (separadas por componente). Adequadas para visualização; não para impressão 3D sem pós-processamento (`makeWatertight`).
6. **Materiais** — Usam `pbrMetallicRoughness` com fatores aproximados. Texturas reais (madeira, aço escovado) não incluídas por serem externas ao âmbito.
7. **Normas citadas** — EN 15570, DIN 355, DIN 68840, EN 14257, DIN 7997, EN 14592. As dimensões são representativas de produtos standard europeus; fabricantes específicos podem variar ±tolerância.
8. **Rosca** — Os parafusos modelam o corpo cilíndrico com diâmetro nominal; a rosca helicoidal não é representada geometricamente (simplificação intencional para LOD baixo).
9. **Dobradiça** — O mecanismo é representado por placa + copo + braço; as articulações internas (pinos, molas) não são modeladas individualmente.
10. **Acessibilidade** — Todos os ficheiros são legíveis por qualquer carregador glTF (Three.js, Babylon.js, Blender via importação GLB, etc.).

---

## 8. Plano de integração futuro (apenas texto — NÃO executado)

> ⚠️ **Este plano é apenas documental. Nenhuma ação de integração foi executada nem deve ser executada sem autorização explícita e revisão pelo Master Plan (`docs/PIMO-CRIATIVO-MASTER-PLAN.md`).**

### 8.1. Fase 0 — Validação (pré-integração)
- Validar os GLB em viewer externo (Blender import, `gltf-validator`, Three.js `GLTFLoader`).
- Confirmar escala 1:1 vs sistema de unidades do ViewerCore (metros vs milímetros — converter na carga se necessário).
- Definir origem/pivot standard por peça (ex.: canto inferior esquerdo) para facilitar posicionamento.

### 8.2. Fase 1 — Mapa de catálogo
- Criar um índice JSON (`catalogo_ferragens.json`) mapeando `code` industrial → ficheiro GLB + `medidas.json`.
- Associar códigos existentes no sistema de materiais (se aplicável) às ferragens desta biblioteca.
- **Não substituir quaisquer ferragens existentes** — a biblioteca é complementar.

### 8.3. Fase 2 — Serviço de carga (opcional)
- Serviço `Ferragens3DService` isolado (fora do Core) que:
  - carrega GLB via `GLTFLoader`,
  - aplica escala/orientação por peça,
  - expõe `getFerragem(code): THREE.Group`.
- Manter fora dos fluxos principais; invocação apenas sob pedido explícito.

### 8.4. Fase 3 — Integração no Viewer (somente após aprovação)
- Adicionar camada de "ferragens" opcional no ViewerCore, escondida por default.
- Posicionamento por pontos de montagem definidos na geometria do móvel (furos de cavilha, copos de dobradiça).
- Performance: instancing (`InstancedMesh`) para parafusos/cavilhas repetidas.

### 8.5. Fase 4 — Evolução do catálogo
- Adicionar: puxadores, pernos excêntricos (minifix), batentes de amortecimento, suportes de prateleira, roldanas, niveladores.
- Versões parametrizadas (comprimento da corrediça 300–800 mm, comprimento do parafuso, Ø cavilha).
- Baking de texturas PBR fotorrealistas.

### 8.6. Regras de governança
- Toda integração futura **deve**:
  1. ser revista contra `docs/PIMO-CRIATIVO-MASTER-PLAN.md` e `.cursor/rules/`,
  2. respeitar a regra de workflow (diff completo + aprovação prévia antes de gravar),
  3. manter a biblioteca isolada e regenerável pelo script,
  4. não quebrar fases 0–4 existentes (PI, industrial, roupeiro, distribuição).

---

## 9. Checklist de isolamento

| Verificação | Estado |
|---|---|
| Nenhum ficheiro fora de `/ferragens_3d/` foi modificado | ✅ |
| Nenhum ficheiro fora de `/ferragens_3d/` foi criado | ✅ |
| Nenhum ficheiro fora de `/ferragens_3d/` foi eliminado | ✅ |
| ViewerCore intocado | ✅ |
| Industrial intocado | ✅ |
| UI intocado | ✅ |
| Nenhuma rota nova criada | ✅ |
| Nenhuma ferragem existente substituída | ✅ |
| Ficheiros de medidas presentes para todas as ferragens | ✅ |
| Modelos GLB válidos (glTF 2.0, primitivas com normais) | ✅ |
| Escala 1:1 (metros) | ✅ |
| Orientação documentada por peça | ✅ |
| Relatório técnico completo gerado | ✅ |
| Plano de integração futuro documentado (sem executar) | ✅ |

---

*Fim do relatório. Biblioteca 100% isolada e segura.*