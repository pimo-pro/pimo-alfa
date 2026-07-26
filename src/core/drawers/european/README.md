# Sistema Europeu de Gavetas — Modelo B

Estrutura base (esqueleto) para o novo sistema europeu de gavetas.

> **Estado:** apenas organização e stubs. **Sem** regras, furos, medidas ou UI implementadas.
> Aguarda especificações completas dos 4 modelos na próxima fase.

## Modelos previstos

| Pasta | Marca / Sistema |
|---|---|
| `models/blum-legrabox/` | Blum Legrabox |
| `models/blum-tandembox-antaro/` | Blum TandemBox Antaro |
| `models/hettich-innotech-atira/` | Hettich InnoTech Atira |
| `models/grass-nova-pro-scala/` | Grass Nova Pro Scala |

## Organização interna

```
european/
  README.md          ? este ficheiro
  index.ts           ? barrel (exports futuros)
  types.ts           ? tipos base partilhados
  catalog.ts         ? catálogo unificado (stub)
  models/            ? um módulo por marca/sistema
  geometry/          ? geometria / layout (futuro)
  drilling/          ? furação específica (futuro)
  measures/          ? tabelas de medidas (futuro)
  ui/                ? componentes Admin/UI (futuro)
```

## Relação com Modelo A

- **Modelo A** = sistema atual em `src/core/drawers/**` (pode ser desativado via `drawerSystemFlags`).
- **Modelo B** = este diretório. Não interfere com o Modelo A até ser ligado explicitamente.
- Industrial (`src/industrial/**`) permanece intocado nesta fase.

## Próximos passos

1. Receber specs oficiais dos 4 modelos.
2. Preencher `measures/`, `catalog.ts` e `types.ts`.
3. Implementar geometria e drilling por modelo.
4. Ligar UI Admin e pipeline de produção com feature flag própria.
