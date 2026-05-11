-- Agrega titulo (Sr./Sra./Srita.) por persona y RPC para dividir grupos.

set check_function_bodies = off;

-- 1) Columna title en guest
alter table public.guest
  add column if not exists title text;

alter table public.guest
  drop constraint if exists guest_title_check;

alter table public.guest
  add constraint guest_title_check
  check (title is null or title in ('Sr.', 'Sra.', 'Srita.'));

-- 2) RPC para dividir un grupo en dos.
-- Mueve los guest_ids indicados a un grupo nuevo (con token unico),
-- recalcula max_attendees en ambos grupos y reasigna primary si hace falta.
create or replace function public.split_guest_group(
  source_group_id uuid,
  guest_ids uuid[],
  new_display_name text,
  new_relationship text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_group public.guest_group%rowtype;
  new_group_id uuid;
  new_token text;
  moved_count int;
  remaining_count int;
  has_remaining_primary boolean;
  has_new_primary boolean;
begin
  if new_display_name is null or btrim(new_display_name) = '' then
    raise exception 'new_display_name no puede estar vacio';
  end if;

  if guest_ids is null or array_length(guest_ids, 1) is null then
    raise exception 'guest_ids no puede estar vacio';
  end if;

  -- Lock fila origen y validaciones
  select * into source_group
  from public.guest_group
  where id = source_group_id
  for update;

  if not found then
    raise exception 'Grupo origen % no existe', source_group_id;
  end if;

  -- Asegurar que todos los guest_ids pertenezcan al grupo origen
  if exists (
    select 1
    from unnest(guest_ids) as g(id)
    where not exists (
      select 1 from public.guest x where x.id = g.id and x.group_id = source_group_id
    )
  ) then
    raise exception 'Alguno de los invitados no pertenece al grupo origen';
  end if;

  -- Conteos
  select count(*) into moved_count
  from public.guest
  where group_id = source_group_id and id = any(guest_ids);

  select count(*) into remaining_count
  from public.guest
  where group_id = source_group_id and id <> all(guest_ids);

  if remaining_count = 0 then
    raise exception 'No se puede mover a todos los invitados (el grupo origen quedaria vacio); usa eliminar grupo en su lugar';
  end if;

  -- Lock advisory para no colisionar con generate_invitation_token
  perform pg_advisory_xact_lock(hashtext('import_guest_groups'));
  new_token := public.generate_invitation_token();

  -- Crear grupo nuevo
  insert into public.guest_group (token, display_name, relationship, max_attendees)
  values (new_token, btrim(new_display_name), nullif(btrim(coalesce(new_relationship, '')), ''), moved_count)
  returning id into new_group_id;

  -- Mover invitados
  update public.guest
  set group_id = new_group_id
  where group_id = source_group_id and id = any(guest_ids);

  -- Ajustar max_attendees del grupo origen
  update public.guest_group
  set max_attendees = remaining_count
  where id = source_group_id;

  -- Reasignar primary si en el origen no quedo ninguno
  select exists (
    select 1 from public.guest where group_id = source_group_id and is_primary = true
  ) into has_remaining_primary;

  if not has_remaining_primary then
    update public.guest
    set is_primary = true
    where id = (
      select id from public.guest
      where group_id = source_group_id
      order by created_at asc
      limit 1
    );
  end if;

  -- Asegurar exactamente un primary en el grupo nuevo
  select exists (
    select 1 from public.guest where group_id = new_group_id and is_primary = true
  ) into has_new_primary;

  if not has_new_primary then
    update public.guest
    set is_primary = true
    where id = (
      select id from public.guest
      where group_id = new_group_id
      order by created_at asc
      limit 1
    );
  end if;

  return jsonb_build_object(
    'new_group_id', new_group_id,
    'new_token', new_token,
    'moved_count', moved_count,
    'remaining_count', remaining_count
  );
end;
$$;

revoke all on function public.split_guest_group(uuid, uuid[], text, text) from anon, authenticated;
grant execute on function public.split_guest_group(uuid, uuid[], text, text) to service_role;

-- 3) Reemplazo de import_guest_groups para soportar primary_title opcional
create or replace function public.import_guest_groups(groups_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  group_data jsonb;
  new_group_id uuid;
  new_token text;
  companion_name text;
  primary_title text;
  imported jsonb := '[]'::jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('import_guest_groups'));

  for group_data in select * from jsonb_array_elements(groups_data) loop
    new_token := public.generate_invitation_token();

    insert into public.guest_group (
      token, display_name, relationship, max_attendees
    ) values (
      new_token,
      group_data->>'display_name',
      group_data->>'relationship',
      (group_data->>'max_attendees')::int
    )
    returning id into new_group_id;

    primary_title := nullif(group_data->>'primary_title', '');

    insert into public.guest (group_id, full_name, is_primary, title)
    values (new_group_id, group_data->>'primary_name', true, primary_title);

    for companion_name in
      select jsonb_array_elements_text(group_data->'companion_names')
    loop
      insert into public.guest (group_id, full_name, is_primary)
      values (new_group_id, companion_name, false);
    end loop;

    imported := imported || jsonb_build_object(
      'group_id', new_group_id,
      'token', new_token,
      'display_name', group_data->>'display_name',
      'relationship', group_data->>'relationship',
      'max_attendees', (group_data->>'max_attendees')::int
    );
  end loop;

  return imported;
end;
$$;

revoke all on function public.import_guest_groups(jsonb) from anon, authenticated;
grant execute on function public.import_guest_groups(jsonb) to service_role;
