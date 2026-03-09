# Preparação para TypeScript Strict Mode

O projeto está atualmente com `strict: false` em `tsconfig.app.json`. Este documento descreve o que foi feito para preparar uma futura migração para `strict: true`.

## Ajustes já realizados

- **Novos módulos** (viewer/, context/hooks/, tests/): tipagem explícita, sem `any`.
- **SnapshotRenderer / viewerApiAdapter**: uso de tipos de `projectTypes` (ViewerSnapshot, Viewer2DAngle).
- **Hooks de contexto**: parâmetros e retornos tipados; uso de `ProjectState`, `ProjectPersistenceApi`, etc.

## Próximos passos (quando ativar strict)

1. Ativar em etapas: por exemplo `strictNullChecks: true` primeiro, depois `noImplicitAny`, etc.
2. Corrigir erros de null/undefined nos módulos mais críticos (projectState, ProjectProvider, Viewer).
3. Substituir tipos implícitos por tipos explícitos onde o compilador inferir `any`.
4. Revisar `as` type assertions e preferir guards ou tipos mais precisos.

## Referência

- [TypeScript strict mode](https://www.typescriptlang.org/tsconfig#strict)
- `tsconfig.app.json`: `"strict": false` — alterar para `true` quando a base estiver pronta.
