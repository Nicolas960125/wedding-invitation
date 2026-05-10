-- Multiselect de canciones: cada grupo puede sugerir varias.
-- Reemplaza song_request + song_spotify_uri (single) por columna jsonb.
-- Estructura por item: { label: string, uri: string | null }
--   - label: "Despacito — Luis Fonsi" o texto libre
--   - uri: "spotify:track:..." o null si fue typed

alter table public.guest_group
  drop column if exists song_request,
  drop column if exists song_spotify_uri,
  add column if not exists songs jsonb not null default '[]'::jsonb;
