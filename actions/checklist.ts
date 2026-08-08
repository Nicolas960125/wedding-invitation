'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';

export type ChecklistActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const uuid = z.string().uuid();

const dueDateSchema = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida'), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const categorySchema = z
  .string()
  .max(60)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : 'General'));

const createTaskSchema = z.object({
  title: z.string().min(1, 'Titulo requerido').max(200),
  category: categorySchema,
  due_date: dueDateSchema,
});

const updateTaskSchema = z.object({
  task_id: uuid,
  title: z.string().min(1, 'Titulo requerido').max(200),
  category: categorySchema,
  due_date: dueDateSchema,
});

const toggleTaskSchema = z.object({
  task_id: uuid,
  completed: z.boolean(),
});

const deleteTaskSchema = z.object({
  task_id: uuid,
});

async function ensureAdmin(): Promise<ChecklistActionState | null> {
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

function revalidateChecklist() {
  revalidatePath('/admin/checklist');
}

export async function createTaskAction(input: unknown): Promise<ChecklistActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin.from('checklist_task').insert({
    title: parsed.data.title.trim(),
    category: parsed.data.category,
    due_date: parsed.data.due_date,
  });

  if (error) return { ok: false, error: 'Error creando tarea: ' + error.message };

  revalidateChecklist();
  return { ok: true, message: 'Tarea agregada' };
}

export async function updateTaskAction(input: unknown): Promise<ChecklistActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin
    .from('checklist_task')
    .update({
      title: parsed.data.title.trim(),
      category: parsed.data.category,
      due_date: parsed.data.due_date,
    })
    .eq('id', parsed.data.task_id);

  if (error) return { ok: false, error: 'Error guardando tarea: ' + error.message };

  revalidateChecklist();
  return { ok: true, message: 'Tarea actualizada' };
}

export async function toggleTaskAction(input: unknown): Promise<ChecklistActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = toggleTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin
    .from('checklist_task')
    .update({ completed_at: parsed.data.completed ? new Date().toISOString() : null })
    .eq('id', parsed.data.task_id);

  if (error) return { ok: false, error: 'Error actualizando tarea: ' + error.message };

  revalidateChecklist();
  return { ok: true };
}

export async function deleteTaskAction(input: unknown): Promise<ChecklistActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos invalidos: ' + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin.from('checklist_task').delete().eq('id', parsed.data.task_id);

  if (error) return { ok: false, error: 'Error eliminando tarea: ' + error.message };

  revalidateChecklist();
  return { ok: true, message: 'Tarea eliminada' };
}
