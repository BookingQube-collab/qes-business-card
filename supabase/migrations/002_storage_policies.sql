-- Private business-cards storage bucket + policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-cards',
  'business-cards',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload business cards" on storage.objects;
create policy "Authenticated users can upload business cards"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'business-cards');

drop policy if exists "Authenticated users can read business cards" on storage.objects;
create policy "Authenticated users can read business cards"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'business-cards');

drop policy if exists "Authenticated users can update business cards" on storage.objects;
create policy "Authenticated users can update business cards"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'business-cards')
  with check (bucket_id = 'business-cards');
