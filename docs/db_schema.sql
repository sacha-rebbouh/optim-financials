-- Optim Financials - Supabase schema (MVP)
-- Notes:
-- - Assumes auth.users exists (Supabase default)
-- - Uses gen_random_uuid() from pgcrypto

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  canonical_name text not null,
  display_name text,
  website text,
  enrichment_json jsonb,
  enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  merchant_id uuid not null references merchants (id) on delete cascade,
  original_name text not null,
  normalized_name text not null,
  category_id uuid references categories (id) on delete set null,
  source_hint text,
  confidence_score numeric(5,2),
  is_business boolean,
  master_flag boolean,
  is_reimbursement boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists merchant_aliases_user_original_idx
  on merchant_aliases (user_id, original_name);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  provider text not null,
  account_label text,
  currency_base text not null default 'ILS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fx_rates (
  id uuid primary key default gen_random_uuid(),
  as_of_date date not null,
  base_currency text not null,
  quote_currency text not null,
  rate numeric(18,8) not null,
  created_at timestamptz not null default now(),
  unique (as_of_date, base_currency, quote_currency)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  source_id uuid references sources (id) on delete set null,
  merchant_id uuid references merchants (id) on delete set null,
  category_id uuid references categories (id) on delete set null,
  transaction_date date not null,
  original_merchant_name text not null,
  normalized_merchant_name text,
  amount_original numeric(12,2) not null,
  currency_original text not null,
  amount_base numeric(12,2),
  currency_base text,
  installment_total numeric(12,2),
  installment_monthly numeric(12,2),
  installment_remaining numeric(12,2),
  confidence_score numeric(5,2),
  is_business boolean not null default false,
  master_flag boolean not null default false,
  is_reimbursement boolean not null default false,
  transaction_hash text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transactions_user_hash_idx
  on transactions (user_id, transaction_hash);

create index if not exists transactions_user_date_idx
  on transactions (user_id, transaction_date desc);

create index if not exists transactions_user_category_idx
  on transactions (user_id, category_id);

create index if not exists transactions_user_merchant_idx
  on transactions (user_id, normalized_merchant_name);

create table if not exists rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  rule_type text not null,
  match_value text not null,
  category_id uuid references categories (id) on delete set null,
  is_business boolean,
  master_flag boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  llm_provider text not null default 'anthropic',
  monthly_budget_usd numeric(10,2),
  hard_limit_enabled boolean not null default false,
  anthropic_api_key text,
  gemini_api_key text,
  openai_api_key text,
  base_currency text not null default 'ILS',
  ocr_provider text not null default 'ocrspace',
  paywall_enabled boolean not null default false,
  paywall_unlocked boolean not null default false,
  merchant_lookup_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  period_month text not null,
  provider text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_month, provider)
);

create table if not exists reimbursements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  transaction_id uuid references transactions (id) on delete set null,
  expected_amount numeric(12,2) not null,
  received_amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  source_id uuid references sources (id) on delete set null,
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  parsed_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS policies (MVP)
alter table categories enable row level security;
alter table merchants enable row level security;
alter table merchant_aliases enable row level security;
alter table sources enable row level security;
alter table transactions enable row level security;
alter table rules enable row level security;
alter table reimbursements enable row level security;
alter table attachments enable row level security;
alter table user_settings enable row level security;
alter table api_usage enable row level security;
alter table fx_rates enable row level security;

create policy "categories_owner" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "merchants_owner" on merchants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "merchant_aliases_owner" on merchant_aliases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sources_owner" on sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_owner" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rules_owner" on rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reimbursements_owner" on reimbursements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments_owner" on attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_owner" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "api_usage_owner" on api_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fx_rates_read" on fx_rates
  for select using (auth.uid() is not null);

-- Storage bucket policies (run in Supabase SQL editor)
-- 1) create bucket 'uploads' (private)
-- 2) allow users to access their own files
-- Example policies:
-- create policy "attachments_read" on storage.objects
--   for select using (auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "attachments_write" on storage.objects
--   for insert with check (auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "attachments_delete" on storage.objects
--   for delete using (auth.uid()::text = (storage.foldername(name))[1]);
