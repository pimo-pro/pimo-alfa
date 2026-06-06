-- Migration: Add description and updated_at to departments table
-- Run this in Supabase SQL Editor if your departments table was created without these columns

ALTER TABLE public.departments 
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Enable Realtime for departments (run if you need live updates)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;

-- RLS policies for admin-only INSERT, UPDATE, DELETE
-- First, create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy: Only admins can insert departments
DROP POLICY IF EXISTS "Allow admin insert departments" ON public.departments;
CREATE POLICY "Allow admin insert departments"
ON public.departments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy: Only admins can update departments
DROP POLICY IF EXISTS "Allow admin update departments" ON public.departments;
CREATE POLICY "Allow admin update departments"
ON public.departments FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy: Only admins can delete departments
DROP POLICY IF EXISTS "Allow admin delete departments" ON public.departments;
CREATE POLICY "Allow admin delete departments"
ON public.departments FOR DELETE
TO authenticated
USING (public.is_admin());
