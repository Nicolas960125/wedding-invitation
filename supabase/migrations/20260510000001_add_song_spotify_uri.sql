-- Spotify integration: guarda la URI del track elegido desde el buscador.
-- Formato: 'spotify:track:6rqhFgbbKwnb9MLmUQDhG6'
-- Si el invitado escribe texto libre sin elegir de Spotify, queda NULL.

alter table public.guest_group
  add column if not exists song_spotify_uri text;
