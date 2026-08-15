-- Asignacion de puestos del plano de mesas (solo admin, via server actions).
-- seat_id es la silla del plano (ej: 'A-head', 'A-L0', 'B-R15').
-- PK en seat_id: una silla no puede tener dos invitados.
-- Unique en guest_id: un invitado no puede estar en dos sillas.

create table if not exists public.seat_assignment (
  seat_id text primary key check (btrim(seat_id) <> ''),
  guest_id uuid not null unique references public.guest(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_seat_assignment_updated_at on public.seat_assignment;
create trigger trg_seat_assignment_updated_at
before update on public.seat_assignment
for each row execute function public.set_updated_at();

-- Sin policies: igual que el resto de tablas, todo pasa por service role.
alter table public.seat_assignment enable row level security;
