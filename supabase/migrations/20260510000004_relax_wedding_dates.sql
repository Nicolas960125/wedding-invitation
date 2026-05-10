-- wedding_date y rsvp_deadline ya no son NOT NULL para que se pueda crear
-- la fila en wedding_config desde flujos parciales (ej: subir una foto
-- antes de cargar la config principal). El codigo trata null con fallback.

alter table public.wedding_config
  alter column wedding_date drop not null,
  alter column rsvp_deadline drop not null;
