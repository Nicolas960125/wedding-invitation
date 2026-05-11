import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAdminClient } from '@/lib/supabase/admin';
import { isValidTokenShape } from '@/lib/tokens';
import { getEventData } from '@/lib/event-data';
import type { SongItem } from '@/lib/schemas/rsvp';
import { HeroCountdown } from './_components/HeroCountdown';
import { EventDetails } from './_components/EventDetails';
import { DressCode } from './_components/DressCode';
import { GiftRegistry } from './_components/GiftRegistry';
import { PhotoGallery } from './_components/PhotoGallery';
import { RsvpForm } from './_components/RsvpForm';
import { AnimatedSection } from './_components/AnimatedSection';
import { FloralDivider } from './_components/FloralDivider';
import { WelcomeMessage } from './_components/WelcomeMessage';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const event = await getEventData();
  return {
    title: `${event.brideName} & ${event.groomName}`,
    description: 'Tenemos el placer de invitarte a nuestra boda',
    other: { referrer: 'no-referrer' },
    openGraph: {
      title: `Boda · ${event.brideName} & ${event.groomName}`,
      description: 'Acompáñanos en nuestro día',
    },
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  if (!isValidTokenShape(token)) {
    notFound();
  }

  const admin = getAdminClient();

  const { data: group, error: groupErr } = await admin
    .from('guest_group')
    .select(
      'id, token, display_name, relationship, max_attendees, message, songs, responded_at',
    )
    .eq('token', token)
    .maybeSingle();

  if (groupErr || !group) {
    notFound();
  }

  const { data: guests } = await admin
    .from('guest')
    .select('id, full_name, title, is_primary, attending, dietary_restrictions')
    .eq('group_id', group.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  const event = await getEventData();

  const now = new Date();
  const isPrePublished = event.publishedAtIso && new Date(event.publishedAtIso) > now;
  const isDeadlinePassed = event.rsvpDeadlineIso && new Date(event.rsvpDeadlineIso) < now;
  const isClosed = !event.rsvpOpen || Boolean(isDeadlinePassed);

  if (isPrePublished) {
    return (
      <main className="theme-wedding bg-background flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl italic">Algo lindo se está preparando</h1>
        <p className="text-muted-foreground mt-4 max-w-sm leading-relaxed">
          Tu invitación está casi lista. Vuelve a abrir este link cerca de la fecha y te
          esperaremos con todos los detalles.
        </p>
      </main>
    );
  }

  return (
    <main className="theme-wedding bg-background min-h-screen p-2 sm:p-6 md:p-10">
      <div className="bg-card border-primary/50 mx-auto max-w-2xl border shadow-md sm:border-2">
        <div className="border-primary/25 m-1.5 border sm:m-3">
          <div className="pb-12">
            <HeroCountdown
              groupName={group.display_name}
              weddingDateIso={event.weddingDateIso}
              brideName={event.brideName}
              groomName={event.groomName}
              locale={event.locale}
            />

            <FloralDivider variant="heart" />

            <WelcomeMessage text={event.welcomeMessage} />

            <AnimatedSection>
              <PhotoGallery
                photos={event.couplePhotos}
                relationshipStartYear={event.relationshipStartYear}
              />
            </AnimatedSection>

            <FloralDivider variant="rings" />

            <AnimatedSection>
              <EventDetails ceremony={event.ceremony} reception={event.reception} />
            </AnimatedSection>

            <FloralDivider variant="leaf" />

            <AnimatedSection>
              <DressCode description={event.dressCode.description} />
            </AnimatedSection>

            {event.registry.length > 0 && (
              <>
                <FloralDivider variant="heart" />
                <AnimatedSection>
                  <GiftRegistry items={event.registry} />
                </AnimatedSection>
              </>
            )}

            <FloralDivider variant="heart" />

            <AnimatedSection className="px-4 sm:px-6">
              <div className="bg-card border-primary/20 rounded-2xl border p-6 shadow-sm sm:p-8">
                {isClosed ? (
                  <div className="text-center">
                    <h2 className="font-serif text-2xl sm:text-3xl">
                      Las confirmaciones cerraron
                    </h2>
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                      {event.rsvpDeadlineIso
                        ? `Cerramos las confirmaciones el ${new Date(event.rsvpDeadlineIso).toLocaleDateString(event.locale, { dateStyle: 'long' })}.`
                        : 'Las confirmaciones ya no están abiertas.'}{' '}
                      Si necesitas avisarnos algo, escríbenos por WhatsApp — siempre hay lugar
                      para quienes amamos.
                    </p>
                  </div>
                ) : (
                  <RsvpForm
                    token={group.token}
                    maxAttendees={group.max_attendees}
                    guests={(guests ?? []).map((g) => ({
                      id: g.id,
                      fullName: g.full_name,
                      title: g.title ?? null,
                      isPrimary: g.is_primary,
                      attending:
                        g.attending === true ? 'yes' : g.attending === false ? 'no' : null,
                      dietaryRestrictions: g.dietary_restrictions ?? '',
                    }))}
                    initialMessage={group.message ?? ''}
                    initialSongs={(group.songs as SongItem[] | null) ?? []}
                  />
                )}
              </div>
            </AnimatedSection>

            {event.notes && (
              <p className="text-muted-foreground mx-6 mt-8 text-center text-sm italic">
                {event.notes}
              </p>
            )}

            <div className="mx-6 mt-14 text-center">
              <p className="text-foreground/80 text-sm italic sm:text-base">
                Compartimos este día junto a ti
              </p>
              <p className="text-primary mt-3 font-serif text-2xl italic sm:text-3xl">
                {event.brideName} &amp; {event.groomName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
