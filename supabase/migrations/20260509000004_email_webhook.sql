-- Disparador de notificacion email cuando un grupo confirma RSVP.
--
-- Estrategia: Database Webhook nativo de Supabase (configurable desde el dashboard).
-- Esta migration documenta la configuracion esperada; el webhook real se crea
-- desde Dashboard -> Database -> Webhooks con estos parametros:
--
--   Name:       send-rsvp-email
--   Table:      public.guest_group
--   Events:     UPDATE
--   Conditions: OLD.responded_at IS DISTINCT FROM NEW.responded_at
--   HTTP:       POST {SUPABASE_FUNCTIONS_URL}/send-rsvp-email
--   Headers:    Authorization: Bearer {SUPABASE_DB_WEBHOOK_SECRET}
--
-- Como alternativa SQL pura (si se quiere version-controlled), usar pg_net:
--
--   create extension if not exists pg_net;
--   create or replace function public.notify_rsvp_change() ...
--
-- Para esta version dejamos el webhook gestionado desde el dashboard,
-- mas simple de mantener segun la guia oficial de Supabase.

-- Comentario informativo en la tabla
comment on column public.guest_group.responded_at is
  'Timestamp del primer RSVP. Cambios disparan el database webhook send-rsvp-email.';
