# PIMO-TRAK — Visão Geral da Funcionalidade Industrial

**Documentação oficial · Versão 1.0.0**  
**Última atualização:** Junho 2026  
**Público-alvo:** Utilizadores finais, operadores de fábrica, gestores de produção e equipa técnica

---

## Índice

1. [Introdução geral](#1-introdução-geral)
2. [Arquitetura geral](#2-arquitetura-geral)
3. [Ciclo de vida de uma peça](#3-ciclo-de-vida-de-uma-peça)
4. [Máquinas e operações](#4-máquinas-e-operações)
5. [Tracking](#5-tracking)
6. [Qualidade e Rework](#6-qualidade-e-rework)
7. [Time Tracking](#7-time-tracking)
8. [Admin Settings](#8-admin-settings)
9. [Fluxo completo (end-to-end)](#9-fluxo-completo-end-to-end)
10. [Conclusão](#10-conclusão)

---

## 1. Introdução geral

### O que é o sistema industrial

O **PIMO-TRAK** é o módulo industrial integrado no **pimo-criativo**. Transforma o projeto de design (cutlist, caixas, materiais) num fluxo de produção rastreável, desde a ordem de trabalho até à embalagem final.

O sistema liga o mundo do projeto (desenho, listagem de peças, dimensões) ao mundo da fábrica (máquinas, operadores, qualidade, tempos e auditoria).

### Objetivo da funcionalidade

- **Rastrear** cada peça ao longo de todas as estações de produção.
- **Organizar** o trabalho em ordens de trabalho (work orders) com tarefas, departamentos e prioridades.
- **Registar** eventos, tempos e decisões de qualidade de forma auditável.
- **Automatizar** transições de estado via motor de workflow configurável.
- **Integrar** com Supabase para persistência, tempo real e controlo de acesso por perfil.

### Problemas que resolve

| Problema tradicional | Solução PIMO-TRAK |
|---------------------|-------------------|
| Peças sem identificação na fábrica | Código de barras / short code por peça, ligado ao projeto |
| Falta de visibilidade do progresso | Tracking em tempo real por ordem de trabalho e operação |
| Retrabalho mal documentado | Fluxo formal de rework com origem, destino e resolução |
| Tempos de produção desconhecidos | Time tracking por operador, estação e operação |
| Decisões de qualidade dispersas | Inspeções estruturadas com pontos definidos |
| Coordenação manual entre departamentos | Workflow engine com regras e transições automáticas |

### Estado actual da release 1.0.0

A versão 1.0.0 inclui a **estrutura completa** do módulo industrial:

- **Core funcional** com lógica de domínio, workflow, permissões e integração Supabase (work orders, tasks, eventos, notificações).
- **Domínio de peças** modelado (peças, operações, qualidade, rework, time tracking) — pronto para ligação total à base de dados.
- **UI industrial** com rotas e layout definidos — páginas operacionais em fase de activação progressiva (Fase 3C).
- **Admin Settings** com feature flags, regras e schema de configuração.

---

## 2. Arquitetura geral

O módulo industrial segue uma arquitectura em **camadas desacopladas**, com regras claras de dependência entre pastas.

### Diagrama de camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                     UTILIZADOR / OPERADOR                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  UI INDUSTRIAL (src/app/industrial + industrial/ui/)            │
│  Rotas, layout, painéis, adaptadores visuais                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  INTEGRATION (industrial/integration/)                          │
│  Cutlist → peças · Sync payload · Adaptadores UI ↔ Core         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  CORE INDUSTRIAL (industrial/core/)                             │
│  Work orders · Peças · Tracking · Events · Quality · Workflow   │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
┌───────────────▼──────────────┐   ┌──────────▼──────────────────┐
│  OPERATIONS (industrial/     │   │  INFRA (industrial/infra/)  │
│  operations/)                │   │  Supabase · Cache · Tabelas │
│  CNC · Nesting · Drill · …   │   └─────────────────────────────┘
└──────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│  MOTOR DE FABRICAÇÃO EXISTENTE (src/core/cnc, cutlayout, drill) │
│  (integração prevista nas próximas fases)                       │
└─────────────────────────────────────────────────────────────────┘
```

### UI Industrial

A interface divide-se em duas camadas complementares:

| Camada | Localização | Função |
|--------|-------------|--------|
| **Rotas da aplicação** | `src/app/industrial/` | Páginas acessíveis pelo router principal |
| **Componentes reutilizáveis** | `industrial/ui/` | Layout, painéis e páginas exportáveis |

**Componentes principais:**

- **IndustrialLayout** — cabeçalho "PIMO-TRAK Industrial", título e descrição de cada secção.
- **IndustrialPlaceholderPanel** — painel informativo durante a fase de activação das funcionalidades.
- **useIndustrialPageState** — hook de estado de página (preparado para dados reais).

**Rotas disponíveis:**

| Rota | Secção |
|------|--------|
| `/industrial` | Centro industrial (home) |
| `/industrial/work-orders` | Ordens de trabalho |
| `/industrial/tracking` | Tracking de progresso |
| `/industrial/events` | Eventos do sistema |
| `/industrial/quality` | Qualidade |
| `/industrial/rework` | Retrabalho |
| `/industrial/time-tracking` | Registo de tempos |
| `/industrial/operations/cnc` | Estação CNC |
| `/industrial/operations/nesting` | Estação Nesting |
| `/industrial/operations/drill` | Estação Drill |
| `/industrial/operations/orlar` | Estação Orlar |
| `/industrial/operations/montagem` | Estação Montagem |
| `/industrial/operations/embalagem` | Estação Embalagem |
| `/admin/settings/industrial` | Configurações administrativas |

### Core Industrial

O core contém toda a **lógica de negócio** sem dependência de interface gráfica. Módulos principais:

| Módulo | Responsabilidade |
|--------|------------------|
| **work-orders** | CRUD de ordens de trabalho, integração com workflow |
| **tasks** | Tarefas associadas a ordens de trabalho |
| **tracking** | Snapshot de progresso (tarefas concluídas, percentagem) |
| **events** | Registo e consulta de eventos de auditoria |
| **pieces** | Modelo de peça industrial (dimensões, operações, estado) |
| **piece-operations** | Operações individuais por peça e estação |
| **quality** | Inspeções e decisões de qualidade |
| **rework** | Pedidos de retrabalho e resolução |
| **time-tracking** | Registo de tempos por operação |
| **workflow-engine** | Motor de regras, transições e acções automáticas |
| **permissions** | RBAC — roles, guards, acesso a rotas |
| **auth** | Autenticação via Supabase Auth |
| **barcode** | Interpretação de códigos (prefixos P, PC, C, T, CMD) |
| **dashboard / metrics / analytics** | KPIs e agregações de produção |
| **notifications** | Notificações in-app (email/SMS preparados) |
| **users / departments** | Perfis, departamentos e atribuições |

**Regra fundamental:** o core **nunca** importa páginas ou componentes de UI.

### Adaptadores (Integration)

A camada de integração faz a ponte entre o pimo-criativo e o domínio industrial:

- **cutlist/** — converte a cutlist do projeto em peças industriais e operações.
- **ui/** — transforma entidades do core em cartões e intenções de interface (ex.: `workOrderToUiCard`, `quality:inspect`, `rework:create`).
- **types/** — payload de sincronização (`IndustrialSyncPayload`) para envio entre sistemas.

### Supabase

A infraestrutura Supabase fornece:

- **Persistência** de work orders, tasks, eventos, notificações, perfis e departamentos.
- **Tempo real** via canais dedicados por tabela.
- **Row Level Security (RLS)** com políticas por role (admin, manager, operador, worker, guest).
- **Autenticação** de utilizadores industriais.

**Variáveis de ambiente obrigatórias em produção:**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `VITE_TEXTURES_URL`

**Tabelas industriais principais:**

| Tabela | Conteúdo |
|--------|----------|
| `work_orders` | Ordens de trabalho |
| `work_order_tasks` | Tarefas por ordem |
| `task_status_history` | Histórico de estados de tarefas |
| `system_events` | Eventos de auditoria |
| `workflow_logs` | Logs de execução do workflow |
| `profiles` | Perfis de utilizador |
| `departments` | Departamentos |
| `notifications` | Notificações |
| `permission_change_logs` | Auditoria de alterações de permissão |
| `quality_reasons` / `quality_stats` | Dados de qualidade (schema preparado) |

**Canais de tempo real:**

| Canal | Tabela monitorizada |
|-------|---------------------|
| `industrial:work_orders` | Ordens de trabalho |
| `industrial:work_order_tasks` | Tarefas |
| `industrial:system_events` | Eventos |
| `industrial:profiles` | Utilizadores |
| `industrial:departments` | Departamentos |
| `industrial:notifications:{userId}` | Notificações por utilizador |

### Workflow Engine

O motor de workflow automatiza transições de estado com base em **eventos** e **regras**:

1. Uma acção (ex.: criar work order) dispara um evento.
2. O engine filtra regras aplicáveis à entidade e ao evento.
3. Avalia condições (equals, contains, inList, etc.).
4. Aplica transições de estado e executa acções (notificar, atribuir departamento, criar tarefa, etc.).
5. Regista a execução em `workflow_logs`.

**Estados de uma ordem de trabalho:**

```
  draft ──► pending_approval ──► approved ──► in_progress ──► completed
                │                    │            │
                │                    │            ├──► paused
                │                    │            └──► quality_review
                └────────────────────┴────────────────► cancelled
```

**Transições automáticas por defeito:**

| De | Para | Disparo |
|----|------|---------|
| Rascunho | Pendente de aprovação | Criação da ordem |
| Pendente de aprovação | Aprovada | Aprovação por departamento autorizado |
| Aprovada | Em produção | Início automático |
| Em produção | Concluída | Todas as tarefas concluídas |

**Tipos de acção do workflow:** actualizar estado, atribuir departamento ou utilizador, enviar notificação, criar tarefa, fechar ordem, registar evento, webhook, email, SMS.

### Permissions (RBAC)

O sistema industrial implementa controlo de acesso baseado em **roles**:

| Role | Perfil típico |
|------|---------------|
| **admin** | Administrador total — painel admin, todas as ordens e utilizadores |
| **manager** | Gestor de departamento — ordens e tarefas do seu departamento |
| **operador** | Operador sénior — gestão de tarefas no departamento |
| **worker** | Operador de fábrica — tarefas atribuídas, qualidade, eventos |
| **guest** | Acesso limitado ou consulta |

**Exemplos de regras:**

- Apenas **admin** acede ao painel de configurações.
- **Manager** e **operador** gerem ordens de trabalho do seu departamento.
- **Worker** vê e edita apenas tarefas que criou ou que lhe foram atribuídas.
- Alterações de permissão são registadas em `permission_change_logs` (role, IP, user agent).

### Regras de boundary (isolamento de módulos)

Para manter o código sustentável, o projecto define fronteiras rígidas:

- `integration/` pode importar de `core/` e de `src/core/` (motor de fabricação).
- `core/` **não** importa UI nem páginas.
- `operations/` pode importar motores CNC, cutlayout e drill existentes.
- `src/core/` **não** importa de `industrial/` (sem acoplamento inverso).

---

## 3. Ciclo de vida de uma peça

Uma **peça industrial** representa um elemento físico a fabricar, derivado da cutlist do projecto.

### Modelo de uma peça

Cada peça contém:

- **Identificação:** nome, código de barras (short code), ligação ao item de origem na cutlist.
- **Dimensões:** largura, altura e espessura em milímetros.
- **Material:** tipo e identificador de material.
- **Quantidade:** número de unidades.
- **Operações planeadas:** lista ordenada de estações (CNC, drill, orlar, montagem, embalagem).
- **Estado:** pending, in_progress, completed, blocked, rework, scrapped.
- **Ligações:** projectId, workOrderId, boxId (caixa/módulo).

### Diagrama do ciclo de vida

```
  CUTLIST DO PROJETO
         │
         ▼
  ┌──────────────┐
  │   CRIAÇÃO    │  cutlistToPieces() gera IndustrialPiece (status: pending)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ IDENTIFICAÇÃO│  Barcode / short code · ligação projectId + sourceItemId
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  OPERAÇÕES   │  pieceToOperations() → fila queued por estação
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐     ┌─────────────┐
  │   MÁQUINAS   │────►│ TIME TRACK  │  start/stop por operador
  └──────┬───────┘     └─────────────┘
         │
         ▼
  ┌──────────────┐
  │   EVENTOS    │  logEvent() regista cada passo relevante
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐     approved ──► próxima operação
  │  QUALIDADE   │──── rework   ──► fluxo de retrabalho
  └──────┬───────┘     rejected ──► blocked / scrapped
         │
         ▼
  ┌──────────────┐
  │  CONCLUSÃO   │  Todas as operações done → peça completed
  └──────────────┘
```

### 3.1 Criação

A peça nasce quando a cutlist de um projecto é convertida para o domínio industrial. O sistema lê cada item da cutlist (nome, dimensões, material, tipo de painel) e cria uma peça com operações inferidas automaticamente.

**Entrada típica da cutlist:** nome da peça, dimensões (largura, altura, profundidade), espessura, quantidade, material, código curto, metadados (tipo de painel, boxId).

### 3.2 Identificação

Cada peça recebe:

- Um **identificador único** interno.
- Um **código de barras** derivado do short code do projecto (quando disponível).
- Ligação ao **item de origem** (`sourceItemId`) e à **caixa/módulo** (`boxId`).

O módulo de barcode interpreta prefixos standard:

| Prefixo | Significado |
|---------|-------------|
| P | Peça |
| PC | Peça composta |
| C | Caixa |
| T | Tarefa |
| CMD | Comando / acção |

Isto permite ao operador scanear uma peça na fábrica e o sistema recuperar instantaneamente o contexto completo.

### 3.3 Atribuição de operações

Com base no tipo de peça, o sistema infere automaticamente a sequência de operações:

1. **CNC** — sempre aplicada.
2. **Drill** — para laterais, portas, fundos e tampas.
3. **Orlar** — para todas as peças excepto costas e fundos.
4. **Montagem** — sempre aplicada.
5. **Embalagem** — sempre aplicada.

Cada operação torna-se um registo `PieceOperation` com estado inicial `queued`.

### 3.4 Passagem por máquinas

Na estação, o operador (ou integração automática) actualiza o estado da operação:

```
queued ──► running ──► done
              │
              ├──► paused (interrupção temporária)
              └──► failed (falha — pode originar rework)
```

Simultaneamente, o estado da peça evolui de `pending` para `in_progress` e, quando todas as operações terminam, para `completed`.

### 3.5 Registo de eventos

Cada acção relevante gera um evento no sistema (`system_events`), incluindo:

- Criação e alteração de ordens de trabalho.
- Mudanças de estado de tarefas.
- Transições de workflow.
- Actividade de departamentos e utilizadores.

Estes eventos formam o **historial auditável** completo da produção.

### 3.6 Conclusão

Uma peça considera-se concluída quando:

- Todas as operações planeadas estão no estado `done`.
- Não existem bloqueios de qualidade activos.
- Não há pedidos de rework em aberto.

A ordem de trabalho associada avança para `completed` quando **todas** as suas tarefas estão concluídas (regra automática do workflow).

---

## 4. Máquinas e operações

O módulo industrial modela **estações de produção** como operações sobre peças. Cada estação corresponde a uma fase física na fábrica.

### Visão geral das estações

```
  NESTING          CNC           DRILL          ORLAR
 (optimização)   (corte CNC)   (furação)     (orla/borda)
      │              │              │              │
      └──────────────┴──────────────┴──────────────┘
                              │
                    MONTAGEM ──► EMBALAGEM ──► EXPEDIÇÃO
                   (montagem)    (embalagem)
```

### CNC

**Função:** corte e usinagem numa máquina CNC.

- Operação sempre atribuída a cada peça.
- Estado da operação: queued → running → done.
- Integração futura com o motor CNC existente em `src/core/cnc`.

**Operador:** inicia a operação, regista conclusão ou falha; o tempo é capturado automaticamente.

### Nesting

**Função:** optimização do layout de corte (agrupamento de peças numa chapa).

- Tipo de operação disponível no modelo (`nesting`).
- Não é inferido automaticamente da cutlist — activado manualmente ou via regra de projecto.
- Integração futura com `src/core/cutlayout`.

**Benefício:** reduz desperdício de material e planifica a sequência de corte CNC.

### Drill

**Função:** furação de furos para ferragens, dobradiças e fixações.

- Atribuída automaticamente a: laterais, portas, fundos e tampas.
- Integração futura com `src/core/drill`.

**Operador:** confirma furação concluída; falhas de posicionamento podem originar rework.

### Orlar

**Função:** aplicação de orla (edge banding) nas bordas visíveis da peça.

- Atribuída a todas as peças excepto costas e fundos.
- Verificação de qualidade inclui ponto específico `edge_band`.

### Montagem

**Função:** montagem de módulos, caixas ou conjuntos.

- Sempre presente na sequência.
- Ponto de inspecção `assembly` na qualidade.

### Embalagem

**Função:** embalagem final para expedição ou armazém.

- Última operação standard da sequência.
- Ponto de inspecção `packaging` na qualidade.

### Limpeza

**Função:** operação auxiliar de limpeza entre fases (quando aplicável).

- Disponível no modelo de tipos; activação conforme regras de projecto.

### Estados de uma operação

| Estado | Significado |
|--------|-------------|
| `queued` | Na fila, aguarda início |
| `running` | Em execução na estação |
| `paused` | Pausada temporariamente |
| `done` | Concluída com sucesso |
| `failed` | Falhou — pode originar rework |

---

## 5. Tracking

O tracking fornece **visibilidade em tempo real** sobre o progresso da produção.

### Work Orders (Ordens de Trabalho)

Uma ordem de trabalho agrupa o trabalho de fabricação:

| Campo | Descrição |
|-------|-----------|
| Número da ordem | Identificador único |
| Título e descrição | Contexto do trabalho |
| Estado | draft → … → completed |
| Prioridade | Urgência relativa |
| Departamento | Responsável pela execução |
| Atribuído a | Utilizador responsável |
| Metadados | Dados adicionais flexíveis |

**Acções disponíveis:** listar, consultar, criar, actualizar, eliminar. Cada alteração dispara eventos e avaliação de workflow.

### Tracking de progresso

O módulo de tracking calcula um **snapshot** por ordem de trabalho:

- Total de tarefas.
- Tarefas concluídas.
- Percentagem de progresso.

```
  Ordem WO-2026-0042
  ├── Tarefa 1: CNC chapa A        [done]
  ├── Tarefa 2: Drill laterais     [running]
  ├── Tarefa 3: Orlar frentes      [queued]
  └── Tarefa 4: Montagem módulo    [queued]

  Progresso: 25% (1/4 tarefas)
```

A subscrição em tempo real combina actualizações de tarefas e ordens de trabalho — qualquer alteração reflecte-se imediatamente na interface.

### Events (Eventos)

O sistema regista **22 tipos de eventos** industriais, incluindo:

- Ciclo de vida de ordens de trabalho (criada, estado alterado, eliminada).
- Ciclo de vida de tarefas (criada, iniciada, concluída).
- Actividade de departamentos e utilizadores.
- Eventos de sistema.

**Consultas disponíveis:** listagem filtrada, estatísticas agregadas, subscrição em tempo real.

### Histórico e auditoria

Cada evento contém timestamp, tipo, entidade afectada, utilizador e metadados. Isto permite:

- Reconstruir a linha temporal completa de uma peça ou ordem.
- Identificar quem fez o quê e quando.
- Suportar auditorias de qualidade e conformidade.
- Alimentar dashboards e métricas de produção.

---

## 6. Qualidade e Rework

### Inspeção de qualidade

O módulo de qualidade define **inspecções estruturadas** com pontos de verificação:

| Ponto de inspeção | O que verifica |
|-------------------|----------------|
| `dimensions` | Dimensões conforme especificação |
| `material` | Material correcto |
| `drilling` | Furação posicionada e completa |
| `edge_band` | Orla aplicada correctamente |
| `assembly` | Montagem conforme |
| `packaging` | Embalagem adequada |

**Decisão da inspeção:**

| Decisão | Efeito |
|---------|--------|
| `approved` | Peça avança para a próxima operação |
| `rework` | Cria pedido de retrabalho |
| `rejected` | Peça bloqueada ou descartada (`blocked` / `scrapped`) |

A função `isQualityBlocking` determina se uma inspecção impede o avanço da peça.

### Fluxo de qualidade

```
  Operação concluída
         │
         ▼
  ┌──────────────┐
  │  INSPEÇÃO    │
  └──────┬───────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
approved rework rejected
    │      │       │
    ▼      ▼       ▼
 próxima  rework  blocked/
 operação  flow   scrapped
```

### Rework (Retrabalho)

Quando uma peça falha na qualidade ou numa operação, o sistema cria um **pedido de retrabalho**:

| Campo | Descrição |
|-------|-----------|
| Origem | quality, operator, cnc, drill, assembly, packaging |
| Operação de origem | Onde falhou (`fromOperationId`) |
| Operação de destino | Para onde regressa (`toOperationId`) |
| Estado | open → in_progress → resolved / rejected |

**Fluxo de rework:**

```
  Falha detectada
         │
         ▼
  ReworkRequest (open)
         │
         ▼
  Atribuição a operador/estação (in_progress)
         │
    ┌────┴────┐
    ▼         ▼
 resolved   rejected
    │         │
    ▼         ▼
 reentrada  peça
 na fila    bloqueada
 destino
```

Isto garante que nenhum retrabalho fica invisible — cada correção fica documentada com origem, destino e resolução.

---

## 7. Time Tracking

O registo de tempos permite medir **produtividade real** na fábrica.

### Como funciona

1. O operador **inicia** o registo ao começar uma operação (`startTimeTracking`).
2. Ao concluir, **para** o registo (`stopTimeTracking`).
3. O sistema calcula automaticamente a **duração** (`durationMs`).

### Dados capturados

| Campo | Descrição |
|-------|-----------|
| Peça | Peça em processamento |
| Operação | Tipo e identificador da operação |
| Ordem de trabalho | Contexto de produção |
| Utilizador | Operador responsável |
| Estação | Máquina ou posto de trabalho |
| Início / fim | Timestamps precisos |
| Duração | Tempo efectivo em milissegundos |

### Produtividade e métricas

Os dados de time tracking alimentam:

- **Métricas por operador** — tempo médio por tipo de operação.
- **Métricas por estação** — utilização de máquinas.
- **Métricas por ordem** — tempo total de produção.
- **Dashboard industrial** — KPIs agregados via módulos metrics e analytics.

---

## 8. Admin Settings

As configurações administrativas industriais encontram-se em `/admin/settings/industrial`.

### Configurações industriais

| Secção | Conteúdo |
|--------|----------|
| **Geral** | Título, versão do módulo, metadados |
| **Workflow** | Estado inicial (draft), estado de conclusão (completed), transições manuais |
| **Qualidade** | Pontos de inspeção activos, regras de bloqueio |

### Feature flags

Funcionalidades activáveis progressivamente:

| Flag | Descrição | Estado default |
|------|-----------|----------------|
| `operationsUi` | Interface operacional das estações | Desligada |
| `realtimeTracking` | Tracking em tempo real na UI | Desligada |
| `qualityGate` | Portão de qualidade obrigatório | Desligada |
| `reworkFlow` | Fluxo formal de retrabalho na UI | Desligada |
| `adminRulesEditor` | Editor de regras de workflow | Desligada |

Estas flags permitem activar funcionalidades de forma controlada, sem afectar a estabilidade do sistema principal.

### Regras de workflow

Configuráveis via Admin Settings:

- **Estado inicial:** `draft` (rascunho).
- **Estado de conclusão:** `completed`.
- **Transições manuais:** permitir ou bloquear mudanças de estado manuais.

As regras em memória (`core/rules/`) complementam estas configurações com lógica automática.

### Permissões administrativas

| Acção | admin | manager | operador | worker |
|-------|-------|---------|----------|--------|
| Ver configurações | ✓ | — | — | — |
| Editar configurações | ✓ | — | — | — |
| Publicar alterações | ✓ | — | — | — |

### Runtime flags

Controlos de execução em ambiente:

| Flag | Função |
|------|--------|
| `requireSupabaseEnv` | Exige variáveis Supabase configuradas |
| `allowMockData` | Permite dados simulados em desenvolvimento |
| `enableWorkflowDryRun` | Executa workflow sem persistir alterações |
| `blockDestructiveActions` | Bloqueia acções destrutivas (eliminar, etc.) |

---

## 9. Fluxo completo (end-to-end)

Este diagrama mostra o percurso completo, desde o projecto de design até à peça embalada.

```
  DESIGNER / PROJETISTA                         FÁBRICA / OPERADOR
  ─────────────────────                         ───────────────────

  ┌─────────────┐
  │   Projeto   │  Caixas, materiais, cutlist
  │ pimo-criativo│
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │   Cutlist   │  Lista de peças com dimensões
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ cutlistTo   │  Conversão automática
  │   Pieces    │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Work Order  │  Ordem de trabalho criada (draft)
  │  + Tasks    │  Workflow: draft → pending → approved
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │   Peças     │  Identificadas com barcode
  │  + Ops      │  Operações queued por estação
  └──────┬──────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
  ┌─────────────┐                        ┌─────────────┐
  │   NESTING   │ (opcional)             │     CNC     │
  └──────┬──────┘                        └──────┬──────┘
         │                                        │
         └────────────────┬───────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    DRILL    │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    ORLAR    │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  QUALIDADE  │──► rework? ──► volta à estação destino
                   └──────┬──────┘
                          │ approved
                          ▼
                   ┌─────────────┐
                   │  MONTAGEM   │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  EMBALAGEM  │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  CONCLUÍDA  │  Peça completed · WO completed
                   └─────────────┘

  Em cada etapa: eventos registados · tempos capturados · tracking actualizado
```

### Interacção por perfil

#### Utilizador final (designer / gestor de projecto)

1. Cria ou abre um projecto no pimo-criativo.
2. Define caixas, materiais e cutlist.
3. Sincroniza ou gera a ordem de trabalho industrial.
4. Consulta tracking e progresso via `/industrial/tracking`.
5. Recebe notificações de conclusão ou problemas de qualidade.

#### Operador de fábrica

1. Acede à estação correspondente (ex.: `/industrial/operations/cnc`).
2. Scanear código de barras da peça ou seleccionar da fila.
3. Inicia operação (time tracking arranca automaticamente).
4. Executa o trabalho na máquina.
5. Regista conclusão ou falha.
6. Se qualidade activa: preenche inspecção.
7. A peça avança automaticamente para a próxima estação.

#### Administrador

1. Configura departamentos, utilizadores e permissões.
2. Define regras de workflow e feature flags.
3. Consulta eventos, métricas e dashboards.
4. Audita alterações de permissão e historial de produção.

### Consistência, segurança e rastreabilidade

| Princípio | Como é garantido |
|-----------|------------------|
| **Consistência** | Workflow engine com transições validadas; estados finitos por entidade |
| **Segurança** | RBAC por role, RLS no Supabase, auditoria de permissões |
| **Rastreabilidade** | Eventos imutáveis, historial de tarefas, time tracking, logs de workflow |
| **Isolamento** | Boundary rules impedem acoplamento entre core e UI |
| **Tempo real** | Canais Supabase actualizam tracking sem refresh manual |

### Como foi construído internamente

O PIMO-TRAK foi desenvolvido em fases dentro do projecto pimo-criativo:

| Fase | Conteúdo |
|------|----------|
| **3A — Build Structure** | Estrutura de pastas, boundaries, placeholders |
| **3B — Migration** | Migração conceptual de work-whatsapp; core Supabase funcional |
| **3C — UI & Operations** | Páginas, adaptadores, integração cutlist, activação progressiva |
| **1.0.0 — Release Final** | Core completo, workflow, RBAC, rotas, admin settings, build aprovado |

**Origens técnicas:**

- Domínio fabril inspirado no projecto **work-whatsapp** (referência read-only).
- Integração com motor de fabricação existente (`src/core/cnc`, `cutlayout`, `drill`).
- Persistência e auth via **Supabase** (PostgreSQL + Realtime + Auth).
- UI integrada no router principal em `src/app/industrial/`.

**Pacote e exportação:**

O módulo exporta-se via `industrial/index.ts` (barrel), disponibilizando core, infra, integration e UI para consumo interno.

---

## 10. Conclusão

### Benefícios

- **Visibilidade total** — do projecto à peça embalada, cada passo é rastreável.
- **Automatização** — workflow engine reduz coordenação manual entre departamentos.
- **Qualidade formalizada** — inspecções estruturadas e rework documentado.
- **Dados de produção** — tempos, métricas e eventos para melhoria contínua.
- **Segurança** — RBAC granular e auditoria completa.
- **Escalabilidade** — arquitectura em camadas permite activar funcionalidades progressivamente via feature flags.

### Como usar

1. **Configurar Supabase** — definir variáveis de ambiente em produção.
2. **Aplicar migrations** — criar tabelas e políticas RLS.
3. **Criar utilizadores** — atribuir roles (admin, manager, operador, worker).
4. **Activar feature flags** — conforme a fábrica estiver pronta para cada funcionalidade.
5. **Aceder às rotas industriais** — `/industrial` para operadores, `/admin/settings/industrial` para administradores.
6. **Sincronizar projectos** — cutlist do pimo-criativo gera peças e ordens de trabalho automaticamente.

### Como expandir no futuro

| Expansão | Descrição |
|----------|-----------|
| **Persistência de peças** | Ligar domínio de peças/operações ao Supabase |
| **UI operacional completa** | Substituir placeholders por interfaces funcionais com dados reais |
| **Integração CNC/Drill/Nesting** | Ligar motores existentes em `src/core/` às estações |
| **Etiquetas ZPL** | Impressão industrial via módulo `labels/` |
| **Sync externo** | Integração com ERP ou sistemas de armazém |
| **Editor de regras** | Interface visual para workflow rules (`adminRulesEditor`) |
| **Notificações email/SMS** | Activar canais além de in-app |
| **Dashboard avançado** | KPIs em tempo real com gráficos de produção |

---

## Referências internas

| Documento | Localização |
|-----------|-------------|
| Índice de documentação | `src/industrial/docs/index.md` |
| Release Notes 1.0.0 | `src/industrial/docs/pimo-trak-release-notes.md` |
| README do módulo | `src/industrial/README.md` |
| Checklist de deployment | `src/industrial/deployment/checklist.md` |
| Checklist pós-deploy | `src/industrial/deployment/post-deploy-checklist.md` |
| Relatório de release | `src/industrial/deployment/release-final.md` |
| Mensagem equipe deploy | `docs/mensagem-equipe-deploy.md` |

---

*Esta documentação faz parte da release 1.0.0 do PIMO-TRAK. Para questões técnicas ou sugestões de melhoria, contacte a equipa de desenvolvimento.*
