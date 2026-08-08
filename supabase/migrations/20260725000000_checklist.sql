-- Checklist de pendientes de la boda (solo admin, via server actions).

create table if not exists public.checklist_task (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  category text not null default 'General' check (btrim(category) <> ''),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_checklist_task_category on public.checklist_task(category);

-- Sin policies: igual que el resto de tablas, todo pasa por service role.
alter table public.checklist_task enable row level security;
