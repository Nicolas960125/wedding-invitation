import Image from 'next/image';
import { ExternalLink, Music, Heart } from 'lucide-react';
import { getAdminClient } from '@/lib/supabase/admin';
import type { SongItem } from '@/lib/schemas/rsvp';

export const dynamic = 'force-dynamic';

type GroupRow = {
  id: string;
  display_name: string;
  message: string | null;
  songs: SongItem[] | null;
  responded_at: string | null;
};

function trackIdFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const match = uri.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

export default async function AdminResponsesPage() {
  const admin = getAdminClient();

  const { data } = await admin
    .from('guest_group')
    .select('id, display_name, message, songs, responded_at')
    .not('responded_at', 'is', null)
    .order('responded_at', { ascending: false });

  const groups = (data ?? []) as GroupRow[];

  const messages = groups.filter((g) => g.message && g.message.trim().length > 0);
  const songEntries = groups.flatMap((g) =>
    (g.songs ?? []).map((s) => ({ song: s, group: g.display_name })),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">Respuestas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {messages.length} dedicatorias · {songEntries.length} canciones sugeridas.
        </p>
      </div>

      <section className="space-y-4">
        <header className="flex items-center gap-2">
          <Music className="text-primary size-5" />
          <h2 className="font-serif text-2xl">Canciones</h2>
        </header>
        {songEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aún no hay canciones sugeridas.</p>
        ) : (
          <ul className="bg-card divide-y rounded-md border">
            {songEntries.map(({ song, group }, idx) => {
              const trackId = trackIdFromUri(song.uri);
              const href = trackId ? `https://open.spotify.com/track/${trackId}` : null;
              const Row = (
                <div className="flex items-center gap-3 px-3 py-2">
                  {song.imageUrl ? (
                    <Image
                      src={song.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded">
                      <Music className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{song.label}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      Sugerida por {group}
                    </p>
                  </div>
                  {href && (
                    <ExternalLink className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  )}
                </div>
              );
              return (
                <li key={`${song.uri ?? song.label}-${idx}`}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:bg-accent/40 block transition"
                      title="Abrir en Spotify"
                    >
                      {Row}
                    </a>
                  ) : (
                    Row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <header className="flex items-center gap-2">
          <Heart className="text-primary size-5" />
          <h2 className="font-serif text-2xl">Dedicatorias</h2>
        </header>
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aún no hay dedicatorias.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((g) => (
              <li key={g.id} className="bg-card rounded-md border p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{g.message}</p>
                <p className="text-muted-foreground mt-2 text-xs italic">— {g.display_name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
