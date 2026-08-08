import { getAdminClient } from '@/lib/supabase/admin';
import { ChecklistClient, type ChecklistTask } from './_components/ChecklistClient';

export const dynamic = 'force-dynamic';

export default async function ChecklistPage() {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('checklist_task')
    .select('id, title, category, due_date, completed_at, created_at')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-2xl">Checklist</h1>
        <p className="text-destructive mt-4 text-sm">Error cargando tareas: {error.message}</p>
      </div>
    );
  }

  return <ChecklistClient tasks={(data ?? []) as ChecklistTask[]} />;
}
