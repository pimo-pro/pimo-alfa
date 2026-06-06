# PIMO-TRAK Post-deploy Checklist

## Estado final do deploy

- Deploy externo: pendente.
- Motivo: alvo de deploy nao configurado neste workspace (`vercel.json`, `netlify.toml` e `Dockerfile` ausentes) e credenciais reais Supabase nao fornecidas.
- Build local de producao: aprovado.
- Preview local: aprovado com resposta HTTP `200` em `http://127.0.0.1:4173/`.

## Testes manuais realizados

- Build final executado: `npm run build`.
- TypeScript validado: `npx tsc --noEmit`.
- Preview local iniciado: `npm run preview -- --host 127.0.0.1 --port 4173`.
- Smoke test local da raiz: resposta HTTP `200`.

## Testes pendentes em ambiente publicado

- Abertura das paginas industriais:
  - `/industrial`
  - `/industrial/work-orders`
  - `/industrial/tracking`
  - `/industrial/events`
  - `/industrial/quality`
  - `/industrial/time-tracking`
  - `/industrial/rework`
  - `/industrial/operations/cnc`
  - `/industrial/operations/nesting`
  - `/industrial/operations/drill`
  - `/industrial/operations/orlar`
  - `/industrial/operations/montagem`
  - `/industrial/operations/embalagem`
- Abertura do Admin Settings:
  - `/admin/settings/industrial`
- Carregamento dos adaptadores UI/core.
- Inicializacao real do Supabase com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Logs de erro

- Sem erros no build local.
- Sem erros no TypeScript.
- Sem erros no smoke test local.
- Deploy externo nao executado por falta de alvo e credenciais reais.

## Pontos pendentes

- Definir ambiente de deploy: Vercel, Netlify, Render, Docker, VPS ou outro.
- Configurar `VITE_SUPABASE_URL` real no ambiente de producao.
- Configurar `VITE_SUPABASE_ANON_KEY` real no ambiente de producao.
- Executar verificacoes manuais no dominio publicado.
