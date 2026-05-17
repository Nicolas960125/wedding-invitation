-- Mensajes y canciones por grupo en tablas append-only. Cada RSVP nuevo
-- inserta una fila por dedicatoria o cancion, en lugar de sobreescribir
-- guest_group.message / guest_group.songs. La asistencia (guest.attending)
-- sigue siendo UPSERT.

set check_function_bodies = off;

create table if not exists public.guest_group_message (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.guest_group(id) on delete cascade,
  content text not null check (btrim(content) <> ''),
  created_at timestamptz not null default now()
);

create index if not exists idx_gg_message_group on public.guest_group_message(group_id);
create index if not exists idx_gg_message_created on public.guest_group_message(created_at desc);

create table if not exists public.guest_group_song (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.guest_group(id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  uri text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gg_song_group on public.guest_group_song(group_id);
create index if not exists idx_gg_song_created on public.guest_group_song(created_at desc);

-- Dedupe accidental: el mismo grupo no inserta dos veces la misma cancion
-- (mismo uri si existe, o mismo label si fue texto libre).
-- Para uri NULL, el unique compuesto no aplica; se evita en el server action.
create unique index if not exists idx_gg_song_unique_uri
  on public.guest_group_song(group_id, uri)
  where uri is not null;

-- Backfill desde guest_group.message
insert into public.guest_group_message (group_id, content, created_at)
select id, message, coalesce(responded_at, updated_at, created_at)
from public.guest_group
where message is not null and btrim(message) <> ''
on conflict do nothing;

-- Backfill desde guest_group.songs (jsonb array de { label, uri, imageUrl })
insert into public.guest_group_song (group_id, label, uri, image_url, created_at)
select
  g.id,
  coalesce(s->>'label', ''),
  nullif(s->>'uri', ''),
  nullif(s->>'imageUrl', ''),
  coalesce(g.responded_at, g.updated_at, g.created_at)
from public.guest_group g,
     lateral jsonb_array_elements(coalesce(g.songs, '[]'::jsonb)) as s
where coalesce(s->>'label', '') <> ''
on conflict do nothing;

-- Las columnas guest_group.message y guest_group.songs quedan en la tabla
-- pero el codigo deja de escribirlas. Se mantienen como respaldo durante
-- una transicion; se pueden dropear en una migracion futura.
