-- Agrega columna welcome_message para editar la frase romantica de intro
-- desde /admin/config sin tocar codigo.

alter table public.wedding_config
  add column if not exists welcome_message text;
