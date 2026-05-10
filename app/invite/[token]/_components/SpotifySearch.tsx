'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Music, Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchSpotifyAction } from '@/actions/spotify';
import type { SpotifyTrack } from '@/lib/spotify';
import type { SongItem } from '@/lib/schemas/rsvp';

const MAX_SONGS = 8;

type Props = {
  initialSongs?: SongItem[];
  onChange: (songs: SongItem[]) => void;
};

export function SpotifySearch({ initialSongs = [], onChange }: Props) {
  const [songs, setSongs] = useState<SongItem[]>(initialSongs);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Search debounced
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchSpotifyAction(trimmed);
        if (res.ok) {
          // Filtrar resultados que ya estan seleccionados
          const pickedUris = new Set(songs.map((s) => s.uri).filter(Boolean));
          const filtered = res.results.filter((r) => !pickedUris.has(r.uri));
          setResults(filtered);
          setOpen(filtered.length > 0);
        } else {
          setResults([]);
          setOpen(false);
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query, songs]);

  const update = (next: SongItem[]) => {
    setSongs(next);
    onChange(next);
  };

  const handlePick = (track: SpotifyTrack) => {
    if (songs.length >= MAX_SONGS) return;
    const item: SongItem = {
      label: `${track.name} — ${track.artists}`,
      uri: track.uri,
      imageUrl: track.imageUrl ?? null,
    };
    update([...songs, item]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleAddFreeText = () => {
    const trimmed = query.trim();
    if (!trimmed || songs.length >= MAX_SONGS) return;
    const item: SongItem = { label: trimmed, uri: null, imageUrl: null };
    update([...songs, item]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleRemove = (idx: number) => {
    update(songs.filter((_, i) => i !== idx));
  };

  const reachedMax = songs.length >= MAX_SONGS;

  return (
    <div ref={wrapperRef} className="space-y-3">
      {!reachedMax && (
        <div className="relative">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (results.length > 0) handlePick(results[0]);
                  else if (query.trim()) handleAddFreeText();
                }
              }}
              placeholder="Busca una canción en Spotify..."
              className="bg-card pl-9 pr-9"
              autoComplete="off"
              maxLength={200}
            />
            {isPending && (
              <Music className="text-primary absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-pulse-soft" />
            )}
          </div>

          {open && (
            <div className="bg-card border-primary/30 absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border shadow-lg">
              {results.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handlePick(track)}
                  className="hover:bg-accent border-border/50 flex w-full items-center gap-3 border-b p-2 text-left transition last:border-b-0"
                >
                  {track.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={track.imageUrl} alt="" className="size-10 shrink-0 rounded" />
                  ) : (
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded">
                      <Music className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{track.artists}</p>
                  </div>
                  <Plus className="text-primary size-4 shrink-0" />
                </button>
              ))}
              {query.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={handleAddFreeText}
                  className="hover:bg-accent flex w-full items-center gap-2 p-2 text-left text-sm italic transition"
                >
                  <Plus className="text-muted-foreground size-4" />
                  Agregar &quot;{query.trim()}&quot; como texto libre
                </button>
              )}
            </div>
          )}

          <p className="text-muted-foreground mt-1.5 text-[10px]">
            Resultados de Spotify · puedes agregar hasta {MAX_SONGS} canciones · si no la encuentras, presiona Enter para texto libre
          </p>
        </div>
      )}

      {reachedMax && (
        <p className="text-muted-foreground text-center text-xs italic">
          Llegaste al máximo de {MAX_SONGS} canciones. Quita alguna para agregar otra.
        </p>
      )}

      {/* Lista de canciones seleccionadas */}
      {songs.length > 0 && (
        <ul className="space-y-2">
          {songs.map((song, idx) => (
            <li
              key={`${song.uri ?? 'free'}-${idx}`}
              className="bg-card border-primary/30 flex items-center gap-3 rounded-md border p-2"
            >
              {song.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={song.imageUrl} alt="" className="size-10 shrink-0 rounded shadow-sm" />
              ) : (
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded">
                  <Music className="text-muted-foreground size-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{song.label}</p>
                {!song.uri && (
                  <p className="text-muted-foreground text-[10px] italic">Texto libre</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1.5 transition"
                aria-label="Quitar canción"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
