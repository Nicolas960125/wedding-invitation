'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';

const BUCKET = 'wedding-assets';
const MAX_SIZE = 5_000_000;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type RawPhoto = { year: number; caption: string | null; image_path: string };

export type PhotoActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const uploadSchema = z.object({
  year: z.coerce.number().int().min(1950).max(2100),
  caption: z.string().max(120).optional().default(''),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = await isAuthorizedAdmin(user?.email);
  if (!allowed) throw new Error('No autorizado');
  return getAdminClient();
}

async function readPhotos(admin: ReturnType<typeof getAdminClient>): Promise<RawPhoto[]> {
  const { data: config } = await admin
    .from('wedding_config')
    .select('couple_photos')
    .eq('id', 1)
    .maybeSingle();
  return (config?.couple_photos as RawPhoto[] | null) ?? [];
}

async function writePhotos(
  admin: ReturnType<typeof getAdminClient>,
  photos: RawPhoto[],
): Promise<void> {
  const { error } = await admin
    .from('wedding_config')
    .upsert({ id: 1, couple_photos: photos }, { onConflict: 'id' });
  if (error) throw new Error('Error guardando fotos: ' + error.message);
}

export async function uploadCouplePhotoAction(
  _prev: PhotoActionState | undefined,
  formData: FormData,
): Promise<PhotoActionState> {
  let admin: ReturnType<typeof getAdminClient>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No autorizado' };
  }

  const file = formData.get('photo');
  if (!(file instanceof File)) return { ok: false, error: 'Falta el archivo' };
  if (file.size === 0) return { ok: false, error: 'Archivo vacío' };
  if (file.size > MAX_SIZE) return { ok: false, error: 'Máximo 5MB' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Solo JPG, PNG o WEBP' };
  }

  const parsed = uploadSchema.safeParse({
    year: formData.get('year'),
    caption: formData.get('caption') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: 'Año o caption inválido' };
  }

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const path = `couple/${parsed.data.year}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { ok: false, error: 'Error subiendo: ' + uploadErr.message };

  try {
    const photos = await readPhotos(admin);
    photos.push({
      year: parsed.data.year,
      caption: parsed.data.caption.trim() || null,
      image_path: path,
    });
    await writePhotos(admin, photos);
  } catch (e) {
    // Si falla guardar, limpiar el archivo
    await admin.storage.from(BUCKET).remove([path]);
    return { ok: false, error: e instanceof Error ? e.message : 'Error guardando' };
  }

  revalidatePath('/admin/config');
  revalidatePath('/');
  return { ok: true, message: 'Foto agregada' };
}

export async function removeCouplePhotoAction(imagePath: string): Promise<PhotoActionState> {
  let admin: ReturnType<typeof getAdminClient>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No autorizado' };
  }

  if (!imagePath || typeof imagePath !== 'string') {
    return { ok: false, error: 'Path inválido' };
  }

  try {
    const photos = await readPhotos(admin);
    const next = photos.filter((p) => p.image_path !== imagePath);
    await writePhotos(admin, next);

    // Borrar del storage (no bloqueante: si falla no es crítico)
    await admin.storage.from(BUCKET).remove([imagePath]);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error eliminando' };
  }

  revalidatePath('/admin/config');
  revalidatePath('/');
  return { ok: true, message: 'Foto eliminada' };
}
