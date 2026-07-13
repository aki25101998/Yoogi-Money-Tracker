-- 1. BẢNG CÀI ĐẶT (SETTINGS)
create table public.settings (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    month_start_day integer default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.settings enable row level security;
create policy "Users can only access their own settings" on public.settings for all using (auth.uid() = user_id);

-- 2. BẢNG DANH MỤC (CATEGORIES)
create table public.categories (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    icon text,
    type text not null,
    "order" integer,
    subcategories jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.categories enable row level security;
create policy "Users can only access their own categories" on public.categories for all using (auth.uid() = user_id);

-- 3. BẢNG VÍ (WALLETS)
create table public.wallets (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    icon text,
    balance numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.wallets enable row level security;
create policy "Users can only access their own wallets" on public.wallets for all using (auth.uid() = user_id);

-- 4. BẢNG NGƯỜI THANH TOÁN (PAYERS)
create table public.payers (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.payers enable row level security;
create policy "Users can only access their own payers" on public.payers for all using (auth.uid() = user_id);

-- 5. BẢNG NGƯỜI NỢ & CHỦ NỢ (DEBTORS & LENDERS)
create table public.debtors (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.debtors enable row level security;
create policy "Users can only access their own debtors" on public.debtors for all using (auth.uid() = user_id);

create table public.lenders (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.lenders enable row level security;
create policy "Users can only access their own lenders" on public.lenders for all using (auth.uid() = user_id);

-- 6. BẢNG CÁC KHOẢN NỢ / VAY (DEBTS)
create table public.debts (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    type text not null,
    amount numeric not null,
    remaining_amount numeric not null,
    interest_rate numeric default 0,
    date timestamp with time zone not null,
    due_date timestamp with time zone,
    note text,
    person_id text,
    person_name text,
    status text default 'active',
    wallet_id text references public.wallets,
    installment_months integer,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.debts enable row level security;
create policy "Users can only access their own debts" on public.debts for all using (auth.uid() = user_id);

-- 7. BẢNG INSTALLMENTS (TRẢ GÓP)
create table public.installments (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text not null,
    original_amount numeric not null,
    monthly_payment numeric not null,
    total_payable numeric not null,
    term integer not null,
    rate numeric default 0,
    start_date text not null,
    owner text,
    lender text,
    paid_months jsonb default '[]'::jsonb,
    partial_payments jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.installments enable row level security;

create policy "Users can view their own installments" on public.installments for select using (auth.uid() = user_id);
create policy "Users can insert their own installments" on public.installments for insert with check (auth.uid() = user_id);
create policy "Users can update their own installments" on public.installments for update using (auth.uid() = user_id);
create policy "Users can delete their own installments" on public.installments for delete using (auth.uid() = user_id);

-- 8. BẢNG GIAO DỊCH (TRANSACTIONS)
create table public.transactions (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    type text not null,
    amount numeric not null,
    date timestamp with time zone not null,
    category_id text,
    subcategory_id text,
    wallet_id text references public.wallets,
    to_wallet_id text references public.wallets,
    payer_id text references public.payers,
    installment_id text,
    fee numeric default 0,
    note text,
    is_recurring boolean default false,
    ai_categorized boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.transactions enable row level security;
create policy "Users can only access their own transactions" on public.transactions for all using (auth.uid() = user_id);
create index transactions_date_idx on public.transactions(date);
create index transactions_user_id_idx on public.transactions(user_id);

-- 9. BẢNG GIAO DỊCH ĐỊNH KỲ (RECURRING TRANSACTIONS)
create table public.recurring_transactions (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    type text not null,
    amount numeric not null,
    category_id text,
    subcategory_id text,
    wallet_id text references public.wallets,
    note text,
    frequency text not null,
    next_date timestamp with time zone not null,
    status text default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.recurring_transactions enable row level security;
create policy "Users can only access their own recurring txns" on public.recurring_transactions for all using (auth.uid() = user_id);


-- 10. BẢNG AI MEMORY
create table public.ai_memory (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    context text not null,
    category_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.ai_memory enable row level security;
create policy "Users can only access their own ai memory" on public.ai_memory for all using (auth.uid() = user_id);

-- 11. BẢNG TỪ VIẾT TẮT (ABBREVIATIONS)
create table public.abbreviations (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    short text not null,
    full_text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.abbreviations enable row level security;
create policy "Users can only access their own abbreviations" on public.abbreviations for all using (auth.uid() = user_id);

-- 12. BẢNG AI CHAT HISTORY
create table public.ai_chat_history (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    wallet_id text references public.wallets not null,
    history jsonb default '[]'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    unique(user_id, wallet_id)
);
alter table public.ai_chat_history enable row level security;
create policy "Users can only access their own chat history" on public.ai_chat_history for all using (auth.uid() = user_id);
