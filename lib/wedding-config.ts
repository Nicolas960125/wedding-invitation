/**
 * Configuracion estatica del evento.
 * TODO: reemplazar todos los valores marcados con TODO_ antes del go-live.
 *
 * Algunos valores duplican datos de la tabla wedding_config (DB). La fuente de
 * verdad es la DB para campos editables desde /admin/config; este archivo
 * provee defaults y datos verdaderamente estaticos (paleta, locale, tz).
 */

export const WEDDING_CONFIG = {
  // ===== Datos del evento =====
  brideName: 'Paola',
  groomName: 'Nicolás',
  weddingDate: '2026-12-31T16:00:00-05:00', // ISO con TZ Bogota
  rsvpDeadline: '2026-12-15T23:59:59-05:00',
  ceremony: {
    name: 'TODO_NOMBRE_CEREMONIA',
    address: 'TODO_DIRECCION',
    mapsUrl: 'https://www.google.com/maps?q=TODO',
    time: '16:00',
  },
  reception: {
    name: 'TODO_NOMBRE_RECEPCION',
    address: 'TODO_DIRECCION',
    mapsUrl: 'https://www.google.com/maps?q=TODO',
    time: '19:00',
  },
  dressCode: {
    description: 'TODO descripcion del dress code',
    paletteHex: ['#000000', '#FFFFFF', '#D4AF37'],
  },
  registry: [
    { label: 'TODO Mesa de regalos', url: 'https://example.com' },
  ],
  welcomeMessage:
    'Un minuto, un segundo, un instante que queda para siempre. Acompáñanos a dar este nuevo paso, porque los momentos más bellos son los que se viven con quienes amamos.',
  // ============================================

  timezone: 'America/Bogota',
  locale: 'es-CO',
} as const;

export type WeddingConfigStatic = typeof WEDDING_CONFIG;
