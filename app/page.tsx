import { WEDDING_CONFIG } from '@/lib/wedding-config';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-serif text-4xl tracking-wide">
        {WEDDING_CONFIG.brideName} & {WEDDING_CONFIG.groomName}
      </h1>
      <p className="max-w-md text-muted-foreground">
        Esta es nuestra invitación privada. Si recibiste un link personal, ábrelo desde ahí para
        ver los detalles del evento.
      </p>
    </main>
  );
}
