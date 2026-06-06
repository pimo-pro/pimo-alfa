# PIMO-TRAK — Pacote Industrial

Estrutura inicial criada na **Fase 3A — Build Structure**.

## Escopo

Este diretório receberá os módulos migrados de `work-whatsapp` (read-only) e as integrações com o motor de fabricação existente em `src/core/`.

## Regras de boundary

- `industrial/integration/` pode importar de `industrial/core/` e `src/core/`
- `industrial/core/` não importa de `src/pages/` nem de UI
- `industrial/operations/` pode importar de `src/core/cnc`, `src/core/cutlayout`, `src/core/drill`
- `src/core/` não importa de `industrial/`

## Estrutura

| Pasta | Responsabilidade |
|-------|------------------|
| `core/` | Domínio fabril (work orders, peças, tracking, eventos, qualidade) |
| `operations/` | Estações de produção (nesting, cnc, drill, orlar, montagem, embalagem, limpeza) |
| `integration/` | Ponte com projetos/peças do pimo-criativo e sync externo |
| `labels/` | Etiquetas industriais (ZPL, templates, impressão) |
| `infra/` | Supabase, constantes de tabelas, event types |
| `ui/` | Páginas e componentes React do módulo industrial |

## Documentação oficial

- [Índice de documentação](./docs/index.md)
- [Release Notes 1.0.0](./docs/pimo-trak-release-notes.md)
- [Visão geral da funcionalidade](./docs/industrial-feature-overview.md)

Acesso via browser (após deploy): `/industrial/docs/index.html`

## Estado actual

- Fase 3A: apenas placeholders (`index.ts` vazios)
- Fase 3B: migração de módulos do work-whatsapp
- Fase 3C+: implementação de lógica e páginas
