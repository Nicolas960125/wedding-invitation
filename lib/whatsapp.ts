import { WEDDING_CONFIG } from './wedding-config';

type WhatsAppArgs = {
  guestName: string;
  link: string;
  maxAttendees: number;
};

/**
 * Genera el texto del mensaje WhatsApp para invitar a un grupo.
 * Editable: cambia este string si quieres personalizar el tono.
 */
export function buildWhatsAppMessage({ guestName, link, maxAttendees }: WhatsAppArgs): string {
  const namesIncomplete =
    WEDDING_CONFIG.brideName.startsWith('TODO') || WEDDING_CONFIG.groomName.startsWith('TODO');
  const couple = namesIncomplete
    ? 'Nosotros'
    : `${WEDDING_CONFIG.brideName} y ${WEDDING_CONFIG.groomName}`;
  const groupLine =
    maxAttendees > 1
      ? `Confirma tu asistencia con tu grupo (hasta ${maxAttendees} personas):`
      : 'Confirma tu asistencia:';

  return [
    `¡Hola ${guestName}!`,
    '',
    `${couple} tenemos el gusto de invitarte a nuestra boda.`,
    groupLine,
    link,
    '',
    'Te esperamos.',
  ].join('\n');
}

/**
 * Link que abre WhatsApp con el mensaje pre-cargado.
 * El usuario elige el contacto manualmente desde la app.
 */
export function buildWhatsAppLink(args: WhatsAppArgs): string {
  return `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(args))}`;
}
