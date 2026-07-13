ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS subcategory_id text;
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS usage_count integer default 1;
