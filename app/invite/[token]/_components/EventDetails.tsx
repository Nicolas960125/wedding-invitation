import { Clock, MapPin, ExternalLink, Sparkles } from 'lucide-react';

type Location = {
  name: string | null;
  address: string | null;
  mapsUrl: string | null;
  time: string | null;
};

type Props = {
  ceremony: Location;
  reception: Location;
};

function isSameVenue(a: Location, b: Location): boolean {
  // Si los nombres y direcciones coinciden (ignorando casing/espacios) consideramos
  // que es un solo lugar y mostramos un solo card con dos horarios.
  const norm = (s: string | null) => (s ?? '').trim().toLowerCase();
  const sameName = !!a.name && !!b.name && norm(a.name) === norm(b.name);
  const sameAddress = !!a.address && !!b.address && norm(a.address) === norm(b.address);
  return sameName || sameAddress;
}

export function EventDetails({ ceremony, reception }: Props) {
  const hasCeremonyData = ceremony.name || ceremony.address || ceremony.time;
  const hasReceptionData = reception.name || reception.address || reception.time;

  if (!hasCeremonyData && !hasReceptionData) {
    return (
      <section className="px-6 py-10 text-center">
        <h2 className="font-serif text-3xl">Detalles del evento</h2>
        <p className="text-muted-foreground mt-3 text-sm italic">Por confirmar</p>
      </section>
    );
  }

  if (isSameVenue(ceremony, reception)) {
    return <CombinedVenueCard ceremony={ceremony} reception={reception} />;
  }

  return (
    <section className="grid gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6">
      <SingleVenueCard title="Ceremonia" location={ceremony} icon="ceremony" />
      <SingleVenueCard title="Recepción" location={reception} icon="reception" />
    </section>
  );
}

function CombinedVenueCard({ ceremony, reception }: { ceremony: Location; reception: Location }) {
  // Para el lugar tomamos los datos que existan (preferimos ceremonia)
  const venue = {
    name: ceremony.name ?? reception.name,
    address: ceremony.address ?? reception.address,
    mapsUrl: ceremony.mapsUrl ?? reception.mapsUrl,
  };

  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="bg-card border-primary/20 mx-auto max-w-md overflow-hidden rounded-2xl border shadow-sm">
        <div className="from-primary/10 to-accent/20 bg-gradient-to-br px-6 py-8 text-center">
          <div className="text-primary mx-auto mb-3 flex justify-center">
            <Sparkles className="size-6 animate-pulse-soft" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl">Ceremonia y Recepción</h2>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest">
            Compartamos este día en un mismo lugar
          </p>
        </div>

        <div className="px-6 py-6">
          {venue.name && (
            <p className="text-foreground text-center font-serif text-xl">{venue.name}</p>
          )}
          {venue.address && (
            <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1.5 text-center text-sm">
              <MapPin className="size-3.5 shrink-0" />
              {venue.address}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ceremony.time && <TimeRow label="Ceremonia" time={ceremony.time} />}
            {reception.time && <TimeRow label="Recepción" time={reception.time} />}
          </div>

          {venue.mapsUrl && (
            <a
              href={venue.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground mt-6 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
            >
              <MapPin className="size-4" />
              Cómo llegar
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function TimeRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="bg-muted/40 border-border/60 flex items-center gap-3 rounded-lg border px-4 py-3">
      <Clock className="text-primary size-4 shrink-0 animate-pulse-soft" />
      <div>
        <p className="text-muted-foreground text-[11px] uppercase tracking-wider">{label}</p>
        <p className="font-serif text-lg font-medium leading-tight">{time}</p>
      </div>
    </div>
  );
}

function SingleVenueCard({
  title,
  location,
  icon,
}: {
  title: string;
  location: Location;
  icon: 'ceremony' | 'reception';
}) {
  const hasAny = location.name || location.address || location.time;
  return (
    <div className="bg-card border-primary/20 rounded-2xl border p-6 shadow-sm">
      <div className="flex items-center gap-2">
        {icon === 'ceremony' ? (
          <Sparkles className="text-primary size-5 animate-pulse-soft" />
        ) : (
          <Clock className="text-primary size-5 animate-pulse-soft" />
        )}
        <h3 className="font-serif text-2xl">{title}</h3>
      </div>
      {hasAny ? (
        <>
          {location.time && (
            <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-sm">
              <Clock className="size-3.5" />
              {location.time} hs
            </p>
          )}
          {location.name && <p className="mt-3 font-medium">{location.name}</p>}
          {location.address && (
            <p className="text-muted-foreground flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {location.address}
            </p>
          )}
          {location.mapsUrl && (
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-3 inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
            >
              Cómo llegar
              <ExternalLink className="size-3" />
            </a>
          )}
        </>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm italic">Por confirmar</p>
      )}
    </div>
  );
}
