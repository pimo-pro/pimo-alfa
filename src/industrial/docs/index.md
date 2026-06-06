# PIMO-TRAK — Documentação Oficial

Índice central da documentação do módulo industrial **PIMO-TRAK** (release 1.0.0).

---

## Documentação principal

### PIMO-TRAK — Release Notes 1.0.0

Notas oficiais da release final: funcionalidades adicionadas, melhorias, breaking changes, issues conhecidos e roadmap.

→ [Abrir Release Notes](./pimo-trak-release-notes.md)

**Acesso via browser (produção):** `/industrial/docs/index.html?view=release-notes`

**Rota React planificada:** `/industrial/docs/release-notes`

---

### Visão Geral da Funcionalidade Industrial

Documentação completa do sistema industrial: arquitectura, ciclo de vida das peças, operações, tracking, qualidade, admin settings e fluxo end-to-end.

→ [Abrir Visão Geral](./industrial-feature-overview.md)

**Acesso via browser (produção):** `/industrial/docs/index.html?view=overview`

---

## Deployment e release

| Documento | Descrição |
|-----------|-----------|
| [Release Final](../deployment/release-final.md) | Relatório de release 1.0.0 |
| [Release Report](../deployment/release-report.md) | Validação RC1 e verificações |
| [Checklist de deployment](../deployment/checklist.md) | Pré-requisitos de build e deploy |
| [Checklist pós-deploy](../deployment/post-deploy-checklist.md) | Validação em produção |

---

## Navegação industrial (UI)

O menu oficial de documentação industrial está definido em [navigation.manifest.json](./navigation.manifest.json).

| Entrada de menu | Destino |
|-----------------|---------|
| **Release Notes (PIMO-TRAK)** | `/industrial/docs/index.html?view=release-notes` |
| **Documentação PIMO-TRAK** | `/industrial/docs/index.html` |
| **Visão Geral Industrial** | `/industrial/docs/index.html?view=overview` |

Quando a rota React `/industrial/docs/release-notes` for activada (Fase 3C.2), o componente `IndustrialReleaseNotesPage` passará a renderizar o markdown directamente na aplicação.

---

## Estrutura desta pasta

```
src/industrial/docs/
├── index.md                          ← Este índice
├── pimo-trak-release-notes.md        ← Release Notes 1.0.0
├── industrial-feature-overview.md    ← Visão geral completa
└── navigation.manifest.json          ← Registo de navegação UI
```

**Espelho público (deploy):** os ficheiros markdown são publicados em `public/industrial/docs/` para acesso HTTP directo após build.

---

## Referências externas

| Documento | Localização |
|-----------|-------------|
| README do módulo | `src/industrial/README.md` |
| Mensagem equipe deploy | `docs/mensagem-equipe-deploy.md` |

---

*PIMO-TRAK · Documentação oficial · Junho 2026*
