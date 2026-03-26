# PIMO-CRIATIVO — PLANO DO SISTEMA DE EVENTOS (EVENTS SYSTEM)

====================================================
VISÃO GERAL DO SISTEMA DE EVENTOS
====================================================
Objetivo:
Criar um sistema de eventos interno (Events System) para o pimo-criativo que permita:

- Registrar eventos importantes do sistema (ex: criação de projeto, login, mudança de role, publicação, etc.)
- Futuramente, acionar automações, notificações, relatórios e integrações externas.
- Tudo isso de forma desacoplada, modular e controlada por feature flag.

IMPORTANTE:
- O sistema de eventos NÃO deve ser ativado para usuários finais imediatamente.
- Ele deve ser construído de forma segura, mas mantido desativado por padrão via feature flag.
- Nenhuma parte crítica do sistema deve depender exclusivamente do Events System nesta fase.

====================================================
FEATURE FLAG DO SISTEMA DE EVENTOS
====================================================
O sistema de eventos deve ser controlado por uma feature flag global, por exemplo:

- Nome sugerido: `features.eventsSystem` (boolean)
- Valor padrão: `false`

Regras:
- Quando `features.eventsSystem = false`:
  - O sistema de eventos pode existir no código.
  - Pode ter modelos, funções, handlers, etc.
  - Mas não deve impactar o fluxo principal do usuário.
  - Não deve quebrar nada se estiver desativado.
  - Não deve expor UI específica para eventos.

- Quando `features.eventsSystem = true`:
  - O sistema começa a registrar eventos conforme configurado.
  - Podem ser ativadas integrações internas (ex: logs, dashboards internos).
  - Ainda assim, pode continuar invisível para o usuário final, se desejado.

====================================================
OBJETIVOS DO SISTEMA DE EVENTOS (VERSÃO INICIAL)
====================================================
Versão inicial (MVP do Events System) deve focar em:

1. Modelo de Evento (Event):
   - id
   - type (string, ex: "USER_LOGIN", "PROJECT_CREATED")
   - userId (opcional, se houver usuário associado)
   - projectId (opcional, se houver projeto associado)
   - factoryId (opcional, se houver fábrica associada)
   - payload (JSON genérico com dados adicionais)
   - createdAt (timestamp)

2. Camada de registro de eventos:
   - Função central, ex: `recordEvent(eventData)`
   - Essa função:
     - Verifica se `features.eventsSystem` está ativa.
     - Se estiver desativada, retorna sem fazer nada (no-op).
     - Se estiver ativa, grava o evento no banco de dados (ou em fila, no futuro).

3. Tipos de eventos iniciais sugeridos:
   - USER_LOGIN
   - USER_LOGOUT (se aplicável)
   - USER_ROLE_CHANGED
   - PROJECT_CREATED
   - PROJECT_UPDATED
   - PROJECT_VISITED
   - PROJECT_VISIBILITY_CHANGED (público/privado)
   - FACTORY_USER_ADDED (quando ultra+ cria usuário abaixo dele)

4. Integração mínima:
   - Em pontos críticos do sistema (login, criação de projeto, etc.), chamar `recordEvent(...)`.
   - Mas SEM depender disso para o fluxo principal funcionar.

====================================================
INTEGRAÇÃO COM ROLES E PERMISSÕES
====================================================
O sistema de eventos, na versão inicial, NÃO precisa de permissões específicas para ser usado, pois:

- Ele é um mecanismo interno.
- Não expõe interface direta para o usuário final.

Porém, para fases futuras:
- Poderá existir uma permissão como `events.view` para permitir que:
  - admin veja eventos do sistema
  - ultra+ veja eventos da sua fábrica
- Isso deve ser planejado, mas não é obrigatório na primeira versão.

====================================================
INTEGRAÇÃO COM FÁBRICAS
====================================================
Quando possível, eventos devem carregar o contexto de fábrica:

- Se o usuário pertence a uma fábrica, `factoryId` deve ser preenchido.
- Se o projeto pertence a uma fábrica, `factoryId` também pode ser associado.

Isso permitirá no futuro:
- Relatórios por fábrica
- Monitoramento de atividades por time
- Auditoria de ações

====================================================
FUTURAS EXTENSÕES DO SISTEMA DE EVENTOS
====================================================
Fases futuras podem incluir:

1. Painel interno de eventos:
   - Página (ex: /admin/events)
   - Filtros por tipo, usuário, projeto, fábrica, data

2. Integração com notificações:
   - Enviar e-mails, mensagens ou notificações internas com base em certos eventos.

3. Integração com IA:
   - Analisar padrões de uso
   - Sugerir melhorias
   - Detectar comportamentos anômalos

4. Integração com plugins:
   - Plugins podem se inscrever em certos tipos de eventos
   - Ex: plugin que reage a "PROJECT_CREATED" para gerar um template automático

====================================================
RELAÇÃO COM AS FASES DO MASTER PLAN
====================================================
O sistema de eventos deve respeitar as fases do documento principal:

- FASES 0–4:
  - Prioridade é a base: usuários, roles, permissões, projetos, fábricas, admin básico.
  - O sistema de eventos pode ser implementado em paralelo, mas:
    - Sempre atrás de feature flag.
    - Sem bloquear ou complicar a base.

- FASES FUTURAS:
  - O Events System pode ser promovido a componente central para:
    - Auditoria
    - Relatórios
    - Automação
    - Integrações externas

====================================================
REGRAS IMPORTANTES
====================================================
1. O sistema de eventos NÃO deve quebrar o fluxo principal se estiver desativado.
2. Nenhuma funcionalidade crítica deve depender exclusivamente do Events System nesta fase.
3. Toda integração com o Events System deve passar pela função central (ex: `recordEvent`), nunca acessando o banco diretamente.
4. O código do Events System deve ser organizado de forma modular, para facilitar:
   - Evolução
   - Testes
   - Possível extração para microserviço no futuro.

====================================================
OBJETIVO DESTE DOCUMENTO
====================================================
Este documento define o plano do Sistema de Eventos do pimo-criativo.

O Cursor deve:
- Utilizar este plano como referência ao criar qualquer código relacionado a eventos.
- Manter o sistema de eventos sempre protegido por feature flag.
- Garantir que o projeto continue funcional mesmo com o sistema de eventos desativado.
- Propor melhorias sem violar as regras de segurança e modularidade aqui descritas.

====================================================
FIM DO DOCUMENTO
====================================================
