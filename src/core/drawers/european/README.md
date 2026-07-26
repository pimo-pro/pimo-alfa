# Sistema Europeu de Gavetas — Modelo B

Implementacao completa (fase specs oficiais).

## Modelos

| ID | Sistema | Folga lateral | Alturas |
|---|---|---|---|
| `blum-legrabox` | Blum Legrabox | 2×13 mm | N66 M90 K128 F185 H241 |
| `blum-tandembox-antaro` | Blum TandemBox Antaro | 2×15 mm | D68 M83 K115 C167 F199 |
| `hettich-innotech-atira` | Hettich InnoTech Atira | 2×12 mm | 70 144 176 208 |
| `grass-nova-pro-scala` | Grass Nova Pro Scala | 2×14 mm | 63 90 186 250 |

## API

```ts
import { generateEuropeanDrawer } from "@/core/drawers/european";

const result = generateEuropeanDrawer("blum-legrabox", box, { heightMm: 90, depthMm: 500 });
```

Activo apenas com **Modelo A desactivado** (Admin ? Produtos ? Gavetas).

## Modulos

- `types.ts` / `catalog.ts` — contratos e SSOT
- `measures/` / `geometry/` — calculos puros
- `drilling/` / `assembly/` — furos e montagem
- `cutlist/` / `pdf/` / `viewer/` / `adapter/` — saidas
- `ui/` — painel de configuracao

Industrial (`src/industrial/**`) permanece intocado.
