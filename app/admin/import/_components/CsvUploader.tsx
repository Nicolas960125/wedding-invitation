'use client';

import { useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importGuestsAction, type ImportActionState } from '@/actions/import';
import { InvitationActions } from '@/components/shared/InvitationActions';

export function CsvUploader() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<ImportActionState | undefined, FormData>(
    importGuestsAction,
    undefined,
  );

  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="bg-card flex items-center gap-3 rounded-md border p-4">
        <Input type="file" name="csv" accept=".csv,text/csv" required className="flex-1" />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Importando...' : 'Importar'}
        </Button>
      </form>

      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

      {state?.errors && state.errors.length > 0 && (
        <div className="bg-destructive/10 rounded-md border p-4">
          <h3 className="font-medium">Errores en el CSV</h3>
          <ul className="text-destructive mt-2 list-disc space-y-1 pl-5 text-sm">
            {state.errors.map((e, i) => (
              <li key={i}>
                Linea {e.line}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state?.ok && state.imported && (
        <div className="space-y-4">
          <h3 className="font-medium">Importados: {state.imported.length} grupos</h3>
          <div className="bg-card overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Parentezco</TableHead>
                  <TableHead>Aforo</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.imported.map((g) => {
                  const link = `${siteUrl}/invite/${g.token}`;
                  return (
                    <TableRow key={g.group_id}>
                      <TableCell className="font-medium">{g.display_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {g.relationship ?? '—'}
                      </TableCell>
                      <TableCell>{g.max_attendees}</TableCell>
                      <TableCell className="font-mono text-xs">{g.token}</TableCell>
                      <TableCell>
                        <InvitationActions
                          guestName={g.display_name}
                          link={link}
                          maxAttendees={g.max_attendees}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const csv = [
                'Nombre,Parentezco,Token,Aforo,Link',
                ...state.imported!.map(
                  (g) =>
                    `"${g.display_name}","${g.relationship ?? ''}","${g.token}",${g.max_attendees},"${siteUrl}/invite/${g.token}"`,
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'tokens.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar tokens a CSV
          </Button>
        </div>
      )}
    </div>
  );
}
