-- XÓA BẢNG CŨ NẾU CÓ (Trường hợp user đã chạy file cũ)
drop table if exists public.budget_rules;
drop table if exists public.budget_portfolios;
drop table if exists public.budget_settings;

-- 1. BẢNG CÀI ĐẶT NGÂN QUỸ CHUNG (Lưu trữ danh sách thu nhập cơ sở)
create table public.budget_settings (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    income_category_ids jsonb default '[]'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    unique(user_id)
);
alter table public.budget_settings enable row level security;
create policy "Users can only access their own budget settings" on public.budget_settings for all using (auth.uid() = user_id);

-- 2. BẢNG NHÓM NGÂN QUỸ (Từng thanh Progress Bar)
create table public.budget_portfolios (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    percentage numeric not null check (percentage >= 0 and percentage <= 100),
    expense_category_ids jsonb default '[]'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.budget_portfolios enable row level security;
create policy "Users can only access their own budget portfolios" on public.budget_portfolios for all using (auth.uid() = user_id);
