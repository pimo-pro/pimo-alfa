# PIMO-CRIATIVO — MASTER PLAN DOCUMENT
# Documento oficial de arquitetura, fases e regras do sistema
# Este documento deve ser armazenado e utilizado pelo Cursor como base permanente do projeto.

====================================================
VISÃO GERAL DO PROJETO
====================================================
Nome do projeto: pimo-criativo

Objetivo macro:
Criar uma plataforma modular para criação, gestão e publicação de projetos criativos, com:
- Sistema robusto de usuários, roles e permissões
- Controle de acesso avançado (público/privado, fábrica, admin)
- Interface única com recursos liberados/bloqueados por plano
- Base preparada para futuras expansões (produção, IA, plugins, etc.)

O sistema deve ser:
- Modular
- Extensível
- Seguro
- Fácil de manter
- Preparado para múltiplas fases de evolução

====================================================
ARQUITETURA GERAL
====================================================
Arquitetura sugerida (pode ser refinada pelo Cursor):
- Backend:
  - API REST (ou GraphQL, se necessário)
  - Autenticação via JWT ou similar
  - Camada de domínio clara (Users, Projects, Factories, Permissions)
  - Banco de dados relacional (PostgreSQL ou similar)
- Frontend:
  - SPA ou framework moderno (ex: Next.js / React)
  - Consumo da API
  - Controle de interface baseado em role + permissions
- Futuro:
  - Possível separação em microserviços
  - Módulos independentes (produção, IA, plugins, etc.)

====================================================
ROLES OFICIAIS (5 NÍVEIS)
====================================================
Roles fixos do sistema (não devem ser renomeados):

1. visitor
2. pro
3. ultra
4. ultra+
5. admin

Cada Role representa um nível de acesso e capacidades dentro da plataforma.

====================================================
PERMISSÕES E MODELO DE AUTORIZAÇÃO
====================================================
O sistema deve suportar:
- Permissões padrão por Role
- Permissões adicionais (extraPermissions)
- Permissões removidas (removedPermissions)

Cada usuário possui:
- role: define o conjunto base de permissões
- extraPermissions: lista de permissões adicionais
- removedPermissions: lista de permissões removidas

Permissões são atômicas, por exemplo:
- project.view.self
- project.edit.self
- project.send_to_production.self
- project.view.factory
- project.view.all
- user.manage.below
- admin.full_access

Regra:
permissões_efetivas = (permissões_da_role + extraPermissions) - removedPermissions

====================================================
HIERARQUIA E CAPACIDADES POR ROLE
====================================================
visitor:
- vê apenas seus próprios projetos
- não edita projetos (apenas visualização, se permitido)

pro:
- vê e edita apenas seus próprios projetos

ultra:
- vê e edita seus próprios projetos
- pode enviar seus projetos para produção (quando o módulo existir)

ultra+:
- gerente de fábrica
- pode criar usuários abaixo dele (visitor, pro, ultra)
- vê projetos da sua fábrica
- pode gerenciar permissões de usuários abaixo dele (dentro de limites definidos)

admin:
- acesso total ao sistema
- vê todos os projetos
- gerencia todas as fábricas, usuários e configurações globais

====================================================
CONCEITO DE FÁBRICA
====================================================
"Fábrica" é uma unidade lógica de agrupamento de usuários e projetos.

- ultra+ é o gerente de uma fábrica
- usuários criados por um ultra+ pertencem à sua fábrica
- projetos criados por usuários de uma fábrica podem ser vistos pelo ultra+ (conforme permissões)
- admin pode ver todas as fábricas

Fábrica é importante para:
- Escopo de visualização de projetos
- Organização de times
- Futuras funcionalidades de produção

====================================================
PÁGINAS PRINCIPAIS
====================================================
1. /{username}
   - Página pública/privada do usuário
   - Exibe informações básicas do usuário
   - Lista de projetos públicos do usuário

2. /{username}/{projectSlug}
   - Página do projeto
   - Pode ser pública ou privada
   - Se privada, apenas o dono ou quem tiver permissão pode ver

3. /admin
   - Área de administração global
   - Acesso exclusivo admin

4. /admin/projects
   - admin: vê todos os projetos
   - ultra+: vê apenas projetos da sua fábrica
   - outros roles: sem acesso

====================================================
REGRAS DE ACESSO (RESUMO)
====================================================
admin:
- acesso total a tudo

ultra+:
- acesso aos projetos da sua fábrica
- pode gerenciar usuários abaixo dele

ultra / pro / visitor:
- acesso apenas aos seus próprios projetos

páginas públicas:
- qualquer pessoa (logada ou não) pode ver

páginas privadas:
- apenas o dono
- ou usuários com permissão específica
- ou admin (sempre)

====================================================
INTERFACE — PRINCÍPIOS
====================================================
A interface é única para todos os usuários.

Elementos da UI podem:
- Não aparecer para certos roles
- Aparecer bloqueados com indicação de upgrade (ex: “Disponível no plano PRO”)
- Aparecer totalmente ativos conforme permissões

Exemplos:
- Botão “Editar projeto”:
  - Ativo para pro, ultra, ultra+, admin (com permissão)
  - Bloqueado com mensagem de upgrade para visitor
- Botão “Enviar para produção”:
  - Ativo para ultra, ultra+, admin (quando o módulo existir)
  - Bloqueado para visitor e pro

====================================================
FASES DO PROJETO
====================================================
As fases abaixo definem a evolução do sistema.
Cada fase deve ser implementada de forma incremental, mantendo compatibilidade com as fases anteriores.

----------------------------------------------------
FASE 0 — FUNDAMENTOS DO SISTEMA
----------------------------------------------------
Objetivo:
- Definir a base conceitual e estrutural do sistema.

Itens:
- Definir modelos principais:
  - User
  - Role
  - Permissions
  - Project
  - Factory (estrutura inicial, mesmo que não usada totalmente)
- Definir esquema de banco de dados (sem necessidade de otimização avançada)
- Definir estratégia de autenticação (ex: JWT)
- Definir convenções de nomenclatura (rotas, campos, etc.)
- Definir estrutura de pastas do backend e frontend

Resultado esperado:
- Projeto com estrutura mínima organizada
- Modelos conceituais claros
- Nenhuma funcionalidade complexa ainda, apenas base

----------------------------------------------------
FASE 1 — USUÁRIOS, ROLES, PERMISSÕES E ACESSO BÁSICO
----------------------------------------------------
Objetivo:
- Implementar o núcleo de autenticação e autorização.

Itens:
- Sistema de usuários:
  - Registro (opcional nesta fase, pode ser manual via seed)
  - Login básico
- Sistema de roles:
  - Atribuição de role ao usuário
- Sistema de permissions:
  - Cálculo de permissões efetivas (role + extraPermissions - removedPermissions)
- Endpoints principais:
  - /auth/login
  - /me (retorna dados do usuário logado + role + permissions)
- Access Control:
  - Middleware de autenticação
  - Middleware de autorização (verificação de permissões)
- Preparar base para:
  - Dashboard do usuário
  - Páginas de projeto

Resultado esperado:
- Usuário consegue logar
- Sistema sabe qual o role e permissões do usuário
- Backend consegue restringir acesso com base em permissões

----------------------------------------------------
FASE 2 — DASHBOARD DO USUÁRIO E PÁGINAS DE PROJETO
----------------------------------------------------
Objetivo:
- Criar a experiência básica do usuário logado.

Itens:
- User Dashboard:
  - Exibir informações do usuário
  - Exibir role e permissões
  - Listar projetos do usuário
- Project Pages:
  - Estrutura de criação e listagem de projetos
  - Campos básicos: título, slug, isPublic, data
- Páginas:
  - /{username}
    - Exibe dados públicos do usuário
    - Lista projetos públicos
  - /{username}/{projectSlug}
    - Exibe projeto
    - Respeita regra público/privado
- Regras de acesso:
  - Usuário só vê o que tem permissão para ver
  - Visitante (não logado) só vê conteúdo público

Resultado esperado:
- Usuário logado tem um dashboard funcional
- Páginas públicas/privadas de usuário e projeto funcionam

----------------------------------------------------
FASE 3 — FÁBRICAS E VISÃO POR FÁBRICA
----------------------------------------------------
Objetivo:
- Introduzir o conceito de fábrica de forma funcional.

Itens:
- Modelo Factory:
  - id
  - nome
  - ownerId (ultra+ ou admin)
- Associação:
  - Usuários pertencem a uma fábrica (opcional para alguns roles)
  - Projetos podem estar associados a uma fábrica
- Regras:
  - ultra+ vê projetos da sua fábrica
  - ultra+ pode criar usuários abaixo dele
- Endpoints:
  - /factory/me (retorna info da fábrica do usuário, se houver)
  - /factory/users
  - /factory/projects

Resultado esperado:
- Estrutura de fábrica funcionando
- ultra+ consegue atuar como gerente de fábrica

----------------------------------------------------
FASE 4 — ÁREA ADMINISTRATIVA BÁSICA
----------------------------------------------------
Objetivo:
- Criar a base da área administrativa.

Itens:
- Página /admin
- Página /admin/projects:
  - admin: vê todos os projetos
  - ultra+: vê apenas projetos da sua fábrica
- Endpoints:
  - /admin/projects
  - /admin/users
- Regras:
  - Apenas admin acessa /admin (exceto se houver seções específicas para ultra+)

Resultado esperado:
- Admin tem visão global do sistema
- ultra+ tem visão gerencial da sua fábrica (quando aplicável)

----------------------------------------------------
FASE 5 — MELHORIAS DE UX E CONTROLE DE INTERFACE
----------------------------------------------------
Objetivo:
- Refinar a experiência do usuário com base em roles e permissões.

Itens:
- Componentes de UI condicionais:
  - Mostrar/ocultar elementos por role
  - Mostrar elementos bloqueados com indicação de upgrade
- Mensagens claras:
  - “Disponível no plano PRO”
  - “Disponível no plano ULTRA”
  - “Apenas admin”
- Centralizar lógica de visibilidade:
  - Funções utilitárias no frontend para verificar permissões

Resultado esperado:
- Interface se adapta automaticamente ao role do usuário
- Usuário entende o que está bloqueado e por quê

----------------------------------------------------
FASES FUTURAS (ESBOÇO)
----------------------------------------------------
FASE 6 — Módulo de produção:
- Enviar projetos para produção
- Filas, estados, histórico

FASE 7 — Módulo de IA:
- Sugestões automáticas
- Geração de conteúdo auxiliar

FASE 8 — Plugins e extensões:
- Sistema de plugins
- Integrações externas

FASE 9 — Relatórios e analytics:
- Métricas de uso
- Relatórios por fábrica, usuário, projeto

FASE 10 — Escalonamento e microserviços:
- Separar módulos críticos
- Otimizar performance e infraestrutura

====================================================
REGRAS GERAIS PARA O DESENVOLVIMENTO
====================================================
1. O sistema deve sempre respeitar a hierarquia de roles e permissões.
2. Nenhuma funcionalidade avançada (produção, IA, plugins) deve ser iniciada antes da conclusão sólida das fases 0 a 4.
3. Toda nova funcionalidade deve:
   - Declarar claramente quais roles podem usá-la
   - Declarar quais permissões são necessárias
4. A documentação interna (comentários, README, etc.) deve seguir a mesma terminologia deste documento.
5. Qualquer melhoria sugerida pelo Cursor deve:
   - Manter compatibilidade com este documento
   - Ou propor uma revisão explícita de seção específica

====================================================
OBJETIVO DESTE DOCUMENTO
====================================================
Este documento é a referência principal do projeto pimo-criativo.

O Cursor deve:
- Utilizar este documento como base para todas as decisões de arquitetura
- Manter coerência com as fases e regras aqui descritas
- Propor melhorias sem quebrar os princípios fundamentais
- Ajudar a implementar o sistema fase a fase, de forma incremental e organizada

====================================================
FIM DO DOCUMENTO
====================================================
