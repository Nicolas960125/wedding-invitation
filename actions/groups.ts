'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';
import { GUEST_TITLES } from '@/lib/schemas/csvRow';

export type GroupActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

const titleSchema = z
  .union([z.enum(GUEST_TITLES), z.literal(''), z.null()])
  .transform((v) => (v === '' || v === null ? null : v));

const uuid = z.string().uuid();

const updateGroupSchema = z.object({
  group_id: uuid,
  display_name: z.string().min(1, 'Nombre requerido').max(120),
  relationship: z
    .string()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

const attendingSchema = z
  .union([z.enum(['yes', 'no', 'pending']), z.null()])
  .optional()
  .transform((v) => (v ?? undefined));

const updateGuestSchema = z.object({
  guest_id: uuid,
  group_id: uuid,
  full_name: z.string().min(1, 'Nombre requerido').max(120),
  title: titleSchema,
  attending: attendingSchema,
});

const addGuestSchema = z.object({
  group_id: uuid,
  full_name: z.string().min(1, 'Nombre requerido').max(120),
  title: titleSchema,
});

const removeGuestSchema = z.object({
  guest_id: uuid,
  group_id: uuid,
});

const splitGroupSchema = z.object({
  source_group_id: uuid,
  guest_ids: z.array(uuid).min(1, 'Selecciona al menos un invitado'),
  new_display_name: z.string().min(1, 'Nombre del nuevo grupo requerido').max(120),
  new_relationship: z
    .string()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

const deleteGroupSchema = z.object({
  group_id: uuid,
});

async function ensureAdmin(): Promise<GroupActionState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = await isAuthorizedAdmin(user?.email);
  if (!allowed) return { ok: false, error: 'No autorizado' };
  return null;
}

function flattenZod(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || 'campo'}: ${i.message}`).join('; ');
}

function revalidateGroups() {
  revalidatePath('/admin');
  revalidatePath('/admin/groups');
}

export async function updateGroupAction(input: unknown): Promise<GroupActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = updateGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin
    .from('guest_group')
    .update({
      display_name: parsed.data.display_name.trim(),
      relationship: parsed.data.relationship,
    })
    .eq('id', parsed.data.group_id);

  if (error) return { ok: false, error: 'Error guardando grupo: ' + error.message };

  revalidateGroups();
  return { ok: true, message: 'Grupo actualizado' };
}

export async function updateGuestAction(input: unknown): Promise<GroupActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = updateGuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();

  type GuestUpdate = {
    full_name: string;
    title: string | null;
    attending?: boolean | null;
    source?: 'admin';
  };

  const update: GuestUpdate = {
    full_name: parsed.data.full_name.trim(),
    title: parsed.data.title,
  };

  if (parsed.data.attending !== undefined) {
    update.attending =
      parsed.data.attending === 'yes' ? true : parsed.data.attending === 'no' ? false : null;
    update.source = 'admin';
  }

  const { error } = await admin
    .from('guest')
    .update(update)
    .eq('id', parsed.data.guest_id)
    .eq('group_id', parsed.data.group_id);

  if (error) return { ok: false, error: 'Error guardando invitado: ' + error.message };

  // Si el admin esta marcando asistencia y el grupo aun no tiene responded_at,
  // se marca como respondido ahora (para no quedar en "Pendiente" en la tabla).
  if (parsed.data.attending !== undefined) {
    const { data: g } = await admin
      .from('guest_group')
      .select('responded_at')
      .eq('id', parsed.data.group_id)
      .maybeSingle();
    if (g && g.responded_at === null) {
      await admin
        .from('guest_group')
        .update({ responded_at: new Date().toISOString() })
        .eq('id', parsed.data.group_id);
    }
  }

  revalidateGroups();
  return { ok: true, message: 'Invitado actualizado' };
}

export async function addGuestToGroupAction(input: unknown): Promise<GroupActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = addGuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();

  const { data: group, error: gErr } = await admin
    .from('guest_group')
    .select('id, max_attendees')
    .eq('id', parsed.data.group_id)
    .maybeSingle();

  if (gErr || !group) return { ok: false, error: 'Grupo no encontrado' };

  const { error: insErr } = await admin.from('guest').insert({
    group_id: parsed.data.group_id,
    full_name: parsed.data.full_name.trim(),
    title: parsed.data.title,
    is_primary: false,
    source: 'admin',
  });

  if (insErr) return { ok: false, error: 'Error agregando invitado: ' + insErr.message };

  const { error: updErr } = await admin
    .from('guest_group')
    .update({ max_attendees: group.max_attendees + 1 })
    .eq('id', parsed.data.group_id);

  if (updErr) return { ok: false, error: 'Error ajustando aforo: ' + updErr.message };

  revalidateGroups();
  return { ok: true, message: 'Invitado agregado' };
}

export async function removeGuestAction(input: unknown): Promise<GroupActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = removeGuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();

  const { data: guest, error: gErr } = await admin
    .from('guest')
    .select('id, is_primary, group_id')
    .eq('id', parsed.data.guest_id)
    .eq('group_id', parsed.data.group_id)
    .maybeSingle();

  if (gErr || !guest) return { ok: false, error: 'Invitado no encontrado' };

  const { count, error: countErr } = await admin
    .from('guest')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', parsed.data.group_id);

  if (countErr) return { ok: false, error: 'Error contando invitados: ' + countErr.message };
  if ((count ?? 0) <= 1) {
    return { ok: false, error: 'No podes quitar al unico invitado; elimina el grupo entero' };
  }

  const { error: delErr } = await admin
    .from('guest')
    .delete()
    .eq('id', parsed.data.guest_id)
    .eq('group_id', parsed.data.group_id);

  if (delErr) return { ok: false, error: 'Error eliminando invitado: ' + delErr.message };

  // Si el eliminado era primary, reasignar al mas antiguo restante
  if (guest.is_primary) {
    const { data: next } = await admin
      .from('guest')
      .select('id')
      .eq('group_id', parsed.data.group_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await admin.from('guest').update({ is_primary: true }).eq('id', next.id);
    }
  }

  // Ajustar max_attendees al nuevo conteo real
  const newCount = (count ?? 1) - 1;
  await admin.from('guest_group').update({ max_attendees: newCount }).eq('id', parsed.data.group_id);

  revalidateGroups();
  return { ok: true, message: 'Invitado removido' };
}

export async function splitGroupAction(input: unknown): Promise<GroupActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = splitGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { data, error } = await admin.rpc('split_guest_group', {
    source_group_id: parsed.data.source_group_id,
    guest_ids: parsed.data.guest_ids,
    new_display_name: parsed.data.new_display_name,
    new_relationship: parsed.data.new_relationship,
  });

  if (error) return { ok: false, error: 'Error dividiendo grupo: ' + error.message };

  revalidateGroups();
  return { ok: true, message: 'Grupo dividido', data };
}

export async function deleteGroupAction(input: unknown): Promise<GroupActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = deleteGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin.from('guest_group').delete().eq('id', parsed.data.group_id);

  if (error) return { ok: false, error: 'Error eliminando grupo: ' + error.message };

  revalidateGroups();
  return { ok: true, message: 'Grupo eliminado' };
}
