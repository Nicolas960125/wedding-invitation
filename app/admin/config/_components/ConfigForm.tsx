'use client';

import { useActionState, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { updateConfigAction, type ConfigActionState } from '@/actions/config';

type RegistryRow = { label: string; url: string };

type Initial = Record<string, unknown> | null;

// Convierte un ISO UTC ("2026-12-31T21:00:00+00:00") a datetime-local Bogota
// ("2026-12-31T16:00") para pre-popular los inputs.
function isoToBogotaLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour'); // edge case medianoche
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export function ConfigForm({ initial }: { initial: Initial }) {
  const [state, formAction, isPending] = useActionState<ConfigActionState | undefined, FormData>(
    updateConfigAction,
    undefined,
  );

  const initialRegistry: RegistryRow[] = Array.isArray(initial?.registry_links)
    ? (initial.registry_links as RegistryRow[])
    : [];
  const [registry, setRegistry] = useState<RegistryRow[]>(
    initialRegistry.length > 0 ? initialRegistry : [{ label: '', url: '' }],
  );

  const updateRegistry = (i: number, patch: Partial<RegistryRow>) => {
    setRegistry((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRegistry = () => setRegistry((rs) => [...rs, { label: '', url: '' }]);
  const removeRegistry = (i: number) =>
    setRegistry((rs) => (rs.length === 1 ? [{ label: '', url: '' }] : rs.filter((_, idx) => idx !== i)));

  const registryJson = JSON.stringify(
    registry.filter((r) => r.label.trim() && r.url.trim()),
  );

  const get = (k: string) => {
    const v = initial?.[k];
    if (typeof v !== 'string' || !v) return '';
    if (k === 'wedding_date' || k === 'rsvp_deadline') return isoToBogotaLocal(v);
    if (k === 'ceremony_time' || k === 'reception_time') return v.slice(0, 5); // "HH:mm"
    return v;
  };

  return (
    <form action={formAction} className="bg-card space-y-4 rounded-md border p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="wedding_date">Fecha del evento *</Label>
          <Input
            id="wedding_date"
            name="wedding_date"
            type="datetime-local"
            defaultValue={get('wedding_date')}
            required
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">Hora local Bogota (UTC-5)</p>
        </div>
        <div>
          <Label htmlFor="rsvp_deadline">Deadline RSVP *</Label>
          <Input
            id="rsvp_deadline"
            name="rsvp_deadline"
            type="datetime-local"
            defaultValue={get('rsvp_deadline')}
            required
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">Hora local Bogota (UTC-5)</p>
        </div>
        <div>
          <Label htmlFor="ceremony_location_name">Ceremonia · Lugar</Label>
          <Input
            id="ceremony_location_name"
            name="ceremony_location_name"
            defaultValue={get('ceremony_location_name')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ceremony_location_address">Ceremonia · Direccion</Label>
          <Input
            id="ceremony_location_address"
            name="ceremony_location_address"
            defaultValue={get('ceremony_location_address')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ceremony_location_maps_url">Ceremonia · Maps URL</Label>
          <Input
            id="ceremony_location_maps_url"
            name="ceremony_location_maps_url"
            type="url"
            defaultValue={get('ceremony_location_maps_url')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ceremony_time">Ceremonia · Hora</Label>
          <Input
            id="ceremony_time"
            name="ceremony_time"
            type="time"
            defaultValue={get('ceremony_time')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="reception_location_name">Recepcion · Lugar</Label>
          <Input
            id="reception_location_name"
            name="reception_location_name"
            defaultValue={get('reception_location_name')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="reception_location_address">Recepcion · Direccion</Label>
          <Input
            id="reception_location_address"
            name="reception_location_address"
            defaultValue={get('reception_location_address')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="reception_location_maps_url">Recepcion · Maps URL</Label>
          <Input
            id="reception_location_maps_url"
            name="reception_location_maps_url"
            type="url"
            defaultValue={get('reception_location_maps_url')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="reception_time">Recepcion · Hora</Label>
          <Input
            id="reception_time"
            name="reception_time"
            type="time"
            defaultValue={get('reception_time')}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="dress_code">Dress code</Label>
        <Textarea
          id="dress_code"
          name="dress_code"
          rows={2}
          defaultValue={get('dress_code')}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="relationship_start_year">Año de inicio de la relación</Label>
        <Input
          id="relationship_start_year"
          name="relationship_start_year"
          type="number"
          min={1950}
          max={2100}
          defaultValue={get('relationship_start_year')}
          placeholder="2017"
          className="mt-1 max-w-[200px]"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Para calcular automáticamente "X años juntos, y contando..." en la timeline.
        </p>
      </div>
      <div>
        <Label htmlFor="welcome_message">Mensaje de bienvenida (frase romantica de intro)</Label>
        <Textarea
          id="welcome_message"
          name="welcome_message"
          rows={3}
          defaultValue={get('welcome_message')}
          placeholder="Despues de compartir tantos sueños, hoy queremos compartir contigo uno mas..."
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Aparece debajo de los nombres en la invitacion. Si lo dejas vacio se usa un default.
        </p>
      </div>
      <div>
        <Label htmlFor="notes">Notas (footer pequeño en la invitacion)</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={get('notes')} className="mt-1" />
      </div>
      <div>
        <Label>Lluvia de sobres</Label>
        <p className="text-muted-foreground mt-1 text-xs">
          Cada fila es un botón en la invitación. <strong>Nombre</strong> es el texto que verá el
          invitado (ej: "Nequi", "Bancolombia ahorros"). <strong>Enlace</strong> es a dónde se abre
          al hacer click (puede ser un link a app, una página, o <code>tel:+57...</code> para
          llamar). Si dejás todo vacío, la sección no aparece.
        </p>
        <div className="mt-3 space-y-2">
          {registry.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input
                value={row.label}
                onChange={(e) => updateRegistry(i, { label: e.target.value })}
                placeholder="Nequi"
                maxLength={80}
              />
              <Input
                value={row.url}
                onChange={(e) => updateRegistry(i, { url: e.target.value })}
                placeholder="https://nequi.com.co o tel:+573001234567"
                type="url"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRegistry(i)}
                aria-label="Quitar fila"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRegistry} className="mt-2">
          <Plus className="size-3.5" />
          Agregar opción
        </Button>
        <input type="hidden" name="registry_links" value={registryJson} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="rsvp_open"
          name="rsvp_open"
          value="true"
          defaultChecked={initial?.rsvp_open !== false}
        />
        <Label htmlFor="rsvp_open">RSVP abierto (desmarcar cierra el formulario)</Label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar configuracion'}
      </Button>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-600">{state.message}</p>}
    </form>
  );
}
