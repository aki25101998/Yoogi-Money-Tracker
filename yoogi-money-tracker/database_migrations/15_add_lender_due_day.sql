-- Migration: 15_add_lender_due_day.sql
-- Description: Add optional due_day column to lenders and installments tables to allow custom monthly payment due dates

ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS due_day integer;
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS due_day integer;
