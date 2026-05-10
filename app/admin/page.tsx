import { getAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const admin = getAdminClient();

  const [{ data: groups }, { data: guests }] = await Promise.all([
    admin.from('guest_group').select('id, responded_at, max_attendees'),
    admin.from('guest').select('id, attending'),
  ]);

  const totalGroups = groups?.length ?? 0;
  const respondedGroups = groups?.filter((g) => g.responded_at !== null).length ?? 0;
  const totalGuests = guests?.length ?? 0;
  const yesGuests = guests?.filter((g) => g.attending === true).length ?? 0;
  const noGuests = guests?.filter((g) => g.attending === false).length ?? 0;
  const pendingGuests = guests?.filter((g) => g.attending === null).length ?? 0;
  const responseRate = totalGroups > 0 ? Math.round((respondedGroups * 100) / totalGroups) : 0;

  const kpis = [
    { label: 'Grupos', value: totalGroups },
    { label: 'Invitados totales', value: totalGuests },
    { label: 'Confirmados (si)', value: yesGuests },
    { label: 'Declinados (no)', value: noGuests },
    { label: 'Sin responder', value: pendingGuests },
    { label: 'Tasa de respuesta', value: `${responseRate}%` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Resumen de RSVPs en tiempo real.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
