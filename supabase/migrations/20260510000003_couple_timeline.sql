-- Línea de tiempo de los novios: año de inicio + fotos taggeadas con año.

alter table public.wedding_config
  add column if not exists relationship_start_year integer,
  add column if not exists couple_photos jsonb not null default '[]'::jsonb;

-- Bucket publico para fotos de la invitacion.
-- Lectura publica, escritura solo via service_role (bypass de RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-assets',
  'wedding-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wedding_assets_public_read" on storage.objects;
create policy "wedding_assets_public_read" on storage.objects
  for select using (bucket_id = 'wedding-assets');
