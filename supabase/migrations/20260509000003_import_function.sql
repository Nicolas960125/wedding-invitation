-- RPC para importar grupos desde CSV de forma atomica
-- Input: jsonb array de grupos. Cada grupo:
--   { display_name, relationship, max_attendees, primary_name, companion_names: [string] }
-- Output: jsonb array con los grupos creados y sus tokens.

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
  imported jsonb := '[]'::jsonb;
begin
  -- Lock de seccion critica para evitar imports concurrentes que generen tokens duplicados
  perform pg_advisory_xact_lock(hashtext('import_guest_groups'));

  for group_data in select * from jsonb_array_elements(groups_data) loop
    -- Generar token unico
    new_token := public.generate_invitation_token();

    -- Crear grupo
    insert into public.guest_group (
      token, display_name, relationship, max_attendees
    ) values (
      new_token,
      group_data->>'display_name',
      group_data->>'relationship',
      (group_data->>'max_attendees')::int
    )
    returning id into new_group_id;

    -- Crear primary guest
    insert into public.guest (group_id, full_name, is_primary)
    values (new_group_id, group_data->>'primary_name', true);

    -- Crear acompanantes (placeholder o nombres reales)
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

-- Permitir llamada desde service role unicamente (no desde anon)
revoke all on function public.import_guest_groups(jsonb) from anon, authenticated;
grant execute on function public.import_guest_groups(jsonb) to service_role;
