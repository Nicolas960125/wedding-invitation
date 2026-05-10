import { getAdminClient } from '@/lib/supabase/admin';
import { ConfigForm } from './_components/ConfigForm';
import { CouplePhotosManager, type ExistingPhoto } from './_components/CouplePhotosManager';

export const dynamic = 'force-dynamic';

type RawPhoto = { year: number; caption?: string | null; image_path: string };

export default async function AdminConfigPage() {
  const admin = getAdminClient();
  const { data: config } = await admin
    .from('wedding_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const rawPhotos = (config?.couple_photos as RawPhoto[] | null) ?? [];
  const photos: ExistingPhoto[] = rawPhotos.map((p) => {
    const { data } = admin.storage.from('wedding-assets').getPublicUrl(p.image_path);
    return {
      year: p.year,
      caption: p.caption ?? null,
      image_path: p.image_path,
      image_url: data.publicUrl,
    };
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">Configuración</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Datos del evento, deadline y estado del RSVP.
        </p>
      </div>

      <ConfigForm initial={config ?? null} />

      <div className="space-y-3">
        <div>
          <h2 className="font-serif text-2xl">Línea de tiempo</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Subí fotos taggeadas con el año correspondiente. Aparecen ordenadas
            cronológicamente en la invitación.
          </p>
        </div>
        <CouplePhotosManager initialPhotos={photos} />
      </div>
    </div>
  );
}
