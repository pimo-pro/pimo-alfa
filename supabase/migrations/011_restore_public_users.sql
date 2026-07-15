-- Restaurar public.users para PIMO-TRAK e eventos industriais.
-- Schema base: id, email, name, role, created_at

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON public.users (lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_all ON public.users;
CREATE POLICY users_select_all
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS users_insert_all ON public.users;
CREATE POLICY users_insert_all
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Utilizador industrial padrão (idempotente)
INSERT INTO public.users (email, name, role)
SELECT
  'pimo-trak-industrial@pimo.pro',
  'PIMO-TRAK Industrial',
  'operator'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.users
  WHERE lower(email) = lower('pimo-trak-industrial@pimo.pro')
);

-- Atualizar schema cache do PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
