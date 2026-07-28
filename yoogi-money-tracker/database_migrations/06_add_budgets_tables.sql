-- 1. BẢNG BUDGET RULES (QUY TẮC NGÂN QUỸ)
create table public.budget_rules (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    category_id text references public.categories(id) on delete cascade not null,
    percentage numeric not null check (percentage >= 0 and percentage <= 100),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    unique(user_id, category_id)
);
alter table public.budget_rules enable row level security;
create policy "Users can only access their own budget rules" on public.budget_rules for all using (auth.uid() = user_id);
