# Pimo v4 — Development Rules

> Este documento é a fonte de verdade para todas as decisões de desenvolvimento em `src/v4/`.
> Qualquer desvio requer aprovação do Lead Dev.

---

## R-01 · Icons — SVG obrigatório

**Regra:** Todos os ícones usados em v4 devem ser componentes SVG React inline.

**Proibido:**
- Emojis como ícones (`🪑`, `📐`, `⚙️`...)
- Fontes de ícones (Font Awesome, Material Icons, etc.)
- Imagens raster (PNG/JPG) como ícones
- Strings de texto como substitutos de ícones

**Como usar:**
```tsx
// ✅ Correto
import { V4Icon } from "@/v4/icons/Icon";
<V4Icon name="furniture" size={16} />

// ❌ Errado
<span>🪑</span>
<img src="/icon.png" />
```

**Fonte de ícones:**
- Primeiro verificar se existe em `src/v4/icons/registry.ts`
- Se não existir, criar em `src/v4/icons/groups/` como componente SVG
- Ícones do projeto original podem ser importados em `src/v4/icons/registry.ts`

---

## R-02 · Sem modificar ficheiros fora de `src/v4/`

**Regra:** Código v4 não modifica ficheiros do projeto original.
A única exceção é o sistema de ícones em `src/components/icons/` (leitura/importação permitida).

**Como reutilizar código do projeto original:**
```ts
// ✅ Importar e re-exportar
import { IconFurniture } from "../../components/icons/groups/leftToolbar";

// ❌ Modificar o ficheiro original
```

---

## R-03 · Cada camada tem o seu contrato

**Regra:** Toda a camada expõe um `contract/` com interfaces TypeScript.
Outras camadas comunicam apenas através desses contratos — nunca através de imports diretos de implementação.

```
src/v4/
  viewer-engine/
    contract/
      IViewerEngine.ts   ← único ponto de contacto com o exterior
    core/                ← implementação interna (privada)
```

---

## R-04 · Estado imutável via ações

**Regra:** Nunca mutar estado diretamente. Todas as alterações passam por actions tipadas.

```ts
// ✅ Correto
actions.addModule(params)

// ❌ Errado
state.modules.push(...)
```

---

## R-05 · Medidas em milímetros no domínio, metros no Three.js

**Regra:** Toda a lógica de domínio usa mm. A conversão para metros acontece apenas na camada do viewer.

```ts
// Domínio
const largura_mm = 600;

// Viewer (conversão explícita)
const largura_m = largura_mm / 1000;
```

---

## R-06 · Língua

- **Código:** inglês (variáveis, funções, tipos)
- **Domínio:** português onde o termo técnico é português (`caixa`, `gaveta`, `porta`, `prateleira`)
- **UI:** português (textos visíveis ao utilizador)
- **Comentários:** português ou inglês, consistente por ficheiro

---

## R-07 · CSS — Design tokens obrigatórios

**Regra:** Nenhum valor de cor, espaçamento ou radius hardcoded. Usar sempre variáveis CSS de `v4.css`.

```css
/* ✅ Correto */
color: var(--v4-text);
border: 1px solid var(--v4-border);

/* ❌ Errado */
color: #e6edf3;
border: 1px solid #30363d;
```

---

## R-08 · Estrutura de pastas v4

```
src/v4/
  RULES.md                  ← este ficheiro
  icons/                    ← sistema de ícones SVG (R-01)
  viewer-engine/            ← Layer 1: motor 3D
  geometry/                 ← Layer 2: geometria e medidas
  box-engine/               ← Layer 3: motor de caixas
  manufacturing/            ← Layer 4: sistema de fabrico
  tracking/                 ← Layer 5: sistema de rastreio
  shell/                    ← UI shell (layout, tema, componentes base)
```

---

## Histórico de decisões

| Data       | Regra | Decisão |
|------------|-------|---------|
| 2026-05-30 | R-01  | Icons SVG — emojis causam inconsistência visual entre sistemas operativos |
| 2026-05-30 | R-02  | Isolamento total v4 — permitir desenvolvimento paralelo sem conflitos |
| 2026-05-30 | R-07  | Design tokens CSS — v4 usa `--v4-*` para não conflituar com tema original |
