# Domínio de Materiais — Fonte única de verdade

## Fonte oficial

- **`materials.api.ts`** — Lista oficial de materiais (madeira): `OFFICIAL_WOOD_MATERIALS_SEED`, `listOfficialMaterials()`, `getDefaultOfficialMaterial()`, `resolveMaterial()`. Use este módulo para obter materiais industriais e padrões.

## Adaptadores / consumidores

- **`service.ts`** — CRUD de materiais em localStorage (estado da aplicação). Resolve material por id/label usando `materials.api`.
- **`materialsApi.ts`** (em `src/server/`) — Adaptador HTTP: monta o payload da API `/api/materials` a partir de `listOfficialMaterials()`.

## Regra

Para “lista oficial” e defaults industriais, importe de `./materials.api` ou de `./index` (que re-exporta). Para CRUD e estado da UI, use `./service` e os hooks em `./hooks`.
