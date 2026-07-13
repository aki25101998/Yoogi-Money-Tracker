ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS initial_balance numeric default 0,
ADD COLUMN IF NOT EXISTS is_default boolean default false,
ADD COLUMN IF NOT EXISTS "order" integer default 0;
