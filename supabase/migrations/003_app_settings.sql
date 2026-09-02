-- Shared app settings (service-role only). Used for Gemini API key override
-- so every booth device on the same deployment shares one Admin-saved key.

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_app_settings_updated_at();

alter table public.app_settings enable row level security;

-- No policies for anon/authenticated: only the service_role key can read/write.
-- (service_role bypasses RLS.)

revoke all on table public.app_settings from anon, authenticated;
grant select, insert, update, delete on table public.app_settings to service_role;
