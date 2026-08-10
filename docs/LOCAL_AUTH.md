/**
 * Autenticação local permanente — utilizador **K** / senha **K**.
 *
 * ## Comportamento
 * - Sem feature flags (`VITE_LOCAL_AUTH`, etc.).
 * - Sem fallback genérico: só K/K cria sessão local admin.
 * - Outras credenciais continuam no login remoto (`/auth/login` + `/me`).
 * - DEV e PROD: K/K funciona sempre, offline.
 *
 * ## Sessão
 * - Token: `local-auth-k` (prefixo `local-auth-k`)
 * - Storage: `pimo_auth_token`, `pimo_auth_user`, `pimo_auth_permissions`
 * - Role: `admin` + todas as permissões de `ALL_KNOWN_PERMISSIONS`
 * - Token local **não** é enviado como Bearer nas APIs PHP
 *
 * ## Âmbito
 * - Não altera Industrial Supabase.
 * - Não altera writers CNC / pipelines industriais.
 *
 * Código: `src/auth/localAuth.ts`, `src/auth/AuthProvider.tsx`.
 */
export {};
