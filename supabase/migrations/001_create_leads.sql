-- QES Business Card Leads — leads table
create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  position text,
  phone text,
  email text,
  interest text not null
    check (interest in (
      'WhatsApp AI',
      'Contact Center',
      'FEC Solutions',
      'Events',
      'Partnership',
      'Other'
    )),
  priority text not null
    check (priority in ('Hot', 'Warm', 'Cold')),
  owner text not null
    check (owner in ('Rajan', 'Nicole', 'Waqar', 'Mary')),
  notes text,
  business_card_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(email));
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_priority_idx on public.leads (priority);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "Authenticated users can select leads" on public.leads;
create policy "Authenticated users can select leads"
  on public.leads
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert leads" on public.leads;
create policy "Authenticated users can insert leads"
  on public.leads
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update leads" on public.leads;
create policy "Authenticated users can update leads"
  on public.leads
  for update
  to authenticated
  using (true)
  with check (true);
