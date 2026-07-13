ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS debt_id text references public.debts;
