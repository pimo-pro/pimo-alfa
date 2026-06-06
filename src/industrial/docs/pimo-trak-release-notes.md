# PIMO-TRAK — Release Notes

**Versão:** 1.0.0  
**Nome da release:** Release Final  
**Data:** Junho 2026  
**Produto:** PIMO-TRAK (módulo industrial do pimo-criativo)

---

## Overview

A versão **1.0.0** marca a primeira release oficial do **PIMO-TRAK**, o módulo industrial integrado no pimo-criativo. Esta release entrega a fundação completa para rastreabilidade de produção — desde a conversão da cutlist do projecto até ao controlo de ordens de trabalho, eventos, qualidade e workflow automatizado.

O PIMO-TRAK foi construído em fases incrementais (estrutura, migração de domínio, integração UI e validação de release), consolidando conhecimento do ecossistema PIMO num pacote industrial autónomo, com regras claras de isolamento entre core, UI e motor de fabricação existente.

**O que esta release representa:**

- Entrega da **arquitectura industrial completa** pronta para activação operacional progressiva.
- Core funcional com persistência Supabase para entidades centrais de produção.
- Motor de workflow, permissões RBAC e camada de integração com a cutlist do pimo-criativo.
- Interface industrial com rotas, layout e painéis definidos.
- Documentação oficial, checklists de deployment e release notes.

**Público-alvo desta release:** equipa técnica, gestores de produção, administradores de sistema e operadores que iniciam a adopção do módulo industrial.

**Estado geral:** release estável para integração e deploy. Funcionalidades operacionais avançadas (UI com dados reais, estações de máquina activas) activam-se progressivamente via feature flags nas próximas iterações.

---

## Features Added

### Infraestrutura e persistência

- Cliente Supabase industrial com inicialização lazy e variáveis de ambiente documentadas.
- Constantes centralizadas de tabelas, eventos e canais de tempo real.
- Cache em memória com TTL para consultas frequentes.
- Migrations Supabase para tabelas industriais, workflow e políticas RLS por role.

### Core industrial

- **Work Orders** — criação, consulta, actualização e eliminação de ordens de trabalho, com integração ao workflow engine.
- **Tasks** — tarefas associadas a ordens de trabalho, com historial de estados.
- **Tracking** — snapshot de progresso por ordem (tarefas totais, concluídas, percentagem).
- **Events** — registo e consulta de eventos de auditoria com mais de vinte tipos industriais.
- **Notifications** — notificações in-app (canais email e SMS preparados).
- **Users e Departments** — gestão de perfis e departamentos com subscrição em tempo real.
- **Barcode** — interpretação de códigos com prefixos standard (peça, caixa, tarefa, comando).

### Domínio de peças e operações

- Modelo de **peça industrial** com dimensões, material, estado, código de barras e ligação ao projecto.
- Modelo de **operações por peça** com estados de fila, execução, pausa, conclusão e falha.
- Inferência automática de operações a partir da cutlist (CNC, drill, orlar, montagem, embalagem).
- Pipeline de conversão cutlist → peças → operações → payloads de tracking.

### Qualidade, rework e tempos

- **Quality** — inspeções estruturadas com pontos de verificação e decisões (aprovado, rework, rejeitado).
- **Rework** — pedidos de retrabalho com origem, operação de destino e ciclo de resolução.
- **Time Tracking** — registo de início, fim e duração por operador, estação e operação.

### Workflow e regras

- **Workflow Engine** — avaliação de regras por evento, transições automáticas e acções configuráveis.
- **Rules Engine** — regras em memória para criação, aprovação e conclusão de ordens de trabalho.
- Estados de work order: rascunho, pendente de aprovação, aprovada, em produção, pausada, revisão de qualidade, concluída, cancelada.
- Logs de execução de workflow persistidos em Supabase.

### Permissões e segurança

- RBAC com roles: admin, manager, operador, worker, guest.
- Guards de acesso a tarefas, departamentos e rotas.
- Auditoria de alterações de permissão (role, contexto, IP, user agent).
- Políticas RLS no Supabase alinhadas com roles industriais.

### Métricas e dashboard

- Módulos de metrics, dashboard e analytics com agregações derivadas de ordens e tarefas.
- Base para KPIs de produção e produtividade.

### Interface industrial

- Rotas completas em `/industrial` para work orders, tracking, eventos, qualidade, rework, time tracking e estações operacionais.
- Layout industrial reutilizável (IndustrialLayout) e painéis informativos.
- Admin Settings em `/admin/settings/industrial` com configuração, feature flags, permissões, regras e schema de UI.

### Integração e adaptadores

- Adaptadores UI/core para work orders, tracking, eventos, qualidade, rework, time tracking e operações.
- Payload de sincronização industrial para integração entre sistemas.
- Export barrel do pacote industrial.

### Deployment e documentação

- Checklists de deployment e pós-deploy.
- Relatórios de release e validação de build.
- Documentação oficial: visão geral da funcionalidade industrial e release notes.
- Pipeline de publicação via GitHub Actions com build e deploy FTP para produção.

---

## Improvements

### Arquitectura e organização

- Estrutura modular em camadas (core, operations, integration, infra, ui) com boundary rules documentadas.
- Separação clara entre lógica de domínio e interface — o core não depende de UI.
- Integração unidireccional com o motor de fabricação existente (sem acoplamento inverso de `src/core/` para `industrial/`).

### Qualidade de engenharia

- Build de produção aprovado sem erros de TypeScript no escopo industrial.
- Lint focado em `src/industrial` e `src/app` aprovado na release.
- Cliente Supabase lazy — erro apenas no primeiro uso se variáveis ausentes, evitando falhas prematuras em desenvolvimento.
- Contratos estáveis exportados para tabelas, eventos e tipos industriais.

### Experiência de configuração

- Feature flags para activação progressiva de funcionalidades operacionais.
- Runtime flags para controlar ambiente (mock data, dry-run de workflow, bloqueio de acções destrutivas).
- Schema de UI para formulários administrativos (Geral, Workflow, Qualidade).

### Rastreabilidade

- Eventos imutáveis em cada transição relevante de ordens, tarefas e workflow.
- Canais Supabase Realtime para actualização automática de tracking, ordens, tarefas e notificações.
- Historial de estados de tarefas persistido.

### Integração com o pimo-criativo

- Conversão directa da cutlist do projecto para o domínio industrial, sem reimportar regras CNC legadas.
- Ligação de peças a projectId, workOrderId, boxId e sourceItemId para rastreio completo.

---

## Breaking Changes

Esta é a **primeira release oficial** do PIMO-TRAK. Não existem breaking changes face a versões anteriores do módulo industrial, por ser a estreia do pacote integrado no pimo-criativo.

**Notas relevantes para integradores:**

| Alteração | Impacto |
|-----------|---------|
| Novo módulo `src/industrial/` | Código industrial anterior em outros locais deve migrar para esta estrutura. Não existe compatibilidade com layouts pré-Fase 3A. |
| Variáveis Supabase obrigatórias em produção | Deploy sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` impede funcionalidades industriais. |
| Roles industriais novos | Perfis existentes devem ser mapeados para roles RBAC (admin, manager, operador, worker, guest). |
| Estados de work order normalizados | Estados como `draft`, `pending_approval`, `in_progress` substituem valores legados de sistemas anteriores (ex.: `novo`). |
| Feature flags desligadas por defeito | UI operacional completa, quality gate, rework flow e realtime tracking requerem activação explícita no Admin Settings. |

**Sem impacto no pimo-criativo principal:** o módulo industrial é aditivo. O fluxo de design, cutlist e viewer 3D existente permanece inalterado. Nenhuma API pública do pimo-criativo foi removida ou alterada nesta release.

---

## Known Issues

### Interface e operação

- **Páginas industriais em modo placeholder.** As rotas em `/industrial` apresentam layout e estrutura definidos, mas a maioria dos painéis ainda não consome dados reais da API. A ligação operacional completa está planeada para a Fase 3C.2.
- **Feature flags desactivadas.** `operationsUi`, `realtimeTracking`, `qualityGate`, `reworkFlow` e `adminRulesEditor` estão desligadas por defeito.
- **Estações de operação (CNC, nesting, drill, etc.)** — módulos em `industrial/operations/` são placeholders; integração com motores existentes pendente.

### Persistência

- **Peças, operações, qualidade, rework e time tracking** existem como domínio modelado (funções puras) mas ainda **não persistem em Supabase**. Work orders, tasks, eventos e notificações já persistem.
- **Regras de workflow** residem em memória (`core/rules/`), não na base de dados relacional de workflow rules das migrations.
- **Divergência de schema legado:** migrations incluem tabelas de workflow e qualidade que o core TypeScript ainda não consome integralmente.

### Ambiente e deploy

- **Credenciais Supabase reais** devem ser configuradas manualmente no ambiente de produção; valores placeholder em `.env.production` não são funcionais.
- **Lint global do projecto** (`npm run lint`) continua a falhar por issues legadas fora do escopo industrial (viewer 3D, admin antigo, nesting-v3, v4). O lint do escopo industrial/app está aprovado.
- **Notificações email e SMS** são stubs — apenas notificações in-app estão implementadas.
- **Etiquetas industriais (ZPL)** — módulo `labels/` é placeholder.
- **Sync externo** (ERP, armazém) — integrações `link-project`, `link-piece`, `projects` e `external-sync` são placeholders.

### Workflow

- **Nesting** existe no modelo de operações mas não é inferido automaticamente da cutlist.
- **Primeira execução do deploy v1.0.0** pode falhar por timeout FTP transitório; re-run do workflow resolve o problema.

---

## Future Roadmap

### Curto prazo (1.x)

| Prioridade | Item |
|------------|------|
| Alta | Activar UI operacional com dados reais (substituir placeholders) |
| Alta | Persistir peças e operações em Supabase |
| Alta | Activar feature flags progressivamente (`operationsUi`, `realtimeTracking`) |
| Média | Ligar motores CNC, drill e cutlayout/nesting às estações |
| Média | Implementar quality gate e rework flow na interface |
| Média | Preencher credenciais Supabase e validar RLS em produção |

### Médio prazo (1.x – 2.0)

| Prioridade | Item |
|------------|------|
| Alta | Editor visual de regras de workflow (`adminRulesEditor`) |
| Média | Persistência de qualidade, rework e time tracking |
| Média | Impressão de etiquetas industriais (ZPL) |
| Média | Notificações email e SMS operacionais |
| Média | Dashboard avançado com KPIs em tempo real |
| Baixa | Sync externo com ERP ou sistemas de armazém |

### Longo prazo (2.0+)

| Prioridade | Item |
|------------|------|
| Alta | Operações de fábrica totalmente integradas com máquinas (CNC, nesting, drill) |
| Média | App móvel ou PWA para operadores de chão de fábrica |
| Média | Relatórios de produtividade e análise preditiva |
| Baixa | Multi-fábrica e multi-departamento com isolamento de dados |
| Baixa | API pública documentada para integradores externos |

### Fases de migração (referência)

| Fase | Estado | Conteúdo |
|------|--------|----------|
| 3A — Build Structure | Concluída | Estrutura, boundaries, placeholders |
| 3B — Migration | Concluída | Core Supabase, workflow, RBAC |
| 3C — UI & Operations | Em curso | Páginas, adaptadores, activação operacional |
| 4 — Deployment & Release | Concluída (1.0.0) | Build, validação, deploy, documentação |
| 3C.2+ — Operational | Planificada | Dados reais, feature flags, persistência de peças |

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [Índice de documentação](./index.md) | Índice oficial PIMO-TRAK |
| `industrial-feature-overview.md` | Visão geral completa da funcionalidade industrial |
| `../deployment/release-final.md` | Relatório de release final |
| `../deployment/release-report.md` | Relatório de validação RC1 |
| `../deployment/checklist.md` | Checklist de deployment |
| `../README.md` | Regras de boundary e estrutura do módulo |

---

## Agradecimentos

Esta release resulta da consolidação do ecossistema PIMO — design, fabricação e rastreabilidade — num único módulo industrial coerente. Agradecimento à equipa pelo trabalho nas fases de estrutura, migração, integração e validação de release.

---

*PIMO-TRAK 1.0.0 · Release Notes oficiais · Junho 2026*
