import Image from 'next/image';
import { ExternalLink, Music, Heart } from 'lucide-react';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type MessageRow = {
  id: string;
  content: string;
  created_at: string;
  guest_group: { display_name: string } | null;
};

type SongRow = {
  id: string;
  label: string;
  uri: string | null;
  image_url: string | null;
  created_at: string;
  guest_group: { display_name: string } | null;
};

function trackIdFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const match = uri.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

function formatDate(iso: string, locale = 'es-CO'): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminResponsesPage() {
  const admin = getAdminClient();

  const [{ data: songsData }, { data: messagesData }] = await Promise.all([
    admin
      .from('guest_group_song')
      .select('id, label, uri, image_url, created_at, guest_group(display_name)')
      .order('created_at', { ascending: false }),
    admin
      .from('guest_group_message')
      .select('id, content, created_at, guest_group(display_name)')
      .order('created_at', { ascending: false }),
  ]);

  const songs = (songsData ?? []) as unknown as SongRow[];
  const messages = (messagesData ?? []) as unknown as MessageRow[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">Respuestas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {messages.length} dedicatorias · {songs.length} canciones sugeridas.
        </p>
      </div>

      <section className="space-y-4">
        <header className="flex items-center gap-2">
          <Music className="text-primary size-5" />
          <h2 className="font-serif text-2xl">Canciones</h2>
        </header>
        {songs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aún no hay canciones sugeridas.</p>
        ) : (
          <ul className="bg-card divide-y rounded-md border">
            {songs.map((song) => {
              const trackId = trackIdFromUri(song.uri);
              const href = trackId ? `https://open.spotify.com/track/${trackId}` : null;
              const group = song.guest_group?.display_name ?? 'Grupo eliminado';
              const Row = (
                <div className="flex items-center gap-3 px-3 py-2">
                  {song.image_url ? (
                    <Image
                      src={song.image_url}
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
                      Sugerida por {group} · {formatDate(song.created_at)}
                    </p>
                  </div>
                  {href && (
                    <ExternalLink className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  )}
                </div>
              );
              return (
                <li key={song.id}>
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
            {messages.map((m) => (
              <li key={m.id} className="bg-card rounded-md border p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className="text-muted-foreground mt-2 text-xs italic">
                  — {m.guest_group?.display_name ?? 'Grupo eliminado'} · {formatDate(m.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
