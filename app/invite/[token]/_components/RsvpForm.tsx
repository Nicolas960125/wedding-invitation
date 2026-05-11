'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';
import { Music, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { submitRsvpAction, type RsvpActionState } from '@/actions/rsvp';
import { SpotifySearch } from './SpotifySearch';
import type { SongItem } from '@/lib/schemas/rsvp';
import { GUEST_TITLES, type GuestTitle } from '@/lib/schemas/csvRow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TITLE_NONE = '__none__';

type GuestUI = {
  id: string;
  fullName: string;
  title: GuestTitle | null;
  isPrimary: boolean;
  attending: 'yes' | 'no' | null;
  dietaryRestrictions: string;
};

type Props = {
  token: string;
  maxAttendees: number;
  guests: GuestUI[];
  initialMessage: string;
  initialSongs: SongItem[];
};

const PLACEHOLDER_PREFIX = 'Acompañante';

export function RsvpForm(props: Props) {
  const [guests, setGuests] = useState<GuestUI[]>(props.guests);
  const [message, setMessage] = useState(props.initialMessage);
  const [songs, setSongs] = useState<SongItem[]>(props.initialSongs);

  const [state, formAction, isPending] = useActionState<RsvpActionState | undefined, FormData>(
    async (prev, formData) => {
      const payload = {
        token: props.token,
        guests: guests.map((g) => ({
          id: g.id,
          fullName: g.fullName.trim(),
          title: g.title,
          attending: g.attending ?? 'pending',
          dietaryRestrictions: g.dietaryRestrictions.trim() || null,
        })),
        message: message.trim() || null,
        songs,
      };
      formData.set('payload', JSON.stringify(payload));
      const result = await submitRsvpAction(prev, formData);
      if (result.ok) {
        toast.success(result.message ?? '¡Confirmado!');
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    undefined,
  );

  const updateGuest = (id: string, patch: Partial<GuestUI>) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const yesCount = guests.filter((g) => g.attending === 'yes').length;
  const overflow = yesCount > props.maxAttendees;

  return (
    <form action={formAction} className="space-y-6">
      <div className="text-center">
        <h2 className="font-serif text-3xl sm:text-4xl">¿Nos acompañas?</h2>
        <p className="text-foreground/85 mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base">
          Es importante que confirmes tu asistencia. Tu presencia es lo que hará de este día un
          recuerdo eterno.
        </p>
        <p className="text-muted-foreground mt-2 text-xs italic">
          {props.maxAttendees === 1
            ? 'Confirma tu asistencia más abajo'
            : `Tu grupo puede ser de hasta ${props.maxAttendees} personas`}
        </p>
      </div>

      <div className="space-y-4">
        {guests.map((g) => {
          const isPlaceholder = g.fullName.startsWith(PLACEHOLDER_PREFIX);
          return (
            <div key={g.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-center gap-2">
                {g.isPrimary && (
                  <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                    Tu
                  </span>
                )}
                {isPlaceholder ? (
                  <>
                    <Select
                      value={g.title ?? TITLE_NONE}
                      onValueChange={(v) =>
                        updateGuest(g.id, { title: v === TITLE_NONE ? null : (v as GuestTitle) })
                      }
                    >
                      <SelectTrigger className="w-24" aria-label="Tratamiento">
                        <SelectValue placeholder="—" />
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
                    <Input
                      value={g.fullName}
                      onChange={(e) => updateGuest(g.id, { fullName: e.target.value })}
                      placeholder="Nombre del acompañante"
                      className="max-w-xs"
                    />
                  </>
                ) : (
                  <span className="font-medium">
                    {g.title ? `${g.title} ` : ''}
                    {g.fullName}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  ¿Asiste?
                </Label>
                <RadioGroup
                  className="mt-2 flex gap-4"
                  value={g.attending ?? ''}
                  onValueChange={(v) => updateGuest(g.id, { attending: v as 'yes' | 'no' })}
                >
                  <Label className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id={`a-${g.id}-yes`} /> Sí
                  </Label>
                  <Label className="flex items-center gap-2">
                    <RadioGroupItem value="no" id={`a-${g.id}-no`} /> No
                  </Label>
                </RadioGroup>
              </div>
              {g.attending === 'yes' && (
                <div className="mt-3">
                  <Label htmlFor={`d-${g.id}`} className="text-muted-foreground text-xs uppercase tracking-wider">
                    Restricciones alimentarias (opcional)
                  </Label>
                  <Input
                    id={`d-${g.id}`}
                    value={g.dietaryRestrictions}
                    onChange={(e) => updateGuest(g.id, { dietaryRestrictions: e.target.value })}
                    placeholder="Vegetariano, alergias, etc."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {overflow && (
        <p className="text-destructive text-sm">
          Solo puedes confirmar hasta {props.maxAttendees} asistentes en tu grupo.
        </p>
      )}

      <div className="bg-accent/40 border-primary/25 rounded-xl border p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
            <Music className="size-5 animate-float" />
          </div>
          <div className="min-w-0">
            <Label className="font-serif text-lg leading-tight">
              Las canciones que no pueden faltar
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Suma tus favoritas para la playlist de la fiesta
            </p>
          </div>
        </div>
        <SpotifySearch initialSongs={songs} onChange={setSongs} />
      </div>

      <div className="bg-accent/40 border-primary/25 rounded-xl border p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
            <Heart className="size-5 animate-pulse-soft" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <Label htmlFor="message" className="font-serif text-lg leading-tight">
              Una dedicatoria para los novios
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Atesoraremos cada palabra
            </p>
          </div>
        </div>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Compártenos un deseo, una bendición o lo que sientas en el corazón..."
          rows={3}
          maxLength={500}
          className="bg-card"
        />
        <p className="text-muted-foreground mt-2 text-xs italic">
          Tu mensaje viaja con nosotros a este nuevo capítulo.
        </p>
      </div>

      <Button type="submit" disabled={isPending || overflow} className="w-full">
        {isPending ? 'Guardando...' : state?.ok ? 'Actualizar respuesta' : 'Confirmar asistencia'}
      </Button>

      {state?.error && <p className="text-destructive text-center text-sm">{state.error}</p>}
      {state?.ok && <p className="text-center text-sm text-green-600">{state.message}</p>}
    </form>
  );
}
