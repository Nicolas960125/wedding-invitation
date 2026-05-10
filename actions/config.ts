'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';
import { z } from 'zod';

// Asumimos zona horaria de Bogota (UTC-5, sin DST) para los inputs datetime-local
// que el browser envia como "YYYY-MM-DDTHH:mm" sin offset.
const BOGOTA_OFFSET = '-05:00';

function bogotaLocalToIso(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  // Si ya viene con offset/Z, lo dejamos como esta
  if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(value)) return value;
  // Anadir segundos si faltan ("YYYY-MM-DDTHH:mm" -> "YYYY-MM-DDTHH:mm:00")
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}${BOGOTA_OFFSET}`;
}

const updateConfigSchema = z.object({
  rsvp_deadline: z
    .string()
    .transform(bogotaLocalToIso)
    .pipe(z.string().datetime({ offset: true }))
    .optional(),
  rsvp_open: z.boolean().optional(),
  wedding_date: z
    .string()
    .transform(bogotaLocalToIso)
    .pipe(z.string().datetime({ offset: true }))
    .optional(),
  ceremony_location_name: z.string().nullable().optional(),
  ceremony_location_address: z.string().nullable().optional(),
  ceremony_location_maps_url: z.string().url().nullable().optional(),
  ceremony_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  reception_location_name: z.string().nullable().optional(),
  reception_location_address: z.string().nullable().optional(),
  reception_location_maps_url: z.string().url().nullable().optional(),
  reception_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  dress_code: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  welcome_message: z.string().nullable().optional(),
  relationship_start_year: z.coerce
    .number()
    .int()
    .min(1950)
    .max(2100)
    .nullable()
    .optional(),
  registry_links: z
    .string()
    .transform((s, ctx) => {
      const trimmed = s.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return parsed;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JSON invalido' });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.object({ label: z.string().min(1).max(80), url: z.string().url() })))
    .optional(),
});

export type ConfigActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function updateConfigAction(
  _prev: ConfigActionState | undefined,
  formData: FormData,
): Promise<ConfigActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = await isAuthorizedAdmin(user?.email);
  if (!allowed) return { ok: false, error: 'No autorizado' };

  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'rsvp_open') continue; // se maneja aparte (checkbox no envia false cuando esta desmarcado)
    if (value === '') continue;
    raw[key] = value;
  }
  // Siempre setear rsvp_open segun presencia del checkbox
  raw.rsvp_open = formData.has('rsvp_open');

  const parsed = updateConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        'Datos invalidos: ' +
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from('wedding_config')
    .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' });

  if (error) {
    return { ok: false, error: 'Error guardando: ' + error.message };
  }

  revalidatePath('/admin/config');
  revalidatePath('/');
  return { ok: true, message: 'Configuracion actualizada' };
}
