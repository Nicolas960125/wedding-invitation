'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { rsvpFormSchema, type RsvpFormInput } from '@/lib/schemas/rsvp';
import { rsvpSubmitLimiter, checkLimit } from '@/lib/ratelimit';

export type RsvpActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitRsvpAction(
  _prev: RsvpActionState | undefined,
  formData: FormData,
): Promise<RsvpActionState> {
  const raw = formData.get('payload');
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Payload invalido' };
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Payload no es JSON valido' };
  }

  const result = rsvpFormSchema.safeParse(parsedRaw);
  if (!result.success) {
    return { ok: false, error: 'Datos invalidos', fieldErrors: flattenZod(result.error) };
  }

  const data: RsvpFormInput = result.data;

  // Rate limit por token
  const limitRes = await checkLimit(rsvpSubmitLimiter, `rsvp:${data.token}`);
  if (!limitRes.ok) {
    return { ok: false, error: 'Demasiados envios. Intenta en un minuto.' };
  }

  const admin = getAdminClient();

  // Verificar config global y deadline
  const { data: config, error: configErr } = await admin
    .from('wedding_config')
    .select('rsvp_open, rsvp_deadline, published_at')
    .eq('id', 1)
    .maybeSingle();

  if (configErr) {
    return { ok: false, error: 'Error de configuracion' };
  }

  const now = new Date();
  if (config) {
    if (!config.rsvp_open) return { ok: false, error: 'El RSVP esta cerrado.' };
    if (config.rsvp_deadline && new Date(config.rsvp_deadline) < now) {
      return { ok: false, error: 'El RSVP cerro el ' + new Date(config.rsvp_deadline).toLocaleDateString('es-CO') };
    }
  }

  // Verificar grupo y aforo
  const { data: group, error: groupErr } = await admin
    .from('guest_group')
    .select('id, max_attendees')
    .eq('token', data.token)
    .maybeSingle();

  if (groupErr || !group) {
    return { ok: false, error: 'Invitacion no encontrada' };
  }

  const attendingCount = data.guests.filter((g) => g.attending === 'yes').length;
  if (attendingCount > group.max_attendees) {
    return {
      ok: false,
      error: `Solo podes confirmar hasta ${group.max_attendees} asistentes (intentaste ${attendingCount}).`,
    };
  }

  // Update guests + grupo
  for (const guest of data.guests) {
    const { error: updErr } = await admin
      .from('guest')
      .update({
        full_name: guest.fullName,
        title: guest.title ?? null,
        attending: guest.attending === 'yes' ? true : guest.attending === 'no' ? false : null,
        dietary_restrictions: guest.dietaryRestrictions ?? null,
        source: 'guest',
      })
      .eq('id', guest.id)
      .eq('group_id', group.id);

    if (updErr) {
      return { ok: false, error: 'Error guardando una de las personas: ' + updErr.message };
    }
  }

  const { error: groupUpdErr } = await admin
    .from('guest_group')
    .update({
      message: data.message ?? null,
      songs: data.songs ?? [],
      responded_at: new Date().toISOString(),
    })
    .eq('id', group.id);

  if (groupUpdErr) {
    return { ok: false, error: 'Error guardando el grupo: ' + groupUpdErr.message };
  }

  revalidatePath(`/invite/${data.token}`);
  return { ok: true, message: '¡Confirmado! Gracias por responder.' };
}

function flattenZod(err: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const out: Record<string, string> = {};
  const flat = err.flatten().fieldErrors;
  for (const [key, msgs] of Object.entries(flat)) {
    if (msgs?.length) out[key] = msgs[0];
  }
  return out;
}
