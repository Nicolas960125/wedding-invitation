import 'server-only';

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  imageUrl: string | null;
  durationMs: number;
  externalUrl: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

type SpotifyArtistRaw = { name: string };
type SpotifyImageRaw = { url: string; width: number; height: number };
type SpotifyTrackRaw = {
  id: string;
  uri: string;
  name: string;
  artists: SpotifyArtistRaw[];
  album: { name: string; images: SpotifyImageRaw[] };
  duration_ms: number;
  external_urls: { spotify?: string };
};

export async function searchTracks(query: string, limit = 6): Promise<SpotifyTrack[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const token = await getAccessToken();
  const params = new URLSearchParams({
    q: trimmed,
    type: 'track',
    limit: String(Math.min(Math.max(limit, 1), 10)),
    market: 'CO',
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { tracks?: { items: SpotifyTrackRaw[] } };
  const items = data.tracks?.items ?? [];

  return items.map((t) => {
    const images = t.album.images ?? [];
    // Preferimos imagen pequeña-media (~64px) para el dropdown
    const image = images.find((i) => i.width <= 80) ?? images[images.length - 1] ?? images[0];
    return {
      id: t.id,
      uri: t.uri,
      name: t.name,
      artists: t.artists.map((a) => a.name).join(', '),
      album: t.album.name,
      imageUrl: image?.url ?? null,
      durationMs: t.duration_ms,
      externalUrl: t.external_urls.spotify ?? `https://open.spotify.com/track/${t.id}`,
    };
  });
}

/**
 * Extrae el track ID de una URI o URL de Spotify.
 * Acepta: 'spotify:track:abc', 'https://open.spotify.com/track/abc?...', 'abc' (id pelado)
 */
export function extractTrackId(uriOrUrl: string | null | undefined): string | null {
  if (!uriOrUrl) return null;
  const m =
    uriOrUrl.match(/spotify:track:([a-zA-Z0-9]+)/) ||
    uriOrUrl.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/) ||
    uriOrUrl.match(/^([a-zA-Z0-9]{20,})$/);
  return m?.[1] ?? null;
}
