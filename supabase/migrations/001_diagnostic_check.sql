-- =============================================================================
-- 001_diagnostic_check.sql - CHECKUP COMPLETO DO BANCO
-- =============================================================================
-- Execute no Supabase SQL Editor. Mostra:
-- - Existência das tabelas
-- - Schema (deve ser public)
-- - Primary Key (obrigatório para REST API)
-- - RLS habilitado
-- - Permissões (GRANT)
-- =============================================================================

-- ========== 1. LISTA DE TABELAS ESPERADAS ==========
WITH expected AS (
  SELECT unnest(ARRAY[
    'departments', 'work_orders', 'work_order_tasks', 'task_status_history',
    'work_order_statuses', 'work_order_transitions', 'work_order_rules',
    'work_order_events', 'system_events', 'quality_reasons', 'quality_checks',
    'quality_stats', 'profiles'
  ]) AS table_name
),
actual AS (
  SELECT 
    t.tablename AS table_name,
    t.schemaname AS schema_name,
    COALESCE(tc.constraint_type = 'PRIMARY KEY', false) AS has_pk,
    COALESCE(c.relrowsecurity, false) AS has_rls
  FROM pg_tables t
  LEFT JOIN information_schema.table_constraints tc 
    ON tc.table_schema = t.schemaname AND tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY'
  LEFT JOIN pg_namespace n ON n.nspname = t.schemaname
  LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = n.oid AND c.relkind = 'r'
  WHERE t.tablename IN (SELECT table_name FROM expected)
)
SELECT 
  e.table_name AS tabela,
  COALESCE(a.schema_name, '-') AS schema_atual,
  CASE WHEN a.table_name IS NULL THEN 'FALTANDO' WHEN a.schema_name != 'public' THEN 'SCHEMA ERRADO' ELSE 'OK' END AS schema_status,
  CASE WHEN a.table_name IS NULL THEN '-' WHEN a.has_pk THEN 'OK' ELSE 'FALTA PK' END AS pk_status,
  CASE WHEN a.table_name IS NULL THEN '-' WHEN a.has_rls THEN 'OK' ELSE 'SEM RLS' END AS rls_status,
  CASE 
    WHEN a.table_name IS NULL THEN 'N/A'
    WHEN a.schema_name != 'public' OR NOT a.has_pk THEN 'NAO'
    ELSE 'SIM (requer PK+public)'
  END AS rest_api_ready
FROM expected e
LEFT JOIN actual a ON a.table_name = e.table_name
ORDER BY e.table_name;

-- ========== 2. TABELAS EM SCHEMAS NAO-PUBLIC ==========
SELECT 
  schemaname AS schema_errado,
  tablename AS tabela,
  'Mover para public: ALTER TABLE ' || schemaname || '.' || tablename || ' SET SCHEMA public;' AS acao
FROM pg_tables
WHERE schemaname NOT IN ('public', 'pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'realtime', 'vault')
  AND tablename IN ('departments', 'work_orders', 'work_order_tasks', 'task_status_history', 
    'work_order_statuses', 'work_order_transitions', 'work_order_rules',
    'work_order_events', 'system_events', 'quality_reasons', 'quality_checks', 'quality_stats', 'profiles');

-- ========== 3. TABELAS SEM PRIMARY KEY ==========
SELECT 
  t.tablename AS tabela,
  t.schemaname AS schema,
  'Adicionar PK: ALTER TABLE ' || t.schemaname || '.' || t.tablename || ' ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid();' AS acao
FROM pg_tables t
LEFT JOIN information_schema.table_constraints tc 
  ON tc.table_schema = t.schemaname AND tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.schemaname = 'public'
  AND t.tablename IN ('departments', 'work_orders', 'work_order_tasks', 'task_status_history',
    'work_order_statuses', 'work_order_transitions', 'work_order_rules',
    'work_order_events', 'system_events', 'quality_reasons', 'quality_checks', 'quality_stats', 'profiles')
  AND tc.constraint_name IS NULL;

-- ========== 4. RESUMO EXECUTIVO ==========
SELECT 
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'departments', 'work_orders', 'work_order_tasks', 'task_status_history',
    'work_order_statuses', 'work_order_transitions', 'work_order_rules',
    'work_order_events', 'system_events', 'quality_reasons', 'quality_checks', 'quality_stats', 'profiles'
  )) AS tabelas_existentes,
  13 AS tabelas_esperadas,
  (SELECT count(*) FROM pg_tables t
   JOIN information_schema.table_constraints tc ON tc.table_schema = t.schemaname AND tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY'
   WHERE t.schemaname = 'public' AND t.tablename IN (
    'departments', 'work_orders', 'work_order_tasks', 'task_status_history',
    'work_order_statuses', 'work_order_transitions', 'work_order_rules',
    'work_order_events', 'system_events', 'quality_reasons', 'quality_checks', 'quality_stats', 'profiles'
  )) AS tabelas_com_pk;
