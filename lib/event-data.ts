import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { WEDDING_CONFIG } from '@/lib/wedding-config';

export type RegistryLink = { label: string; url: string };

export type CouplePhoto = {
  year: number;
  caption: string | null;
  image_path: string;
  image_url: string;
};

export type EventData = {
  brideName: string;
  groomName: string;
  weddingDateIso: string;
  rsvpDeadlineIso: string | null;
  rsvpOpen: boolean;
  publishedAtIso: string | null;
  ceremony: {
    name: string | null;
    address: string | null;
    mapsUrl: string | null;
    time: string | null;
  };
  reception: {
    name: string | null;
    address: string | null;
    mapsUrl: string | null;
    time: string | null;
  };
  dressCode: {
    description: string | null;
  };
  registry: RegistryLink[];
  notes: string | null;
  welcomeMessage: string;
  relationshipStartYear: number | null;
  couplePhotos: CouplePhoto[];
  timezone: string;
  locale: string;
};

/**
 * Retorna el evento mergeando wedding_config (DB, fuente de verdad para campos
 * editables) con WEDDING_CONFIG (estatico: nombres, paleta, tz, locale).
 */
export async function getEventData(): Promise<EventData> {
  const admin = getAdminClient();
  const { data: config } = await admin
    .from('wedding_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  return {
    brideName: WEDDING_CONFIG.brideName,
    groomName: WEDDING_CONFIG.groomName,
    weddingDateIso: (config?.wedding_date as string | undefined) ?? WEDDING_CONFIG.weddingDate,
    rsvpDeadlineIso: (config?.rsvp_deadline as string | null | undefined) ?? null,
    rsvpOpen: (config?.rsvp_open as boolean | undefined) ?? true,
    publishedAtIso: (config?.published_at as string | null | undefined) ?? null,
    ceremony: {
      name: (config?.ceremony_location_name as string | null | undefined) ?? null,
      address: (config?.ceremony_location_address as string | null | undefined) ?? null,
      mapsUrl: (config?.ceremony_location_maps_url as string | null | undefined) ?? null,
      time: (config?.ceremony_time as string | null | undefined)?.slice(0, 5) ?? null,
    },
    reception: {
      name: (config?.reception_location_name as string | null | undefined) ?? null,
      address: (config?.reception_location_address as string | null | undefined) ?? null,
      mapsUrl: (config?.reception_location_maps_url as string | null | undefined) ?? null,
      time: (config?.reception_time as string | null | undefined)?.slice(0, 5) ?? null,
    },
    dressCode: {
      description: (config?.dress_code as string | null | undefined) ?? null,
    },
    registry: ((config?.registry_links as RegistryLink[] | null | undefined) ?? []) as RegistryLink[],
    notes: (config?.notes as string | null | undefined) ?? null,
    welcomeMessage:
      (config?.welcome_message as string | null | undefined) ?? WEDDING_CONFIG.welcomeMessage,
    relationshipStartYear:
      (config?.relationship_start_year as number | null | undefined) ?? null,
    couplePhotos: buildCouplePhotos(admin, config?.couple_photos),
    timezone: WEDDING_CONFIG.timezone,
    locale: WEDDING_CONFIG.locale,
  };
}

type RawPhoto = { year: number; caption?: string | null; image_path: string };

function buildCouplePhotos(
  admin: ReturnType<typeof getAdminClient>,
  raw: unknown,
): CouplePhoto[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawPhoto[])
    .filter((p) => p && typeof p.image_path === 'string' && Number.isInteger(p.year))
    .map((p) => {
      const { data } = admin.storage.from('wedding-assets').getPublicUrl(p.image_path);
      return {
        year: p.year,
        caption: p.caption ?? null,
        image_path: p.image_path,
        image_url: data.publicUrl,
      };
    })
    .sort((a, b) => a.year - b.year);
}
