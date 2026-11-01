-- Migration: 14_create_daily_budget_settings.sql
-- Description: Create daily_budget_settings table for daily spending discipline calendar

create table if not exists public.daily_budget_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    enabled boolean not null default true,
    daily_limit numeric not null default 150000,
    category_ids text[] not null default '{}',
    wallet_ids text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.daily_budget_settings enable row level security;

-- Policy: Users can view and manage their own daily budget settings
create policy "Users can manage their own daily budget settings"
    on public.daily_budget_settings
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Enable Supabase Realtime broadcast for daily_budget_settings
do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_budget_settings'
    ) then
        alter publication supabase_realtime add table public.daily_budget_settings;
    end if;
end $$;
