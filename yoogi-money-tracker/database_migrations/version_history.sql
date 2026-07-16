-- Create table for Version History
create table public.version_history (
    id text default gen_random_uuid()::text primary key,
    user_id uuid references auth.users not null,
    name text,
    data jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.version_history enable row level security;

-- Create policy
create policy "Users can access their own version history" on public.version_history for all using (auth.uid() = user_id);

-- Optional: index on user_id and created_at for faster queries
create index version_history_user_id_idx on public.version_history(user_id);
create index version_history_created_at_idx on public.version_history(created_at desc);
