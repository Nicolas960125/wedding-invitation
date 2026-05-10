'use server';

import { searchTracks, type SpotifyTrack } from '@/lib/spotify';

export type SpotifySearchResult =
  | { ok: true; results: SpotifyTrack[] }
  | { ok: false; error: string };

export async function searchSpotifyAction(query: string): Promise<SpotifySearchResult> {
  const trimmed = (query ?? '').trim();
  if (trimmed.length < 2) {
    return { ok: true, results: [] };
  }
  try {
    const results = await searchTracks(trimmed, 6);
    return { ok: true, results };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error de busqueda',
    };
  }
}
