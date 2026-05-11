'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash2, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  updateGroupAction,
  updateGuestAction,
  addGuestToGroupAction,
  removeGuestAction,
  splitGroupAction,
  deleteGroupAction,
} from '@/actions/groups';
import { GUEST_TITLES, type GuestTitle } from '@/lib/schemas/csvRow';

const TITLE_NONE = '__none__';

export type GroupEditGuest = {
  id: string;
  full_name: string;
  title: GuestTitle | null;
  is_primary: boolean;
};

export type GroupEditData = {
  id: string;
  display_name: string;
  relationship: string | null;
  max_attendees: number;
  guests: GroupEditGuest[];
};

type Props = {
  group: GroupEditData;
};

export function GroupEditDialog({ group }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(group.display_name);
  const [relationship, setRelationship] = useState(group.relationship ?? '');

  const [splitSelection, setSplitSelection] = useState<Set<string>>(new Set());
  const [splitName, setSplitName] = useState('');
  const [splitRelationship, setSplitRelationship] = useState('');

  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestTitle, setNewGuestTitle] = useState<string>(TITLE_NONE);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, successMsg?: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(successMsg ?? res.message ?? 'Listo');
      else toast.error(res.error ?? 'Error');
    });
  };

  const saveGroup = () =>
    run(
      () =>
        updateGroupAction({
          group_id: group.id,
          display_name: name,
          relationship: relationship || null,
        }),
      'Grupo guardado',
    );

  const saveGuest = (g: GroupEditGuest, patch: Partial<Pick<GroupEditGuest, 'full_name' | 'title'>>) =>
    run(() =>
      updateGuestAction({
        guest_id: g.id,
        group_id: group.id,
        full_name: patch.full_name ?? g.full_name,
        title: patch.title === undefined ? g.title : patch.title,
      }),
    );

  const addGuest = () => {
    if (!newGuestName.trim()) {
      toast.error('Ingresa un nombre');
      return;
    }
    run(
      () =>
        addGuestToGroupAction({
          group_id: group.id,
          full_name: newGuestName,
          title: newGuestTitle === TITLE_NONE ? null : (newGuestTitle as GuestTitle),
        }),
      'Invitado agregado',
    );
    setNewGuestName('');
    setNewGuestTitle(TITLE_NONE);
  };

  const removeGuest = (guestId: string) =>
    run(() => removeGuestAction({ guest_id: guestId, group_id: group.id }), 'Invitado removido');

  const toggleSplit = (id: string) => {
    setSplitSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitSplit = () => {
    if (splitSelection.size === 0) {
      toast.error('Selecciona al menos un invitado para mover');
      return;
    }
    if (splitSelection.size >= group.guests.length) {
      toast.error('No podes mover a todos; al menos uno debe quedar en el grupo original');
      return;
    }
    if (!splitName.trim()) {
      toast.error('Ingresa el nombre del nuevo grupo');
      return;
    }
    run(
      () =>
        splitGroupAction({
          source_group_id: group.id,
          guest_ids: Array.from(splitSelection),
          new_display_name: splitName,
          new_relationship: splitRelationship || null,
        }),
      'Grupo dividido',
    );
    setSplitSelection(new Set());
    setSplitName('');
    setSplitRelationship('');
  };

  const removeGroup = () => {
    if (!confirm(`Eliminar el grupo "${group.display_name}" y todos sus invitados? Esta accion es permanente.`)) return;
    run(() => deleteGroupAction({ group_id: group.id }), 'Grupo eliminado');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Pencil className="size-3.5" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar grupo</DialogTitle>
          <DialogDescription>
            Modifica nombres, titulos y compone el grupo. Los cambios se guardan al instante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="group-name">Nombre del grupo</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveGroup}
                disabled={pending}
              />
            </div>
            <div>
              <Label htmlFor="group-rel">Parentezco</Label>
              <Input
                id="group-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                onBlur={saveGroup}
                placeholder="opcional"
                disabled={pending}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Aforo actual: {group.max_attendees} (se ajusta automaticamente al agregar/quitar invitados).
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Invitados</h3>
            <span className="text-muted-foreground text-xs">{group.guests.length} personas</span>
          </div>

          <div className="space-y-2">
            {group.guests.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                pending={pending}
                splitChecked={splitSelection.has(g.id)}
                onToggleSplit={() => toggleSplit(g.id)}
                onSave={(patch) => saveGuest(g, patch)}
                onRemove={() => removeGuest(g.id)}
                canRemove={group.guests.length > 1}
              />
            ))}
          </div>

          <div className="bg-muted/40 rounded-md border p-3">
            <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wider">
              Agregar invitado
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-24">
                <Label className="text-xs">Titulo</Label>
                <Select value={newGuestTitle} onValueChange={setNewGuestTitle}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TITLE_NONE}>—</SelectItem>
                    {GUEST_TITLES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[12rem] flex-1">
                <Label htmlFor="new-guest-name" className="text-xs">
                  Nombre
                </Label>
                <Input
                  id="new-guest-name"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <Button type="button" size="sm" onClick={addGuest} disabled={pending}>
                <Plus className="size-3.5" />
                Agregar
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h3 className="font-medium">Dividir grupo</h3>
            <p className="text-muted-foreground text-xs">
              Marca a las personas que se mueven a un grupo nuevo (con token y link propios).
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="split-name" className="text-xs">
                Nombre del nuevo grupo
              </Label>
              <Input
                id="split-name"
                value={splitName}
                onChange={(e) => setSplitName(e.target.value)}
                placeholder="ej. Familia Reyes"
              />
            </div>
            <div>
              <Label htmlFor="split-rel" className="text-xs">
                Parentezco (opcional)
              </Label>
              <Input
                id="split-rel"
                value={splitRelationship}
                onChange={(e) => setSplitRelationship(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={submitSplit} disabled={pending}>
            <Scissors className="size-3.5" />
            Mover {splitSelection.size} a grupo nuevo
          </Button>
        </div>

        <DialogFooter className="mt-4 sm:justify-between">
          <Button type="button" variant="destructive" onClick={removeGroup} disabled={pending}>
            <Trash2 className="size-3.5" />
            Eliminar grupo
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GuestRowProps = {
  guest: GroupEditGuest;
  pending: boolean;
  splitChecked: boolean;
  onToggleSplit: () => void;
  onSave: (patch: Partial<Pick<GroupEditGuest, 'full_name' | 'title'>>) => void;
  onRemove: () => void;
  canRemove: boolean;
};

function GuestRow({ guest, pending, splitChecked, onToggleSplit, onSave, onRemove, canRemove }: GuestRowProps) {
  const [name, setName] = useState(guest.full_name);
  const titleValue = guest.title ?? TITLE_NONE;

  return (
    <div className="bg-card flex flex-wrap items-end gap-2 rounded-md border p-2">
      <div className="flex items-center pb-2 pl-1">
        <Checkbox checked={splitChecked} onCheckedChange={onToggleSplit} aria-label="Mover a grupo nuevo" />
      </div>
      <div className="w-24">
        <Label className="text-xs">Titulo</Label>
        <Select
          value={titleValue}
          onValueChange={(v) => onSave({ title: v === TITLE_NONE ? null : (v as GuestTitle) })}
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TITLE_NONE}>—</SelectItem>
            {GUEST_TITLES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[10rem] flex-1">
        <Label className="text-xs">
          Nombre
          {guest.is_primary && (
            <span className="text-primary ml-2 text-[10px] uppercase tracking-wider">titular</span>
          )}
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== guest.full_name && onSave({ full_name: name.trim() })}
          disabled={pending}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRemove}
        disabled={pending || !canRemove}
        title={canRemove ? 'Remover invitado' : 'No podes remover al unico invitado'}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
