'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';
import { parseGuestsCsv } from '@/lib/csv';

const MAX_FILE_SIZE = 1_000_000; // 1 MB
const MAX_ROWS = 500;

export type ImportedGroup = {
  group_id: string;
  token: string;
  display_name: string;
  relationship: string | null;
  max_attendees: number;
};

export type ImportActionState = {
  ok: boolean;
  imported?: ImportedGroup[];
  errors?: { line: number; message: string }[];
  error?: string;
  warnings?: string[];
};

export async function importGuestsAction(
  _prev: ImportActionState | undefined,
  formData: FormData,
): Promise<ImportActionState> {
  // Auth admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = await isAuthorizedAdmin(user?.email);
  if (!allowed) {
    return { ok: false, error: 'No autorizado' };
  }

  const file = formData.get('csv');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Archivo invalido' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Archivo vacio' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: 'Archivo demasiado grande (maximo 1 MB)' };
  }

  const text = await file.text();
  const parsed = parseGuestsCsv(text);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }

  if (parsed.payloads.length === 0) {
    return { ok: false, error: 'El CSV no contiene filas validas' };
  }
  if (parsed.payloads.length > MAX_ROWS) {
    return { ok: false, error: `Maximo ${MAX_ROWS} filas por import (recibidas ${parsed.payloads.length})` };
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc('import_guest_groups', {
    groups_data: parsed.payloads,
  });

  if (error) {
    return { ok: false, error: 'Error en RPC import_guest_groups: ' + error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/groups');
  revalidatePath('/admin/import');

  return { ok: true, imported: (data as ImportedGroup[]) ?? [], warnings: parsed.warnings };
}
