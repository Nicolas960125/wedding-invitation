-- Funcion para generar tokens unicos de invitacion
-- Alfabeto sin caracteres ambiguos (no 0/O, 1/I/L), 8 chars, ~10^12 combinaciones

create or replace function public.generate_invitation_token()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  alphabet_len int := length(alphabet);
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, ceil(random() * alphabet_len)::int, 1);
    end loop;

    if not exists (select 1 from public.guest_group where token = candidate) then
      return candidate;
    end if;

    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'Could not generate unique invitation token after 10 attempts';
    end if;
  end loop;
end;
$$;
