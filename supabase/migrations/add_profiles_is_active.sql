-- Migration: Add is_active column to profiles table
-- Run this in Supabase SQL Editor for user activate/deactivate functionality

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
