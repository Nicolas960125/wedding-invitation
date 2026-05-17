import { getAdminClient } from '@/lib/supabase/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InvitationActions } from '@/components/shared/InvitationActions';
import { BulkPendingCopy } from './_components/BulkPendingCopy';
import { GroupEditDialog, type GroupEditGuest } from './_components/GroupEditDialog';
import type { GuestTitle } from '@/lib/schemas/csvRow';

export const dynamic = 'force-dynamic';

type GuestRow = {
  id: string;
  full_name: string;
  title: GuestTitle | null;
  is_primary: boolean;
  attending: boolean | null;
  created_at: string;
};

export default async function AdminGroupsPage() {
  const admin = getAdminClient();

  const { data: groups } = await admin
    .from('guest_group')
    .select(
      'id, token, display_name, relationship, max_attendees, responded_at, guest(id, full_name, title, is_primary, attending, created_at)',
    )
    .order('created_at', { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const list = groups ?? [];
  const pending = list.filter((g) => g.responded_at === null);
  const pendingForBulk = pending.map((g) => ({
    name: g.display_name,
    link: `${siteUrl}/invite/${g.token}`,
    maxAttendees: g.max_attendees,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Grupos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {list.length} grupos · {pending.length} pendientes de respuesta.
          </p>
        </div>
        {pendingForBulk.length > 0 && <BulkPendingCopy items={pendingForBulk} />}
      </div>

      <div className="bg-card overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Parentezco</TableHead>
              <TableHead>Aforo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((g) => {
              const guestsRaw = (g.guest ?? []) as GuestRow[];
              const yes = guestsRaw.filter((x) => x.attending === true).length;
              const no = guestsRaw.filter((x) => x.attending === false).length;
              const link = `${siteUrl}/invite/${g.token}`;
              const guestsForEdit: GroupEditGuest[] = [...guestsRaw]
                .sort((a, b) => {
                  if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
                  return a.created_at.localeCompare(b.created_at);
                })
                .map((x) => ({
                  id: x.id,
                  full_name: x.full_name,
                  title: x.title,
                  is_primary: x.is_primary,
                  attending: x.attending,
                }));
              return (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.display_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {g.relationship ?? '—'}
                  </TableCell>
                  <TableCell>{g.max_attendees}</TableCell>
                  <TableCell>
                    {g.responded_at ? (
                      <Badge variant="secondary">
                        {yes} si · {no} no
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <GroupEditDialog
                        group={{
                          id: g.id,
                          display_name: g.display_name,
                          relationship: g.relationship,
                          max_attendees: g.max_attendees,
                          guests: guestsForEdit,
                        }}
                      />
                      <InvitationActions
                        guestName={g.display_name}
                        link={link}
                        maxAttendees={g.max_attendees}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                  Aun no hay grupos. Importa un CSV en la seccion Importar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
