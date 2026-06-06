# Checklist de Deployment Industrial

## Pre-build checks

- Confirmar que `src/industrial/` não importa UI externa nem módulos legados proibidos.
- Confirmar que `src/app/industrial/` usa apenas componentes/adaptadores industriais.
- Executar lint focado: `npx eslint "src/industrial/**/*.{ts,tsx}" "src/app/**/*.{ts,tsx}"`.
- Executar build completo quando o working tree fora do escopo estiver estável.

## Variáveis obrigatórias

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

## Testes mínimos

- Abrir rota industrial principal.
- Abrir work orders, tracking, events, quality, time tracking e rework.
- Abrir operações: CNC, nesting, drill, orlar, montagem e embalagem.
- Abrir admin settings industrial.
- Validar que placeholders não fazem chamadas API.

## Fluxo de publicação

- Garantir migrations Supabase aplicadas no ambiente alvo.
- Validar feature flags industriais antes de expor UI real.
- Publicar build com Supabase configurado.
- Ativar gradualmente páginas industriais.

## Pós-deploy

- Confirmar carregamento da UI industrial.
- Confirmar autenticação e permissões antes de ações reais.
- Confirmar eventos Supabase e realtime quando a Fase 3C.2 ligar dados reais.
- Monitorizar erros de workflow, quality gates e rework.
