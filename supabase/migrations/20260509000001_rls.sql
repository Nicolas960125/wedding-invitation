-- Row Level Security: bloquear todo acceso publico
-- Solo el service role (bypass de RLS) puede leer/escribir.
-- Los server actions usan service role; el cliente browser usa anon y NO puede leer nada.

alter table public.wedding_config enable row level security;
alter table public.guest_group enable row level security;
alter table public.guest enable row level security;
alter table public.admin_users enable row level security;
alter table public.email_outbox enable row level security;

-- No policies: rol anon y authenticated reciben deny por default.
-- Service role tiene bypass automatico.

-- NOTA: si en el futuro se agrega acceso directo desde el cliente admin
-- (ej: realtime), agregar policies especificas usando auth.jwt() ->> 'email'
-- contra la tabla admin_users. Por ahora todo pasa por server actions.
